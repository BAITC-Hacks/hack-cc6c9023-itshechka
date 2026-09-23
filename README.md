# HackAlem AI

Монорепозиторий системы автоматического протоколирования совещаний с распознаванием русской, казахской и смешанной речи, выделением поручений и контролем сроков.
Commit

## Структура

```text
.
├── apps/
│   ├── api/              # NestJS, Prisma и PostgreSQL
│   └── web/              # Next.js frontend
├── packages/
│   └── contracts/        # единые Zod-схемы и TypeScript-типы
└── ml/                   # локальный STT, диаризация и анализ текста
```

`apps/web` и `apps/api` используют один pnpm workspace и один пакет `@hackalem/contracts`. Frontend взаимодействует с ML только через REST API backend.

## Быстрый старт

```bash
corepack pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
docker compose up -d
corepack pnpm prisma:generate
corepack pnpm --filter @hackalem/api exec prisma migrate deploy
corepack pnpm prisma:seed
corepack pnpm dev
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/api/docs`
- Health: `http://localhost:4000/api/v1/health`

Frontend по умолчанию подключён к реальному API. Для автономной демонстрации без backend установите `NEXT_PUBLIC_USE_MOCKS=true` в `apps/web/.env.local` и перезапустите Next.js.

## Основные команды

```bash
corepack pnpm dev:web
corepack pnpm dev:api
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

## Реализовано

- загрузка записей и live-поток совещаний;
- сквозной сценарий frontend → multipart upload → backend → AI pipeline → протокол;
- локальный AI pipeline с demo-fallback;
- транскрипт, спикеры, темы, саммари и поручения;
- реестр поручений и обновление статусов;
- экспорт протокола в DOCX/PDF;
- адаптивный frontend с RU/KZ/mixed интерфейсом;
- единые контракты между web и API.

Подробности frontend находятся в [apps/web/README.md](./apps/web/README.md), границы ML-компонента — в [ml/README.md](./ml/README.md).
