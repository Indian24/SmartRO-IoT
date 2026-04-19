import { Router, type IRouter } from "express";
import { HARDWARE_PIN_MAP, MQTT_TOPIC_LIST, TEMPERATURE_THRESHOLD_C } from "../lib/iotConfig";
import { iotStore } from "../lib/iotStore";
import { mqttTelemetryService } from "../lib/mqttService";

const router: IRouter = Router();

router.get("/latest", async (_req, res, next) => {
  try {
    res.json(await iotStore.latest());
  } catch (err) {
    next(err);
  }
});

router.get("/history", async (req, res, next) => {
  try {
    const limit = clamp(Number(req.query.limit ?? 60), 1, 500);
    res.json({ readings: await iotStore.history(limit) });
  } catch (err) {
    next(err);
  }
});

router.get("/status", async (_req, res, next) => {
  try {
    res.json({
      mode: "AUTOMATIC",
      threshold: TEMPERATURE_THRESHOLD_C,
      pumpRule: "Pump OFF when temperature is above 35°C; pump ON when temperature is 35°C or below.",
      latest: await iotStore.latest(),
      mqtt: mqttTelemetryService.status,
      database: iotStore.databaseStatus,
      topics: MQTT_TOPIC_LIST,
      hardware: HARDWARE_PIN_MAP,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/alerts", async (req, res, next) => {
  try {
    const limit = clamp(Number(req.query.limit ?? 20), 1, 100);
    res.json({ alerts: await iotStore.alerts(limit) });
  } catch (err) {
    next(err);
  }
});

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

export default router;