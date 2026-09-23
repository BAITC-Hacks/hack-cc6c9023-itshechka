import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from speech import transcribe


class SpeechRoutingTests(unittest.TestCase):
    def test_kazakh_uses_separate_model_and_cyrillic_language_hint(self):
        settings = SimpleNamespace(
            whisper_model="large-v3-turbo",
            whisper_kz_model="ml/models/kazakh-whisper-large-v3-turbo-ct2",
            whisper_device="cpu",
            stt_initial_prompt="",
        )
        options = {}
        def transcribe_audio(*args, **kwargs):
            options.update(kwargs)
            return [], None

        fake_model = SimpleNamespace(transcribe=transcribe_audio)
        with patch("speech._whisper", return_value=fake_model) as load_model:
            transcribe(Path("test.wav"), settings, "kz")
        self.assertTrue(load_model.call_args.args[0].endswith("/ml/models/kazakh-whisper-large-v3-turbo-ct2"))
        self.assertEqual(load_model.call_args.args[1], "cpu")
        self.assertEqual(options["language"], "kk")


if __name__ == "__main__":
    unittest.main()
