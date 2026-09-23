"""Grounded meeting analysis using OpenAI Structured Outputs."""

import json
from datetime import datetime

import httpx


def _object(properties: dict) -> dict:
    return {"type": "object", "properties": properties, "required": list(properties), "additionalProperties": False}


ANALYSIS_SCHEMA = _object({
    "summary": {"type": "string"},
    "topics": {"type": "array", "items": _object({
        "title": {"type": "string"},
        "startUtteranceOrder": {"type": "integer"},
        "endUtteranceOrder": {"type": "integer"},
        "summary": {"type": "string"},
    })},
    "tasks": {"type": "array", "items": _object({
        "description": {"type": "string"},
        "responsibleSpeakerTag": {"type": ["string", "null"]},
        "responsibleRaw": {"type": ["string", "null"]},
        "dueRaw": {"type": ["string", "null"]},
        "dueDateIso": {"type": ["string", "null"]},
        "sourceUtteranceOrder": {"type": "integer"},
        "topicIndex": {"type": ["integer", "null"]},
    })},
})


INSTRUCTIONS = """Ты составляешь протокол совещания по транскрипту с русской и казахской речью.
Опирайся только на предоставленные реплики. Не придумывай имена, должности, решения, сроки и поручения.
Поручение добавляй лишь при явном действии/обязательстве; укажи номер реплики-источника.
responsibleSpeakerTag заполняй только если из реплики ясно, кому поручено действие; иначе null.
dueDateIso заполняй только при однозначной полной календарной дате, иначе null и сохраняй фразу в dueRaw.
У тем указывай действительные номера первой и последней реплики. topicIndex — индекс темы в ответе, либо null.
Если поручений нет, верни пустой массив tasks. Сохраняй казахские имена и термины без перевода.
Если в транскрипте слово записано приблизительно, не восстанавливай его по догадке и не делай из него факт.
Общее summary и summaries тем пересказывают только явно произнесённые сведения. Не добавляй века, годы, исторические периоды, числа или выводы, которых нет в репликах. Если тема понятна лишь частично, опиши только ясную часть."""


def language_instruction(lang_hint: str) -> str:
    if lang_hint == "ru":
        return "Пиши заголовки тем, саммари и описания поручений на русском языке."
    return "Пиши заголовки тем, саммари и описания поручений на казахском языке. Сохраняй исходные цитаты и имена без перевода."


def _extract_output(payload: dict) -> dict:
    if payload.get("status") != "completed":
        raise RuntimeError(f"OpenAI response status: {payload.get('status')}")
    for item in payload.get("output", []):
        if item.get("type") == "message":
            for content in item.get("content", []):
                if content.get("type") == "output_text":
                    return json.loads(content["text"])
                if content.get("type") == "refusal":
                    raise RuntimeError("OpenAI refused meeting analysis")
    raise RuntimeError("OpenAI returned no structured output")


async def _analyze_block(client: httpx.AsyncClient, utterances: list[dict], settings, lang_hint: str) -> dict:
    transcript = "\n".join(
        f"[{u['order']}] {u['speakerTag']} ({u['startMs']/1000:.1f}-{u['endMs']/1000:.1f}s): {u['text']}"
        for u in utterances
    )
    response = await client.post(
        f"{settings.openai_base_url.rstrip('/')}/responses",
        headers={"Authorization": f"Bearer {settings.openai_api_key}"},
        json={
            "model": settings.openai_model,
            "instructions": INSTRUCTIONS + "\n" + language_instruction(lang_hint),
            "input": transcript,
            "store": False,
            "text": {"format": {"type": "json_schema", "name": "meeting_analysis", "strict": True, "schema": ANALYSIS_SCHEMA}},
        },
        timeout=180,
    )
    response.raise_for_status()
    return _extract_output(response.json())


def _blocks(utterances: list[dict], max_chars: int = 18000) -> list[list[dict]]:
    blocks: list[list[dict]] = []
    current: list[dict] = []
    length = 0
    for utterance in utterances:
        size = len(utterance["text"]) + 80
        if current and length + size > max_chars:
            blocks.append(current)
            current, length = [], 0
        current.append(utterance)
        length += size
    if current:
        blocks.append(current)
    return blocks


def _valid_iso(value: str | None) -> str | None:
    if not value:
        return None
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return value
    except ValueError:
        return None


async def analyze(utterances: list[dict], speakers: list[dict], settings, lang_hint: str = "mixed") -> tuple[list[dict], list[dict], list[dict]]:
    if not utterances:
        return [], [], [{"topicOrder": None, "text": "Сөйлеу анықталмады." if lang_hint == "kz" else "Речь не обнаружена."}]

    valid_speakers = {s["speakerTag"] for s in speakers}
    speaker_names = {s["speakerTag"]: (s.get("fullNameGuess") or "").strip().casefold() for s in speakers}
    topics: list[dict] = []
    tasks: list[dict] = []
    summaries: list[dict] = []
    block_summaries: list[str] = []
    async with httpx.AsyncClient() as client:
        for block in _blocks(utterances):
            result = await _analyze_block(client, block, settings, lang_hint)
            valid_orders = {u["order"] for u in block}
            local_to_global: dict[int, int] = {}
            for index, topic in enumerate(result.get("topics", [])):
                start, end = topic.get("startUtteranceOrder"), topic.get("endUtteranceOrder")
                if start not in valid_orders or end not in valid_orders or start > end:
                    continue
                order = len(topics)
                title = str(topic.get("title", "")).strip() or ("Талқылау" if lang_hint == "kz" else "Обсуждение")
                topics.append({"title": title, "order": order, "startUtteranceOrder": start, "endUtteranceOrder": end})
                local_to_global[index] = order
                if topic.get("summary"):
                    summaries.append({"topicOrder": order, "text": str(topic["summary"])})
            if not local_to_global:
                order = len(topics)
                topics.append({"title": "Талқылау" if lang_hint == "kz" else "Обсуждение", "order": order, "startUtteranceOrder": block[0]["order"], "endUtteranceOrder": block[-1]["order"]})
            for task in result.get("tasks", []):
                source = task.get("sourceUtteranceOrder")
                description = str(task.get("description", "")).strip()
                if source not in valid_orders or not description:
                    continue
                speaker = task.get("responsibleSpeakerTag")
                responsible_raw = (task.get("responsibleRaw") or "").strip()
                if responsible_raw and responsible_raw.casefold() != speaker_names.get(speaker, ""):
                    speaker = None
                tasks.append({
                    "description": description,
                    "responsibleSpeakerTag": speaker if speaker in valid_speakers else None,
                    "responsibleRaw": responsible_raw or None,
                    "dueRaw": task.get("dueRaw"),
                    "dueDateIso": _valid_iso(task.get("dueDateIso")),
                    "sourceUtteranceOrder": source,
                    "topicOrder": local_to_global.get(task.get("topicIndex")),
                })
            if result.get("summary"):
                block_summaries.append(str(result["summary"]).strip())

    summaries.append({"topicOrder": None, "text": "\n".join(s for s in block_summaries if s)})
    return topics, tasks, summaries
