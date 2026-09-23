# ML worker

`POST /process` принимает внутренний контракт `AiProcessRequest`: скачивает запись из API, приводит её к mono 16 kHz, распознаёт локальным faster-whisper, при наличии `HF_TOKEN` размечает спикеров pyannote и передаёт только транскрипт в OpenAI для тем, саммари и поручений. Результат отправляется в callback backend. При ошибке worker вызывает `/failed`, встреча получает статус `FAILED`.

## Локальный запуск

```bash
python3 -m venv ml/.venv
ml/.venv/bin/pip install -r ml/requirements.txt
cp ml/.env.example ml/.env
# Укажите OPENAI_API_KEY, AI_WORKER_TOKEN и API_BASE_URL в ml/.env.
# Тот же AI_WORKER_TOKEN укажите в apps/api/.env.
cd ml
.venv/bin/uvicorn worker:app --host 127.0.0.1 --port 5000
```

Backend должен иметь `AI_WORKER_URL=http://127.0.0.1:5000`, `PUBLIC_API_URL=http://localhost:4000/api/v1`, `AI_DEMO_FALLBACK=false`. Для первого прогона на CPU можно выбрать `WHISPER_MODEL=small`; после проверки качества — `large-v3-turbo`. Веса загружаются при первом запросе в `ml/models/hf` (игнорируется Git). `ffmpeg` должен быть доступен в PATH.

Для преимущественно казахской записи выберите язык `Қазақша`: тогда Whisper получает `language=kk`. При установленном `WHISPER_KZ_MODEL` этот режим использует отдельную модель. Смешанный режим определяет язык по 10-секундным окнам и объединяет соседние окна одного языка; казахские фрагменты тоже проходят через специализированную модель. На CPU это медленнее. Речь распознаётся локально и даёт кириллический транскрипт, затем GPT API составляет итог на казахском. Неразборчивые слова могут быть записаны приблизительно: анализу запрещено превращать догадку в подтверждённый факт.

Пилотный скрипт `train_asr.py` предназначен для дообучения на GPU и сравнивает WER/CER до и после на отложенной выборке FLEURS `kk_kz`. Для быстрой локальной проверки на CPU можно использовать [готовую казахскую Whisper-модель](https://huggingface.co/shyngys879/kazakh-whisper-large-v3-turbo) и предварительно конвертировать её в CTranslate2:

```bash
ml/.venv/bin/pip install -r ml/requirements-train.txt
ml/.venv/bin/python ml/prepare_kz_model.py
# Добавьте в ml/.env:
# WHISPER_KZ_MODEL=ml/models/kazakh-whisper-large-v3-turbo-ct2
```

Для нескольких спикеров установите `ml/requirements-diarization.txt`, примите условия доступа к `pyannote/segmentation-3.0` и `pyannote/speaker-diarization-3.1` на Hugging Face и задайте `HF_TOKEN`. Без него worker помечает всю речь как `SPEAKER_00`; имена не угадываются.

В OpenAI отправляется транскрипт, без аудиофайла. Модель выбирается через `OPENAI_MODEL`; результат запрашивается в режиме Structured Outputs. При большой записи текст делится на блоки, каждое поручение сохраняет ссылку на реплику-источник. Ключ API и модели не коммитятся.

Проверка без API-запросов:

```bash
PYTHONPATH=ml ml/.venv/bin/python -m unittest discover -s ml/tests -v
```

Документация: [ISSAI KSC2](https://issai.nu.edu.kz/kz-speech-corpus/) для последующего дообучения казахского STT; [faster-whisper](https://github.com/SYSTRAN/faster-whisper); [pyannote](https://huggingface.co/pyannote/speaker-diarization-3.1); [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
