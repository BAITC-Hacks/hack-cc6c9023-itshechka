# Хаттама

Frontend прототипа локального ИИ-секретаря для автоматического протоколирования совещаний, распознавания русской, казахской и смешанной речи, выделения поручений и контроля сроков.

## Что реализовано

- обзор с метриками, последними протоколами и ближайшими сроками;
- архив совещаний с поиском;
- загрузка аудио/видео, выбор языка и экран этапов обработки;
- карточка протокола: AI-саммари, поручения, диаризованный транскрипт;
- общий реестр поручений со статусами и быстрым завершением;
- серверный экспорт протокола в DOCX/PDF с браузерным fallback в mock-режиме;
- адаптивная навигация для desktop, tablet и mobile;
- loading, empty и error states;
- реальный NestJS API по умолчанию и переключаемый mock-слой для автономной демонстрации.

## Стек

Next.js App Router, TypeScript strict, Tailwind CSS, TanStack Query, React Hook Form, Zod, Lucide, Sonner и пакет `docx`. Общие схемы API находятся в `packages/contracts`.

## Запуск

Команды выполняются из корня монорепозитория. Требования: Node.js 22+ и Corepack. Рекомендуемая версия Node.js для команды — 24 LTS.

```bash
corepack pnpm install
cp apps/web/.env.example apps/web/.env.local
corepack pnpm dev:web
```

Откройте [http://localhost:3000](http://localhost:3000).

## Проверки

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

## Подключение backend

По умолчанию интерфейс работает с backend на `http://localhost:4000/api/v1`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_USE_MOCKS=false
```

Используемые endpoints:

- `GET /meetings`
- `GET /meetings/:id`
- `POST /meetings`
- `POST /meetings/:id/audio-file`
- `POST /meetings/:id/process`
- `GET /meetings/:id/audio`
- `GET /meetings/:id/transcript`
- `GET /meetings/:id/summary`
- `GET /meetings/:id/tasks`
- `GET /tasks`
- `PATCH /tasks/:id`
- `PATCH /participants/:id`
- `POST /meetings/:id/export`
- `GET /exports/:id/download`

Чтобы временно запустить только frontend на встроенных данных, установите `NEXT_PUBLIC_USE_MOCKS=true` и перезапустите dev-сервер.

Запросы страниц идут через `features/meetings/hooks.ts` → `features/meetings/api.ts` → единый `lib/api.ts`. Контракты описаны Zod-схемами в `packages/contracts`.

## Демонстрационный сценарий

1. На обзоре нажать «Создать протокол».
2. Добавить аудио или видео и выбрать «Смешанный» язык.
3. Запустить обработку и дождаться перехода в протокол.
4. Проверить саммари, поручения и переключиться на транскрипт.
5. Скачать DOCX через кнопку «Экспорт».
6. Открыть «Поручения» и отметить одну задачу выполненной.

Архитектурные допущения зафиксированы в [docs/frontend-decisions.md](../../docs/frontend-decisions.md).
