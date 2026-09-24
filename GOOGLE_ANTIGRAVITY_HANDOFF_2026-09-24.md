# Übergabe an Google AntiGravity – Doori Messenger

Bitte lies zuerst diese Datei und danach `CODEX_HANDOFF_2026-09-24.md` im Projekt-Hauptverzeichnis vollständig. Setze den bestehenden Code exakt auf diesem Stand fort. Nichts neu aufsetzen, keine bestehenden Messenger-, Spiele-, Telefonie-, Konto- oder KI-Funktionen entfernen.

## Aktueller Stand (Update: 24.09.2026, 06:18 Uhr)

- Git-Basis: `9e4d65b` auf `main`.
- **Deployments:**
  - Firebase Cloud Functions live aktualisiert: `askDooriAssistant`, `synthesizeDooriSpeech`, `transcribeDooriSpeech` (sowie zuvor `getLiveToken`).
  - Firebase Hosting live bereitgestellt: Cache `v129`, `tts.js?v=9`, `assistant.js?v=11`. Live auf `https://www.doori-messenger.de/` und `https://doori-messenger.web.app/`.
- Build: Exakt 37 allowlistete Public-Dateien (`scripts/build-hosting.cjs`).
- Testsuite: **55/55 Tests bestanden (100% grün)** (`npm.cmd test`).
- Keine Secrets, API-Schlüssel oder Tokens in Frontend-Code, Git oder Logs exponiert. Firebase Functions Secrets bleiben maßgeblich.
- Alle sichtbaren Änderungen immer synchron in Deutsch, Englisch, Arabisch, Persisch und Türkisch gepflegt (RTL für ar/fa).

## Ursachenanalyse & Behebung: „Kein KI-Dienst verfügbar“

Der Nutzer meldete: *„Es kommt immer beim Chatten und beim Sprechen der Fehler: Es ist kein KI Dienst verfügbar bitte später versuchen... Ich hab gar nicht so viel mehr genutzt...“*

Die Log- und API-Diagnose zeigte die eindeutige Ursache:
1. **Google Model Deprecation (HTTP 404):**
   - In `functions/assistant-router.js` war `GEMINI_MODEL = 'gemini-2.5-flash-lite'`.
   - In `functions/index.js` war für Sprachtranskription `models/gemini-2.0-flash`.
   - Google AI Studio hat beide Modelle serverseitig mit HTTP 404 abgewiesen (*„This model is no longer available to new users. Please update your code to use gemini-3.5-flash-lite / gemini-3.6-flash“*).
   - In `synthesizeDooriSpeech` lieferte das veraltete `gemini-2.5-flash-preview-tts` HTTP 429 Quota Exceeded (10 RPM Free Tier Limit).
   - **Es lag kein Verbrauchslimit des Nutzers vor!** In Firestore hatte der Nutzer heute nur 8 von 200 Anfragen verbraucht. Der 404-Fehler von Google ließ Gemini scheitern.
2. **Korrektur der Modelle:**
   - Textinferenz (`functions/assistant-router.js`): Aktualisiert auf `gemini-3.5-flash-lite` (verifiziert: HTTP 200, Antwortzeit ~600ms).
   - Sprachtranskription (`functions/index.js`): Aktualisiert auf `gemini-3.5-flash-lite` (unterstützt Audio-Inline-Data, verifiziert: HTTP 200); Fallback bleibt Groq Whisper (`whisper-large-v3-turbo`).
   - Sprachsynthese / TTS (`functions/index.js`): Aktualisiert auf `gemini-3.8-flash-tts` (verifiziert: HTTP 200, generiert vollständige WAV-Audiodaten).
   - `pcmToWavBase64`: Erkennt bereits vorhandene RIFF/WAVE-Header und verhindert Doppel-Header.
   - Groq Inferenz: `max_completion_tokens` von 180 auf 360 erhöht, damit `openai/gpt-oss-20b` reasoning tokens nicht die Antwort abschneiden.
3. **Provider-Reihenfolge & Kaskade:**
   - Der Nutzer wünschte sich Gemini als 1. Wahl, falls verfügbar, und Groq als direkten Fallback.
   - `createAssistantRouter` unterstützt nun flexibel `providerOrder` (Standard: `['gemini', 'groq', 'cloudflare']`).
   - Sobald Gemini antwortet, kommt Gemini zum Einsatz. Sollte Gemini ein Rate-Limit oder einen Fehler haben, übernimmt nahtlos Groq (`openai/gpt-oss-20b`), danach Cloudflare/Local.

## Ursachenanalyse & Behebung: iPhone Audio-Stummschaltung / fehlende Sprachwiedergabe

1. **Autoplay-Token & Audio-Session Interruption auf WebKit/iOS:**
   - Auf iOS Safari wird der `AudioContext` suspendiert, sobald das Mikrofon (`stream.getTracks().forEach(t => t.stop())`) gestoppt wird und keine Audioausgabe aktiv läuft.
   - Zudem verfällt die Benutzerinteraktions-Berechtigung (Autoplay) nach den ~6-9 Sekunden für Transkription + KI-Antwort + TTS-Synthese.
   - Ein pausiertes `<audio>`-Element darf nach dieser asynchronen Verzögerung ohne neuen Nutzertouch nicht starten (`NotAllowedError`).
   - Zudem schaltet der physische Hardware-Stummschalter (Mute-Switch) der iPhones Web Audio stumm, während ein spielendes `<audio playsinline>`-Element die Session in `AVAudioSessionCategoryPlayback` hält.
2. **Lösung (Keep-Alive Audio Pipeline):**
   - In `tts.js`: `startKeepAlive()` startet beim Mikrofon-Klick (`unlock()`) einen minimalen stummen Loop auf `player()` (`audio.loop = true; audio.play()`) sowie einen inaudiblen GainNode (`0.00001`) auf dem `AudioContext`.
   - Das `<audio>`-Element bleibt während des Sprechens und der Cloud-Verzögerung im Status `playing`.
   - Sobald der TTS-Blob eintrifft, setzt `playBlob`: `audio.loop = false; audio.src = objectUrl; audio.play()`.
   - Weil das Element bereits lief, blockiert iOS Safari die Wiedergabe nicht!
   - Durch die Kategorie `Playback` wird Doori auch dann laut über die Lautsprecher gehört, wenn der iPhone-Stummschalter aktiv ist.
   - Web Audio dient als sofortiger zweiter Fallback.
   - Der Lautsprecher-Button `#assistant-voice-btn` bleibt als manueller Replay-Fallback erhalten.

## Betroffene & verifizierte Dateien

- `functions/assistant-router.js` (`gemini-3.5-flash-lite`, `max_completion_tokens: 360`, `providerOrder`)
- `functions/index.js` (`gemini-3.5-flash-lite` Transkription, `gemini-3.8-flash-tts` TTS, RIFF-Guard)
- `tts.js` (Keep-Alive Loop, `gemini-3.8-flash-tts`, unterbrechungsfreie iOS-Wiedergabe)
- `assistant.js` (Keep-Alive Trigger beim Start und Stopp der Aufnahme)
- `tests/assistant.test.cjs` (55/55 Tests grün, Modell- und Routing-Prüfungen aktualisiert)
- `index.html` (Cache-Buster `tts.js?v=9`, `assistant.js?v=11`)
- `service-worker.js` (Cache `web-messenger-v129-tts-model-upgrade`)
- `CODEX_HANDOFF_2026-09-24.md` & `GOOGLE_ANTIGRAVITY_HANDOFF_2026-09-24.md`
