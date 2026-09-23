# HATTAMA AI

Монорепозиторий системы автоматического протоколирования совещаний с распознаванием русской, казахской и смешанной речи, выделением поручений и контролем сроков.

**HATTAMA** — латинизированное казахское слово «хаттама» (протокол). Название напрямую объясняет продукт и одинаково хорошо читается на русском, казахском и английском.

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
docker compose up -d postgres
corepack pnpm prisma:generate
corepack pnpm --filter @hackalem/api exec prisma migrate deploy
corepack pnpm prisma:seed
corepack pnpm dev
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/api/docs`
- Health: `http://localhost:4000/api/v1/health`

### Запуск целиком в Docker

```bash
docker compose up -d --build
docker compose exec api pnpm prisma:seed
docker compose ps
```

Compose запускает PostgreSQL, API и web, применяет миграции при старте API и сохраняет базу и загруженные файлы в Docker volumes. Сайт доступен на `http://localhost:3000`, API — на `http://localhost:4000/api/v1`. Повторный seed обновляет демо-аккаунты и демо-встречу. Для остановки: `docker compose down` (данные в volumes сохраняются).

### Демо на отдельном сервере

Публичный адрес текущего развёртывания: `http://46.225.138.70:3001`. На сервере проект лежит в `/opt/hackalem`; только gateway публикует порт `3001`, API, web и PostgreSQL доступны внутри отдельной Docker-сети. Порты существующих сайтов `80/443/3000` не меняются.

Для повторного запуска на сервере:

```bash
cd /opt/hackalem
docker compose -f compose.yaml -f compose.remote.yaml up -d --no-build --pull never
docker compose -f compose.yaml -f compose.remote.yaml ps
```

Перед первым запуском `deploy/setup-remote.sh` создаёт закрытый `.env` со случайными секретами. Готовые образы передаются скриптом `deploy/push-images.py`; web-образ нужно собирать с `NEXT_PUBLIC_API_URL=http://46.225.138.70:3001/api/v1`. Для HTTPS нужен отдельный домен и маршрут в nginx.

### Доступ для демонстрации

После миграции и `corepack pnpm prisma:seed` доступны два готовых аккаунта:

| Роль | Email | Пароль |
| --- | --- | --- |
| Жюри | `jury@hattama.kz` | `Jury2026!` |
| Администратор | `admin@hattama.kz` | `Admin2026!` |

На странице входа аккаунт можно выбрать одним нажатием. В production эти пароли необходимо заменить.

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


- multipart-загрузка MP3 через `POST /api/v1/meetings/:id/upload` и live-поток совещаний;
- AI-оркестратор с локальным worker-адресом и demo-fallback при его недоступности;
- загрузка записей и live-поток совещаний;
- сквозной сценарий frontend → multipart upload → backend → AI pipeline → протокол;
- локальный AI pipeline с demo-fallback;
- транскрипт, спикеры, темы, саммари и поручения;
- реестр поручений и обновление статусов;
- экспорт протокола в DOCX/PDF без внешнего конвертера;
- адаптивный frontend с RU/KZ/mixed интерфейсом;
- публичный продуктовый лендинг, регистрация и вход;
- серверные HttpOnly-сессии и защищённые API-маршруты;
- единые контракты между web и API.

Подробности frontend находятся в [apps/web/README.md](./apps/web/README.md), границы ML-компонента — в [ml/README.md](./ml/README.md).
Проверка backend и ограничения реального MP3-пути описаны в [backend smoke](./docs/backend-smoke.md).

## Локальная ML-часть

Исходники ML и воспроизводимые синтетические выборки находятся в `ml/`. Эталонные протоколы, транскрипты и два MP3 сохранены локально в `ml/data/private/`; эта папка исключена из Git. `ml/SHA256SUMS.json` содержит контрольные хеши комплекта, включая локальные приватные файлы. Обученный детектор реплик с поручениями хранится в `ml/models/action_detector.json`.

Для повторного обучения детектора используйте Python 3.11. Отдельное окружение и зафиксированные зависимости описаны в [инструкции ML](./ml/README.md#обучение-детектора-на-cpu). Из каталога `ml/`:

```powershell
python ml.py generate-data --seed 42
python ml.py train
python -m unittest discover -s tests -v
python ml.py rank --transcript data/demo/transcript.json --out outputs/demo_candidates.json
```

`train` обучает только вспомогательный классификатор на синтетическом тексте. MP3 не используются для его обучения; для запуска полного аудиопайплайна нужны отдельная аудиосреда и локальные веса моделей.

Оба исходных MP3 уже прошли локальное распознавание Whisper small и оценку текстовым детектором. Измерения и границы результата описаны в [отчёте аудиопроверки](./docs/ml-audio-smoke.md). Полные ASR JSON сохраняются локально в `ml/outputs/` и исключены из Git.
