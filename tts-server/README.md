# Doori self-hosted TTS

This optional GPU service serves XTTS-v2 for German, English, Turkish and Arabic and ParsVoice-XTTS for Persian. It never calls a paid TTS API.

Provide exactly two legally authorized clean mono WAV reference recordings as `/voices/female.wav` and `/voices/male.wav`. Do not commit those recordings. The browser endpoint must be HTTPS and must expose `POST /synthesize`.

Set the public endpoint in the empty `doori-tts-endpoint` meta tag in `index.html` only after the service is reachable. If it is absent, slow, or fails, the client logs a provider-neutral fallback event and uses the matching system voice without changing language or gender.

Review the Coqui Public Model License and the ParsVoice model card before public or commercial deployment. The model weights are not included in this repository.
