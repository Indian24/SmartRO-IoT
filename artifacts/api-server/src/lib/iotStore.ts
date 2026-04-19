import { randomUUID } from "node:crypto";
import { MongoClient, type Collection } from "mongodb";
import { logger } from "./logger";
import { TEMPERATURE_THRESHOLD_C } from "./iotConfig";
import type { AlertEvent, PartialTelemetry, SensorReading } from "./iotTypes";

type SensorDocument = Omit<SensorReading, "id"> & {
  _id?: unknown;
};

const now = Date.now();

const sampleReadings: SensorReading[] = [
  {
    id: "sample-1",
    timestamp: new Date(now - 20 * 60_000).toISOString(),
    temperature: 31.8,
    tds: 176,
    waterLevel: 4.8,
    pumpState: "ON",
    threshold: TEMPERATURE_THRESHOLD_C,
    alert: "NORMAL",
    manualMode: false,
  },
  {
    id: "sample-2",
    timestamp: new Date(now - 15 * 60_000).toISOString(),
    temperature: 32.4,
    tds: 181,
    waterLevel: 4.5,
    pumpState: "ON",
    threshold: TEMPERATURE_THRESHOLD_C,
    alert: "NORMAL",
    manualMode: false,
  },
  {
    id: "sample-3",
    timestamp: new Date(now - 10 * 60_000).toISOString(),
    temperature: 34.1,
    tds: 188,
    waterLevel: 4.2,
    pumpState: "ON",
    threshold: TEMPERATURE_THRESHOLD_C,
    alert: "NORMAL",
    manualMode: false,
  },
  {
    id: "sample-4",
    timestamp: new Date(now - 5 * 60_000).toISOString(),
    temperature: 36.2,
    tds: 194,
    waterLevel: 3.9,
    pumpState: "OFF",
    threshold: TEMPERATURE_THRESHOLD_C,
    alert: "HIGH_TEMPERATURE",
    manualMode: false,
  },
  {
    id: "sample-5",
    timestamp: new Date(now).toISOString(),
    temperature: 33.5,
    tds: 189,
    waterLevel: 4.1,
    pumpState: "ON",
    threshold: TEMPERATURE_THRESHOLD_C,
    alert: "NORMAL",
    manualMode: false,
  },
];

export class IotStore {
  private readings = [...sampleReadings];
  private client: MongoClient | null = null;
  private collection: Collection<SensorDocument> | null = null;
  private connected = false;

  get databaseStatus() {
    return {
      configured: Boolean(process.env.MONGODB_URI),
      connected: this.connected,
      provider: process.env.MONGODB_URI ? "MongoDB Atlas" : "In-memory development store",
    };
  }

  async connect() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      logger.warn("MONGODB_URI is not configured; using in-memory telemetry store");
      return;
    }

    const dbName = process.env.MONGODB_DB_NAME ?? "smart_ro_purifier";
    const collectionName = process.env.MONGODB_COLLECTION ?? "sensor_logs";

    try {
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.collection = this.client.db(dbName).collection<SensorDocument>(collectionName);
      await this.collection.createIndex({ timestamp: -1 });
      this.connected = true;
      logger.info({ dbName, collectionName }, "Connected to MongoDB telemetry store");
    } catch (err) {
      this.connected = false;
      logger.error({ err }, "MongoDB connection failed; continuing with in-memory telemetry store");
    }
  }

  async save(partial: PartialTelemetry) {
    const previous = await this.latest();
    const temperature = asNumber(partial.temperature, previous.temperature);
    const threshold = asNumber(partial.threshold, TEMPERATURE_THRESHOLD_C);
    const pumpState = temperature > threshold ? "OFF" : "ON";
    const alert = temperature > threshold ? "HIGH_TEMPERATURE" : "NORMAL";
    const reading: SensorReading = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      temperature,
      tds: asNumber(partial.tds, previous.tds),
      waterLevel: asNumber(partial.waterLevel, previous.waterLevel),
      pumpState,
      threshold,
      alert,
      manualMode: Boolean(partial.manualMode ?? previous.manualMode),
    };

    this.readings = [...this.readings.slice(-199), reading];

    if (this.collection) {
      try {
        const { id, ...document } = reading;
        await this.collection.insertOne(document);
      } catch (err) {
        logger.error({ err }, "Failed to persist sensor reading");
      }
    }

    return reading;
  }

  async latest() {
    if (this.collection) {
      try {
        const document = await this.collection.find().sort({ timestamp: -1 }).limit(1).next();
        if (document) return fromDocument(document);
      } catch (err) {
        logger.error({ err }, "Failed to read latest MongoDB telemetry");
      }
    }

    return this.readings.at(-1) ?? sampleReadings.at(-1)!;
  }

  async history(limit: number) {
    if (this.collection) {
      try {
        const documents = await this.collection.find().sort({ timestamp: -1 }).limit(limit).toArray();
        return documents.map(fromDocument).reverse();
      } catch (err) {
        logger.error({ err }, "Failed to read MongoDB telemetry history");
      }
    }

    return this.readings.slice(-limit);
  }

  async alerts(limit: number): Promise<AlertEvent[]> {
    const readings = await this.history(Math.max(limit * 4, limit));
    return readings
      .filter((reading) => reading.alert !== "NORMAL")
      .slice(-limit)
      .map((reading) => ({
        id: `alert-${reading.id}`,
        timestamp: reading.timestamp,
        severity: "warning",
        message: `Temperature exceeded ${reading.threshold}°C. Pump stopped automatically.`,
        reading,
      }));
  }
}

function asNumber(value: unknown, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function fromDocument(document: SensorDocument): SensorReading {
  const id =
    document._id && typeof document._id === "object" && "toString" in document._id
      ? document._id.toString()
      : randomUUID();
  return {
    id,
    timestamp: new Date(document.timestamp).toISOString(),
    temperature: document.temperature,
    tds: document.tds,
    waterLevel: document.waterLevel,
    pumpState: document.pumpState,
    threshold: document.threshold,
    alert: document.alert,
    manualMode: document.manualMode,
  };
}

export const iotStore = new IotStore();