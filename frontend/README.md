# Хаттама

Frontend прототипа локального ИИ-секретаря для автоматического протоколирования совещаний, распознавания русской, казахской и смешанной речи, выделения поручений и контроля сроков.

## Что реализовано

- обзор с метриками, последними протоколами и ближайшими сроками;
- архив совещаний с поиском;
- загрузка аудио/видео, выбор языка и экран этапов обработки;
- карточка протокола: AI-саммари, поручения, диаризованный транскрипт;
- общий реестр поручений со статусами и быстрым завершением;
- экспорт настоящего `.docx` в браузере и печать/сохранение в PDF;
- адаптивная навигация для desktop, tablet и mobile;
- loading, empty и error states;
- mock-слой за тем же feature API, который будет использовать реальный backend.

## Стек

Next.js App Router, TypeScript strict, Tailwind CSS, TanStack Query, React Hook Form, Zod, Lucide, Sonner и пакет `docx`. Общие схемы API находятся в `packages/contracts`.

## Запуск

Команды выполняются из глобальной папки `frontend`. Требования: Node.js 22+ и Corepack. Рекомендуемая версия Node.js для команды — 24 LTS.

```bash
cd frontend
corepack pnpm install
cp apps/web/.env.example apps/web/.env.local
corepack pnpm dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Проверки

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

## Подключение backend

По умолчанию интерфейс работает на демонстрационных данных. Когда REST API готов:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_USE_MOCKS=false
```

Ожидаемые endpoints первого вертикального среза:

- `GET /meetings`
- `GET /meetings/:id`
- `POST /meetings`

Запросы страниц идут через `features/meetings/hooks.ts` → `features/meetings/api.ts` → единый `lib/api.ts`. Контракты описаны Zod-схемами в `packages/contracts`.

## Демонстрационный сценарий

1. На обзоре нажать «Создать протокол».
2. Добавить аудио или видео и выбрать «Смешанный» язык.
3. Запустить обработку и дождаться перехода в протокол.
4. Проверить саммари, поручения и переключиться на транскрипт.
5. Скачать DOCX через кнопку «Экспорт».
6. Открыть «Поручения» и отметить одну задачу выполненной.

Архитектурные допущения зафиксированы в [DECISIONS.md](./DECISIONS.md).
