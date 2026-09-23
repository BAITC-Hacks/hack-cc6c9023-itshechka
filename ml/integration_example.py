"""Example backend adapter, not an HTTP server.

Caller supplies already validated local paths. Put execution in a background job.
Does not copy credentials, send files, start web services, or install dependencies.
"""
import json
import subprocess
from pathlib import Path

KIT = Path(__file__).resolve().parent


def process_meeting(audio_python, audio_file, job_directory, meeting_date=None, device='cpu'):
    audio_file = Path(audio_file).resolve(strict=True)
    job_directory = Path(job_directory).resolve()
    if job_directory.exists() and any(job_directory.iterdir()):
        raise ValueError('Use a new empty job directory to avoid mixing meetings')
    if device not in ('cpu', 'cuda'):
        raise ValueError('device must be cpu or cuda')
    command = [str(audio_python), str(KIT/'ml.py'), 'run', '--audio', str(audio_file),
               '--out', str(job_directory), '--device', device]
    if meeting_date:
        command += ['--meeting-date', meeting_date]
    # stdout/stderr contain local inference diagnostics. Do not forward them to a cloud log service.
    subprocess.run(command, cwd=KIT, check=True)
    return json.loads((job_directory/'result.json').read_text(encoding='utf-8'))


# Backend usage:
# result = process_meeting(
#     audio_python=KIT/'.venv-audio/Scripts/python.exe',  # Linux: .venv-audio/bin/python
#     audio_file=validated_upload_path,
#     job_directory=unique_job_path,
#     meeting_date=confirmed_meeting_date_or_none,
# )
