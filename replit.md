# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This project now contains a smart RO purifier IoT mobile application backed by the shared Express API server.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile app**: Expo React Native (`artifacts/smart-ro-mobile`)
- **API framework**: Express 5 (`artifacts/api-server`)
- **Messaging**: MQTT via Mosquitto-compatible broker
- **Database**: MongoDB Atlas via `mongodb` driver when `MONGODB_URI` is configured; in-memory sample telemetry for development preview
- **Validation/API contract**: OpenAPI + generated API client/Zod schemas
- **Build**: esbuild for API, Expo tooling for mobile

## Smart RO Details

- Fixed temperature threshold: 35°C
- Pump logic: temperature > 35°C turns pump OFF; temperature <= 35°C turns pump ON
- MQTT topics: `ro/sensor/temperature`, `ro/sensor/tds`, `ro/sensor/waterlevel`, `ro/device/pump`, `ro/device/status`, `ro/device/alert`
- Hardware pins: DS18B20 on GPIO4, water level on GPIO35, TDS on GPIO34, relay on GPIO25, OLED SCL/SDA on GPIO22/GPIO21

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/smart-ro-mobile run dev` — run Expo mobile app

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
