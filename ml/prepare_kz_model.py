"""Download and convert a public Kazakh Whisper checkpoint for faster-whisper."""

import json
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MODEL = "shyngys879/kazakh-whisper-large-v3-turbo"
SOURCE = ROOT / "models" / "kazakh-whisper-source"
TARGET = ROOT / "models" / "kazakh-whisper-large-v3-turbo-ct2"
FILES = (
    "config.json",
    "generation_config.json",
    "model.safetensors",
    "preprocessor_config.json",
    "tokenizer.json",
    "tokenizer_config.json",
)


def main():
    os.environ.setdefault("HF_HOME", str(ROOT / "models" / "hf"))
    os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
    from huggingface_hub import hf_hub_download

    SOURCE.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        cached = Path(hf_hub_download(MODEL, name))
        target = SOURCE / name
        if name == "model.safetensors":
            if not target.exists():
                target.symlink_to(cached)
        elif name == "tokenizer_config.json":
            config = json.loads(cached.read_text())
            # The checkpoint stores this as a list, but current Transformers
            # expects a mapping. Whisper's tokens are already in tokenizer.json.
            config.pop("extra_special_tokens", None)
            target.write_text(json.dumps(config, ensure_ascii=False))
        else:
            target.write_bytes(cached.read_bytes())

    subprocess.run(
        [str(Path(sys.executable).with_name("ct2-transformers-converter")),
         "--model", str(SOURCE), "--output_dir", str(TARGET),
         "--quantization", "int8", "--copy_files", "tokenizer.json", "preprocessor_config.json"],
        check=True,
    )
    print(f"Kazakh model ready: {TARGET}")


if __name__ == "__main__":
    main()
