"""Internal AI worker: audio URL -> local STT -> GPT analysis -> backend callback."""

import asyncio
import hmac
import logging
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from pydantic import BaseModel
from typing import Literal

from analysis import analyze
from speech import diarize, prepare_audio, transcribe


load_dotenv(Path(__file__).with_name(".env"))
os.environ.setdefault("HF_HOME", str(Path(__file__).with_name("models") / "hf"))
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hattama.ml")


@dataclass(frozen=True)
class Settings:
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    worker_token: str = os.getenv("AI_WORKER_TOKEN", "")
    api_base_url: str = os.getenv("API_BASE_URL", "http://localhost:4000/api/v1")
    whisper_model: str = os.getenv("WHISPER_MODEL", "large-v3-turbo")
    whisper_kz_model: str = os.getenv("WHISPER_KZ_MODEL", "")
    whisper_device: str = os.getenv("WHISPER_DEVICE", "auto")
    stt_initial_prompt: str = os.getenv("STT_INITIAL_PROMPT", "")
    hf_token: str = os.getenv("HF_TOKEN", "")


settings = Settings()
app = FastAPI(title="HATTAMA AI worker")
job_lock = asyncio.Lock()


class ProcessRequest(BaseModel):
    meetingId: str
    audioUrl: str
    langHint: Literal["ru", "kz", "mixed"] = "mixed"
    callbackUrl: str


def _api_url(url: str) -> bool:
    expected = urlparse(settings.api_base_url.rstrip("/"))
    actual = urlparse(url)
    return actual.scheme == expected.scheme and actual.netloc == expected.netloc and actual.path.startswith(expected.path + "/")


@app.get("/health")
def health():
    return {"ok": True, "openaiConfigured": bool(settings.openai_api_key), "diarizationConfigured": bool(settings.hf_token)}


@app.post("/process", status_code=202)
async def process(request: ProcessRequest, background_tasks: BackgroundTasks, x_ai_worker_token: str | None = Header(None)):
    if not settings.worker_token or not hmac.compare_digest(x_ai_worker_token or "", settings.worker_token):
        raise HTTPException(status_code=401, detail="Invalid AI worker token")
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured")
    expected_callback = f"{settings.api_base_url.rstrip('/')}/internal/meetings/{request.meetingId}/result"
    expected_audio = f"{settings.api_base_url.rstrip('/')}/meetings/{request.meetingId}/audio"
    if request.callbackUrl != expected_callback or request.audioUrl != expected_audio or not _api_url(request.audioUrl):
        raise HTTPException(status_code=400, detail="Unexpected audio or callback URL")
    background_tasks.add_task(_run_job, request)
    return {"accepted": True}


async def _download(client: httpx.AsyncClient, url: str, path: Path) -> None:
    async with client.stream("GET", url, headers={"X-AI-Worker-Token": settings.worker_token}, timeout=120) as response:
        response.raise_for_status()
        with path.open("wb") as output:
            async for chunk in response.aiter_bytes():
                output.write(chunk)


async def _post_callback(client: httpx.AsyncClient, url: str, payload: dict) -> None:
    for attempt in range(3):
        try:
            response = await client.post(url, json=payload, headers={"X-AI-Worker-Token": settings.worker_token}, timeout=30)
            response.raise_for_status()
            return
        except (httpx.HTTPError, TimeoutError):
            if attempt == 2:
                raise
            await asyncio.sleep(2 ** attempt)


async def _run_job(request: ProcessRequest) -> None:
    async with job_lock:
        async with httpx.AsyncClient() as client:
            try:
                with tempfile.TemporaryDirectory(prefix="hattama-") as temp_dir:
                    source = Path(temp_dir) / "source"
                    wav = Path(temp_dir) / "audio.wav"
                    await _download(client, request.audioUrl, source)
                    duration_sec = await asyncio.to_thread(prepare_audio, source, wav)
                    utterances = await asyncio.to_thread(transcribe, wav, settings, request.langHint)
                    speakers, utterances = await asyncio.to_thread(diarize, wav, utterances, settings)
                    topics, tasks, summaries = await analyze(utterances, speakers, settings, request.langHint)
                    result = {
                        "meetingId": request.meetingId,
                        "durationSec": duration_sec,
                        "speakers": speakers,
                        "utterances": utterances,
                        "topics": topics,
                        "tasks": tasks,
                        "summaries": summaries,
                    }
                    await _post_callback(client, request.callbackUrl, result)
                    logger.info("Meeting %s processed: %s utterances, %s tasks", request.meetingId, len(utterances), len(tasks))
            except Exception as exc:
                logger.exception("Meeting %s processing failed", request.meetingId)
                failed_url = request.callbackUrl.removesuffix("/result") + "/failed"
                try:
                    await _post_callback(client, failed_url, {"message": str(exc)[:500]})
                except Exception:
                    logger.exception("Could not report failure for meeting %s", request.meetingId)
