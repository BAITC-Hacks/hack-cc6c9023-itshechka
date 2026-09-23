#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
python3 ml.py rank --transcript data/demo/transcript.json --out outputs/demo_candidates.json
python3 -m unittest discover -s tests -v
echo 'Text demo complete. Read README.md for training and full audio inference.'
