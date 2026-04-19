import {
  getGetAlertsQueryKey,
  getGetHistoryQueryKey,
  getGetLatestReadingQueryKey,
  useGetLatestReading,
  useGetSystemStatus,
  type SensorReading,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { useRoSettings } from "@/contexts/RoSettingsContext";

type TelemetryStreamEvent = {
  type: "reading";
  reading: SensorReading;
};

const apiDomain = process.env.EXPO_PUBLIC_DOMAIN;
const streamUrl = apiDomain ? `https://${apiDomain}/api/stream` : "/api/stream";

export function useLiveTelemetry() {
  const queryClient = useQueryClient();
  const { refreshIntervalMs } = useRoSettings();
  const latest = useGetLatestReading({ query: { refetchInterval: refreshIntervalMs, retry: 1 } });
  const status = useGetSystemStatus({ query: { refetchInterval: refreshIntervalMs, retry: 1 } });
  const [liveReading, setLiveReading] = useState<SensorReading | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [lastLiveAt, setLastLiveAt] = useState<string | null>(null);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    const source = new EventSource(streamUrl);
    source.onopen = () => setLiveConnected(true);
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as TelemetryStreamEvent;
        if (event.type !== "reading" || !event.reading?.timestamp) return;
        setLiveReading(event.reading);
        setLastLiveAt(new Date().toISOString());
        queryClient.setQueryData(getGetLatestReadingQueryKey(), event.reading);
        queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAlertsQueryKey() });
      } catch {
        setLiveConnected(false);
      }
    };
    source.onerror = () => setLiveConnected(false);

    return () => {
      source.close();
      setLiveConnected(false);
    };
  }, [queryClient]);

  const reading = liveReading ?? latest.data ?? status.data?.latest ?? null;
  const apiConnected = latest.isSuccess || status.isSuccess;
  const mqttConnected = Boolean(status.data?.mqtt.connected);
  const readingAgeMs = reading ? Date.now() - new Date(reading.timestamp).getTime() : Number.POSITIVE_INFINITY;
  const isStale = !reading || readingAgeMs > refreshIntervalMs * 2 + 5_000;

  return useMemo(
    () => ({
      latest,
      status,
      reading,
      apiConnected,
      mqttConnected,
      liveConnected,
      lastLiveAt,
      isStale,
      refreshIntervalMs,
      refetch: () => {
        latest.refetch();
        status.refetch();
      },
    }),
    [apiConnected, isStale, lastLiveAt, latest, liveConnected, mqttConnected, reading, refreshIntervalMs, status],
  );
}
