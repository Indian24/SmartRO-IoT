import { useGetLatestReading, useGetSystemStatus } from "@workspace/api-client-react";
import React from "react";
import { View } from "react-native";

import { ErrorState, LoadingState, PumpBadge, ReadingTimestamp, RulePanel, ScreenShell, SectionCard, SensorCard, StatusBadge, formatNumber, styles } from "@/components/RoComponents";
import { useRoSettings } from "@/contexts/RoSettingsContext";

export default function DashboardScreen() {
  const { refreshIntervalMs } = useRoSettings();
  const latest = useGetLatestReading({ query: { refetchInterval: refreshIntervalMs } });
  const status = useGetSystemStatus({ query: { refetchInterval: refreshIntervalMs } });
  const reading = latest.data;

  if (latest.isLoading || status.isLoading) return <ScreenShell title="Dashboard"><LoadingState /></ScreenShell>;
  if (latest.isError || !reading) return <ScreenShell title="Dashboard"><ErrorState message="Check that the backend service is running and reachable." onRetry={() => latest.refetch()} /></ScreenShell>;

  return (
    <ScreenShell
      title="Purifier overview"
      subtitle="Live health view for the ESP32-based RO purifier retrofit. Automatic pump cutoff is fixed at 35°C."
      refreshing={latest.isRefetching || status.isRefetching}
      onRefresh={() => {
        latest.refetch();
        status.refetch();
      }}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <StatusBadge status={reading.alert} />
        <PumpBadge pumpState={reading.pumpState} />
      </View>

      <RulePanel reading={reading} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <SensorCard label="Temperature" value={formatNumber(reading.temperature)} unit="°C" icon="thermometer" tone={reading.alert === "NORMAL" ? "success" : "critical"} footer={`Cutoff ${reading.threshold}°C`} />
        <SensorCard label="TDS" value={formatNumber(reading.tds)} unit="ppm" icon="droplet" tone="water" footer="Analog sensor on GPIO34" />
        <SensorCard label="Water level" value={formatNumber(reading.waterLevel)} unit="V" icon="bar-chart-2" tone="water" footer="Analog level on GPIO35" />
        <SensorCard label="Pump relay" value={reading.pumpState} unit="" icon="power" tone={reading.pumpState === "ON" ? "success" : "warning"} footer="Relay input on GPIO25" />
      </View>

      <SectionCard title="Connectivity">
        <SensorCard label="MQTT" value={status.data?.mqtt.connected ? "Online" : status.data?.mqtt.configured ? "Connecting" : "Not set"} unit="" icon="radio" tone={status.data?.mqtt.connected ? "success" : "warning"} footer={status.data?.mqtt.configured ? "Broker configured" : "Set MQTT_BROKER_URL to receive live ESP32 telemetry"} />
        <SensorCard label="Database" value={status.data?.database.connected ? "Atlas" : "Local"} unit="" icon="database" tone={status.data?.database.connected ? "success" : "warning"} footer={status.data?.database.provider ?? "Telemetry store"} />
      </SectionCard>

      <ReadingTimestamp timestamp={reading.timestamp} />
    </ScreenShell>
  );
}
