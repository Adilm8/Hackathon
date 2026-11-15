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

Recommendation: ElevenLabs as the default premium voice (already in SPEC 17.1, the most expressive story reading,
consent tooling for cloning). Fish Audio or Inworld as the cheaper alternative with cloning.
Decide by a blind test: the same chapter from three providers plus one cloned adult voice, budget up to $6.

## What it needs

1. Lida's approval of the test budget.
2. API keys (ElevenLabs Starter, Fish Audio top-up $1 to $2, Inworld trial) in `web/.env.local` or a Remote Control run; never committed.
3. For cloning: 30 to 60 s of calm adult reading in a quiet room, with written consent of the speaker.
4. The default character voice, picked from the test.
5. Audio storage for the cache (Railway Volume or S3/R2), cents a month.
6. Spend limits: a cap in each provider's dashboard and a daily limit in code, as for the LLM.
7. For the parent's own voice: a consent screen, one-tap deletion of the voice, legal review (a voice is biometric data under several US state laws and COPPA).

Sources: invideo.io/blog/ai-voice-model-pricing, docs.fish.audio pricing, texttolab.com/pricing, inworld.ai TTS benchmarks (vendor).
