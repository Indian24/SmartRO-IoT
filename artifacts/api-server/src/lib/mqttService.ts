import mqtt, { type MqttClient } from "mqtt";
import { randomUUID } from "node:crypto";
import { TEMPERATURE_THRESHOLD_C, MQTT_TOPICS, MQTT_TOPIC_LIST } from "./iotConfig";
import { logger } from "./logger";
import { iotStore } from "./iotStore";
import type { PartialTelemetry } from "./iotTypes";

class MqttTelemetryService {
  private client: MqttClient | null = null;
  private connected = false;

  get status() {
    const brokerUrl = process.env.MQTT_BROKER_URL;
    return {
      configured: Boolean(brokerUrl),
      connected: this.connected,
      brokerUrl: brokerUrl ? sanitizeBrokerUrl(brokerUrl) : undefined,
    };
  }

  connect() {
    const brokerUrl = process.env.MQTT_BROKER_URL;
    if (!brokerUrl) {
      logger.warn("MQTT_BROKER_URL is not configured; REST API will serve stored telemetry only");
      return;
    }

    this.client = mqtt.connect(brokerUrl, {
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clientId: process.env.MQTT_CLIENT_ID ?? `smart-ro-api-${randomUUID()}`,
      reconnectPeriod: 5_000,
      clean: true,
    });

    this.client.on("connect", () => {
      this.connected = true;
      this.client?.subscribe(MQTT_TOPIC_LIST, (err) => {
        if (err) logger.error({ err }, "Failed to subscribe to MQTT topics");
        else logger.info({ topics: MQTT_TOPIC_LIST }, "Subscribed to MQTT topics");
      });
    });

    this.client.on("reconnect", () => {
      this.connected = false;
    });

    this.client.on("close", () => {
      this.connected = false;
    });

    this.client.on("error", (err) => {
      this.connected = false;
      logger.error({ err }, "MQTT connection error");
    });

    this.client.on("message", (topic, payload) => {
      void this.handleMessage(topic, payload);
    });
  }

  private async handleMessage(topic: string, payload: Buffer) {
    try {
      const telemetry = parsePayload(topic, payload);
      const reading = await iotStore.save(telemetry);
      this.publishState(reading.pumpState, reading.alert);
    } catch (err) {
      logger.error({ err, topic }, "Failed to process MQTT message");
    }
  }

  private publishState(pumpState: "ON" | "OFF", alert: "NORMAL" | "HIGH_TEMPERATURE") {
    if (!this.client || !this.connected) return;
    const payload = JSON.stringify({
      pumpState,
      threshold: TEMPERATURE_THRESHOLD_C,
      alert,
      mode: "AUTOMATIC",
    });
    this.client.publish(MQTT_TOPICS.pump, payload, { qos: 1, retain: true });
    this.client.publish(MQTT_TOPICS.status, payload, { qos: 1, retain: true });
    if (alert !== "NORMAL") {
      this.client.publish(MQTT_TOPICS.alert, payload, { qos: 1, retain: true });
    }
  }
}

function parsePayload(topic: string, payload: Buffer): PartialTelemetry {
  const text = payload.toString("utf8").trim();
  const parsed = parseJson(text);

  if (parsed && typeof parsed === "object") {
    return parsed as PartialTelemetry;
  }

  const value = Number(text);
  if (!Number.isFinite(value)) return {};

  if (topic === MQTT_TOPICS.temperature) return { temperature: value };
  if (topic === MQTT_TOPICS.tds) return { tds: value };
  if (topic === MQTT_TOPICS.waterLevel) return { waterLevel: value };

  return {};
}

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function sanitizeBrokerUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "redacted";
    if (parsed.username) parsed.username = "configured";
    return parsed.toString();
  } catch {
    return "configured";
  }
}

export const mqttTelemetryService = new MqttTelemetryService();