# Übergabe an Google AntiGravity – Doori Messenger

Bitte lies zuerst diese Datei und danach `CODEX_HANDOFF_2026-09-24.md` im Projekt-Hauptverzeichnis vollständig. Setze den bestehenden Code exakt auf diesem Stand fort. Nichts neu aufsetzen, keine bestehenden Messenger-, Spiele-, Telefonie-, Konto- oder KI-Funktionen entfernen.

## Aktueller Stand (Update: 24.09.2026, 06:38 Uhr)

- Git-Basis: `760cfa3` (bzw. nach aktuellem Push) auf `main`.
- **Deployments:**
  - Firebase Cloud Functions live: `askDooriAssistant`, `synthesizeDooriSpeech`, `transcribeDooriSpeech`, `getLiveToken` (alle in `europe-west3`).
  - Firebase Hosting live bereitgestellt: Cache `v130` (`web-messenger-v130-assistant-ui-layout`), `style.css?v=334`, `assistant.js?v=12`, `tts.js?v=9`, `doori-live.js?v=7`. Live auf `https://www.doori-messenger.de/` und `https://doori-messenger.web.app/`.
- Build: Exakt 37 allowlistete Public-Dateien (`scripts/build-hosting.cjs`).
- Testsuite: **55/55 Tests bestanden (100% grün)** (`npm.cmd test`).
- Keine Secrets, API-Schlüssel oder Tokens in Frontend-Code, Git oder Logs exponiert. Firebase Functions Secrets bleiben maßgeblich.
- Alle sichtbaren Änderungen immer synchron in Deutsch, Englisch, Arabisch, Persisch und Türkisch gepflegt (RTL für ar/fa).

## Update: Live-Audio auf verschiedenen iPhones (24.09.2026)

- Praxisstand: Gemini Live funktioniert auf Laptop und auf einem iPhone mit geringer Latenz. Auf diesem iPhone traten gelegentlich mehrere gleichzeitige Stimmen auf; auf einem anderen iPhone startete das Live-Gespräch nicht zuverlässig.
- Nachgewiesener Clientfehler: `stopPlayback()` setzte nur Zeitstatus zurück, stoppte aber bereits geplante `AudioBufferSourceNode`-Segmente nicht. Nach Barge-in oder Wiederverbindung konnten alte und neue Antworten gleichzeitig laufen.
- Korrektur: Alle aktiven und geplanten Wiedergabequellen werden in `playbackSources` verfolgt, bei Unterbrechung vollständig gestoppt und getrennt. Eine Generation verhindert, dass alte `onended`-Ereignisse den Status einer neuen Antwort verändern.
- iPhone-Echo: Die lokale RMS-Erkennung durfte die Doori-Wiedergabe stoppen. Lautsprecherton kann auf iPhones trotz Echo-Cancellation wieder ins Mikrofon gelangen und dadurch die eigene Antwort unterbrechen. Lokales RMS-Barge-in wurde entfernt; Unterbrechungen werden über Geminis serverseitiges `serverContent.interrupted` verarbeitet.
- Kompatibilität älterer Safari-Versionen: AudioWorklet und ScriptProcessor sind nun über Analyser plus sehr leisen Gain-Knoten tatsächlich mit `ctx.destination` verbunden. Ohne vollständigen Graphen führt älteres iOS teilweise keine Audiocallbacks aus.
- Gerätefehler werden unterschieden: fehlende Browserunterstützung, verweigerter Mikrofonzugriff und ein durch eine andere App belegtes Mikrofon. Alle Texte liegen in de/en/ar/fa/tr vor.
- Veraltete WebSocket-Ereignisse einer bereits ersetzten Verbindung werden ignoriert.
- Cache: `web-messenger-v131-live-mobile-audio`; `doori-live.js?v=8`.
- Validierung: Syntaxprüfung bestanden, 55/55 Tests grün, Build exakt 37 Dateien. Tests prüfen Quellenbereinigung, aktiven iOS-Audiographen, entfernte lokale Echo-Unterbrechung und fünfsprachige Fehlermeldungen.
- Grenze: Es wurde kein physisches zweites iPhone automatisiert gesteuert. Nach dem Deployment müssen beide iPhones die Seite vollständig schließen/neu öffnen, Mikrofonberechtigung erlauben und praktisch testen. Keine Zusage für buchstäblich jedes alte Gerät oder jeden eingebetteten Browser.

## UI-Umstrukturierung: KI-Assistent Chatleiste & Symbole

Auf ausdrücklichen Nutzerwunsch (*„In dem KI-Assistant-Chat soll die Chatleiste alleine stehen und die Symbole zum Chatten da drüber sein. Also zuerst die Symbole und da drunter die Chatleiste soll sein.“*):
1. **Zweistufiger Composer im Assistenten-Chat (`#assistant-controls-row`):**
   - **Obere Zeile (drüber):** Eigener kompakter Container `#assistant-controls-row` für die Steuer- und Interaktionssymbole:
     - `#assistant-mic-btn` (🎙️ - Normaler Sprachdialog mit automatischer Whisper-Erkennung)
     - `#doori-live-btn` (Live - Echtzeit-Audiomodus)
     - `#doori-live-status` (Status-Meldungen des Live-Modus)
     - `#assistant-voice-btn` (🔊 / 🔇 - Sprachausgabe-Umschalter / Replay)
     - `#assistant-voice-select` (Stimmenauswahl: weiblich / männlich)
   - **Untere Zeile (drunter, steht alleine):** Die Chatleiste `.composer-main-row` enthält ausschließlich das Eingabefeld (`#message-input`) und den Sende-Button (`#send-btn`). Sie erstreckt sich nun über die volle Breite ohne störende Icons in der Zeile.
2. **Sichtbarkeits- und Layout-Steuerung:**
   - In `assistant.js`: `updateControls()` blendet `#assistant-controls-row` ein (`classList.remove('hidden')`), sobald der Assistent aktiv ist (`isActive()`), und blendet sie in normalen Chats aus (`hidden`).
   - In `style.css`: `body:not(.assistant-chat-open) #assistant-controls-row { display: none !important; }` stellt zusätzlich rein per CSS sicher, dass normale Chats (DMs, Räume, Kanäle) zu 100% ihre Standardansicht behalten.
   - Vollständige RTL-Unterstützung für Arabisch und Persisch sowie Responsivität auf Mobilgeräten (`@media (max-width: 600px)`).

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

- `index.html` (`#assistant-controls-row`, `style.css?v=334`, `assistant.js?v=12`)
- `assistant.js` (`updateControls` steuert `#assistant-controls-row`, Keep-Alive Trigger)
- `style.css` (Styling für `.assistant-controls-row`, `.assistant-control.live-btn`, `.doori-live-status`, RTL)
- `service-worker.js` (Cache `web-messenger-v130-assistant-ui-layout`)
- `functions/assistant-router.js` (`gemini-3.5-flash-lite`, `max_completion_tokens: 360`, `providerOrder`)
- `functions/index.js` (`gemini-3.5-flash-lite` Transkription, `gemini-3.8-flash-tts` TTS, RIFF-Guard)
- `tts.js` (Keep-Alive Loop, `gemini-3.8-flash-tts`, unterbrechungsfreie iOS-Wiedergabe)
- `tests/assistant.test.cjs` (55/55 Tests grün, Modell- und Routing-Prüfungen aktualisiert)
- `CODEX_HANDOFF_2026-09-24.md` & `GOOGLE_ANTIGRAVITY_HANDOFF_2026-09-24.md`

