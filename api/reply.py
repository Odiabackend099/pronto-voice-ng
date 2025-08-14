from fastapi import FastAPI, Body

app = FastAPI(title="CrossAI Reply", version="1.0.0")

@app.post("/")
def reply(body: dict = Body(...)):
    text = (body.get("text") or "").strip()
    if not text:
        out = "How far! Voice is online and ready on Cross-AI."
    else:
        out = f"You said: {text}. We move!"
    return {"text": out}
