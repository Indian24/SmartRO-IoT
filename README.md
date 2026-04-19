# Smart RO Purifier IoT App

Full-stack mobile application for an ESP32-based smart RO water purifier retrofit.

## What is included

- Expo React Native mobile app in `artifacts/smart-ro-mobile`
- Express backend in `artifacts/api-server`
- MQTT intake for ESP32 telemetry topics
- MongoDB Atlas persistence when `MONGODB_URI` is configured
- REST APIs for latest readings, history, status, and alerts
- Fixed 35°C automatic pump cutoff logic
- Hardware pin map reflected in the app settings screen

## Hardware pin map

| Component | Pin |
| --- | --- |
| DS18B20 temperature DATA | GPIO4 |
| Water level analog signal | GPIO35 |
| TDS analog signal | GPIO34 |
| Relay IN | GPIO25 |
| OLED SCL | GPIO22 |
| OLED SDA | GPIO21 |

## Environment variables

Copy `.env.example` values into your deployment or local environment and fill in real values.

```bash
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=smart_ro_purifier
MONGODB_COLLECTION=sensor_logs
MQTT_BROKER_URL=mqtt://broker-host:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=smart-ro-api
```

If MongoDB or MQTT are not configured, the backend runs with sample in-memory telemetry so the mobile app can still be previewed.

## MQTT topics

- `ro/sensor/temperature`
- `ro/sensor/tds`
- `ro/sensor/waterlevel`
- `ro/device/pump`
- `ro/device/status`
- `ro/device/alert`

## Sample MQTT payload

```json
{
  "temperature": 32.5,
  "tds": 189,
  "waterLevel": 4.2,
  "pumpState": "ON",
  "threshold": 35,
  "alert": "NORMAL"
}
```

## API routes

- `GET /api/latest`
- `GET /api/history?limit=60`
- `GET /api/status`
- `GET /api/alerts?limit=20`

## Run

```bash
pnpm install
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/smart-ro-mobile run dev
```

The mobile app uses the shared API client and expects the API server to be reachable through the project domain in Replit.
