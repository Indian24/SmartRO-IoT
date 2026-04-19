import { useGetLatestReading, useGetSystemStatus } from "@workspace/api-client-react";
import React from "react";
import { Text, View } from "react-native";

import { ErrorState, LoadingState, PumpBadge, ReadingTimestamp, RulePanel, ScreenShell, SectionCard, StatusBadge, formatNumber, styles } from "@/components/RoComponents";
import { useRoSettings } from "@/contexts/RoSettingsContext";
import { useColors } from "@/hooks/useColors";

export default function LiveScreen() {
  const colors = useColors();
  const { refreshIntervalMs } = useRoSettings();
  const latest = useGetLatestReading({ query: { refetchInterval: refreshIntervalMs } });
  const status = useGetSystemStatus({ query: { refetchInterval: refreshIntervalMs } });
  const reading = latest.data;

  if (latest.isLoading) return <ScreenShell title="Live data"><LoadingState /></ScreenShell>;
  if (latest.isError || !reading) return <ScreenShell title="Live data"><ErrorState message="The latest reading endpoint did not return telemetry." onRetry={() => latest.refetch()} /></ScreenShell>;

  return (
    <ScreenShell title="Live data" subtitle="Current telemetry from temperature, TDS, water-level, and relay state." refreshing={latest.isRefetching} onRefresh={() => latest.refetch()}>
      <View style={[styles.sectionCard, { backgroundColor: colors.graphite, borderColor: colors.graphite }]}> 
        <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Current temperature</Text>
        <Text style={{ color: colors.primaryForeground, fontFamily: "Inter_700Bold", fontSize: 56, letterSpacing: -2 }}>{formatNumber(reading.temperature)}°C</Text>
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <StatusBadge status={reading.alert} />
          <PumpBadge pumpState={reading.pumpState} />
        </View>
      </View>

      <RulePanel reading={reading} />

      <SectionCard title="Raw sensor values">
        <ValueRow label="DS18B20 temperature" value={`${formatNumber(reading.temperature)} °C`} detail="DATA GPIO4" />
        <ValueRow label="TDS sensor" value={`${formatNumber(reading.tds)} ppm`} detail="Analog GPIO34" />
        <ValueRow label="Water level sensor" value={`${formatNumber(reading.waterLevel)} V`} detail="Analog GPIO35" />
        <ValueRow label="Relay state" value={reading.pumpState} detail="IN GPIO25" />
        <ValueRow label="OLED display" value="Ready" detail="SCL GPIO22 · SDA GPIO21" />
      </SectionCard>

      <SectionCard title="System mode">
        <ValueRow label="Mode" value={status.data?.mode ?? "AUTOMATIC"} detail="Manual override support is reserved for the next control release" />
        <ValueRow label="Refresh interval" value={`${refreshIntervalMs / 1000}s`} detail="Adjustable in Settings" />
      </SectionCard>

      <ReadingTimestamp timestamp={reading.timestamp} />
    </ScreenShell>
  );
}

function ValueRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  const colors = useColors();
  return (
    <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 3 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15, flex: 1 }}>{label}</Text>
        <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 15 }}>{value}</Text>
      </View>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>{detail}</Text>
    </View>
  );
}
