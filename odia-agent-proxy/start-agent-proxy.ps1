$ErrorActionPreference = 'Stop'
Set-Location ""
if(-not (Test-Path .venv)){ py -3 -m venv .venv }
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip >$null
pip install -r requirements.txt
if(Test-Path .env){ Write-Host 'Using .env for OPENAI_API_KEY' }
python server.py
