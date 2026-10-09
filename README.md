# NatureQuest 🌿

NatureQuest turns a little free time into a small, screen-light outdoor adventure. The app uses an open-weight Gemma model through Ollama when available, and a built-in fallback so the interface still works during setup.

## Requirements
- Windows 10/11
- Python 3.10+
- Ollama for local AI generation (optional for the first UI test)

## 1. Install Ollama
Install from https://ollama.com/download/windows

Then open PowerShell or the VS Code terminal and run:

```powershell
ollama run gemma3:4b
```

The first run downloads the model (a few GB). Once it opens a chat, type a simple prompt and check that it responds. Type `/bye` to leave the model chat. Ollama usually continues running in the background.

## 2. Run NatureQuest
Open this folder in VS Code, then in the terminal:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --reload
```

If PowerShell blocks activation, use the VS Code terminal with Command Prompt, or run `.venv\Scripts\python.exe -m pip install -r requirements.txt` and `.venv\Scripts\python.exe -m uvicorn main:app --reload`.

Open http://127.0.0.1:8000 in your browser.

## 3. What to test
- Generate a quest with different time, setting, interests, and energy.
- Mark missions complete.
- Refresh the page and check that the history is still saved.
- Stop Ollama and generate another quest: the app should use its fallback.

## Project structure
- `main.py` — FastAPI API and Ollama connection
- `static/index.html` — page structure
- `static/style.css` — visual design
- `static/app.js` — form handling, mission cards, local history

## Honest project note
The fallback quest is rule-based; AI-generated quests come from the local Gemma model when Ollama is running. Do not claim the project works fully offline until you have tested it after downloading the model and disconnecting from the internet.

## Before sharing or submitting
Add your own improvements, screenshots, a demo, and a GitHub repository. Explain which parts you built and tested yourself.
