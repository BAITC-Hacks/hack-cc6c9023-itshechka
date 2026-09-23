"""Local speech recognition and optional speaker diarization."""

import functools
import subprocess
import wave
from collections import defaultdict
from pathlib import Path

import numpy as np


def prepare_audio(source: Path, target: Path) -> int:
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-ac", "1", "-ar", "16000", str(target)],
        check=True,
        capture_output=True,
    )
    with wave.open(str(target), "rb") as wav:
        duration = wav.getnframes() / wav.getframerate()
        if duration <= 0:
            raise ValueError("Audio file contains no samples")
        return max(1, round(duration))


@functools.lru_cache(maxsize=2)
def _whisper(model_name: str, device: str):
    from faster_whisper import WhisperModel

    compute_type = "float16" if device == "cuda" else "int8"
    return WhisperModel(model_name, device=device, compute_type=compute_type)


def _model_name(value: str) -> str:
    if value.startswith("ml/"):
        return str(Path(__file__).resolve().parent.parent / value)
    return value


def transcribe(audio_path: Path, settings, lang_hint: str) -> list[dict]:
    if lang_hint == "mixed":
        return _transcribe_mixed(audio_path, settings)
    language = {"ru": "ru", "kz": "kk", "mixed": None}[lang_hint]
    model_name = settings.whisper_kz_model if lang_hint == "kz" and settings.whisper_kz_model else settings.whisper_model
    model_name = _model_name(model_name)
    model = _whisper(model_name, settings.whisper_device)
    segments, _ = model.transcribe(
        str(audio_path), task="transcribe", language=language,
        vad_filter=True, multilingual=(lang_hint == "mixed"),
        initial_prompt=settings.stt_initial_prompt or None,
    )
    return [
        {
            "speakerTag": "SPEAKER_00",
            "text": segment.text.strip(),
            "startMs": round(segment.start * 1000),
            "endMs": round(segment.end * 1000),
            "order": index,
        }
        for index, segment in enumerate(s for s in segments if s.text.strip())
    ]


def _transcribe_mixed(audio_path: Path, settings) -> list[dict]:
    """Detect language per short window so an initial Russian sentence cannot hide Kazakh speech."""
    base = _whisper(_model_name(settings.whisper_model), settings.whisper_device)
    utterances = []
    options = dict(task="transcribe", vad_filter=True, condition_on_previous_text=False,
                   initial_prompt=settings.stt_initial_prompt or None)

    def decode_group(chunks: list[np.ndarray], language: str, start_frames: int, rate: int) -> None:
        samples = np.concatenate(chunks)
        model = base
        if language == "kk" and settings.whisper_kz_model:
            model = _whisper(_model_name(settings.whisper_kz_model), settings.whisper_device)
        segments, _ = model.transcribe(samples, language=language, **options)
        offset_ms = round(start_frames / rate * 1000)
        for segment in segments:
            if segment.text.strip():
                utterances.append({
                    "speakerTag": "SPEAKER_00",
                    "text": segment.text.strip(),
                    "startMs": offset_ms + round(segment.start * 1000),
                    "endMs": offset_ms + round(segment.end * 1000),
                    "order": len(utterances),
                })

    with wave.open(str(audio_path), "rb") as wav:
        if wav.getnchannels() != 1 or wav.getsampwidth() != 2:
            raise ValueError("Mixed transcription requires mono 16-bit WAV")
        rate = wav.getframerate()
        window_frames = rate * 10
        offset_frames = 0
        group_start = 0
        group_language = ""
        group_chunks: list[np.ndarray] = []
        group_frames = 0
        while True:
            raw = wav.readframes(window_frames)
            if not raw:
                break
            samples = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
            if len(samples) < rate // 2:
                break
            _, info = base.transcribe(samples, language=None, **options)
            language = info.language if info.language_probability >= 0.5 else (group_language or info.language)
            if group_chunks and (language != group_language or group_frames + len(samples) > rate * 60):
                decode_group(group_chunks, group_language, group_start, rate)
                group_chunks = []
                group_frames = 0
                group_start = offset_frames
            group_language = language
            group_chunks.append(samples)
            group_frames += len(samples)
            offset_frames += len(samples)
        if group_chunks:
            decode_group(group_chunks, group_language, group_start, rate)
    return utterances


def diarize(audio_path: Path, utterances: list[dict], settings) -> tuple[list[dict], list[dict]]:
    if not utterances:
        return [], utterances
    if not settings.hf_token:
        return [{"speakerTag": "SPEAKER_00", "fullNameGuess": None, "roleGuess": None}], utterances

    from pyannote.audio import Pipeline

    pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=settings.hf_token)
    diarization = pipeline(str(audio_path))
    turns = [(round(turn.start * 1000), round(turn.end * 1000), label)
             for turn, _, label in diarization.itertracks(yield_label=True)]
    label_to_tag: dict[str, str] = {}
    for utterance in utterances:
        overlaps = defaultdict(int)
        for start, end, label in turns:
            overlaps[label] += max(0, min(end, utterance["endMs"]) - max(start, utterance["startMs"]))
        if overlaps and max(overlaps.values()) > 0:
            label = max(overlaps, key=overlaps.get)
            if label not in label_to_tag:
                label_to_tag[label] = f"SPEAKER_{len(label_to_tag):02d}"
            utterance["speakerTag"] = label_to_tag[label]
    tags = sorted({u["speakerTag"] for u in utterances})
    return [{"speakerTag": tag, "fullNameGuess": None, "roleGuess": None} for tag in tags], utterances
