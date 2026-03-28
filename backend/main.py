"""
Momentum — FastAPI backend
Receives Chrome tab data, asks Gemma (via Ollama) for a focus score
and structured insight, stores sessions in SQLite, and serves
everything to the React frontend.
"""

import json
import re
import sqlite3
import sys
import subprocess
import datetime
import os
from typing import Optional
from urllib.parse import urlparse

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure .env is loaded from the correct folder
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

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

class SkipPayload(BaseModel):
    session_id: int

class TaskTogglePayload(BaseModel):
    session_id: int
    task_index: int
    done: bool

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

# ── LLM HELPERS ────────────────────────────────────────────────────

GEMINI_MODEL = "gemini-2.5-flash-preview-04-17"

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
            timeout=httpx.Timeout(20.0, connect=5.0),
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Ollama Error: {e}", file=sys.stderr)
        raise


def _call_gemini(system: str, user: str, response_schema: dict | None = None) -> str:
    """Call Gemini via the generateContent API."""
    gen_config: dict = {"temperature": 0.7}
    if response_schema:
        gen_config["responseMimeType"] = "application/json"
        gen_config["responseSchema"] = response_schema

    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": gen_config,
    }
    resp = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}",
        json=payload,
        timeout=httpx.Timeout(60.0, connect=10.0),
    )
    if not resp.is_success:
        print(f"Gemini API error {resp.status_code}: {resp.text[:500]}", file=sys.stderr)
        resp.raise_for_status()
    data = resp.json()
    parts = data["candidates"][0]["content"]["parts"]
    for part in parts:
        if not part.get("thought", False) and "text" in part:
            return part["text"]
    return parts[0]["text"]


def _call_llm(system: str, user: str, response_schema: dict | None = None) -> str:
    """Generic AI caller: Gemini first, Ollama as fallback on ANY error."""
    if GEMINI_API_KEY:
        try:
            # Try the bleeding-edge Gemini 3 first
            return _call_gemini(system, user, response_schema)
        except Exception as e:
            print(f"Gemini 3 (preview) failed/timed out: {e}. Trying stable 1.5-flash...", file=sys.stderr)
            try:
                # Try the ultra-stable 1.5-flash as a mid-tier fallback
                # Note: We swap the model name for this one-off call
                orig_model = globals()["GEMINI_MODEL"]
                globals()["GEMINI_MODEL"] = "gemini-1.5-flash"
                res = _call_gemini(system, user, response_schema)
                globals()["GEMINI_MODEL"] = orig_model
                return res
            except Exception as e2:
                print(f"Gemini 1.5 also failed: {e2}. Falling back to LOCAL Ollama...", file=sys.stderr)

    return _call_ollama(system, user)


# ── JSON schemas for structured Gemini output ────────────────────────────────

_SCHEMA_FOCUS = {
    "type": "object",
    "properties": {
        "focus_score": {"type": "integer"},
        "focus_label": {"type": "string"},
    },
    "required": ["focus_score", "focus_label"],
}

_SCHEMA_QUESTION = {
    "type": "object",
    "properties": {
        "question": {"type": "string"},
        "options": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["question", "options"],
}

_SCHEMA_INSIGHT = {
    "type": "object",
    "properties": {
        "working_on": {"type": "string"},
        "next_action": {"type": "string"},
        "stuck_signal": {"type": "string", "nullable": True},
        "memory_summary": {"type": "string"},
        "supporting_tasks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "task": {"type": "string"},
                    "energy": {"type": "string", "enum": ["high", "medium", "low"]},
                },
                "required": ["task", "energy"],
            },
        },
    },
    "required": ["working_on", "next_action", "memory_summary", "supporting_tasks"],
}

def _parse_json(raw: str) -> dict:
    try:
        text = raw.strip()
        # Handle thinking/markdown blocks
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace != -1:
            text = text[first_brace : last_brace + 1]
        
        return json.loads(text)
    except Exception as e:
        print(f"JSON Parse Error: {e}\nRaw Content: {raw}", file=sys.stderr)
        raise

def _generate_focus_score(tabs: list[dict]) -> dict:
    summary = _build_tab_summary(tabs)
    prompt = (
        "You are Momentum, a productivity AI. Analyse the user's open tabs and score their focus.\n\n"
        "SCORING RULES:\n"
        "1. Start at 85 (most people have a few stray tabs — that's normal).\n"
        "2. MODERATE penalty (-8 each): clearly off-task tabs — e.g. YouTube videos, Amazon/eBay product "
        "pages, Reddit browsing, news feeds, social media. Only penalise if there are multiple of these.\n"
        "3. NO penalty: ambient background tabs — e.g. Spotify, Apple Music, YouTube Music, radio, "
        "podcasts, a single reference search. These are normal while working.\n"
        "4. SMALL penalty (-3 each): loosely related tabs — e.g. Wikipedia, a tangential tutorial, "
        "a Stack Overflow answer on an unrelated topic.\n"
        "5. Tabs clearly in the same work cluster (same repo, project docs, framework docs) do NOT "
        "reduce the score — they raise confidence.\n"
        "6. Cap minimum at 20. Cap maximum at 100.\n"
        "7. Be generous: if the person is clearly working (code, docs, tools tabs dominate), "
        "score should be 75+.\n\n"
        "After scoring, pick the label:\n"
        "- 'Deep focus' if score >= 70\n"
        "- 'Getting scattered' if score >= 40\n"
        "- 'Highly fragmented' if score < 40\n\n"
        "Respond with valid JSON only: {\"focus_score\": <int>, \"focus_label\": \"<label>\"}"
    )
    
    try:
        raw = _call_llm(prompt, summary, response_schema=_SCHEMA_FOCUS)
        return _parse_json(raw)
    except:
        return {"focus_score": 50, "focus_label": "Getting scattered"}

_STOP_WORDS = {
    "the", "and", "for", "with", "this", "that", "from", "have", "are", "not",
    "you", "your", "page", "home", "tab", "new", "tab", "com", "http", "www",
    "about", "login", "sign", "google", "search", "docs", "open", "view",
}

def _extract_tab_signals(tabs: list[dict]) -> dict:
    """Extract specific domains and keyword signals from tabs in Python."""
    domains: list[str] = []
    keywords: list[str] = []

    for tab in tabs:
        url = tab.get("url", "")
        title = tab.get("title", "") or ""

        try:
            netloc = urlparse(url).netloc.replace("www.", "")
            if netloc and not netloc.startswith("chrome") and netloc not in domains:
                domains.append(netloc)
        except Exception:
            pass

        words = re.findall(r"[A-Za-z][A-Za-z0-9_\-]{2,}", title)
        for w in words:
            lw = w.lower()
            if lw not in _STOP_WORDS and w not in keywords:
                keywords.append(w)

    return {
        "domains": domains[:6],
        "keywords": keywords[:10],
    }


# Each question has a distinct purpose so the 3 answers together give a full picture.
_QUESTION_ANGLES = {
    1: (
        "GOAL: Identify the specific task or project the user is working on right now.",
        "Ask which specific thing from their tabs they're focused on.",
        "What are you focusing on with {term}?",
        ["Starting fresh on it", "Resuming where I left off", "Just exploring / researching", "Other"],
    ),
    2: (
        "GOAL: Understand the user's current state — are they making progress, stuck, or exploring?",
        "Ask about their current momentum or blocker.",
        "Where are you at with {term}?",
        ["Making good progress", "Stuck on something specific", "Still figuring out the approach", "Other"],
    ),
    3: (
        "GOAL: Clarify what 'done' looks like for this session — what do they want to ship or achieve?",
        "Ask what they want to have completed by the end of this session.",
        "What would feel like a win with {term} today?",
        ["Ship / finish a feature", "Resolve a specific bug", "Understand how something works", "Other"],
    ),
}


def _generate_question(tabs: list[dict], history: list[dict], index: int, prev_context: str = "") -> dict:
    signals = _extract_tab_signals(tabs)
    domains_str = ", ".join(signals["domains"]) if signals["domains"] else "unknown"
    keywords_str = ", ".join(signals["keywords"]) if signals["keywords"] else "unknown"

    covered = [f'- Q: {h["question"]} | A: {h["answer"]}' for h in history]
    covered_str = "\n".join(covered) if covered else "None yet."

    angle_goal, angle_hint, fallback_q_tmpl, fallback_opts = _QUESTION_ANGLES.get(index, _QUESTION_ANGLES[3])
    fallback_term = signals["keywords"][0] if signals["keywords"] else (signals["domains"][0] if signals["domains"] else "your work")

    system_prompt = (
        "You are Momentum, a productivity check-in assistant.\n\n"
        f"PREVIOUS SESSION CONTEXT (WHERE THEY LEFT OFF):\n{prev_context}\n\n"
        f"CONTEXT FROM USER'S OPEN TABS:\n"
        f"  Sites: {domains_str}\n"
        f"  Key terms: {keywords_str}\n\n"
        f"ALREADY ANSWERED (do not repeat these topics):\n{covered_str}\n\n"
        f"YOUR TASK FOR QUESTION {index} OF 3:\n"
        f"  {angle_goal}\n"
        f"  {angle_hint}\n\n"
        "RULES:\n"
        "1. The question must reference a specific term from 'Key terms' or 'Sites'.\n"
        "2. Max 12 words. No filler. Jump straight to the question.\n"
        "3. Generate 3 specific options that reflect real possibilities given the tab context.\n"
        "4. Always add \"Other\" as the final option.\n"
        "5. Options must be concrete phrases (5–8 words), not single words.\n\n"
        "EXAMPLE (tabs: github.com, keyword: FastAPI):\n"
        "{\"question\": \"Where are you at with the FastAPI work?\", "
        "\"options\": [\"Debugging a broken endpoint\", \"Adding a new route or feature\", \"Writing or fixing tests\", \"Other\"]}\n\n"
        "Return ONLY the JSON object."
    )

    try:
        raw = _call_llm(system_prompt, f"Generate question {index} of 3. (Memory: {prev_context[:50]}...)", response_schema=_SCHEMA_QUESTION)
        result = _parse_json(raw)
        if "question" in result and "options" in result and len(result["options"]) >= 3:
            # Ensure "Other" is always the last option
            opts = [o for o in result["options"] if o.lower() != "other"]
            opts.append("Other")
            result["options"] = opts
            return result
        raise ValueError("bad shape")
    except Exception:
        return {
            "question": fallback_q_tmpl.format(term=fallback_term),
            "options": fallback_opts,
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
        raw = _call_llm(prompt, f"TABS:\n{summary}\n\nHISTORY:\n{hist_str}", response_schema=_SCHEMA_INSIGHT)
        return _parse_json(raw)
    except Exception as e:
        print(f"_generate_final_insight error: {e}", file=sys.stderr)
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
    
    conn = _get_db()
    prev = conn.execute("SELECT working_on FROM sessions WHERE is_draft = 0 ORDER BY id DESC LIMIT 1").fetchone()
    prev_str = f"Prev session was: {prev['working_on']}" if prev and prev['working_on'] else "No previous session."

    # Generate initial focus score & Q1
    score_data = _generate_focus_score(tabs_dump)
    q1_data = _generate_question(tabs_dump, [], 1, prev_str)
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
        # Fetch memory for context
        prev_row = conn.execute("SELECT working_on FROM sessions WHERE is_draft = 0 ORDER BY id DESC LIMIT 1").fetchone()
        prev_str = f"Previously working on: {prev_row['working_on']}" if prev_row and prev_row['working_on'] else ""

        # Generate Next Question
        q_data = _generate_question(tabs, history, q_index, prev_str)
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


@app.post("/skip")
def skip_endpoint(payload: SkipPayload):
    conn = _get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (payload.session_id,)).fetchone()
    if not row or not row["is_draft"]:
        conn.close()
        raise HTTPException(400, "Invalid session or not a draft.")

    history = json.loads(row["history_json"])
    tabs = json.loads(row["raw_tabs_json"])

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
            payload.session_id,
        ),
    )
    conn.commit()
    conn.close()
    return {"status": "complete"}


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
