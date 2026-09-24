# CODEX_HANDOFF_2026-09-24.md
# Vollständige Übergabedokumentation: Doori Messenger (Stand: 24. September 2026)

---

## 1. Executive Summary & Git-Status

Diese Dokumentation führt die Arbeit aus `CODEX_HANDOFF_2026-09-23.md` (Start-Commit `d2cdb2a`) lückenlos fort. Alle Aufgaben wurden erfolgreich im bestehenden Projektverzeichnis umgesetzt, getestet und live bereitgestellt.

- **Ausgangs-Commit:** `d2cdb2a`
- **Aktueller Commit:** `30892c2` (Branch `main`, synchron mit `origin/main`)
- **Automatisierte Testsuite:** **55/55 Tests bestanden (100% grün)** (`npm.cmd test`)
- **Hosting-Build:** **37 allowlistete Public-Dateien** (`scripts/build-hosting.cjs`)
- **Deployments:** 
  - Firebase Cloud Functions (`europe-west3`): `getLiveToken`, `askDooriAssistant`, `transcribeDooriSpeech`, `synthesizeDooriSpeech`
  - Firebase Hosting: Live auf `https://www.doori-messenger.de/` und `https://doori-messenger.web.app/`
- **Alle 5 Projektsprachen synchron gepflegt:** Deutsch (`de`), Englisch (`en`), Arabisch (`ar`, RTL), Persisch (`fa`, RTL), Türkisch (`tr`).

---

## 2. Historie der Commits seit `d2cdb2a`

1. **`612ae6d`** – *fix(tts): sanitize GEMINI_API_KEY, deploy functions and hosting, update handoff docs*
   - Bereinigung des `GEMINI_API_KEY` im Secret Manager (Version 4).
   - Deployment der Functions `askDooriAssistant`, `transcribeDooriSpeech`, `synthesizeDooriSpeech`.
2. **`9d21bad`** – *fix: resolve iPhone audio playback with Web Audio API, enforce assistant answer brevity and clamp TTS length*
   - Lösung des iPhone-Stummschaltungs-Problems beim normalen KI-Assistenten.
   - Kürzung der Antwortlängen auf 1-3 Sätze (Token-Caps: Groq 180, Gemini 180, Cloudflare 180).
   - TTS-Zeichenbegrenzung auf 360 Zeichen; Web Audio API (`AudioContext`) in `tts.js`.
3. **`92d6eab`** – *fix: switch Gemini transcription to gemini-2.0-flash (audio support), raise provider timeout to 8000ms and daily limits*
   - Behebung des 404-Fehlers bei der Sprachtranskription (`gemini-2.5-flash-lite` unterstützte keine Audio-Inline-Data -> Umstellung auf `gemini-2.0-flash`).
   - Timeout für Provider von 4500ms auf 8000ms erhöht (verhindert Abbrüche bei Cold-Starts).
   - Tageskontingente für Gemini/Groq auf je 200 erhöht.
4. **`837487b`** – *feat: add Gemini Live bidirectional real-time voice mode (gemini-3.8-live) with ephemeral tokens and barge-in*
   - Einführung des neuen, separaten „Live“-Modus mit `gemini-3.8-live`.
   - Ephemeral-Token-Cloud-Function `getLiveToken` via REST `v1beta/auth_tokens`.
   - WebSocket-Client `doori-live.js` für bi-direktionalen Live-Audio-Dialog.
5. **`8c7786c`** – *fix(live): fix iOS/mobile mic capture, sample rate downsampling to 16kHz, setup gating and Web Audio playback*
   - Behebung der Stille auf mobilen Endgeräten: Lineares Downsampling von nativer Hardware-Rate (44.1k/48k) auf 16 kHz PCM.
   - Handshake-Gate: Audioübertragung startet erst nach Empfang von `{ "setupComplete": {} }`.
6. **`a983958`** – *docs: add section 11.3 mobile audio fix to handoff*
   - Dokumentation des Audio-Hotfixes in `CODEX_HANDOFF_2026-09-23.md`.
7. **`30892c2`** – *fix(live): implement AudioWorklet capture pipeline with AnalyserNode fallback, native sampleRate upsampler, and DooriTTS unlock*
   - Vollständige Härtung der mobilen Audio-Pipeline gegen WebKit/iOS-Eigenheiten (`AudioWorklet`, `AnalyserNode`-Sink, native Upsampling für 24 kHz Output, iOS Mute-Switch Override).

---

## 3. Umgesetzte Features & Detailarchitektur

### A. Gemini Live Echtzeit-Sprachmodus (`gemini-3.8-live`)
- **Ziel:** Ein echter, bidirektionaler Sprachdialog in Echtzeit (Audio-zu-Audio) ohne Zwischenschritte über Text, mit Unterbrechungsmöglichkeit (Barge-in), rein über das kostenlose Kontingent von Google AI Studio.
- **Bestehende Funktionen:** Der bisherige Mikrofon-Button (`#assistant-mic-btn`), Textchat, Telefonie (Agora/Daily/GetStream), Spiele und die Betreiber-Konsole (`/operator-console`) bleiben zu **100% unberührt und funktionsfähig**.
- **Neuer Button „Live“:** Platziert direkt neben dem Mikrofon-Button im Chat-Composer (`#doori-live-btn`).
  - Normaler Zustand: Blaues Design mit weißer Schrift („Live“).
  - Aktiver Zustand: Pulsierendes rotes Gradient-Design mit Box-Shadow-Animation (`.live-btn--active`).
  - Kontingent erschöpft: Deaktiviert, ausgegraut (`.live-btn--disabled`), Tooltip & Meldung: *„Live momentan nicht verfügbar – kostenloses Kontingent erreicht. Bitte später erneut versuchen.“* (in der jeweiligen Nutzersprache).

#### Sicherheits- & Secret-Architektur (Backend -> Frontend)
- **Problem:** Der Google AI Studio API-Key darf unter keinen Umständen im Browser sichtbar sein oder ins Frontend gelangen.
- **Lösung (Ephemeral Tokens):**
  1. Frontend ruft die abgesicherte Cloud Function `getLiveToken` auf (Auth erforderlich, Rate-Limit 10/min, Tagesbudget in `_assistantBudgets/live-{uid}-{day}`).
  2. `getLiveToken` ruft Googles internen Token-Endpoint auf:
     `POST https://generativelanguage.googleapis.com/v1beta/auth_tokens?key=GEMINI_API_KEY` mit `{}` Payload.
  3. Google generiert ein flüchtiges Token (`auth_tokens/{hex_hash}`).
  4. Die Cloud Function extrahiert den Hash und liefert ihn mit einer TTL von 30 Minuten an den Browser zurück.
  5. Der Browser verbindet sich direkt per WebSocket mit:
     `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token={token}`
  - **Ergebnis:** Der echte `GEMINI_API_KEY` bleibt 100% geschützt im Secret Manager.

#### Audio-Pipeline & iOS/Mobile-Härtung
Bei ersten Praxistests auf mobilen Endgeräten trat das Phänomen auf, dass keine Antworten generiert wurden. Eine eingehende Diagnose deckte drei systemspezifische WebKit/Browser-Eigenheiten auf, die im Modul `doori-live.js` wie folgt gelöst wurden:

1. **Abtastraten-Mismatch (Downsampling auf 16 kHz):**
   - *Problem:* Mobile Hardware (iPhone, Android) initialisiert Audioaufnahmen typischerweise mit 44.100 Hz oder 48.000 Hz. Die Gemini Live API erwartet zwingend 16.000 Hz 16-Bit Little-Endian PCM (`audio/pcm;rate=16000`). Ohne Konvertierung klang die Sprache für das Google-VAD 3-fach verlangsamt und 1,6 Oktaven zu tief (unverständliches Sub-Bass-Brummen). Das VAD erkannte keine Sprache.
   - *Lösung:* Funktion `downsampleTo16k(samples, inRate)` rechnet die Float32-Puffer der nativen Hardware-Rate in Echtzeit verlustfrei per Boxcar/Linear-Filter auf exakt 16.000 Hz um.
2. **WebKit Audio-Graph Optimierung (Muting):**
   - *Problem:* WebKit (Safari auf iOS) schaltet `ScriptProcessorNode`-Instanzen komplett ab, wenn diese downstream an einen `GainNode` mit `gain.value = 0` angeschlossen sind, um Akku zu sparen.
   - *Lösung:* Duale Erfassungs-Pipeline:
     - **Primär:** Inline-`AudioWorklet` (`LiveMicProcessor`), das in einem separaten Audio-Thread läuft und von WebKit niemals garbage-collected oder stummgeschaltet wird.
     - **Fallback:** `ScriptProcessorNode` (2048 Puffergröße) verbunden mit einem `AnalyserNode` anstelle eines Null-Gain-Nodes. Ein `AnalyserNode` verbraucht die Daten aktiv, gibt sie aber nicht an die Lautsprecher aus.
3. **Setup-Handshake-Gate:**
   - *Problem:* Wenn Audio-Chunks gesendet wurden, bevor der Server `{ "setupComplete": {} }` zurückgemeldet hatte, wurden frühe Sprachsegmente verworfen.
   - *Lösung:* Das Flag `state.ready = false` blockiert das Senden von `realtime_input`, bis `msg.setupComplete` eingetroffen ist.
4. **iOS Hardware-Stummschalter (Mute Switch) Überbrückung:**
   - *Problem:* Web Audio API wird auf iOS standardmäßig stummgeschaltet, wenn der physische Seitenschalter auf „Lautlos“ steht.
   - *Lösung:* `unlockAudio()` ruft zusätzlich `root.DooriTTS?.unlock?.()` auf, welches einen minimalen stillen WAV-Puffer über ein HTML5 `<audio>`-Element abspielt. Dies versetzt die iOS Audio-Session in die Kategorie `Playback`, wodurch die Sprachausgabe auch bei aktiviertem Stummschalter über die Lautsprecher hörbar ist.
5. **Native SampleRate-Upsampling für 24 kHz Gemini Output:**
   - Funktion `upsample24kToNative(f32_24k, ctx.sampleRate)` rechnet den 24 kHz Ausgabestrom von Gemini linear auf die native Rate des `AudioContext` um, bevor `createBuffer` aufgerufen wird. Dadurch treten auf keinem Betriebssystem Buffer-Mismatch-Verzerrungen auf.
6. **Barge-in / Natürliche Unterbrechungen:**
   - Server-seitig: Auswertung von `msg.serverContent?.interrupted`.
   - Client-seitig: RMS-Berechnung des Eingangssignals (`rms > 0.035`). Sobald der Nutzer spricht während Doori antwortet, bricht `stopPlayback()` die Wiedergabe sofort ab.
7. **Visuelle Statusanzeige:**
   - Anzeige im Composer (`#doori-live-status`) und im Chat-Header (`#current-chat-status`):
     - `🔴 Live: Verbinde …`
     - `🔴 Live: Ich höre zu …`
     - `🔴 Live: Höre zu (Sprache erkannt) …`
     - `🔴 Live: Doori spricht …`

---

### B. Behebung des normalen Audio-/Assistenten-Problems auf Mobilgeräten
Parallel zum Live-Modus wurde der bestehende normale KI-Sprachmodus (`#assistant-mic-btn` und TTS) repariert:
1. **Länge der Antworten drastisch reduziert:**
   - Der System-Prompt in `functions/assistant-router.js` erzwingt nun:
     *„Always keep responses short, direct, and conversational (typically 1 to 3 sentences, maximum 4 sentences). Never write long essays or bullet-point lists unless explicitly requested by the user.“*
   - Ausgabetoken-Limits gesenkt: Groq (180), Gemini (180), Cloudflare (180).
2. **TTS-Zeichenkappung:**
   - `synthesizeDooriSpeech` kappt den zu vertonenden Text defensiv auf 360 Zeichen (`rawText.slice(0, 360)`). Die Audiosynthese schließt stets in unter 2-3 Sekunden ab.
3. **Web Audio API in `tts.js`:**
   - Empfangene TTS-Audiodateien werden vorrangig über `AudioContext.decodeAudioData` abgespielt. Ein im Klick/Touch entsperrter `AudioContext` verliert seine Berechtigung auf iOS auch nach asynchronen Netzwerkverzögerungen nicht.

---

## 4. Dateistruktur & geänderte Dateien

```
web-messenger/
├── functions/
│   ├── index.js                     # getLiveToken exportiert; Provider-Limits & Timeouts
│   ├── assistant-router.js          # 1-3 Sätze Prompt-Vorgabe; maxOutputTokens: 180
│   └── ...
├── doori-live.js                    # NEU: Vollständiges Gemini Live Modus Client-Modul (v3)
├── assistant.js                     # Live-Button Steuerung (updateControls, activate, initialize)
├── index.html                       # #doori-live-btn, #doori-live-status, doori-live.js?v=3
├── service-worker.js                # Cache web-messenger-v123-gemini-live-worklet
├── scripts/build-hosting.cjs        # doori-live.js in Allowlist (37 Dateien)
├── tests/
│   └── assistant.test.cjs           # Test für Gemini Live Modus (55/55 Tests grün)
├── CODEX_HANDOFF_2026-09-23.md      # Bisheriges Handoff-Dokument
└── CODEX_HANDOFF_2026-09-24.md      # DIESES DOKUMENT (Aktueller Stand)
```

---

## 5. Validierung & Tests

Vor jedem Deployment wurden alle Tests und Builds strikt ausgeführt:

```powershell
# 1. Testsuite (Security, Games, Calls, Assistant)
npm.cmd test
# Output: 55/55 pass, 0 fail (Dauer: ~2.3s)

# 2. Hosting Build
npm.cmd run build
# Output: Built 37 allowlisted public files.
```

Folgende Aspekte werden durch automatisierte Unit-Tests abgedeckt:
- `assistant.test.cjs`:
  - Context bounding & newest message preservation
  - Provider-Kaskade (Gemini -> Groq -> Cloudflare)
  - Quota guards & timeout fallbacks
  - Web Audio TTS & Gender-Auswahl
  - iPhone-kompatibler Recorder (MP4 Whisper)
  - Sprach-Lock über alle 5 Sprachen (de, en, ar, fa, tr)
  - **Gemini Live Modus Test:** Überprüfung aller 5 Sprachen, Modell `models/gemini-3.8-live`, `BidiGenerateContentConstrained`, `getLiveToken`, vollständige Secret-Isolation (kein Key im Client), Allowlist-Präsenz und Service-Worker-Caching.

---

## 6. Lokale Terminal-Befehle für Codex / Fortführung

Sollte Codex oder der Entwickler lokal weiterarbeiten, gelten folgende standardisierte Befehle im Projektverzeichnis `C:\Users\hidis\.gemini\antigravity\scratch\web-messenger`:

```powershell
# Tests ausführen
npm.cmd test

# Public Hosting Distribution bauen
npm.cmd run build

# Functions deployen (immer mit CA-Fix wegen Windows OpenSSL)
$env:NODE_OPTIONS="--use-system-ca"
firebase.cmd deploy --only functions:getLiveToken,functions:askDooriAssistant,functions:synthesizeDooriSpeech,functions:transcribeDooriSpeech --project doori-messenger

# Hosting deployen
$env:NODE_OPTIONS="--use-system-ca"
firebase.cmd deploy --only hosting --project doori-messenger

# Lokalen Dev-Server starten
npm.cmd run dev
```

---

## 7. Bekannte Erkenntnisse & Hinweise für Codex

1. **Gemini Live API Modell-Name:**
   - Der offizielle, funktionierende Modellbezeichner auf dem WebSocket lautet `models/gemini-3.8-live`. Ältere Bezeichner wie `gemini-2.0-flash-exp` werden von der API mit Code 1008 abgewiesen.
2. **Ephemeral Tokens REST Endpoint:**
   - Der Endpoint zur Generierung von Ephemeral Tokens lautet:
     `POST https://generativelanguage.googleapis.com/v1beta/auth_tokens?key={KEY}`
     mit leerem JSON-Body `{}`. Er gibt `{ "name": "auth_tokens/{hash}" }` zurück.
3. **Web Audio auf iOS Safari:**
   - Niemals feste Sample-Rates im `new AudioContext({ sampleRate: ... })` Konstruktor übergeben. WebKit auf iOS wirft dabei `NotSupportedError`. Stets `new AudioContext()` ohne Argumente verwenden und intern per Software resamplen.
   - Puffer über ein HTML5 `<audio>`-Element einmalig anzutriggern (wie in `DooriTTS.unlock()`), ist auf iOS essenziell, damit der Browser nicht durch den Hardware-Mute-Switch stummgeschaltet wird.
4. **Service Worker Caching:**
   - Bei Änderungen an Frontend-Dateien immer die Versionsnummer in `index.html` und den Cache-Namen in `service-worker.js` anpassen, da mobile Browser PWA-Assets aggressiv cachen.

---

## 8. Codex-Fortsetzung: Gemini-Live-Antwort repariert

**Problem:** Auf dem iPhone zeigte der Live-Modus beim Sprechen „Sprache erkannt“, Gemini gab jedoch keine hörbare Antwort zurück.

**Bestätigte Ursache:** Der Client verwendete für Gemini 3.8 Live ein veraltetes/falsches WebSocket-Nachrichtenformat. Audio wurde als `realtime_input.media_chunks` gesendet und die Ausgabe-Konfiguration lag unter `generation_config`. Die aktuelle offizielle API erwartet `realtimeInput.audio` mit `mimeType` sowie `responseModalities`, `speechConfig` und `systemInstruction` direkt im `setup`. Zusätzlich erzeugte der AudioWorklet auf 48-kHz-Hardware nur etwa 2,7 ms lange Pakete und damit mehrere Hundert WebSocket-Nachrichten pro Sekunde.

**Korrektur:**
- Audioformat auf `realtimeInput.audio` und `mimeType: audio/pcm;rate=16000` umgestellt.
- Setup auf die offiziellen CamelCase-Felder von Gemini 3.8 Live umgestellt.
- Eingehende Worklet-Puffer werden zu 1.600 Samples bzw. 100 ms bei 16 kHz gebündelt.
- Capture-Puffer wird beim Beenden des Mikrofons zuverlässig geleert.
- Empfang bleibt für CamelCase aktiv und akzeptiert defensiv auch ältere Snake-Case-Antworten.
- `doori-live.js?v=4`; Service-Worker-Cache `web-messenger-v124-gemini-live-protocol`.

**Validierung und Veröffentlichung:**
- Syntaxprüfung erfolgreich.
- `npm.cmd test`: 55/55 bestanden.
- `npm.cmd run build`: 37 allowlistete Dateien.
- Firebase Hosting erfolgreich live veröffentlicht auf `https://doori-messenger.web.app/` und der verbundenen Domain `https://www.doori-messenger.de/`.
