# start-tts.ps1 — create venv, install, run ODIA TTS on port 5500
$ErrorActionPreference = 'Stop'
Set-Location ""
if(-not (Test-Path .venv)){ py -3 -m venv .venv }
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip >$null
pip install -r requirements.txt
$env:ODIA_TTS_HOST = '127.0.0.1'
$env:ODIA_TTS_PORT = '5500'
$env:ODIA_TTS_VOICE = 'en-NG-EzinneNeural'
python server.py
