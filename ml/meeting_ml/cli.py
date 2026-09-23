import argparse
import importlib.util
import subprocess
import sys
from pathlib import Path
from .common import ROOT


def main():
    parser = argparse.ArgumentParser(description='HackAlem: local meeting ML kit')
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('prepare-data'); p.add_argument('--source', default='..')
    p = sub.add_parser('generate-data'); p.add_argument('--seed', type=int, default=42)
    sub.add_parser('train')
    p = sub.add_parser('rank'); p.add_argument('--transcript', required=True); p.add_argument('--out', required=True)
    p = sub.add_parser('download-models'); p.add_argument('--asr', choices=['small', 'large-v3', 'large-v3-turbo'], default='large-v3'); p.add_argument('--diarization', action='store_true')
    for command in ('transcribe', 'diarize'):
        p = sub.add_parser(command); p.add_argument('--audio', required=True); p.add_argument('--out', required=True)
        p.add_argument('--model-path', default=str(ROOT / ('models/asr/large-v3' if command == 'transcribe' else 'models/diarization/community-1')))
        p.add_argument('--device', choices=['cpu', 'cuda'], default='cpu')
        if command == 'transcribe': p.add_argument('--language', choices=['ru', 'kk'], default=None)
        else: p.add_argument('--speakers', type=int)
    p = sub.add_parser('align'); p.add_argument('--transcript', required=True); p.add_argument('--turns', required=True); p.add_argument('--out', required=True); p.add_argument('--names')
    p = sub.add_parser('extract'); p.add_argument('--transcript', required=True); p.add_argument('--out', required=True); p.add_argument('--meeting-date')
    p = sub.add_parser('export'); p.add_argument('--result', required=True); p.add_argument('--out', required=True)
    p = sub.add_parser('to-backend'); p.add_argument('--result', required=True); p.add_argument('--meeting-id', required=True); p.add_argument('--out', required=True)
    for command in ('evaluate', 'wer'):
        p = sub.add_parser(command); p.add_argument('--reference', required=True); p.add_argument('--prediction', required=True); p.add_argument('--out', required=True)
        if command == 'evaluate': p.add_argument('--matches')
    p = sub.add_parser('package'); p.add_argument('--out', default=str(ROOT.parent / 'hackalem_ml_share.zip')); p.add_argument('--include-private', action='store_true'); p.add_argument('--include-models', action='store_true')
    p = sub.add_parser('verify-zip'); p.add_argument('path')
    sub.add_parser('doctor')
    p = sub.add_parser('run'); p.add_argument('--audio', required=True); p.add_argument('--out', required=True)
    p.add_argument('--asr-path', default=str(ROOT / 'models/asr/large-v3'))
    p.add_argument('--diarization-path', default=str(ROOT / 'models/diarization/community-1'))
    p.add_argument('--device', choices=['cpu', 'cuda'], default='cpu'); p.add_argument('--language', choices=['ru', 'kk'])
    p.add_argument('--speakers', type=int); p.add_argument('--names'); p.add_argument('--meeting-date')
    args = parser.parse_args()
    try:
        if args.command == 'prepare-data':
            from .prepare import prepare
            prepare(args.source)
        elif args.command == 'generate-data':
            from .synthetic import generate
            generate(args.seed)
        elif args.command == 'train':
            from .classifier import train
            train()
        elif args.command == 'rank':
            from .classifier import rank
            rank(args.transcript, args.out)
        elif args.command == 'download-models':
            from .audio import download
            download(args.asr, args.diarization)
        elif args.command == 'transcribe':
            from .audio import transcribe
            transcribe(args.audio, args.out, args.model_path, args.device, args.language)
        elif args.command == 'diarize':
            from .audio import diarize
            diarize(args.audio, args.out, args.model_path, args.speakers, args.device)
        elif args.command == 'align':
            from .audio import align
            align(args.transcript, args.turns, args.out, args.names)
        elif args.command == 'extract':
            from .extract import extract
            extract(args.transcript, args.out, meeting_date=args.meeting_date)
        elif args.command == 'export':
            from .export import export_protocol
            export_protocol(args.result, args.out)
        elif args.command == 'to-backend':
            from .backend_adapter import convert
            convert(args.result, args.meeting_id, args.out)
        elif args.command in ('evaluate', 'wer'):
            from .evaluate import evaluate, wer
            if args.command == 'evaluate': evaluate(args.reference, args.prediction, args.out, args.matches)
            else: wer(args.reference, args.prediction, args.out)
        elif args.command == 'package':
            from .bundle import package
            package(args.out, args.include_private, args.include_models)
        elif args.command == 'verify-zip':
            from .bundle import verify_archive
            verify_archive(args.path)
        elif args.command == 'doctor':
            print('Python:', sys.version)
            for module in ('sklearn', 'faster_whisper', 'pyannote', 'torch'):
                print(module, bool(importlib.util.find_spec(module)))
            for path in ('models/action_detector.json', 'models/asr/large-v3', 'models/diarization/community-1'):
                print(path, (ROOT / path).exists())
            print('Full inference requires locally installed Ollama + qwen3:4b-instruct.')
        elif args.command == 'run':
            run_pipeline(args)
    except (ValueError, FileNotFoundError, ImportError) as e:
        parser.exit(2, f'Error: {e}\n')


def run_pipeline(args):
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    def step(*parts):
        subprocess.run([sys.executable, str(ROOT / 'ml.py'), *map(str, parts)], check=True)
    extra = ['--language', args.language] if args.language else []
    step('transcribe', '--audio', args.audio, '--model-path', args.asr_path, '--device', args.device, '--out', out/'asr.json', *extra)
    # New process per stage releases GPU memory before the next model loads.
    extra = ['--speakers', args.speakers] if args.speakers else []
    step('diarize', '--audio', args.audio, '--model-path', args.diarization_path, '--device', args.device, '--out', out/'diarization.json', *extra)
    extra = ['--names', args.names] if args.names else []
    step('align', '--transcript', out/'asr.json', '--turns', out/'diarization.json', '--out', out/'transcript.json', *extra)
    extra = ['--meeting-date', args.meeting_date] if args.meeting_date else []
    step('extract', '--transcript', out/'transcript.json', '--out', out/'result.json', *extra)
    step('export', '--result', out/'result.json', '--out', out)
