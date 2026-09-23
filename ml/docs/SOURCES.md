# Проверенные первичные источники

Дата проверки: 23 сентября 2026. Ссылки нужны для установки и сверки API; качество на наших аудио ими не подтверждается.

- faster-whisper: API, int8/CPU, word_timestamps, требования CUDA/cuDNN, PyAV: https://github.com/SYSTRAN/faster-whisper
- Multilingual large-v3 в CTranslate2: https://huggingface.co/Systran/faster-whisper-large-v3
- Turbo-вариант CTranslate2: https://huggingface.co/dropbox-dash/faster-whisper-large-v3-turbo
- Community-1: условия получения весов, exclusive diarization, загрузка с диска, CC-BY-4.0: https://huggingface.co/pyannote/speaker-diarization-community-1
- pyannote.audio 4.0.3 и отключение telemetry: https://pypi.org/project/pyannote-audio/4.0.3/
- faster-whisper 1.2.1: https://pypi.org/project/faster-whisper/1.2.1/
- Локальный тег Qwen3 4B Instruct (Q4_K_M, карточка указывает 2.5 GB): https://ollama.com/library/qwen3:4b-instruct
- Chat API Ollama: https://docs.ollama.com/api/chat
- Structured JSON outputs: https://docs.ollama.com/capabilities/structured-outputs
- Настройки локального сервера и отключение облака: https://github.com/ollama/ollama/blob/main/docs/faq.mdx
- Ollama Windows: https://docs.ollama.com/windows

Указанный размер GGUF не равен расходу VRAM: добавляются KV-cache, контекст и runtime. Рекомендация запускать этапы по очереди — инженерный выбор под обнаруженную GPU 6 ГБ, не результат измеренного benchmark.

Веса, исходные данные и код библиотек имеют собственные лицензии. Для распространения Community-1 сохраняйте атрибуцию и лицензию модели; `--include-models` включает скачанные файлы репозитория. Исходные MP3/DOCX предоставлены пользователем: публичная лицензия на них не установлена. Доступность файла в проекте не делает его открытым датасетом.
