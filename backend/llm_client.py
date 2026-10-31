"""
Direct Anthropic / OpenAI clients, replacing the Emergent-proxied
`emergentintegrations` wrapper. Same call shapes the rest of the backend
already expects (system prompt + user text + optional image -> text reply),
so server.py only needs its import line and call sites swapped, not its logic.

Requires ANTHROPIC_API_KEY and OPENAI_API_KEY in the environment.
"""
import os
from typing import Optional

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

_anthropic = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
_openai = AsyncOpenAI(api_key=OPENAI_API_KEY)

CLAUDE_MODEL = "claude-sonnet-4-5-20250929"


async def claude_message(
    system_prompt: str,
    user_text: str,
    image_b64: Optional[str] = None,
    max_tokens: int = 4096,
) -> str:
    """Single-turn Claude call. image_b64 is a raw base64 JPEG/PNG string (no data: prefix)."""
    content = []
    if image_b64:
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": image_b64},
        })
    content.append({"type": "text", "text": user_text})

    resp = await _anthropic.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": content}],
    )
    return "".join(block.text for block in resp.content if block.type == "text")


async def transcribe_audio_openai(
    file,
    model: str = "gpt-4o-mini-transcribe",
    language: str = "fr",
    temperature: float = 0.0,
    prompt: str = "",
    response_format: str = "json",
):
    """file: an open binary file handle, same as the original OpenAISpeechToText.transcribe call."""
    return await _openai.audio.transcriptions.create(
        file=file,
        model=model,
        language=language,
        temperature=temperature,
        prompt=prompt,
        response_format=response_format,
    )


async def tts_openai(
    text: str,
    model: str = "tts-1",
    voice: str = "nova",
    speed: float = 0.95,
    response_format: str = "mp3",
) -> bytes:
    resp = await _openai.audio.speech.create(
        model=model,
        voice=voice,
        input=text,
        speed=speed,
        response_format=response_format,
    )
    return resp.read()
