<<<<<<< HEAD
# HackAlem AI — backend (apps/api)

Backend для кейса «Система автопротоколирования совещаний с фиксацией поручений».
Стек: NestJS + TypeScript strict + PostgreSQL + Prisma v7 + Zod-контракты в `packages/contracts`.

## Быстрый старт

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # поправь DATABASE_URL под свой Postgres
pnpm --filter @hackalem/api prisma:generate
pnpm --filter @hackalem/api prisma:migrate   # создаст миграцию + применит схему
pnpm --filter @hackalem/api prisma:seed      # одна демо-встреча на основе эталонного протокола
pnpm dev:api
```

API: `http://localhost:4000/api/v1`
Swagger: `http://localhost:4000/api/docs`
Health: `GET http://localhost:4000/api/v1/health`

## ⚠️ Известное ограничение этой песочницы

`prisma generate` здесь не смог скачать движок (`binaries.prisma.sh` не в whitelist сетевых доменов
контейнера, 403 Forbidden) — поэтому Prisma Client не сгенерирован и `@prisma/client`-типы сейчас
недоступны. Весь остальной TS-код (контракты, контроллеры, сервисы, DTO) прогнан через `tsc --noEmit`
и компилируется чисто — единственные ошибки сейчас каскадные от отсутствующего Prisma Client.
**На твоей машине/CI с обычным интернетом `prisma generate` отработает штатно** — команда та же самая.

## Что уже реализовано

- **Meetings**: create / list / get / attach-audio (FILE) / stop (LIVE)
- **Live-стрим**: WS `ws://localhost:4000/api/v1/meetings/stream?meetingId=...` — приём аудио-чанков,
  буферизация на диск, авто-финализация по disconnect → `Meeting.status: UPLOADED`. Дальше единый
  pipeline `POST /meetings/:id/process`, как и для файла.
- **AI-интеграция**: `POST /meetings/:id/process` дёргает self-hosted AI worker (`AI_WORKER_URL`);
  если worker недоступен — автоматический фолбэк на demo-adapter (фикстура в той же Zod-схеме
  `AiProcessResult`), чтобы бэкенд демонстрировался независимо от готовности worker'а.
  Webhook `POST /internal/meetings/:id/result` — приёмник результата от worker'а.
- **Transcript / Topics / Summary**: чтение по встрече, группировка по темам (`Topic.startOrder/endOrder`)
  — закрывает требование "многотемные встречи → раздельное саммари".
- **Tasks**: список поручений + `PATCH /tasks/:id` для ручной корректировки ответственного/срока/статуса/темы.
- **Export**: `POST /meetings/:id/export` собирает DOCX (структура — как в эталонном
  `Протокол_совещания_*.docx`: заголовок, реплики по темам, таблица поручений, саммари) и, если на хосте
  есть `soffice`, конвертирует в PDF.

## Что дальше (не в этом проходе)

- AI worker (STT/диаризация/извлечение поручений) — общая зона с фронтендером, см. `Открытый вопрос`
  в бэкенд-ТЗ про способ live-захвата (браузер стримит системное аудио — заложено в `LiveGateway`).
- Партиальный live-транскрипт в реальном времени (сейчас backend только надёжно копит аудио на диск
  во время записи; полный pipeline — по `stop`).
- Auth — не добавлен, кейс не требует ролей для MVP.
- Meeting-бот (Teams/Zoom/Meet) — сознательно отложен, как договорились.
=======
# Хаттама

Монорепозиторий системы автоматического протоколирования совещаний с распознаванием русской, казахской и смешанной речи, выделением поручений и контролем сроков.

## Структура репозитория

```text
.
├── frontend/   # веб-интерфейс, UI и общие frontend-контракты
├── backend/    # REST API, хранение данных и бизнес-логика
└── ml/         # распознавание речи, диаризация, саммари и извлечение поручений
```

Каждая глобальная папка является самостоятельной рабочей областью со своими зависимостями, настройками запуска и документацией. Не размещайте общие `package.json`, виртуальные окружения или lock-файлы в корне репозитория.

## Frontend

Frontend уже реализован и запускается из своей директории:

```bash
cd frontend
corepack pnpm install
cp apps/web/.env.example apps/web/.env.local
corepack pnpm dev
```

Подробное описание интерфейса, API-контрактов и демонстрационного сценария находится в [frontend/README.md](./frontend/README.md).

## Границы компонентов

- `frontend` обращается только к публичному REST API backend и не импортирует код из `backend` или `ml`.
- `backend` управляет окончательными DTO, авторизацией, данными и оркестрацией ML-задач.
- `ml` предоставляет backend локальные/self-hosted возможности обработки аудио и текста; frontend не обращается к ML напрямую.
- Аудио и транскрипты не должны передаваться во внешние облачные AI API.

>>>>>>> f86958b038695ff2636deef6e354e6455f614113
