import unittest
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

import analysis
import worker


class AnalysisTests(unittest.IsolatedAsyncioTestCase):
    def test_kazakh_language_instruction(self):
        self.assertIn("казахском", analysis.language_instruction("kz"))
        self.assertIn("русском", analysis.language_instruction("ru"))

    async def test_tasks_must_point_to_real_utterances_and_speakers(self):
        utterances = [
            {"order": 0, "speakerTag": "SPEAKER_00", "text": "Подготовьте отчёт.", "startMs": 0, "endMs": 1000},
            {"order": 1, "speakerTag": "SPEAKER_01", "text": "Хорошо.", "startMs": 1000, "endMs": 2000},
        ]
        answer = {
            "summary": "Поручено подготовить отчёт.",
            "topics": [{"title": "Отчёт", "startUtteranceOrder": 0, "endUtteranceOrder": 1, "summary": "Подготовка отчёта."}],
            "tasks": [
                {"description": "Подготовить отчёт", "sourceUtteranceOrder": 0, "responsibleSpeakerTag": "SPEAKER_00", "responsibleRaw": "Иван", "dueRaw": None, "dueDateIso": None, "topicIndex": 0},
                {"description": "Выдуманное поручение", "sourceUtteranceOrder": 99, "responsibleSpeakerTag": None, "responsibleRaw": None, "dueRaw": None, "dueDateIso": None, "topicIndex": 0},
            ],
        }
        with patch.object(analysis, "_analyze_block", new=AsyncMock(return_value=answer)):
            topics, tasks, summaries = await analysis.analyze(utterances, [{"speakerTag": "SPEAKER_00"}, {"speakerTag": "SPEAKER_01"}], SimpleNamespace())
        self.assertEqual(len(topics), 1)
        self.assertEqual(len(tasks), 1)
        self.assertIsNone(tasks[0]["responsibleSpeakerTag"])
        self.assertEqual(tasks[0]["responsibleRaw"], "Иван")
        self.assertEqual(tasks[0]["sourceUtteranceOrder"], 0)
        self.assertEqual(summaries[-1]["topicOrder"], None)


class WorkerRequestTests(unittest.TestCase):
    def setUp(self):
        self.settings_patch = patch.object(worker, "settings", replace(worker.settings, worker_token="test-secret", openai_api_key="test-key"))
        self.settings_patch.start()
        self.addCleanup(self.settings_patch.stop)
        self.client = TestClient(worker.app)
        self.request = {
            "meetingId": "meeting-1",
            "audioUrl": "http://localhost:4000/api/v1/meetings/meeting-1/audio",
            "callbackUrl": "http://localhost:4000/api/v1/internal/meetings/meeting-1/result",
            "langHint": "mixed",
        }

    def test_requires_worker_secret(self):
        response = self.client.post("/process", json=self.request)
        self.assertEqual(response.status_code, 401)

    def test_accepts_backend_request(self):
        with patch.object(worker, "_run_job", new=AsyncMock()) as job:
            response = self.client.post("/process", json=self.request, headers={"X-AI-Worker-Token": "test-secret"})
        self.assertEqual(response.status_code, 202)
        job.assert_awaited_once()

    def test_rejects_external_audio_url(self):
        request = {**self.request, "audioUrl": "https://example.com/audio.mp3"}
        response = self.client.post("/process", json=request, headers={"X-AI-Worker-Token": "test-secret"})
        self.assertEqual(response.status_code, 400)
