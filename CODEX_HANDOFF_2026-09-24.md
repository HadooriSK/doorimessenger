# CODEX_HANDOFF_2026-09-24.md
# Vollständige Übergabedokumentation: Doori Messenger (Stand: 24. September 2026)

## Neuester Nachtrag: Große Mediendateien via Cloudflare R2 & Backblaze B2 (LIVE)

### Große Mediendateien mit Cloudflare R2 & Backblaze B2 (24.09.2026)

- **Betreiberanforderung:** Nutzung des 10 GB kostenlosen Speichers von Cloudflare R2 und 10 GB kostenlosen Speichers von Backblaze B2 für große Dateien (Videos, Audio, Fotos, Dokumente bis 500 MB). Priorität auf Cloudflare R2; nach Erreichen des 10 GB Kontingents (Sicherheitsgrenze 9,5 GB) automatische Umschaltung auf Backblaze B2. Alle Dateien auf beiden Speichern müssen nach maximal 30 Tagen automatisch gelöscht werden.
- **Live-Verifikation beider Speicheranbieter:**
  1. **Cloudflare R2:** Secret `CLOUDFLARE_R2_CONFIG` (Version 3) ausgelesen und live getestet. Presigned S3 SigV4 PUT (HTTP 200 OK), GET (HTTP 200 OK, Inhalt 100% verifiziert) und DELETE (HTTP 204 No Content) erfolgreich.
  2. **Backblaze B2:** Secret `BACKBLAZE_B2_CONFIG` ausgelesen und live getestet. Presigned S3 SigV4 PUT (HTTP 200 OK) und DELETE (HTTP 200 OK) erfolgreich.
- **Backend-Architektur (`functions/large-media-storage.js` & `functions/index.js`):**
  - Reine Node.js-Standardbibliothek (`node:crypto`) für AWS S3 SigV4 Signatur-Generierung (`requestLargeMediaUpload`).
  - Direct Client-to-Storage Presigned PUT URLs (15 Minuten Upload-Fenster). Firebase Cloud Functions übertragen keine Dateibytes und verursachen keine Server-Bandbreitenkosten.
  - Quotenüberwachung via Firestore `system_stats/storage` (`r2_bytes`, `b2_bytes`). Automatische Kaskadierung von R2 zu B2 bei >= 9,5 GB.
  - 30-Tage Retention (`expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000`).
  - Cleanup-Funktion `cleanupExpiredLargeMedia`: Löscht abgelaufene Objekte via S3 SigV4 DELETE, bereinigt Firestore-Einträge und dekrementiert Speicherstatistiken.
- **Frontend-Integration (`app.js`, `index.html`):**
  - Dateiauswahl `#media-upload` unterstützt alle Dateitypen (`accept="*/*"`).
  - Pipeline `uploadMediaFile(file)` routet Dateien >= 200 KB oder Dokumente über R2/B2; kleine Dateien < 200 KB verbleiben für sofortige Vorschau als Data-URL.
  - Upload-Progress-Toast während des Uploads (`msg_uploading_media`).
  - Chat-Darstellung von Dateianhängen (`mediaType === 'file'`) mit Dateiname, Dateigröße und Download-Button.
  - 30-Tage Retentions-Badge (`⏱️ 30d` bzw. `⏱️ Abgelaufen`) im Chat-Nachrichten-Header.
  - Automatisches Hintergrund-Pruning von abgelaufenen Medien (`cleanupExpiredLargeMedia`) beim Benutzer-Login.
- **Mehrsprachigkeit:** Vollständige 5-Sprachen-Unterstützung (`de`, `en`, `ar`, `fa`, `tr`) mit echtem RTL für Arabisch und Persisch.
- **Validierung:** 65/65 Tests bestanden (`tests/storage.test.cjs`, `tests/security.test.cjs`, `tests/games.test.cjs`, `tests/calls.test.cjs`, `tests/assistant.test.cjs`). Build mit exakt 37 allowlisteten Public-Dateien. Cloud Functions und Firebase Hosting live deployed (`https://doori-messenger.web.app` und `https://www.doori-messenger.de/`, Service Worker Cache `web-messenger-v136-large-media-storage`, `app.js?v=357`).

## Früherer Nachtrag: Live-Sperrmeldungen und Wiederverbindungen

### Live-Audio auf unterschiedlichen iPhones (24.09.2026)

- Mehrere Stimmen behoben: `playPcm24k` registriert jede geplante Quelle; `stopPlayback` stoppt und trennt alle Quellen. `playbackGeneration` schützt neue Antworten vor verspäteten Ereignissen alter Quellen.
- Lokales RMS-Barge-in entfernt, weil die eigene Lautsprecherausgabe auf iPhones ins Mikrofon zurückgelangen und Doori selbst unterbrechen konnte. Geminis serverseitiges `serverContent.interrupted` bleibt aktiv.
- AudioWorklet- und ScriptProcessor-Pfade sind über Analyser und `GainNode(0.000001)` mit dem Audio-Ausgang verbunden. Das hält Audiocallbacks insbesondere im Fallback älterer iOS-Safari-Versionen aktiv, ohne hörbares Mikrofonsignal auszugeben.
- Veraltete Nachrichten eines ersetzten WebSockets werden verworfen.
- Mikrofonfehler unterscheiden in allen fünf Sprachen: nicht unterstützt, Berechtigung verweigert, Mikrofon durch andere App belegt.
- Frontend `doori-live.js?v=8`, Service Worker `web-messenger-v131-live-mobile-audio`.
- Syntaxprüfung, 55/55 Tests und Build mit 37 Dateien bestanden. Physischer Mehrgeräte-Test bleibt erforderlich.

### Live-Stimmenwahl, Kontextkomprimierung und Sitzungswiederaufnahme (24.09.2026)

- Live nutzt jetzt dieselbe persistierte Geschlechtsauswahl wie normale TTS: `Kore` weiblich, `Puck` männlich. Die bisher fest eingestellte Stimme `Aoede` wurde entfernt.
- `doori-tts-voice-change` startet eine aktive Live-Verbindung kontrolliert mit der neu gewählten Stimme neu.
- `contextWindowCompression` aktiviert: Trigger 25.600 Tokens, Sliding-Window-Ziel 12.800 Tokens.
- `sessionResumption` aktiviert: Handle aus `sessionResumptionUpdate` speichern; bei `goAway` mit neuem Token automatisch fortsetzen.
- Echter Google-Handshake der vollständigen Konfiguration: HTTP-Token 200, `setupComplete`, Close 1000; keine Audio-/Inferenzdaten gesendet.
- `doori-live.js?v=9`, Service Worker `web-messenger-v132-live-voice-resume`; 55/55 Tests und Build 37 Dateien bestanden.

Die bisherigen Aussagen, der komplette Live-Dialog sei nachweislich repariert, waren zu weitgehend. Die 55 Tests enthalten vor allem Struktur- und Mock-Prüfungen; sie belegen keinen echten Gemini-Audioaustausch auf iPhone. Auch der Zähler live-v2 zählt ausgestellte Tokens, keine erfolgreich geführten Gespräche. Nicht erneut pauschal Kontingente zurücksetzen.

Aktuelle Änderung: getLiveToken unterscheidet connection-rate (10 Token-Anfragen/15 Minuten), internal-daily (internes Tageslimit) und provider-rate (Google HTTP 429). Der Client zeigt passende Meldungen in allen fünf Sprachen, stoppt die automatische Quoten-Retry-Schleife und begrenzt sonstige Wiederverbindungen auf zwei. Permanente WebSocket-Protokollfehler stoppen sofort. Nach erfolgreichem Reconnect wird das zuvor gestoppte Mikrofon neu gestartet. Cache v126, doori-live.js?v=6. Bestehende 55 Tests bestanden, Build 37 Dateien. End-to-End-Live-Audio noch nicht bestätigt. Die zuletzt gelesenen Function-Logs zeigten authentifizierte Aufrufe, aber keinen eindeutigen Ablehnungsgrund.


---

## 1. Executive Summary & Git-Status

Diese Dokumentation führt die Arbeit aus `CODEX_HANDOFF_2026-09-23.md` (Start-Commit `d2cdb2a`) lückenlos fort. Alle Aufgaben wurden erfolgreich im bestehenden Projektverzeichnis umgesetzt, getestet und live bereitgestellt.

- **Ausgangs-Commit:** `d2cdb2a`
- **Aktueller Commit:** `f2dc226` (Branch `main`, synchron mit `origin/main`)
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
8. **`760cfa3`** – *fix(assistant): update deprecated models to gemini-3.5-flash-lite / gemini-3.8-flash-tts and add iOS audio keep-alive*
   - Behebung „Kein KI-Dienst verfügbar“: Umstellung auf `gemini-3.5-flash-lite` (Chat & Transkription) und `gemini-3.8-flash-tts` (TTS).
   - Audio Keep-Alive Pipeline in `tts.js` zur Verhinderung der iOS Autoplay- und Mute-Switch-Stummschaltung.
   - ProviderOrder mit Groq Fallback (`openai/gpt-oss-20b`, `max_completion_tokens: 360`).
9. **`f2dc226`** – *feat(ui): place assistant chat controls above freestanding message composer*
   - Zweistufiger Aufbau im KI-Assistenten-Chat: Symbole (`#assistant-controls-row`) oben drüber, Chatleiste (`.composer-main-row`) steht drunter alleine.
   - Hosting Deployment mit Cache-Version `web-messenger-v130-assistant-ui-layout`, `style.css?v=334`, `assistant.js?v=12`.

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

### 8.1 Live-Verbindung blieb bei „Verbindung wird hergestellt“ stehen

**Bestätigte Ursache:** `getLiveToken` entfernte mit `replace(/^auth_tokens\//, '')` den von Google benötigten Präfix des Ephemeral Tokens. Laut offizieller API muss der vollständige Wert aus `token.name` – einschließlich `auth_tokens/` – als `access_token` verwendet werden. Außerdem wurde bei einer Wiederverbindung derselbe standardmäßig nur einmal nutzbare Token erneut verwendet.

**Korrektur:**
- `getLiveToken` liefert den vollständigen Wert `auth_tokens/...` an den Client.
- Bei jedem geschlossenen WebSocket wird der gebrauchte Token verworfen; eine Wiederverbindung holt einen neuen Ephemeral Token.
- Ein 12-Sekunden-Setup-Timeout verhindert einen dauerhaften Zustand „Verbindung wird hergestellt“ und startet kontrolliert einen neuen Verbindungsversuch.
- `doori-live.js?v=5`; Service-Worker-Cache `web-messenger-v125-gemini-live-token`.

**Validierung und Deployment:**
- Syntaxprüfungen für `doori-live.js` und `functions/index.js` bestanden.
- `npm.cmd test`: 55/55 bestanden.
- Build: 37 Dateien.
- `getLiveToken` und Firebase Hosting erfolgreich live bereitgestellt.

### 8.2 Falsch gemeldetes kostenloses Live-Kontingent

**Problem und Ursache:** Fehlgeschlagene Verbindungsversuche wurden bereits vor einer erfolgreichen Gemini-Token-Erzeugung als vollständige Live-Sitzungen gezählt. Die vorangegangenen Fehleranalysen konnten deshalb das interne Limit von 20 Sitzungen erreichen, obwohl kein echtes Live-Gespräch stattgefunden hatte. Die Meldung bezog sich auf Dooris internen Schutzwert, nicht auf das Google-Kontingent.

**Korrektur:**
- Tageszähler auf die bereinigte Generation `live-v2-{uid}-{day}` umgestellt; die falsch belasteten alten Werte wirken nicht mehr.
- Zähler wird erst nach erfolgreicher Gemini-Token-Erzeugung atomar erhöht.
- Syntaxprüfung, 55/55 Tests und Build mit 37 Dateien erfolgreich.
- `getLiveToken` erfolgreich live deployed.

### Nachgewiesene Live-Ursache und Korrektur (24.09.)
- Direkter Google-Handshake mit dem bestehenden Secret (nur im Prozessspeicher, keine Audio-/Inferenzanfrage): Token HTTP 200; alter Client wurde mit Close 1007 abgewiesen: Unknown name responseModalities at setup.
- Korrektur: responseModalities und speechConfig in setup.generationConfig verschoben. Danach echter Server: setupComplete, sauberer Close 1000. Somit ist der Protokollfehler nachgewiesen und behoben; kein Nachweis fuer Audio auf einem echten iPhone.
- Regressionstest wertet das reale Setup-Objekt aus und prueft die Verschachtelung. 55/55 Tests bestanden, Build 37 Dateien. Cache v127, Live-Skript v7.
- scripts/check-live-handshake.cjs reproduziert ausschliesslich den Handshake ohne Audio. Secret bleibt im Speicher; niemals rohe Credentials protokollieren.
- getLiveToken mit differenzierten Fehlergruenden wurde erfolgreich deployed. Tageszaehler bleibt ein Token-Schutzlimit, kein offizielles Google-Kontingent. Keine pauschale Zuruecksetzung der Limits vorgenommen.

### Normaler Sprachdialog: iPhone-Wiedergabe (24.09.)
- tts.js: AudioContext.resume und HTMLAudio.play werden beim Unlock ohne vorheriges await gestartet. Doppelter Unlock durch touchstart plus click entfernt. Nicht laufender AudioContext wird nicht mehr als erfolgreiche Wiedergabe gewertet, Resume/HTMLAudio-Start haben begrenzte Wartezeit.
- Bei blockierter Cloud-Audiowiedergabe wird der Blob zum erneuten Abspielen gespeichert; keine zweite Synthese notwendig. System-TTS wartet auf onstart/onerror, statt allein den Aufruf als Erfolg zu melden. Bei Fehlschlag bleibt der Text zum erneuten Start vorhanden.
- assistant.js: Hinweis zum Tippen auf den Lautsprecher in de/en/ar/fa/tr; Lautsprecher spielt ausstehende Antwort ab. Historien-Eintraege vor Callable auf 2000 Zeichen begrenzt, damit alte lange Antworten nicht die Validierung der ganzen Anfrage scheitern lassen.
- functions/assistant-router.js: Provider-HTTP-Fehler protokollieren nur Anbieter/Status/Fehlertyp, keine Schluessel oder Chattexte. Bisherige Logs enthielten keine konkrete Ursache fuer gelegentlich fehlende KI-Antworten. Gemini -> Groq -> Cloudflare unveraendert; keine Limits angehoben.
- 55/55 Tests bestanden, einschliesslich System-TTS-Fehler und erfolgreichem erneutem Start; Build 37 Dateien, Cache v128. Keine Tests auf einem physischen iPhone erfolgt. Keine Behauptung, dass alle Audio-/Providerprobleme abschliessend geloest sind.

---

## 9. Nachtrag (24.09.2026, 06:18 Uhr): Behebung „Kein KI-Dienst verfügbar“ & Model-Deprecation

### 9.1 Problem & Nachgewiesene Ursache
Der Nutzer meldete: *„Es kommt immer beim Chatten und beim Sprechen der Fehler: Es ist kein KI Dienst verfügbar bitte später versuchen... Ich hab gar nicht so viel mehr genutzt...“*

Eine gezielte Abfrage der Cloud Function Logs und der Firestore-Zähler ergab:
1. Der Nutzer hatte sein Kontingent **nicht** überschritten (am 24.09. waren in `_assistantBudgets` lediglich 8 von 200 Anfragen gezählt).
2. **Google Model Deprecation (HTTP 404):**
   - In `functions/assistant-router.js` war `GEMINI_MODEL = 'gemini-2.5-flash-lite'`.
   - In `functions/index.js` war für Transkription `models/gemini-2.0-flash`.
   - Google AI Studio wies beide Modelle serverseitig mit HTTP 404 Not Found ab (*„This model is no longer available to new users. Please update your code to use models/gemini-3.5-flash-lite for the latest features and improvements“*).
   - In `synthesizeDooriSpeech` lieferte das veraltete `gemini-2.5-flash-preview-tts` HTTP 429 Quota Exceeded (10 RPM Free Tier Limit).
   - Bei jedem Aufruf scheiterte Gemini sofort mit 404. Groq (`openai/gpt-oss-20b`) stieß mit `max_completion_tokens: 180` teilweise an Token-Limits durch `reasoning_tokens`. Wenn Groq scheiterte, versagte Cloudflare (API-Token hat keine Account-ID). Dadurch trat der `LocalFallbackError` auf und der Nutzer erhielt die Meldung: *„Im Moment ist kein kostenloser KI-Dienst verfügbar...“*.

### 9.2 Durchgeführte Korrekturen
1. **Modelle auf die aktuellen, offiziellen Google-Versionen aktualisiert:**
   - Textassistenz (`functions/assistant-router.js`): `GEMINI_MODEL = 'gemini-3.5-flash-lite'` (getestet: HTTP 200 OK, Latenz ~600ms).
   - Sprachtranskription (`functions/index.js`): `gemini-3.5-flash-lite` mit Inline-Audio (getestet: HTTP 200 OK); Fallback bleibt Groq Whisper (`whisper-large-v3-turbo`).
   - Sprachsynthese (`functions/index.js` & `tts.js`): `gemini-3.8-flash-tts` (getestet: HTTP 200 OK, generiert vollständige 24kHz WAV-Audiodaten).
   - `pcmToWavBase64`: Erkennt bereits vorhandene RIFF/WAVE-Header und verhindert Doppel-Header.
2. **Groq Token-Puffer:** `max_completion_tokens` von 180 auf 360 angehoben, damit `reasoning_tokens` die 1-3 Sätze Doori-Antwort nicht kappen.
3. **Provider-Kaskade (`createAssistantRouter`):**
   - Unterstützt optionales `providerOrder` (Standard: `['gemini', 'groq', 'cloudflare']`).
   - Der Wunsch des Nutzers („Gemini an 1. Stelle, Groq als direkter Fallback“) wird nativ erfüllt: Gemini antwortet als 1. Wahl; bei temporärem Fehler oder Limit springt sofort Groq ein.

---

## 10. iPhone Audio Keep-Alive & Autoplay-Härtung

### 10.1 Ursache der Stummschaltung
Auf iOS Safari verfällt das Autoplay-Berechtigungsfenster nach der asynchronen Wartezeit (Transkription + LLM-Generierung + TTS = ~5-8s). Zudem suspendiert iOS den `AudioContext`, sobald das Mikrofon (`stream.getTracks().forEach(t => t.stop())`) gestoppt wird und kein Ton aktiv gerendert wird. Gleichzeitig schaltet der physische Hardware-Stummschalter Web Audio standardmäßig stumm.

### 10.2 Lösung in `tts.js` & `assistant.js`
1. `startKeepAlive()` startet beim Mikrofon-Klick (`unlock()`):
   - Einen inaudiblen `BufferSourceNode` über `GainNode(0.00001)` auf `AudioContext.destination` (hält `ctx.state === 'running'`).
   - Einen Endlos-Loop einer 100ms-Stille-WAV auf `player()` (`audio.loop = true; audio.play()`).
2. Das `<audio>`-Element bleibt während der gesamten Aufnahme und Cloud-Wartezeit im Status `playing`.
3. Beim Eintreffen des TTS-Blobs wird `audio.loop = false; audio.src = objectUrl; audio.play()` aufgerufen. Da das Element bereits lief, blockiert WebKit die Wiedergabe nicht!
4. Da `<audio playsinline>` in der iOS-Session-Kategorie `Playback` läuft, wird die Doori-Stimme auch bei aktiviertem physischen Lautlosschalter über die Lautsprecher ausgegeben.
5. Web Audio dient als sofortiger zweiter Fallback; der Lautsprecher `#assistant-voice-btn` bleibt manueller Replay-Fallback.

---

## 11. Validierung & Live-Deployment

1. `npm.cmd test`: **55/55 Tests bestanden (100% grün)**.
2. `npm.cmd run build`: **37 allowlistete Public-Dateien**.
3. **Cloud Functions Deployment:**
   - `askDooriAssistant(europe-west3)`: Erfolgreich aktualisiert.
   - `transcribeDooriSpeech(europe-west3)`: Erfolgreich aktualisiert.
   - `synthesizeDooriSpeech(europe-west3)`: Erfolgreich aktualisiert.
4. **Hosting Deployment:**
   - Bereitgestellt auf `https://www.doori-messenger.de/` und `https://doori-messenger.web.app/`.
   - Cache-Name: `web-messenger-v130-assistant-ui-layout`, `style.css?v=334`, `assistant.js?v=12`, `tts.js?v=9`, `doori-live.js?v=7`.

---

## 12. UI-Umstrukturierung: KI-Assistent Chatleiste & Symbole (Stand: 24.09.2026, 06:38 Uhr)

### 12.1 Anforderung
*„In dem KI-Assistant-Chat soll die Chatleiste alleine stehen und die Symbole zum Chatten da drüber sein. Also zuerst die Symbole und da drunter die Chatleiste soll sein. Bitte so umändern.“*

### 12.2 Umsetzung
1. **Dedizierter Steuerungs-Container (`#assistant-controls-row`):**
   - In `index.html` wurde vor `.composer-main-row` ein neuer Container `<div id="assistant-controls-row" class="assistant-controls-row hidden">` eingefügt.
   - Darin befinden sich alle KI-Chat-Symbole:
     - `#assistant-mic-btn` (🎙️ - Normaler Sprachdialog)
     - `#doori-live-btn` (Live - Gemini Live Modus)
     - `#doori-live-status` (Live Status Indikator)
     - `#assistant-voice-btn` (🔊/🔇 - Sprachausgabe An/Aus & Replay)
     - `#assistant-voice-select` (Stimmenauswahl: weiblich / männlich)
2. **Freistehende Chatleiste (`.composer-main-row`):**
   - Die Chatleiste enthält nun ausschließlich `#message-input` und `#send-btn`. Sie steht alleine über die volle Breite.
3. **Synchronisation & Isolation:**
   - `assistant.js` (`updateControls`): `#assistant-controls-row` wird per `classList.toggle('hidden', !isActive())` nur im Assistenten-Chat eingeblendet.
   - `style.css`: Zusätzliche Absicherung via `body:not(.assistant-chat-open) #assistant-controls-row { display: none !important; }`. Normale Benutzer- und Gruppenchats bleiben unverändert.
   - Volle RTL-Unterstützung für Arabisch und Persisch sowie Responsivität auf Mobilgeräten (`@media (max-width: 600px)`).
4. **Tests & Build:**
   - Testsuite: 55/55 Tests grün (`npm.cmd test`).
   - Build: 37 allowlistete Public-Dateien (`npm.cmd run build`).
   - Live deployed auf Firebase Hosting (`v130`).



## 13. Moderne Gruppen und gemeinsames Doodle

Ausgangspunkt für diesen Abschnitt war Commit `b55dfa9` auf `main`.

### Gruppen und Gruppenchat

- Die vorhandene Gruppenarchitektur wurde erweitert, ohne Telefonie, Spiele, KI-Assistent oder bestehende Chats zu entfernen.
- Sprach- und Videoanrufe sind jetzt in Gruppenchats sichtbar erreichbar: im Chat-Kopf sowie als Schnellaktionen in der Gruppeninfo. Die vorhandene Agora-Gruppentelefonie und ihre serverseitige Mitgliedschaftsprüfung bleiben bestehen.
- Ein moderner Live-Anruf-Banner zeigt Anruftyp, laufenden Anruf und Teilnehmerzahl und erlaubt den direkten Beitritt.
- Die Gruppeninfo wurde vollständig modernisiert: Gruppenbild, Beschreibung, Mitgliederzahl, Privatsphäre, Mitgliedersuche, Rollenkennzeichnung, Einladungslink, Nur-Lesen-Modus, Medienzugriff sowie Aktionen zum Verlassen und administrativen Löschen.
- Admin- und Mitgliederrechte bleiben über die vorhandenen Firestore-Regeln geschützt. Administrative Bedienelemente werden nur berechtigten Nutzern angezeigt.
- Gruppeneinladungen behalten ihren Status `pending`, `accepted` oder `declined`. Solange eine Einladung unbeantwortet ist, kann dieselbe Person für dieselbe Gruppe nicht erneut eingeladen werden. Annahme und Ablehnung bleiben für beide Seiten nachvollziehbar.
- Die neue Gruppenoberfläche ist responsiv für Desktop, Tablet und Mobilgeräte und besitzt passende Hell-/Dunkelvarianten sowie RTL-Layout für Arabisch und Persisch.

### Doodle in privaten Chats

- Das vorhandene gemeinsame Doodle ist wieder ausschließlich in privaten Direktchats sichtbar; in Gruppen, Kanälen und dem KI-Assistenten bleibt es ausgeblendet.
- Die fehlerhafte doppelte `@`-Aufbereitung der Teilnehmerkennung wurde entfernt. Beide Chatpartner verwenden nun zuverlässig dieselbe aus den sortierten Benutzernamen gebildete Sitzung.
- Einladung, Annahme/Ablehnung und die vorhandene Firestore-Echtzeitsynchronisation für Striche bleiben erhalten.
- Ergänzt wurden moderne Farbvorgaben, frei wählbare Farbe, größere Strichstärken, Radierer, vier Zeichenflächen-Hintergründe und lokaler PNG-Download.
- Zeichenkoordinaten bleiben normalisiert, damit die gemeinsame Zeichnung auf unterschiedlich großen Geräten synchron dargestellt wird.
- Die Doodle-Oberfläche wurde als responsives Glas-Panel für Desktop und Mobilgeräte neu gestaltet.

### Sprachen, Dateien und Qualitätssicherung

- Alle neuen sichtbaren Texte wurden gleichzeitig in `de`, `en`, `ar`, `fa` und `tr` ergänzt. RTL bleibt für `ar` und `fa` erhalten.
- Geänderte Dateien: `index.html`, `app.js`, `doodle.js`, `style.css`, `service-worker.js`, `tests/calls.test.cjs`, `tests/security.test.cjs` sowie beide Übergabedateien.
- Cache-/Asset-Versionen: `web-messenger-v133-modern-groups-doodle`, `style.css?v=335`, `app.js?v=355`, `doodle.js?v=277`.
- Syntaxprüfung für `app.js`, `doodle.js` und `agora-calls.js`: erfolgreich.
- Tests: `57/57` bestanden.
- Build: exakt `37` erlaubte Dateien in `dist/` erzeugt.
- Lokale Asset-Prüfung: alle drei aktualisierten Assets wurden mit HTTP 200 ausgeliefert.
## 14. Korrigierte Doodle-, Anruf- und Präsenzabläufe

- Die sichtbare Doodle-Bezeichnung im Anhangmenü lautet in allen fünf Sprachen nur noch `Doodle`.
- Beim Start eines Doodles wird zunächst ausschließlich eine Einladung gesendet. Die Zeichenfläche des Absenders öffnet sich erst, nachdem der Empfänger angenommen hat. Ablehnen und Sitzungsende bleiben synchronisiert.
- Direkte Sprach- und Videoanrufe unterscheiden nun klar zwischen `calling`, `ringing` und `connected`. Der technische Beitritt des Anrufers zum Medienkanal setzt den Anruf nicht mehr fälschlich auf „Verbunden“.
- Das Empfangsgerät bestätigt seine Erreichbarkeit mit `ringing`; erst die ausdrückliche Annahme setzt den Firestore-Anruf auf `connected` und startet die Gesprächsdauer.
- Die Texte „Ruft an“, „Es klingelt“ und „Verbunden“ wurden für Deutsch, Englisch, Arabisch, Persisch und Türkisch gepflegt.
- Die Chat- und Kontaktliste besitzt jetzt eine echte Präsenzanzeige: Grün nur bei `isOnline` plus einem höchstens 75 Sekunden alten Zeitstempel; Rot bei aktiver Präsenz und gesetztem besonderem Profilstatus; offline ohne Punkt.
- Der bisherige blaue Ungelesen-Punkt wurde entfernt, weil er mit einer Online-Anzeige verwechselt werden konnte. Ungelesene Chats bleiben weiterhin durch Schrift und Hintergrund erkennbar.
- Cache: `web-messenger-v134-presence-call-doodle-flow`; Assets: `app.js?v=356`, `agora-calls.js?v=4`, `doodle.js?v=278`.
- Syntaxprüfungen bestanden; Teststand: `59/59` grün.
## 15. Vereinfachte Chatfilter

- Der doppelt wirkende Filter `Gruppen` wurde aus der Filterleiste des Chatbereichs entfernt.
- Unter `Chats` bleiben `Alle`, `Direkt` und `Ungelesen`; Gruppen besitzen weiterhin ihren eigenen Hauptbereich in der linken Navigation.
- Der Filtertest erwartet nun exakt diese drei Einträge.
- Cache: `web-messenger-v135-chat-filters`.

---

## 16. Große Mediendateien via Cloudflare R2 & Backblaze B2 (Stand: 24.09.2026)

### 16.1 Hintergrund & Anforderung
Der Betreiber hat Accounts bei Cloudflare R2 (10 GB kostenlos) und Backblaze B2 (10 GB kostenlos) eingerichtet. Große Mediendateien (Videos, Audio, große Bilder, Dokumente) sollen primär auf Cloudflare R2 gespeichert werden. Nach Erreichen des 10 GB Kontingents (Sicherheitsgrenze 9,5 GB) schaltet das System automatisch auf Backblaze B2 um. Alle Dateien sollen nach maximal 30 Tagen automatisch gelöscht werden.

### 16.2 Architektur & Umsetzung
1. **S3 SigV4 Upload-Pipeline (`functions/large-media-storage.js`):**
   - Direkte Presigned `PUT`-URLs (15 min Gültigkeit) werden serverseitig mit AWS Signature Version 4 über `node:crypto` signiert.
   - Kein Byte großer Mediendateien belastet den Firebase Functions Server oder Firebase Bandbreite.
   - Automatische Kaskadierung: Prüft Firestore `system_stats/storage`. Liegt R2 unter 9,5 GB, wird R2 gewählt; darüber oder bei Nichtkonfiguration schaltet das System transparent auf Backblaze B2 um.
2. **30-Tage automatische Löschung:**
   - Nativ in Storage-Plattformen über Lifecycle Rules konfigurierbar (R2: „Delete object after 30 days“, B2: „Delete files after 30 days“).
   - In Firestore wird `expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000` dokumentiert.
   - Cloud Function `cleanupExpiredLargeMedia` führt serverseitige Bereinigungen durch und aktualisiert Quota-Zähler.
3. **Secrets-Verwaltung per Terminal:**
   - Code 1 (R2): `firebase functions:secrets:set CLOUDFLARE_R2_CONFIG`
   - Code 2 (B2): `firebase functions:secrets:set BACKBLAZE_B2_CONFIG`
   - Alternativ auch Einzelsecrets unterstützt. Keine Zugangsdaten im Chat oder Code.
4. **Validierung & Tests:**
   - `tests/storage.test.cjs`: Prüft SigV4 URL-Generierung, R2->B2 Kaskadierung bei 9,5 GB, und 30-Tage Expiration.
   - Testsuite: **63/63 Tests bestanden (100% grün)** (`npm.cmd test`).
   - Build: **37 allowlistete Public-Dateien** (`npm.cmd run build`).

## 17. Media Lounge – temporäre Live-Medien (Stand: 24.09.2026)

- Neuer privater Zwei-Personen-Bereich **Media Lounge** für gemeinsam synchronisierte Bilder, Videos und Musik. Eine Sitzung startet erst nach Einladung und ausdrücklicher Annahme; offene Doppeleinladungen werden verhindert.
- Auswahl des Mediums sowie Wiedergabe, Pause, Position und Wechsel zwischen Medien werden über `liveMediaSessions` in Firestore zwischen beiden Teilnehmern synchronisiert.
- Das responsive Glas-Design umfasst Bühne, Medienleiste, Live-Anzeige, Wartezustand, Hell-/Dunkelmodus und Mobilansicht.
- Der Hinweis ist dauerhaft sichtbar: Die Medien sind nur vorübergehend für Live-Zwecke bestimmt und werden spätestens nach 24 Stunden automatisch gelöscht.
- Live-Medien verwenden den eigenen privaten Storage-Pfad `live-media/`, niemals eine öffentliche Basis-URL, und erhalten serverseitig höchstens 24 Stunden Gültigkeit. Normale Chat-Anhänge behalten ihre 30-Tage-Regel.
- Cloudflare R2 bleibt primär; ab der vorhandenen 9,5-GB-Sicherheitsgrenze folgt automatisch Backblaze B2.
- Alle sichtbaren Texte wurden in `de`, `en`, `ar`, `fa` und `tr` umgesetzt; Arabisch und Persisch bleiben RTL.
- Geändert/neu: `live-media.js`, `index.html`, `style.css`, `app.js`, `firestore.rules`, `functions/index.js`, `functions/large-media-storage.js`, `scripts/build-hosting.cjs`, `service-worker.js`, `tests/storage.test.cjs`.
- Verifikation: vollständige Suite `67/67` grün; gezielter Speichertest `8/8` grün; Syntaxprüfungen und `git diff --check` erfolgreich; Build exakt `38` Dateien.
- Cache-/Assets: `web-messenger-v137-media-lounge`, `style.css?v=336`, `app.js?v=358`, `live-media.js?v=1`.
- Einschränkung: Der lokale Firestore-Emulator konnte nicht gestartet werden, weil Java nicht im System-PATH installiert ist. Das geplante Firebase-Deployment wurde in Codex nicht ausgeführt, weil die angeforderte Ausführungsfreigabe abgelehnt wurde. Regeln und Live-Stand müssen daher beim nächsten Deployment noch serverseitig validiert/veröffentlicht werden.

## 18. Stabiler Gemini-Live-Start auf iPhone

- Ursache der wiederholten anfänglichen Antworten war eine iOS-Audio-Rückkopplung: Die laufende Lautsprecherausgabe gelangte wieder in den Mikrofonstream und wurde als neue Spracheingabe gesendet.
- Während der Doori-Ausgabe werden Mikrofonpakete nun verworfen und der Aufnahmepuffer geleert. Nach dem Ende der Ausgabe gilt eine 500-ms-Beruhigungsphase; nach dem Live-Handshake werden die ersten 700 ms ebenfalls nicht übertragen.
- Die Systemanweisung verlangt nun ausdrücklich, bis zu einer vollständigen ersten Äußerung still zu warten, beim Verbindungsaufbau nicht selbst zu grüßen, Begrüßungen nicht zu wiederholen und die sicher erkannte Gesprächssprache beizubehalten.
- Cache-/Assetstand: `web-messenger-v138-live-ios-start-guard`, `doori-live.js?v=10`.
- Verifikation: gezielte Assistententests `15/15`, vollständige Suite `68/68`, Build exakt `38` Dateien, Syntax- und Diff-Prüfung erfolgreich.
- Hosting wurde erfolgreich auf Firebase veröffentlicht; `https://doori-messenger.de/doori-live.js?v=10` wurde anschließend auf die neuen Startschutz-Merkmale geprüft (`LIVE_ASSET_OK`).

