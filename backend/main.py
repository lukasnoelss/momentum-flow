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
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
            focus_score INTEGER NOT NULL,
            focus_label TEXT NOT NULL,
            working_on  TEXT NOT NULL,
            next_action TEXT NOT NULL,
            stuck_signal TEXT,
            memory_summary TEXT NOT NULL
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

# ── OLLAMA HELPERS ─────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You are Momentum, a productivity AI. Analyse the user's open tabs "
    "and return a JSON object with exactly these keys:\n\n"
    "- focus_score: integer 0-100. Score how focused the user is right "
    "now. 100 = one task, deep in it. 0 = chaotic tab sprawl with no "
    "clear thread. Base this on: number of tabs, how related they are "
    "to each other, presence of distraction sites (social media, news, "
    "video), and whether there is a clear primary task visible.\n"
    "- focus_label: one of exactly three strings: 'Deep focus', "
    "'Getting scattered', or 'Highly fragmented'\n"
    "- working_on: one sentence, what the user is most likely focused "
    "on, specific, references actual tab titles\n"
    "- next_action: one hyper-specific next step, include file names "
    "or URLs where relevant\n"
    "- stuck_signal: one sentence or null — whether tabs suggest the "
    "user is stuck or procrastinating\n"
    "- memory_summary: one short paragraph in second person summarising "
    "this session as useful context for next time\n\n"
    "Respond with valid JSON only. No markdown. No extra keys.\n"
    "Start your response with { and end with }."
)

RETRY_SYSTEM_PROMPT = (
    "You MUST respond with ONLY a JSON object. No markdown, no explanation. "
    "The JSON must have exactly these keys: focus_score (int 0-100), "
    "focus_label (string: 'Deep focus' | 'Getting scattered' | 'Highly fragmented'), "
    "working_on (string), next_action (string), stuck_signal (string or null), "
    "memory_summary (string). Start with { end with }. Nothing else."
)


def _build_tab_summary(tabs: list[Tab]) -> str:
    lines: list[str] = []
    for i, tab in enumerate(tabs, 1):
        snippet = (tab.text or "")[:500]
        lines.append(f"Tab {i}: {tab.title}\n  URL: {tab.url}\n  Text: {snippet}\n")
    return "\n".join(lines)


def _call_ollama(system: str, user: str) -> str:
    """Call Ollama's OpenAI-compatible chat endpoint synchronously."""
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
        timeout=120.0,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


def _parse_insight(raw: str) -> dict:
    """Try to parse JSON from Gemma's response, stripping markdown fences if present."""
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


FALLBACK_INSIGHT = {
    "focus_score": 50,
    "focus_label": "Getting scattered",
    "working_on": "Could not determine — Gemma returned invalid JSON.",
    "next_action": "Try reducing open tabs and re-run the scan.",
    "stuck_signal": None,
    "memory_summary": "The AI was unable to parse this session. You may want to retry.",
}


def _get_insight(tabs: list[Tab]) -> dict:
    summary = _build_tab_summary(tabs)

    # First attempt
    try:
        raw = _call_ollama(SYSTEM_PROMPT, summary)
        return _parse_insight(raw)
    except Exception:
        pass

    # Retry with stricter prompt
    try:
        raw = _call_ollama(RETRY_SYSTEM_PROMPT, summary)
        return _parse_insight(raw)
    except Exception:
        return FALLBACK_INSIGHT.copy()


def _store_session(insight: dict, tab_count: int) -> None:
    conn = _get_db()
    conn.execute(
        """
        INSERT INTO sessions
            (timestamp, tab_count, focus_score, focus_label,
             working_on, next_action, stuck_signal, memory_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            datetime.datetime.utcnow().isoformat(),
            tab_count,
            insight["focus_score"],
            insight["focus_label"],
            insight["working_on"],
            insight["next_action"],
            insight.get("stuck_signal"),
            insight["memory_summary"],
        ),
    )
    conn.commit()
    conn.close()

# ── ENDPOINTS ──────────────────────────────────────────────────────

@app.post("/tabs")
def receive_tabs(payload: TabPayload):
    if not payload.tabs:
        raise HTTPException(status_code=400, detail="No tabs provided.")

    insight = _get_insight(payload.tabs)
    tab_count = len(payload.tabs)
    _store_session(insight, tab_count)

    # TODO: Enrich focus_score with historical session data —
    #       e.g. rolling average, trend direction, time-of-day patterns.

    return {
        "success": True,
        "focus_score": insight["focus_score"],
        "focus_label": insight["focus_label"],
        "insight": {
            "working_on": insight["working_on"],
            "next_action": insight["next_action"],
            "stuck_signal": insight.get("stuck_signal"),
        },
        "tab_count": tab_count,
    }


@app.post("/scan")
def trigger_scan():
    """Trigger a manual scan by running tab_reader.py as a subprocess."""
    try:
        # Run the tab_reader.py script with --once flag
        result = subprocess.run(
            [sys.executable, "tab_reader.py", "--once"],
            capture_output=True,
            text=True,
            timeout=180
        )
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Scan failed: {result.stderr}")
        return {"success": True}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Scan timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/focus")
def get_focus():
    conn = _get_db()
    row = conn.execute(
        "SELECT focus_score, focus_label, tab_count, timestamp "
        "FROM sessions ORDER BY id DESC LIMIT 1"
    ).fetchone()
    conn.close()

    if row is None:
        return {
            "focus_score": None,
            "focus_label": None,
            "tab_count": 0,
            "updated_at": None,
        }

    # TODO: Could blend the latest score with a rolling average of the
    #       last N sessions for a smoother focus trend on the frontend.

    return {
        "focus_score": row["focus_score"],
        "focus_label": row["focus_label"],
        "tab_count": row["tab_count"],
        "updated_at": row["timestamp"],
    }


@app.get("/sessions")
def get_sessions():
    conn = _get_db()
    rows = conn.execute(
        "SELECT timestamp, working_on, next_action, stuck_signal, "
        "focus_score, focus_label FROM sessions ORDER BY id DESC LIMIT 10"
    ).fetchall()
    conn.close()

    # TODO: Add a session_duration field once we track session start/end
    #       and use it to weight focus_score trends over time.

    return {
        "sessions": [dict(r) for r in rows],
    }


@app.get("/memory")
def get_memory():
    conn = _get_db()
    row = conn.execute(
        "SELECT memory_summary FROM sessions ORDER BY id DESC LIMIT 1"
    ).fetchone()
    conn.close()

    return {
        "memory_summary": row["memory_summary"] if row else None,
    }


@app.get("/health")
def health():
    return {"status": "ok", "model": OLLAMA_MODEL}
