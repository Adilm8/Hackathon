# Voice options: premium narration and voice cloning

Status: proposal, 15 Nov 2026. Nothing is bought or connected; any spend needs Lida's approved budget.
Prices come from third-party comparisons of Aug to Nov 2026 and are re-checked on each provider's price page before work starts.

The device voice (free, offline, every tier) stays the default narration. A premium voice is a new `Narrator`
implementation behind `POST /api/tts` (SPEC 11.6, 17.1); each page is synthesised once and cached, because chapters do not change.
A chapter is about 1.5 to 3 thousand characters.

| Provider | Price per 1M characters | One chapter | Voice cloning |
|---|---|---|---|
| ElevenLabs Flash v2.5 / Eleven v3 | ~$50 / ~$100 | $0.08 to $0.30 | Instant clone from the $6 a month Starter plan; professional clone with voice verification |
| Fish Audio S2 Pro | $15 | ~$0.03 | Yes, from 10 to 15 s of audio |
| Inworld TTS-2 (Flash / on-demand) | $15 / $25 | ~$0.05 | Zero-shot from 5 to 15 s, free; top of the Speech Arena by the vendor's own page |
| Cartesia Sonic | credits, from $5 a month | n/a | Instant from 3 to 10 s |
| MiniMax Speech HD / turbo | $100 / $60 | ~$0.30 | $1.50 per voice, no documented consent check |
| OpenAI TTS, Gemini TTS | $12 to $15 | ~$0.03 | No |

## Through OpenRouter (chosen for the MVP, 15 Nov)

OpenRouter has had `/api/v1/audio/speech` and `/api/v1/audio/transcriptions` since May 2026, so one key, one bill and the existing daily cap cover voice too. Prices from its TTS collection page (15 Nov): Fish Audio S2.1 Pro Free $0, Kokoro 82M $0.62/M, Fish S2.1 Pro $15/M, Voxtral TTS 3 $13/M (zero-shot cloning), MAI-Voice-2 $22/M (cloning from short clips), Eleven Flash v2.5 $40/M, Eleven v3 $80/M, Gemini 3.8 Flash TTS (token-billed, Voice Replication). ElevenLabs cloning through OpenRouter is not mentioned; it would need a direct ElevenLabs account.

Built (off until `TTS_MODEL` is set): `POST /api/tts` (one sentence, mp3, disk cache per model + voice + text, cost counted in `llm_calls` with route `tts`, zdr and data_collection deny), `lib/speech/cloud.ts` (plays sentence by sentence, prefetches the next, unlocks audio on iPhone inside the tap, falls back to the device voice), Settings > Story voice and Character voice from `TTS_VOICES`.

Character voices: our own invented storytellers (for example Owl the Storyteller, Grandma Bear, Fox Cub, Night Whale), never an imitation of a real actor or a studio character. Public-domain characters only in their original book form. Each provider voice's commercial-use terms are checked in the test.

The page text sent to the voice service holds the child's first name (SPEC 6.1); this is the open question K8 for Lida.

## Direct providers (reference)

Recommendation before OpenRouter was found: ElevenLabs as the default premium voice (already in SPEC 17.1, the most expressive story reading,
consent tooling for cloning). Fish Audio or Inworld as the cheaper alternative with cloning.
Decide by a blind test: the same chapter from three or four OpenRouter models plus one cloned adult voice, budget up to $0.50 (pending Lida's approval).

## What it needs

1. Lida's approval of the test budget.
2. API keys (ElevenLabs Starter, Fish Audio top-up $1 to $2, Inworld trial) in `web/.env.local` or a Remote Control run; never committed.
3. For cloning: 30 to 60 s of calm adult reading in a quiet room, with written consent of the speaker.
4. The default character voice, picked from the test.
5. Audio storage for the cache (Railway Volume or S3/R2), cents a month.
6. Spend limits: a cap in each provider's dashboard and a daily limit in code, as for the LLM.
7. For the parent's own voice: a consent screen, one-tap deletion of the voice, legal review (a voice is biometric data under several US state laws and COPPA).

Sources: invideo.io/blog/ai-voice-model-pricing, docs.fish.audio pricing, texttolab.com/pricing, inworld.ai TTS benchmarks (vendor).

## Voice test result (15 Nov 2026, about $0.28 of the approved $0.50)

Blind test of 20 voices on one passage (`npm run voice:test`). Lida's favourites: Kokoro 82M Bella, Fish Audio S2.1 Pro Free, ElevenLabs v3 Lily; she found the others decent too.

| Model | Voice | Time for ~330 chars | Price / 1M chars | Note |
|---|---|---|---|---|
| hexgrad/kokoro-82m | af_bella (also af_heart, bf_emma, am_michael) | ~1 s | $0.62 | chosen default |
| fish-audio/s2.1-pro-free:free | default | ~1.4 s | $0 | free alternative |
| elevenlabs/eleven-v3 | Lily `pFZP5JQG7iQjIQuC4Bku` | ~7.5 s | $80 | premium storyteller, needs prefetch |
| elevenlabs/eleven-flash-v2.5 | Rachel, Charlotte, Lily, Brian | ~1.1 s | $40 | needs an explicit voice id |
| google/gemini-3.8-flash-tts | Kore, Aoede, Puck, Sulafat | 7 to 11 s | token-billed, near free | PCM only (wrapped into WAV) |
| x-ai/grok-voice-tts-1.0 | Ara, Eve | ~0.7 s | $15 | |
| microsoft/mai-voice-2.1 | en-US-AvaMultilingualNeural | ~0.6 s | $22 | other voice names rejected |

Recommended setup (in `.env.example`): `TTS_MODEL=hexgrad/kokoro-82m`, and `TTS_VOICES` with our own characters, mixing models with `model@voice`:
Owl the Storyteller (Kokoro Bella, default), Kind Friend (Fish Free), Grandma Bear (Kokoro Emma), Night Whale (Kokoro Michael), Moon Storyteller (ElevenLabs v3 Lily, premium).
