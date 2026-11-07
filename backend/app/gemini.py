"""Gemini helpers. If GEMINI_API_KEY isn't set, these return simple fallbacks so the app still runs."""
import json
import os

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_client = None


def _get_client():
    global _client
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=key)
    return _client


def _ask_json(prompt: str):
    client = _get_client()
    if client is None:
        return None
    resp = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config={"response_mime_type": "application/json"},
    )
    return json.loads(resp.text)


def draft_listing(text: str) -> dict:
    """Turn messy text (a Reddit post, a sentence) into a structured listing."""
    prompt = f"""You help UBC students turn requests into listings on a campus app.
Read the text and return JSON with keys:
category ("study" | "skill" | "ride"), title (short), description, tag (course code like "CPSC 213",
a skill, or a destination), location (UBC building/place if mentioned, else ""), time (if mentioned, else ""),
capacity (integer, default 4).
Text: \"\"\"{text}\"\"\""""
    result = _ask_json(prompt)
    if result is None:  # fallback without API key
        return {"category": "study", "title": text[:60], "description": text,
                "tag": "", "location": "", "time": "", "capacity": 4}
    return result


def rank_matches(user: dict, listings: list[dict]) -> list[dict]:
    """Return [{listing_id, reason}] best-first for this user."""
    if not listings:
        return []
    prompt = f"""You match UBC students to study sessions, skill swaps and rides.
Student: {json.dumps(user)}
Listings: {json.dumps(listings)}
Return a JSON list (best first, max 5) of objects: {{"listing_id": int, "reason": short friendly sentence}}.
Only include genuinely relevant listings."""
    result = _ask_json(prompt)
    if result is None:  # fallback: naive keyword overlap on courses/skills
        words = {w.strip().lower() for w in (user["courses"] + "," + user["skills_learn"]).split(",") if w.strip()}
        hits = [l for l in listings if l["tag"].lower() in words]
        return [{"listing_id": l["id"], "reason": f"Matches your {l['tag']}"} for l in hits[:5]]
    return result
