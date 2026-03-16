from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from typing import List, Optional

from dotenv import load_dotenv
import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI

load_dotenv()

app = FastAPI(title="PriceHunter Assistant")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_openai_client() -> OpenAI:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("OPENAI_API_KEY is missing.")
    try:
        api_key.encode("ascii")
    except UnicodeEncodeError as exc:
        raise ValueError("OPENAI_API_KEY has non-ASCII characters.") from exc
    return OpenAI(api_key=api_key)

DB_PATH = "assistant.db"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            profile_json TEXT,
            updated_at TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            role TEXT,
            content TEXT,
            created_at TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_profile(user_id: str) -> dict:
    conn = get_db()
    row = conn.execute(
        "SELECT profile_json FROM users WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()
    if not row or not row["profile_json"]:
        return {}
    return json.loads(row["profile_json"])


def save_profile(user_id: str, profile: dict) -> None:
    conn = get_db()
    conn.execute(
        """
        INSERT INTO users (user_id, profile_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            profile_json = excluded.profile_json,
            updated_at = excluded.updated_at
        """,
        (user_id, json.dumps(profile), now_iso()),
    )
    conn.commit()
    conn.close()


def add_message(user_id: str, role: str, content: str) -> None:
    conn = get_db()
    conn.execute(
        """
        INSERT INTO messages (user_id, role, content, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, role, content, now_iso()),
    )
    conn.commit()
    conn.close()


def get_recent_messages(user_id: str, limit: int = 8) -> List[dict]:
    conn = get_db()
    rows = conn.execute(
        """
        SELECT role, content FROM messages
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()
    conn.close()
    return [{"role": row["role"], "content": row["content"]} for row in rows[::-1]]


def update_profile_from_message(profile: dict, message: str) -> dict:
    lowered = message.lower()
    if "arabic" in lowered or "عربي" in message:
        profile["language"] = "ar"
    if "english" in lowered:
        profile["language"] = "en"
    if "egypt" in lowered or "مصر" in message:
        profile["region"] = "eg"
    if "saudi" in lowered or "السعودية" in message or "sa" in lowered:
        profile["region"] = "sa"
    if "uk" in lowered or "britain" in lowered or "united kingdom" in lowered:
        profile["region"] = "uk"
    return profile


class AssistantRequest(BaseModel):
    user_id: str = Field(default="guest")
    message: str
    history: Optional[List[dict]] = None


class AssistantResponse(BaseModel):
    reply: str
    profile: dict


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.post("/assistant/ask", response_model=AssistantResponse)
def ask_assistant(payload: AssistantRequest) -> AssistantResponse:
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message is required.")

    profile = get_profile(payload.user_id)
    profile = update_profile_from_message(profile, payload.message)
    save_profile(payload.user_id, profile)

    add_message(payload.user_id, "user", payload.message)

    history = payload.history or get_recent_messages(payload.user_id, limit=8)

    system_prompt = (
        "You are the PriceHunter assistant. Be concise and helpful. "
        "You know the site features: price comparison, search bar, AI image search (placeholder), "
        "Top matches section, dropshipping drawer, plans, and account menu. "
        "If asked about prices, explain that some results may not include live prices yet. "
        "If asked how to use the site, give step-by-step guidance."
    )

    user_context = f"User profile: {json.dumps(profile)}"

    try:
        client = get_openai_client()
    except ValueError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "system", "content": user_context},
                *history,
                {"role": "user", "content": payload.message},
            ],
        )

        reply = response.output_text
        add_message(payload.user_id, "assistant", reply)
        return AssistantResponse(reply=reply, profile=profile)
    except Exception as exc:
        logging.exception("Assistant request failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/assistant/health")
def health() -> dict:
    return {"status": "ok"}
