$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
python ml.py rank --transcript data/demo/transcript.json --out outputs/demo_candidates.json
if ($LASTEXITCODE -ne 0) { throw 'Demo failed' }
python -m unittest discover -s tests -v
if ($LASTEXITCODE -ne 0) { throw 'Tests failed' }
Write-Host 'Text demo complete. Read README.md for training and the full audio pipeline.'
