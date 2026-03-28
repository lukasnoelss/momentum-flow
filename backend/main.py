"""
Momentum — FastAPI backend
Receives Chrome tab data, asks Gemma (via Ollama) for a focus score
and structured insight, stores sessions in SQLite, and serves
everything to the React frontend.
"""

import json
import sqlite3
import sys
import subprocess
import datetime
import os
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# ── CONFIG ─────────────────────────────────────────────────────────
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "gemma3:1b"
DB_PATH = "momentum.db"

# ── APP ────────────────────────────────────────────────────────────
app = FastAPI(title="Momentum", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DATABASE ───────────────────────────────────────────────────────

def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db() -> None:
    conn = _get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT NOT NULL,
            tab_count   INTEGER NOT NULL,
            focus_score INTEGER,
            focus_label TEXT,
            working_on  TEXT,
            next_action TEXT,
            stuck_signal TEXT,
            memory_summary TEXT,
            raw_tabs_json TEXT,
            history_json TEXT DEFAULT '[]',
            current_question TEXT,
            current_options TEXT,
            question_count INTEGER DEFAULT 1,
            is_draft BOOLEAN DEFAULT 1,
            supporting_tasks TEXT DEFAULT '[]'
        )
    """)
    conn.commit()
    conn.close()


@app.on_event("startup")
async def startup() -> None:
    _init_db()

# ── MODELS ─────────────────────────────────────────────────────────

class Tab(BaseModel):
    title: str
    url: str
    text: Optional[str] = ""


class TabPayload(BaseModel):
    tabs: list[Tab]

class ClarifyPayload(BaseModel):
    session_id: int
    answer: str

class TaskTogglePayload(BaseModel):
    session_id: int
    task_index: int
    done: bool

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatPayload(BaseModel):
    messages: list[ChatMessage]

@app.post("/tasks/toggle")
def toggle_task(payload: TaskTogglePayload):
    conn = _get_db()
    row = conn.execute("SELECT supporting_tasks FROM sessions WHERE id = ?", (payload.session_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Session not found")
        
    tasks = json.loads(row["supporting_tasks"])
    if payload.task_index < 0 or payload.task_index >= len(tasks):
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid task index")
        
    tasks[payload.task_index]["done"] = payload.done
    conn.execute("UPDATE sessions SET supporting_tasks = ? WHERE id = ?", (json.dumps(tasks), payload.session_id))
    conn.commit()
    conn.close()
    return {"success": True}

# ── OLLAMA HELPERS ─────────────────────────────────────────────────

def _build_tab_summary(tabs: list[dict]) -> str:
    lines: list[str] = []
    for i, tab in enumerate(tabs, 1):
        snippet = (tab.get("text") or "")[:500]
        lines.append(f"Tab {i}: {tab.get('title')}\n  URL: {tab.get('url')}\n  Text: {snippet}\n")
    return "\n".join(lines)


def _call_ollama(system: str, user: str) -> str:
    """Call Ollama's OpenAI-compatible chat endpoint synchronously."""
    try:
        resp = httpx.post(
            f"{OLLAMA_BASE_URL}/v1/chat/completions",
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "stream": False,
            },
            timeout=180.0,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Ollama Error: {e}", file=sys.stderr)
        raise

def _parse_json(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        if text.endswith("```"):
            text = text[:-3].strip()
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1:
        text = text[first_brace : last_brace + 1]
    return json.loads(text)

def _generate_focus_score(tabs: list[dict]) -> dict:
    summary = _build_tab_summary(tabs)
    prompt = (
        "You are Momentum, a productivity AI. Analyse the user's open tabs and return ONLY a JSON object with:\n"
        "- focus_score: integer 0-100.\n"
        "- focus_label: 'Deep focus', 'Getting scattered', or 'Highly fragmented'.\n\n"
        "Respond with valid JSON only. Start with { and end with }."
    )
    
    try:
        raw = _call_ollama(prompt, summary)
        return _parse_json(raw)
    except:
        return {"focus_score": 50, "focus_label": "Getting scattered"}

def _generate_question(tabs: list[dict], history: list[dict], index: int) -> dict:
    summary = _build_tab_summary(tabs)
    
    # Cap massive tab payloads to keep the 1B model sharply focused on the system instructions
    if len(summary) > 4000:
        summary = summary[:4000] + "\n...[truncated]"

    hist_str = json.dumps(history, indent=2) if history else "No answers yet."
    
    prompt = (
        "You are Momentum, a snappy, observant productivity sidekick. "
        "Review the user's specific tabs and previous choices.\n\n"
        f"Goal: This is Question {index} of 3. Ask ONE extremely short question.\n\n"
        "STRICT CONSTRAINTS:\n"
        "1. NO INTRO: Do not start with 'I see', 'You have been', or any observation. Jump straight to the question.\n"
        "2. ULTRA SPECIFIC: Mention a specific word, project, or domain from the tabs IMMEDIATELY.\n"
        "3. NO REPETITION: Do not ask about things already in the history.\n"
        "4. SECOND PERSON: Use 'You/Your' only.\n"
        "5. LENGTH: Under 10 words.\n\n"
        "Example Good: 'Fixing that CSS grid or just exploring layout?'\n"
        "Example Bad: 'You have been looking at CSS tabs. Are you stuck?'\n\n"
        "6. NO PLACEHOLDERS: Never return '...', 'etc', or 'unknown' in the options. Use real words.\n\n"
        "Return ONLY a JSON object: {\"question\": \"Question text?\", \"options\": [\"Option 1\", \"Option 2\"]}"
    )
    
    try:
        raw = _call_ollama(prompt, f"HISTORY OF QUESTIONS ALREADY ASKED AND ANSWERED:\n{hist_str}\n\nUSER'S OPEN TABS:\n{summary}")
        return _parse_json(raw)
    except:
        return {
            "question": f"Nice—{len(tabs)} tabs deep! What's the main goal?",
            "options": ["Just starting", "Stuck on a bug", "Finishing up", "Taking a break"]
        }

def _generate_final_insight(tabs: list[dict], history: list[dict]) -> dict:
    summary = _build_tab_summary(tabs)
    hist_str = json.dumps(history, indent=2)
    
    prompt = (
        "You are Momentum, a warm, sidekick productivity colleague. "
        "Review the user's tabs and their choices in the history.\n\n"
        "CRITICAL: Always speak in the SECOND PERSON ('You', 'Your'). Speak directly to the user.\n\n"
        "Return ONLY a JSON object with exactly these keys:\n"
        "- working_on: a short label for the current task/project (e.g. 'debugging my API' or 'designing the login page'). DO NOT start with 'You are'.\n"
        "- next_action: one hyper-specific first step directed at the user ('Next, you should...')\n"
        "- stuck_signal: one sentence addressing the user ('You seem a bit stuck on X...') or null.\n"
        "- memory_summary: a 2-3 sentence paragraph in second person summarising their session warmly (e.g. 'You're deep into X...').\n"
        "- supporting_tasks: a JSON array of exactly 2 to 3 small related secondary tasks that suit the current project. Each must be a JSON object: {\"task\": \"Specific short task\", \"energy\": \"high\" | \"medium\" | \"low\"}\n\n"
        "Respond with valid JSON only. Start with { and end with }."
    )
    
    try:
        raw = _call_ollama(prompt, f"TABS:\n{summary}\n\nHISTORY:\n{hist_str}")
        return _parse_json(raw)
    except:
        return {
            "working_on": "Could not determine.",
            "next_action": "Try reducing open tabs.",
            "stuck_signal": None,
            "memory_summary": "The AI was unable to parse this session.",
            "supporting_tasks": []
        }


# ── ENDPOINTS ──────────────────────────────────────────────────────

@app.post("/tabs")
def receive_tabs(payload: TabPayload):
    if not payload.tabs:
        raise HTTPException(status_code=400, detail="No tabs provided.")

    tabs_dump = [t.dict() for t in payload.tabs]
    
    # Generate initial focus score & Q1
    score_data = _generate_focus_score(tabs_dump)
    q1_data = _generate_question(tabs_dump, [], 1)

    conn = _get_db()
    conn.execute(
        """
        INSERT INTO sessions (
            timestamp, tab_count, focus_score, focus_label,
            raw_tabs_json, history_json, current_question, current_options,
            question_count, is_draft
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
            len(tabs_dump),
            score_data.get("focus_score", 50),
            score_data.get("focus_label", "Getting scattered"),
            json.dumps(tabs_dump),
            "[]",
            q1_data.get("question", "What are you working on?"),
            json.dumps(q1_data.get("options", [])),
            1,
            1  # is_draft
        )
    )
    conn.commit()
    conn.close()

    return {"success": True}


@app.post("/scan")
def trigger_scan():
    """Trigger a manual scan by running tab_reader.py as a subprocess."""
    try:
        result = subprocess.run(
            [sys.executable, "tab_reader.py", "--once"],
            capture_output=True,
            text=True,
            timeout=180
        )
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Scan failed: {result.stderr}")
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/clarify")
def clarify_endpoint(payload: ClarifyPayload):
    conn = _get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (payload.session_id,)).fetchone()
    if not row or not row["is_draft"]:
        conn.close()
        raise HTTPException(400, "Invalid session or not a draft.")
        
    history = json.loads(row["history_json"])
    history.append({"question": row["current_question"], "answer": payload.answer})
    q_index = row["question_count"] + 1
    tabs = json.loads(row["raw_tabs_json"])
    
    if q_index > 3:
        # Final Step: Generate final insight based on history + tabs
        insight = _generate_final_insight(tabs, history)
        
        sup_tasks = insight.get("supporting_tasks", [])
        for t in sup_tasks:
            if "done" not in t:
                t["done"] = False

        conn.execute(
            """
            UPDATE sessions 
            SET working_on = ?, next_action = ?, stuck_signal = ?, memory_summary = ?, 
                history_json = ?, is_draft = 0, supporting_tasks = ?
            WHERE id = ?
            """,
            (
                insight.get("working_on"),
                insight.get("next_action"),
                insight.get("stuck_signal"),
                insight.get("memory_summary"),
                json.dumps(history),
                json.dumps(sup_tasks),
                payload.session_id
            )
        )
        conn.commit()
        conn.close()
        return {"status": "complete"}
    else:
        # Generate Next Question
        q_data = _generate_question(tabs, history, q_index)
        conn.execute(
            """
            UPDATE sessions 
            SET history_json = ?, current_question = ?, current_options = ?, question_count = ?
            WHERE id = ?
            """,
            (
                json.dumps(history),
                q_data.get("question", "?"),
                json.dumps(q_data.get("options", [])),
                q_index,
                payload.session_id
            )
        )
        conn.commit()
        conn.close()
        return {"status": "clarifying"}


@app.post("/chat")
def chat_endpoint(payload: ChatPayload):
    # Chat remains identical
    context_str = "No open tabs."
    try:
        resp = httpx.get("http://localhost:9222/json", timeout=2.0)
        if resp.status_code == 200:
            tabs = [
                t for t in resp.json()
                if t.get("type") == "page" and not t.get("url", "").startswith("chrome")
            ]
            if tabs:
                lines = [f"- {t.get('title', 'Unknown')} ({t.get('url', '')})" for t in tabs]
                context_str = "\n".join(lines)
    except Exception:
        pass

    conn = _get_db()
    row = conn.execute("SELECT memory_summary FROM sessions WHERE is_draft=0 ORDER BY id DESC LIMIT 1").fetchone()
    conn.close()
    memory = row["memory_summary"] if row else "No previous sessions."

    system_prompt = (
        "You are Momentum, a proactive productivity coach like Claude. "
        "Keep your answers brief, friendly, and highly actionable.\n\n"
        f"LAST SESSION MEMORY:\n{memory}\n\n"
        f"CURRENT OPEN TABS:\n{context_str}\n\n"
        "INSTRUCTIONS:\n"
        "1. Ask a sharp question to understand what they need to do next, before giving long advice.\n"
        "2. Help them focus their intent for the upcoming session."
    )

    messages = [{"role": "system", "content": system_prompt}]
    
    user_msgs = payload.messages
    if not user_msgs:
        user_msgs = [ChatMessage(role="user", content="I just opened the chat. What should I focus on?")]
        
    for m in user_msgs:
        messages.append({"role": m.role, "content": m.content})

    if not GEMINI_API_KEY:
        try:
            resp = httpx.post(
                f"{OLLAMA_BASE_URL}/v1/chat/completions",
                json={"model": OLLAMA_MODEL, "messages": messages, "stream": False},
                timeout=120.0,
            )
            resp.raise_for_status()
            return {"reply": resp.json()["choices"][0]["message"]["content"]}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
            
    contents = []
    for m in user_msgs:
        role = "model" if m.role == "ai" else "user"
        contents.append({"role": role, "parts": [{"text": m.content}]})

    gemini_payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "tools": [{"googleSearch": {}}]
    }

    try:
        resp = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}",
            json=gemini_payload,
            timeout=120.0,
        )
        resp.raise_for_status()
        reply_data = resp.json()
        try:
            reply_text = reply_data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            reply_text = "Sorry, I received an invalid response from Gemini."
        return {"reply": reply_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/focus")
def get_focus():
    conn = _get_db()
    row = conn.execute(
        "SELECT * FROM sessions ORDER BY id DESC LIMIT 1"
    ).fetchone()
    conn.close()

    if row is None:
        return {"session_id": None, "tab_count": 0, "is_draft": False}

    options = []
    if row["current_options"] and row["is_draft"]:
        try: options = json.loads(row["current_options"])
        except: pass

    return {
        "session_id": row["id"],
        "focus_score": row["focus_score"],
        "focus_label": row["focus_label"],
        "tab_count": row["tab_count"],
        "updated_at": row["timestamp"],
        "is_draft": bool(row["is_draft"]),
        "question": row["current_question"] if row["is_draft"] else None,
        "options": options if row["is_draft"] else [],
        "question_count": row["question_count"] if row["is_draft"] else 0
    }


@app.get("/sessions")
def get_sessions():
    conn = _get_db()
    rows = conn.execute(
        "SELECT timestamp, working_on, next_action, stuck_signal, "
        "focus_score, focus_label, supporting_tasks FROM sessions WHERE is_draft = 0 ORDER BY id DESC LIMIT 10"
    ).fetchall()
    conn.close()
    
    out = []
    for r in rows:
        d = dict(r)
        try: d["supporting_tasks"] = json.loads(d["supporting_tasks"])
        except: d["supporting_tasks"] = []
        out.append(d)
        
    return {"sessions": out}


@app.get("/memory")
def get_memory():
    conn = _get_db()
    row = conn.execute(
        "SELECT memory_summary FROM sessions WHERE is_draft = 0 ORDER BY id DESC LIMIT 1"
    ).fetchone()
    conn.close()
    return {"memory_summary": row["memory_summary"] if row else None}


@app.get("/health")
def health():
    return {"status": "ok", "model": OLLAMA_MODEL}
