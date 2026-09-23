import os
from pathlib import Path
from .common import ROOT, read_json, write_json


def offline_environment():
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
    os.environ['PYANNOTE_METRICS_ENABLED'] = '0'


def download(asr, diarization=False):
    from huggingface_hub import HfApi, snapshot_download
    import importlib.metadata
    repo = {'small': 'Systran/faster-whisper-small', 'large-v3': 'Systran/faster-whisper-large-v3',
            'large-v3-turbo': 'dropbox-dash/faster-whisper-large-v3-turbo'}[asr]
    dest = ROOT / 'models/asr' / asr
    revision = HfApi().model_info(repo).sha
    snapshot_download(repo_id=repo, revision=revision, local_dir=dest)
    downloaded = [{'repo': repo, 'revision': revision, 'path': str(dest.relative_to(ROOT))}]
    if diarization:
        token = os.environ.get('HF_TOKEN')
        if not token:
            raise ValueError('Accept Community-1 access conditions and set HF_TOKEN before --diarization.')
        repo = 'pyannote/speaker-diarization-community-1'
        dest = ROOT / 'models/diarization/community-1'
        revision = HfApi(token=token).model_info(repo).sha
        snapshot_download(repo_id=repo, revision=revision, local_dir=dest, token=token)
        downloaded.append({'repo': repo, 'revision': revision, 'path': str(dest.relative_to(ROOT))})
    manifest_path = ROOT / 'models/download_manifest.json'
    existing = read_json(manifest_path)['downloaded'] if manifest_path.exists() else []
    by_path = {item['path']: item for item in existing + downloaded}
    write_json(manifest_path, {'downloaded': list(by_path.values()),
               'huggingface_hub': importlib.metadata.version('huggingface-hub'),
               'note': 'Exact downloaded commit revisions recorded. Run package --include-models to hash all weights.'})
    print('Models downloaded; runtime uses local paths only. Download Ollama weights separately with ollama pull.')


def transcribe(audio, out, model_path, device='cpu', language=None):
    offline_environment()
    from faster_whisper import WhisperModel
    if not Path(model_path).is_dir():
        raise ValueError('ASR model not found: run download-models first')
    model = WhisperModel(str(Path(model_path).resolve()), device=device,
                         compute_type='int8_float16' if device == 'cuda' else 'int8', local_files_only=True)
    segments, info = model.transcribe(str(audio), language=language, task='transcribe', beam_size=5,
                                     vad_filter=True, word_timestamps=True, condition_on_previous_text=False)
    rows = []
    for s in segments:
        rows.append({'id': f's{len(rows)+1:04d}', 'start': s.start, 'end': s.end, 'speaker': 'UNKNOWN',
                     'speaker_name': None, 'text': s.text.strip(),
                     'words': [{'start': w.start, 'end': w.end, 'text': w.word, 'probability': w.probability}
                               for w in (s.words or [])], 'avg_logprob': s.avg_logprob,
                     'no_speech_prob': s.no_speech_prob})
        print(f'ASR {s.end:.1f}s', flush=True)
    write_json(out, {'schema_version': 1, 'meeting_id': Path(audio).stem, 'meeting_date': None,
                     'source': 'local_asr', 'language': info.language, 'language_probability': info.language_probability,
                     'duration': info.duration, 'participants': [], 'segments': rows,
                     'warnings': ['Language auto-detection is recording-level; code-switching quality must be measured.']})


def diarize(audio, out, model_path, speakers=None, device='cpu'):
    offline_environment()
    import torch
    from faster_whisper.audio import decode_audio
    from pyannote.audio import Pipeline
    if not Path(model_path).is_dir():
        raise ValueError('Diarization model missing; download gated Community-1 weights first')
    pipeline = Pipeline.from_pretrained(str(Path(model_path).resolve()))
    if pipeline is None:
        raise ValueError('Could not load the local diarization pipeline')
    pipeline.to(torch.device(device))
    # Decode via PyAV, avoiding system FFmpeg/TorchCodec file-decoder dependencies.
    samples = decode_audio(str(audio), sampling_rate=16000)
    result = pipeline({'waveform': torch.from_numpy(samples).unsqueeze(0), 'sample_rate': 16000},
                      **({'num_speakers': speakers} if speakers else {}))
    annotation = result.exclusive_speaker_diarization
    turns = [{'start': turn.start, 'end': turn.end, 'speaker': speaker}
             for turn, _, speaker in annotation.itertracks(yield_label=True)]
    write_json(out, {'method': 'pyannote_community_1_exclusive', 'turns': turns,
                     'note': 'Anonymous acoustic clusters. Name mapping requires human confirmation.'})


def speaker_for(start, end, turns):
    overlaps = {}
    for turn in turns:
        overlap = max(0, min(end, turn['end']) - max(start, turn['start']))
        overlaps[turn['speaker']] = overlaps.get(turn['speaker'], 0) + overlap
    if not overlaps or max(overlaps.values()) <= 0:
        return 'UNKNOWN', 0.0
    speaker = max(overlaps, key=overlaps.get)
    fraction = overlaps[speaker] / max(1e-9, end-start)
    return (speaker if fraction >= 0.5 else 'UNKNOWN'), min(1, fraction)


def align(transcript_path, turns_path, out, names_path=None):
    transcript = read_json(transcript_path)
    turns = read_json(turns_path)['turns']
    names = read_json(names_path) if names_path else {}
    if not isinstance(names, dict) or any(not isinstance(v, str) or not v.strip() for v in names.values()):
        raise ValueError('Speaker map must be an object: SPEAKER_00 -> confirmed name')
    unknown = set(names) - {t['speaker'] for t in turns}
    if unknown:
        raise ValueError(f'Map contains nonexistent speaker ids: {unknown}')
    rows = []
    for s in transcript['segments']:
        # Word-level alignment prevents one long ASR segment swallowing a speaker change.
        words = s.get('words') or [{'start': s['start'], 'end': s['end'], 'text': s['text']}]
        for word in words:
            speaker, overlap = speaker_for(word['start'], word['end'], turns)
            if rows and rows[-1]['source_segment_id'] == s['id'] and rows[-1]['speaker'] == speaker:
                rows[-1]['text'] += word['text']
                rows[-1]['end'] = word['end']
                rows[-1]['speaker_overlap_fraction'] = min(rows[-1]['speaker_overlap_fraction'], overlap)
            else:
                rows.append({'id': f's{len(rows)+1:04d}', 'source_segment_id': s['id'], 'start': word['start'],
                             'end': word['end'], 'speaker': speaker, 'speaker_name': names.get(speaker),
                             'text': word['text'], 'speaker_overlap_fraction': overlap})
    for row in rows:
        row['text'] = row['text'].strip()
    transcript['segments'] = rows
    transcript['participants'] = [{'speaker_id': k, 'name': v, 'name_source': 'human_confirmed_map'} for k, v in names.items()]
    transcript['diarization'] = 'pyannote_community_1_exclusive'
    write_json(out, transcript)
    print(f'Aligned {len(rows)} turns; named {len(names)} clusters')
