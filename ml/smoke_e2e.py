"""Create one local test meeting and verify the complete AI pipeline."""

import argparse
import os
import time
from pathlib import Path

import httpx


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("audio", type=Path)
    parser.add_argument("--language", choices=["ru", "kz", "mixed"], default="mixed")
    parser.add_argument("--title", default="AI smoke")
    args = parser.parse_args()
    if not args.audio.is_file():
        parser.error("audio file does not exist")

    base = "http://127.0.0.1:4000/api/v1"
    email = os.getenv("SMOKE_EMAIL", "jury@hattama.kz")
    password = os.getenv("SMOKE_PASSWORD", "Jury2026!")
    with httpx.Client(timeout=60, trust_env=False) as client:
        client.post(f"{base}/auth/login", json={"email": email, "password": password}).raise_for_status()
        meeting_response = client.post(f"{base}/meetings", json={"title": args.title, "sourceType": "FILE"})
        meeting_response.raise_for_status()
        meeting_id = meeting_response.json()["id"]
        print("meeting", meeting_id)
        with args.audio.open("rb") as file:
            client.post(f"{base}/meetings/{meeting_id}/audio-file", files={"file": (args.audio.name, file)}).raise_for_status()
        accepted = client.post(f"{base}/meetings/{meeting_id}/process", json={"langHint": args.language})
        accepted.raise_for_status()
        print("process", accepted.json())

        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            response = client.get(f"{base}/meetings/{meeting_id}")
            response.raise_for_status()
            status = response.json()["status"]
            if status in ("READY", "FAILED"):
                break
            time.sleep(2)
        print("status", status)
        if status != "READY":
            raise SystemExit("Meeting did not reach READY")
        transcript = client.get(f"{base}/meetings/{meeting_id}/transcript").json()
        tasks = client.get(f"{base}/meetings/{meeting_id}/tasks").json()["data"]
        summaries = client.get(f"{base}/meetings/{meeting_id}/summary").json()
        print("transcript:")
        for utterance in transcript["utterances"]:
            print(f"  {utterance['startMs']/1000:.1f}s: {utterance['text']}")
        print("tasks:", [{"description": task["description"], "responsible": task["responsibleRaw"], "due": task["dueRaw"]} for task in tasks])
        print("summary:", [item["text"] for item in summaries])


if __name__ == "__main__":
    main()
