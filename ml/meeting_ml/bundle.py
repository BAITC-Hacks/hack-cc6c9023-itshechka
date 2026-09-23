import hashlib
import json
import zipfile
from pathlib import Path
from .common import ROOT


def package(out, include_private=False, include_models=False):
    target = Path(out).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    files = []
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file() or path.resolve() == target:
            continue
        relative = path.relative_to(ROOT)
        parts = relative.parts
        allowed_dirs = {'data', 'docs', 'meeting_ml', 'models', 'reports', 'tests'}
        allowed_files = {'ml.py', 'integration_example.py', 'README.md', 'requirements.txt',
                         'requirements-audio.txt', 'quickstart.ps1', 'quickstart.sh'}
        if (len(parts) == 1 and path.name not in allowed_files) or (len(parts) > 1 and parts[0] not in allowed_dirs):
            continue
        if any(p.startswith(('.venv', '.git', '.cache', '.runtime')) or p in ('__pycache__', 'node_modules') for p in parts):
            continue
        if path.suffix in ('.zip', '.pyc') or path.name in ('.env', 'SHA256SUMS.json'):
            continue
        if parts[0] == 'outputs':
            continue  # Inference output can contain sensitive input. Share deliberately, not by accident.
        if parts[:2] == ('data', 'private') and not include_private:
            continue
        if parts[0] == 'models' and len(parts) > 1 and parts[1] in ('asr', 'diarization', 'ollama') and not include_models:
            continue
        files.append(path)
    hashes = {}
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=True) as archive:
        for path in files:
            name = path.relative_to(ROOT).as_posix()
            data = path.read_bytes()
            hashes[name] = hashlib.sha256(data).hexdigest()
            archive.writestr('hackalem_ml/' + name, data)
        metadata = {'files': hashes, 'private_originals_included': include_private, 'model_weights_requested': include_models,
                    'note': 'Weights and Python wheels are not included by default; first full installation needs internet.'}
        archive.writestr('hackalem_ml/SHA256SUMS.json', json.dumps(metadata, ensure_ascii=False, indent=2))
    print(f'{target}: {target.stat().st_size / 1024 / 1024:.2f} MiB, {len(files)} files')


def verify_archive(path):
    with zipfile.ZipFile(path) as z:
        prefix = 'hackalem_ml/'
        manifest = json.loads(z.read(prefix + 'SHA256SUMS.json'))
        expected = {prefix + name for name in manifest['files']} | {prefix + 'SHA256SUMS.json'}
        if len(z.namelist()) != len(set(z.namelist())) or set(z.namelist()) != expected:
            raise ValueError('Unexpected or duplicate archive members')
        for name, digest in manifest['files'].items():
            if name.startswith('/') or '..' in Path(name).parts or '\\' in name:
                raise ValueError('Unsafe archive path')
            if hashlib.sha256(z.read(prefix + name)).hexdigest() != digest:
                raise ValueError(f'Checksum mismatch: {name}')
        print(f'Archive OK: {len(manifest["files"])} SHA-256 checksums')
