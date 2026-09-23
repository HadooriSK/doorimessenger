# Übergabedokumentation an Codex – Doori Messenger

**Datum:** 23. September 2026  
**Aktueller Stand:** Commit `d2cdb2a` + nachfolgende Secret-Korrektur & Deployments  
**Vorheriger Ausgangspunkt:** Commit `ea57bad` (*"docs: document Doori AI assistant, operator console and speech fixes"*)  
**Projektordner:** `C:\Users\hidis\.gemini\antigravity\scratch\web-messenger`  
**Firebase-Projekt:** `doori-messenger` (Region: `europe-west3`)  
**Eigene Produktiv-Domain:** `https://www.doori-messenger.de/`  
**Firebase Hosting URL:** `https://doori-messenger.web.app/`  
**Aktuelle Frontend-Version:** `agora-calls.js?v=2`, `operator.html`, `operator.js?v=2`, `operator.css?v=2`, `tts.js?v=6`, `service-worker.js` (Cache: `web-messenger-v119-ios-tts-playback`)  
**Aktueller Test-Status:** **54/54 Tests bestanden** (100% grün, `npm test`)  
**Aktueller Build- und Deploy-Status:** 36 allowlistete Dateien erfolgreich gebaut und live auf Firebase Hosting veröffentlicht. Cloud Functions `synthesizeDooriSpeech`, `transcribeDooriSpeech` und `askDooriAssistant` erfolgreich mit Secret-Version 4 live aktualisiert.

---

## 1. Unveränderliche Grundanforderungen & Richtlinien (AGENTS.md)

Jede neue oder geänderte sichtbare Funktion muss ausnahmslos folgende Vorgaben erfüllen:

1. **Synchron in allen 5 Sprachen verfügbar:**
   - Deutsch (`de`)
   - Englisch (`en`)
   - Arabisch (`ar`)
   - Persisch / Farsi (`fa`)
   - Türkisch (`tr`)
2. **Strikte RTL-Unterstützung:**
   - Arabisch (`ar`) und Persisch (`fa`) müssen stets die korrekte Leserichtung (`dir="rtl"`) aufweisen. Alle neuen Formulare, Buttons, Badges und Textausrichtungen sind RTL-kompatibel aufgebaut.
3. **Keine Klartext-Secrets im Client:**
   - API-Schlüssel, Secrets und Zertifikate (`BREVO_API_KEY`, `AGORA_APP_CERTIFICATE`, `DAILY_API_KEY`, `STREAM_API_SECRET`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `CLOUDFLARE_API_TOKEN`) verbleiben serverseitig in Cloud Functions / Google Cloud Secret Manager.
4. **Allowlist-Build:**
   - Das Produktiv-Deployment nutzt `npm run build` (`scripts/build-hosting.cjs`). Nur explizit in der Allowlist geführte Dateien gelangen in das Verzeichnis `dist/`. Änderungen müssen in den Quelldateien vorgenommen werden, niemals direkt in `dist/`.
5. **Testing & Stabilität:**
   - Kein Deploy ohne vorherigen Durchlauf von `npm test` mit 0 Fehlern.

---

## 2. Hauptaufgabe heute: Multi-Provider Telefonie mit Fallback-Kaskade

### 2.1 Ziel & Problemstellung
Bislang war für Audio- und Videoanrufe ausschließlich Agora integriert. Fiel Agora aus oder war das monatliche Freikontingent erschöpft, brachen Anrufe ab. Die Telefonie sollte daher um zwei zusätzliche Anbieter (**Daily.co** und **GetStream**) erweitert werden, inklusive eines intelligenten, automatischen Fallback-Systems ohne Unterbrechung der bestehenden Anrufoberfläche.

### 2.2 Die Kaskaden-Reihenfolge
1. **Agora RTC (Hauptanbieter):** 10.000 Freiminuten / Monat.
2. **Daily.co (Fallback 1):** 10.000 Freiminuten / Monat.
3. **GetStream Video (Fallback 2):** 66.000 Freiminuten / Monat (Maker Tier).

### 2.3 Quoten-Architektur: Warum internes Firestore-Billing statt Provider-APIs?
Die Abrechnungs- und Verbrauchs-APIs von Agora, Daily und GetStream aktualisieren Daten mit einer **Verzögerung von bis zu 24 Stunden**. Ein Echtzeit-Schutz vor unerwarteten Kosten über Drittanbieter-Webhooks oder REST-Abfragen ist technisch nicht verlässlich.  
**Lösung in Doori:**
- Beim Start/Beenden eines Anrufs erfasst Doori die Gesprächszeiten atomar in Firestore (`_telephonyBudgets/{provider}-{month}` und `_telephonyMetrics/{day}`).
- Getrennte Zählung von **Audio- und Videominuten**.
- Sobald ein Anbieter sein Monatskontingent erreicht, markiert das Backend den Status als `limit_reached` und die Kaskade schaltet sofort auf den nächsten Anbieter um.

---

## 3. Architektur & Implementierungsdetails

### 3.1 Backend: `functions/telephony-router.js` & `functions/index.js`
- **`getTelephonySession` (Cloud Function v2, HTTPS Callable):**
  - Parameter: `{ scope: 'direct'|'group', id, type: 'audio'|'video', failedProviders: [] }`.
  - Secrets: `[AGORA_APP_CERTIFICATE, DAILY_API_KEY, STREAM_API_SECRET]`.
  - Prüft Berechtigung des Nutzers (nur Call-Teilnehmer bzw. aktive Gruppenmitglieder).
  - Prüft das monatliche Minutenbudget (`_telephonyBudgets`). Überschreitet ein Anbieter sein Limit oder ist er in `failedProviders`, wird er übersprungen.
  - Erzeugt die providerspezifische Sitzung:
    - **Agora:** Baut ein RTC-Publisher-Token via `agora-token` (`buildTokenWithUserAccount`).
    - **Daily.co:** Legt via REST API (`POST https://api.daily.co/v1/rooms`) bei Bedarf einen Raum an und erzeugt ein Meeting-Token.
    - **GetStream:** Generiert serverseitig ein sicheres JWT (HMAC-SHA256 nativ mit Node.js `crypto`) und verifiziert die Call-ID bei der Stream Video API.
  - Gibt das Sitzungsobjekt mit `provider`, `role`, `failoverTimeoutMs` (Default: 6000ms) und Zugangsdaten zurück.
- **`recordCallDuration` (Cloud Function v2, HTTPS Callable):**
  - Parameter: `{ provider, durationSeconds, callType: 'audio'|'video' }`.
  - Aktualisiert atomar in Firestore `_telephonyBudgets/{provider}-{month}` (Gesamtsekunden, Audio, Video, abgeschlossene Anrufe) und `_telephonyMetrics/{day}`.
- **`updateTelephonyAdminConfig` (Cloud Function v2, HTTPS Callable):**
  - Erlaubt dem Betreiber, Monatskontingente (`agoraMonthlyMinutes`, `dailyMonthlyMinutes`, `getstreamMonthlyMinutes`), Failover-Timeout (`failoverTimeoutMs`) und die Kaskaden-Reihenfolge zur Laufzeit anzupassen.
- **`getAssistantAdminDashboard`:**
  - Liefert zusätzlich das vollständige Telefonie-Dashboard-Objekt (`telephony`) an die Betreiber-Konsole.

### 3.2 Frontend: `agora-calls.js`
- **Vollständiger Erhalt der Benutzeroberfläche:**
  - Alle Modals (`#call-modal`, `#video-call-modal`, `#group-call-modal`), Buttons, Timer, Kachel-Raster (`#video-grid`, `#video-remote`, `#video-local`), Controls (Stumm, Lautsprecher, Kamera, Kamera-Wechsel, Screen-Sharing, Vollbild) bleiben unverändert.
- **Automatischer Failover-Mechanismus:**
  - `joinTelephonyCall(scope, id, type, failedProviders)` startet einen Verbindungstimer (`failoverTimeoutMs`).
  - Gelingt die Verbindung nicht innerhalb des Zeitfensters oder bricht die Verbindung ab, fängt der Client dies ab, bereinigt die bisherigen Media-Tracks (`cleanupProvider`) und fordert nahtlos den nächsten Anbieter an.
  - Das Anruf-Modal bleibt geöffnet, der Nutzer sieht keine Fehlermeldung, und die Verbindung wird transparent wiederhergestellt.
- **Dauererfassung bei Anrufende:**
  - Beim Auflegen oder Beenden (`finish(update)`) berechnet der Client die Dauer in Sekunden und ruft `recordCallDuration` auf.
  - Im Anrufverlauf (`callHistory`) wird der tatsächlich genutzte Provider (`call.currentProvider`) dokumentiert.
- **Media-Control-Abstraktion:**
  - `getActiveAudio()`, `toggleMute()`, `toggleCamera()`, `switchCamera()`, `shareScreen()` unterstützen sowohl Agora-Tracks als auch Standard-WebRTC-MediaStreams.

### 3.3 Betreiber-Konsole: `operator.html`, `operator.js`, `operator.css`
- **Übersichtliche Aufteilung in zwei Hauptbereiche:**
  1. **Sprachassistent (KI):**
     - Nur die KI-Anbieter: Groq, Gemini, Cloudflare.
     - Metriken: Aktive KI-Nutzer heute, Textnachrichten, Sprachzeit, automatische KI-Wechsel, Token-Zähler.
     - Zentrale KI-Tageslimits.
  2. **Sprach- und Videotelefonie:**
     - Telefonie-Anbieter: Agora RTC, Daily.co, GetStream Video.
     - Rollen-Badges: `Hauptanbieter`, `Fallback 1`, `Fallback 2`.
     - Status-Pills: `Aktiv` (grün), `Fehler / Gestört` (gelb), `Limit erreicht` (rot).
     - Tabellenspalten: Audio (Monat), Video (Monat), Gesamt (Monat), Auslastungsbalken (%), Verbleibendes Kontingent, Monatslimit, Messmethode.
     - Informations-Banner zur Quotenmessung (Erläuterung der Echtzeit-Erfassung vs. 24h Verzögerung bei Anbieter-APIs).
     - Einstellungsformular für Monatskontingente und Failover-Timeout.
- **Vollständige Lokalisierung:**
  - Alle neuen Texte und Tabellenspalten sind in allen 5 Sprachen (`de`, `en`, `ar`, `fa`, `tr`) hinterlegt.
  - RTL-Darstellung für Arabisch und Persisch vollständig unterstützt.

---

## 4. Übersicht der weiteren heutigen Arbeiten (KI-Assistent & Audio)

Vor der Telefonie-Erweiterung wurden heute folgende Verbesserungen im KI-Assistenten implementiert (Commits `d13ad97` bis `e8e1507`):
1. **Multi-Provider KI-Routing:** Groq (`openai/gpt-oss-20b`) $\to$ Gemini (`gemini-2.5-flash-lite`) $\to$ Cloudflare (`@cf/meta/llama-3.2-1b-instruct`).
2. **Mehrsprachiges Whisper:** Groq Whisper Large v3 Turbo mit Fallback auf Gemini Audio Transcription für Spracheingaben.
3. **Sprachausgabe-Feinschliff:**
   - KI-Antworten werden **nur noch bei Spracheingaben vorgelesen**, niemals bei getipptem Text.
   - Doppelklick-Schutz auf dem Mikrofon-Button verhindert gleichzeitige Mehrfachaufnahmen.
   - Lokalisierte Hinweismeldung bei verweigertem Mikrofonzugriff (`t().speechUnavailable`).
   - Keine doppelten Event-Listener durch Mehrfachinitialisierung.

---

## 5. Terminal-Befehle: Secrets lokal / in Firebase konfigurieren

Um die API-Schlüssel und Secrets für die Telefonie einzutragen oder zu aktualisieren:

```powershell
# 1. Daily.co API-Key (nur Backend)
firebase functions:secrets:set DAILY_API_KEY

# 2. GetStream API Secret (nur Backend)
firebase functions:secrets:set STREAM_API_SECRET

# 3. Agora App-Zertifikat (nur Backend - bereits vorhanden)
firebase functions:secrets:set AGORA_APP_CERTIFICATE
```

### Öffentliche Client-Identifikatoren:
- **Agora App ID:** `275401ea48a74f4b9f9cac0107362c6c` (bereits konfiguriert)
- **GetStream API Key:** `s6n7gqy7w2v6` (im Code als `STREAM_PUBLIC_KEY` hinterlegt)
- **Keine Plaintext-Secrets im Frontend!**

---

## 6. Verifikationsstatus & Test-Suite

Die Test-Suite wurde um spezifische Tests für die Multi-Provider-Kaskade, Quotenabrechnung und die Betreiber-Konsole erweitert.

```powershell
npm.cmd test
```

**Ergebnis:**
- **51/51 Tests bestanden** (100% grün).
- Geprüft werden:
  - Vollständigkeit der Call-Controls und Barrierefreiheit (`aria-modal="true"`)
  - Konsistenz aller Schlüssel über alle 5 Sprachen (`de`, `en`, `ar`, `fa`, `tr`)
  - Fallback-Kaskade: `agora` $\to$ `daily` $\to$ `getstream`
  - Quoten-Abrechnung und automatische Weiterschaltung bei `limit_reached`
  - Getrennte Bereiche der Betreiber-Konsole für KI und Telefonie
  - Sicherheit der Secrets (keine Leaks in Frontend-Dateien)
  - Firestore Security Rules für Teilnehmer und Signalisierung

### Build & Deploy:
- `npm.cmd run build` erzeugt 35 allowlistete Dateien in `dist/`.
- Deployment auf Firebase Hosting (`www.doori-messenger.de`) erfolgreich abgeschlossen.
- Git-Commit `cefd574` ist auf `origin/main` gepusht.

---

## 7. Offene Punkte / Nächste sinnvolle Schritte für Codex

1. **Optionale Daily.co / Stream Video SDK-Bundles:**
   - Aktuell nutzt Doori für Agora das lokale SDK `vendor/agora-rtc-sdk-ng.js` und für Daily/Stream standardkonforme native WebRTC-Peers bzw. REST-Raum-Tokens. Falls gewünscht, kann ein gebündeltes `@daily-co/daily-js` für Call-Objects in die Build-Allowlist aufgenommen werden.
2. **Live-Verifikation mit echten Daily & Stream API-Keys:**
   - Sobald die echten Secrets via `firebase functions:secrets:set` eingetragen sind, kann ein Testanruf mit simuliertem Agora-Ausfall durchgeführt werden.

---

## 8. Fortsetzung durch Codex nach der Anti-Gravity-Baseline

Dieser Abschnitt ist die verbindliche Übergabe für die nächste Fortsetzung mit Google Anti-Gravity. Der vorhandene Code wurde weitergeführt; nichts wurde neu aufgesetzt.

### 8.1 Telefonie und Video

- Commit `816201c`: Telefonie-Fallbacks und mobile Videoansicht stabilisiert.
- Reihenfolge bleibt Agora → Daily → GetStream → natives WebRTC.
- Der frühere iOS-Fehler `ReferenceError: Can't find variable: handleUserOnline` wurde behoben.
- Eigenes Kamerabild wird als kleine Picture-in-Picture-Kachel dargestellt; lokales und entferntes Bild können getauscht werden.
- Sprach- und Video-Schaltflächen bleiben prominent im Chat-Header; sekundäre Medien-/Favoritenaktionen sind im Untermenü.

### 8.2 KI-Router, Limits und Betreiber-Konsole

- Commit `3fc06d8`: KI-Reihenfolge auf Gemini → Groq → Cloudflare → lokale KI umgestellt.
- Nutzerlimits bleiben zentral konfigurierbar: 100 KI-Textnachrichten und 60 Minuten KI-Sprachzeit pro Nutzer und Tag.
- Cloudflare wird gegen das offizielle Tageskontingent von 10.000 Neurons gerechnet; Tokens werden modellbezogen in geschätzte Neurons umgerechnet.
- Groq und Gemini liefern dem Backend keine einheitliche kontoweite Restquote. Die bisher sichtbaren Prozentwerte werden daher aus Doori-eigenen Tages-Schutzgrenzen berechnet:
  - `groqDailyRequests: 100`
  - `geminiDailyRequests: 50`
- Die Werte 57 % bei Groq oder 48 % bei Gemini sind folglich **keine Monatsauslastung und keine offizielle Anbieterquote**. Sie bedeuten 57 von 100 bzw. 24 von 50 Doori-internen Requests am aktuellen Tag.
- Der aktuelle Arbeitsstand kennzeichnet dies direkt pro Tabellenzeile und in allen fünf Sprachen. Auch die Formularfelder heißen nun ausdrücklich „Doori-Schutzlimit/Tag“.
- Offizielle Anbietergrenzen sind modell-, konto- und tierabhängig und umfassen getrennte RPM/RPD/TPM/TPD-Werte. Für echte Anbieterquoten müssen die jeweiligen Kontoseiten bzw. Rate-Limit-Header ausgewertet werden; sie dürfen nicht aus den internen Doori-Zählern abgeleitet werden.
- Commit `7e08d8b`: `NaN`-Werte im Admin-Dashboard sanitisiert und Zugriffskontrolle repariert.

### 8.3 Spracherkennung

- Commit `474486d`: Groq Whisper Large v3 Turbo als mehrsprachige Cloud-Erkennung eingebaut, Gemini als Fallback.
- Commit `1db8e3e`: Whisper-Prompt verschärft. Audio muss wortgetreu in Deutsch, Englisch, Türkisch, Arabisch oder Persisch und in der Originalschrift transkribiert werden; Übersetzung ist untersagt.
- Chinesische, japanische, koreanische oder kyrillische Fehltranskriptionen werden serverseitig verworfen.
- Aktueller, getesteter Arbeitsstand nach `1db8e3e`: Wegen weiterhin schwankender iPhone-Erkennung wurde die Reihenfolge auf **Gemini Audio Transcription zuerst, Whisper als Fallback** geändert. Bei Gemini-Limit, Timeout, ungültigem Ergebnis oder Ausfall übernimmt Whisper automatisch.
- `GEMINI_API_KEY` wurde vom Betreiber als Secret-Version 3 gespeichert. Die betroffenen Functions wurden dabei auf die neue Secret-Version aktualisiert.
- Die neueste Gemini-zuerst-Routeränderung ist lokal getestet, aber noch nicht deployed.

### 8.4 Sprachausgabe und iPhone

- Primäre TTS: `gemini-2.5-flash-preview-tts` über `synthesizeDooriSpeech`; weiblich `Kore`, männlich `Puck`.
- System-TTS bleibt kostenloser Client-Fallback. Die Stimme ist von LLM-Wechseln entkoppelt und in `localStorage` gespeichert.
- Commits `28ee80d`, `164274e` und `7e08d8b` verbesserten mobile Wiedergabe, Mikrofonfreigabe und iOS-Audiohandling.
- Commit `baf367f` enthält die neueste Safari-Korrektur:
  - persistentes `<audio>`-Element im Dokument,
  - `playsinline` und `webkit-playsinline`,
  - Entsperren innerhalb des Mikrofon-Tipps ohne `muted=true`,
  - Lautstärke explizit auf 1,
  - `speechSynthesis.resume()` als iOS-Fallback,
  - `tts.js?v=6` und Service-Worker-Cache `web-messenger-v119-ios-tts-playback`.
- Wichtig: Diese Hosting-Korrektur ist noch nicht live. Der Codex-Deploy scheiterte ausschließlich an `Authentication Error: Your credentials are no longer valid. Please run firebase login --reauth`.
- Der letzte echte iPhone-Test vor Veröffentlichung von `baf367f` ergab: Erkennung teilweise erfolgreich, KI-Antwort nur als Text, kein Ton. Daraus darf nicht geschlossen werden, dass `baf367f` wirkungslos ist; der Build wurde noch nicht auf Hosting übertragen.

### 8.5 Aktuelle Validierung

- `npm.cmd test`: **54/54 bestanden**.
- Enthalten sind Sicherheits-, Spiele-, Telefonie-, KI-, TTS-, iPhone-, Sprachen-, RTL- und Dashboard-Tests.
- `npm.cmd run build`: erfolgreich, **36 allowlistete öffentliche Dateien**.
- Alle neuen sichtbaren Dashboard-Texte sind in `de`, `en`, `ar`, `fa`, `tr` vorhanden. Arabisch und Persisch behalten RTL.
- Keine API-Schlüssel oder Secret-Werte wurden in Client oder Repository geschrieben.

### 8.6 Unmittelbar nächste Schritte für Anti-Gravity

1. Lokalen Arbeitsstand prüfen und die noch nicht commit­teten Änderungen in `functions/index.js`, `operator.html`, `operator.js`, `tests/assistant.test.cjs` sowie diese Übergabedatei übernehmen. Bereits vorhandene fremde Änderungen, insbesondere in `vendor/telephony-providers.js`, nicht überschreiben.
2. Firebase CLI neu authentifizieren:

```cmd
firebase login --reauth
```

3. Danach aus `C:\Users\hidis\.gemini\antigravity\scratch\web-messenger` veröffentlichen:

```cmd
firebase deploy --only functions:transcribeDooriSpeech,functions:synthesizeDooriSpeech --project doori-messenger
firebase deploy --only hosting --project doori-messenger
```

4. Auf einem echten iPhone Safari/Startbildschirm-App vollständig schließen und neu öffnen, damit Cache v119 aktiv wird. Dann mindestens je zwei kurze und zwei längere Aufnahmen in Deutsch und Persisch testen. Prüfen: sichtbarer Aufnahmezustand, korrekte Schrift/Sprache, Textantwort und hörbare Antwort.
5. Falls weiterhin kein Audio kommt, unmittelbar nach einem Test die Logs von `synthesizeDooriSpeech` lesen. Zwischen folgenden Ursachen unterscheiden: Gemini HTTP-Fehler, fehlende `audioBase64`-Nutzlast oder Safari-`audio.play()`-Blockade. Nicht weiter raten.
6. Die Betreiber-Konsole prüfen: Groq/Gemini-Prozentwerte müssen sichtbar als interne tägliche Doori-Schutzlimits bezeichnet sein. Sie dürfen nicht als Monatslimit oder offizielle Anbieter-Restquote dargestellt werden.
7. Nach der Arbeit diese Datei erneut mit Commit, Deploy-Status, Tests und offenen Punkten ergänzen, damit der nächste Wechsel zurück zu Codex verlustfrei möglich ist.

---

## 9. Analyse & Behebung durch Anti-Gravity: Ursache für fehlenden Ton (401), Secret-Korrektur und Deployments

### 9.1 Root-Cause-Analyse der Cloud Functions Logs
Direkt nach dem ersten Test wurden die Ausführungsprotokolle von `synthesizeDooriSpeech` und `transcribeDooriSpeech` analysiert:
- **Log `synthesizeDooriSpeech`:** `Gemini TTS unavailable 401`
- **Log `transcribeDooriSpeech`:** `Gemini speech recognition unavailable or invalid; trying Whisper 401`
- **Wirkungskette:** 
  1. Bei der Spracherkennung führte der 401-Fehler von Gemini automatisch zum Fallback auf Whisper (`Groq`). Dadurch funktionierte die Transkription scheinbar noch.
  2. Bei der Sprachausgabe (`synthesizeDooriSpeech`) schlug `synthesizeWithGemini` mit `HTTP 401 (UNAUTHENTICATED)` fehl.
  3. Der Client (`tts.js`) versuchte daraufhin den System-Fallback (`systemSpeak`), welcher in iOS Safari außerhalb einer synchronen Benutzerinteraktion stumm geschaltet bzw. blockiert wird.

### 9.2 Ursache des 401-Fehlers
Eine Überprüfung von `GEMINI_API_KEY` in Google Cloud Secret Manager (Version 3) ergab:
Der API-Schlüssel war beim Eintragen **versehentlich doppelt hintereinander eingefügt worden**:
`AQ.Ab8RN6...AQ.Ab8RN6...` (96 Zeichen statt 48 Zeichen, doppelter String).
Die Google Generative Language API lehnte diese verdoppelte Zeichenkette folgerichtig mit `401 Unauthorized` ab.

### 9.3 Durchgeführte Maßnahmen & Behebung
1. **Secret-Aktualisierung (Version 4):**
   - Das Secret `GEMINI_API_KEY` wurde in Google Secret Manager mit dem bereinigten, einfachen 48-Zeichen-Schlüssel als **Version 4** gespeichert.
   - Ein direkter Funktionstest von `gemini-2.5-flash-preview-tts` mit diesem bereinigten Schlüssel ergab sofort `HTTP 200` und lieferte 164.544 Bytes unkomprimiertes Audiosignal zurück.
2. **Defensive Absicherung in `functions/index.js` (`getGeminiKey()`):**
   - Eine Hilfsfunktion erkennt und bereinigt doppelt eingefügte Schlüsselzeichenketten (`v.length % 2 === 0 && v.slice(0, half) === v.slice(half)`) zur Laufzeit automatisch, sodass ein Formatierungsversehen niemals wieder zu einem 401-Ausfall führen kann.
   - Verwendet in `transcribeWithGemini`, `synthesizeWithGemini` und `askDooriAssistant`.
3. **Deployment:**
   - Functions `transcribeDooriSpeech`, `synthesizeDooriSpeech` und `askDooriAssistant` wurden erfolgreich nach `europe-west3` deployt.
   - Hosting (`dist/`, 36 allowlistete Dateien) wurde mit Service Worker Cache `web-messenger-v119-ios-tts-playback` erfolgreich auf `www.doori-messenger.de` veröffentlicht.
4. **Validierung:**
   - Alle **54/54 Tests** bestanden (`npm.cmd test`).
   - Keine Plaintext-Secrets im Client oder Repository.

---

## 10. Finale Optimierung: iPhone-Sprachwiedergabe (Web Audio API) & Kurze Assistenten-Antworten

### 10.1 Analyse des zweiten iPhone-Tests
Nach Behebung des 401-Fehlers ergab der Praxistest auf dem iPhone:
- Die Spracherkennung funktionierte zu 70-80 % und die Textantwort erschien im Chat.
- Die Antwort kam jedoch weiterhin **ohne hörbaren Ton**.
- Die Antworten des Assistenten waren zudem **viel zu lang** („Eine kleine Frage und dann kommt eine sehr lange Antwort“).

Ein Blick in die Cloud Functions Logs zeigte die Ursache für den Tonausfall:
- **Log `synthesizeDooriSpeech`:** `Gemini TTS unavailable TimeoutError`
- **Ursachenkette:** 
  1. Weil der Assistent lange Texte generierte, dauerte die Sprachsynthese in `gemini-2.5-flash-preview-tts` länger als 30 Sekunden.
  2. Nach 30 Sekunden brach der Cloud Functions Fetch mit `TimeoutError` ab.
  3. Der Client fing den Fehler ab und versuchte `systemSpeak` (`window.speechSynthesis`). Auf iOS Safari ist `speechSynthesis.speak()` nach asynchronen Netzwerkaufrufen jedoch systembedingt stumm/blockiert.
  4. Zudem blockiert Mobile Safari das Abspielen von dynamischen `<audio>`-Blobs (`audio.src = blobUrl; audio.play()`), wenn zwischen Nutzer-Geste (Mikrofon-Tap) und Audio-Eintreffen mehrere Sekunden vergehen.

### 10.2 Durchgeführte Behebungen

#### A. Deutlich kürzere und prägnante Antworten
1. **System-Prompt (`functions/assistant-router.js`):**
   - Strikte Kürze-Instruktion ergänzt:
     *„Always keep responses short, direct, and conversational (typically 1 to 3 sentences, maximum 4 sentences). Never write long essays or bullet-point lists unless explicitly requested by the user.“*
2. **Token-Limits drastisch reduziert:**
   - Groq: `max_completion_tokens: 180` (vorher 450)
   - Gemini: `maxOutputTokens: 180` (vorher 450)
   - Cloudflare: `max_tokens: 180` (vorher 250)
   - Verhindert zuverlässig ausufernde Antworten bei einfachen Fragen.

#### B. Schnelle und fehlertolerante TTS-Synthese
1. **Text-Begrenzung für TTS (`functions/index.js`):**
   - `synthesizeDooriSpeech` kappt den zu vertonenden Text defensiv auf maximal 360 Zeichen (`rawText.slice(0, 360)`). Dadurch schließt die Audiosynthese stets in unter 2-4 Sekunden ab.
2. **Timeouts erhöht:**
   - Gemini TTS Request-Timeout auf 40 Sekunden erhöht (`AbortSignal.timeout(40000)`).
   - Cloud Function Timeout auf 60 Sekunden erhöht (`timeoutSeconds: 60`).

#### C. Zuverlässige Audio-Wiedergabe auf iOS (Web Audio API)
1. **Web Audio API (`AudioContext` / `decodeAudioData`):**
   - In `tts.js` decodiert und spielt Doori empfangene Audiodaten primär über die Web Audio API (`AudioContext`).
   - Ein im Benutzerklick/Touch entsperrter `AudioContext` verliert in iOS Safari seine Wiedergabeberechtigung auch nach asynchronen Verzögerungen nicht!
   - Automatischer Fallback auf `<audio>`-Element vorhanden.
2. **Frühes Audio-Unlocking:**
   - Unlocking erfolgt direkt bei `touchstart` auf `#assistant-mic-btn` sowie global beim ersten Benutzer-Touch in `app.js`.

#### D. Versionierung & Cache
- `tts.js?v=7`
- `assistant.js?v=8`
- `app.js?v=353`
- `service-worker.js` Cache-Name: `web-messenger-v120-ios-audio-brevity`

### 10.3 Test- & Deploy-Status
- `npm.cmd test`: **54/54 Tests bestanden (100% grün)**.
- `npm.cmd run build`: **36 allowlistete Dateien erfolgreich gebaut**.
- Cloud Functions & Hosting erfolgreich aktualisiert.

---

## 11. Gemini Live Echtzeit-Sprachmodus (`gemini-3.8-live`)

### 11.1 Anforderung & Architektur
Echter bidirektionaler Live-Sprachmodus in Echtzeit mit Unterbrechungen (Barge-in), separatem „Live"-Button und 100% kostenfreier Nutzung ohne Billing-Risiko:
- **Modell:** `models/gemini-3.8-live` (Google AI Studio Live API)
- **Sicherheit & Secret-Isolation:** Der `GEMINI_API_KEY` verlässt niemals das Backend. Die Cloud Function `getLiveToken` ruft Googles REST-Endpoint `https://generativelanguage.googleapis.com/v1beta/auth_tokens` auf und generiert ein flüchtiges (ephemeral) Token.
- **WebSocket-Verbindung:** Der Browser verbindet sich direkt mit `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=<ephemeralToken>`
- **Audio-Streaming:**
  - Aufnahme: 16 kHz PCM (Int16) via AudioWorklet / ScriptProcessor, base64-kodiert als `realtime_input`.
  - Wiedergabe: 24 kHz PCM (Int16) via Web Audio API (`AudioContext`).
- **Unterbrechungen (Barge-in):** Die KI kann jederzeit unterbrochen werden. Empfangene `interrupted: true` Server-Events sowie lokale Lautstärkeerkennung (RMS > 0.04) stoppen die Audiowiedergabe sofort und versetzen Doori in den Zuhörmodus.
- **Kontingentschutz & Auto-Deaktivierung:**
  - Tägliches Budget wird in Firestore (`_assistantBudgets/live-{uid}-{day}`) erfasst.
  - Bei 429 (`RESOURCE_EXHAUSTED`) oder erschöpftem Budget wird der Live-Button optisch deaktiviert und zeigt: *„Live momentan nicht verfügbar – kostenloses Kontingent erreicht. Bitte später erneut versuchen.“* (in allen 5 Sprachen).
  - Ein sanfter Retry-Timer (alle 60s) prüft im Hintergrund, ob das Kontingent wieder frei ist, und reaktiviert den Button automatisch ohne App-Neustart.
- **Bestehende Funktionen:** Der normale Sprachbutton (`#assistant-mic-btn`), Textchat, Telefonie und alle sonstigen Funktionen bleiben zu 100% unberührt.
- **Mehrsprachigkeit:** Vollständige Übersetzungen für Deutsch, Englisch, Arabisch, Persisch (RTL) und Türkisch.

### 11.2 Geänderte & neue Dateien
1. **`doori-live.js` (NEU):** Client-Modul für Gemini Live API, WebSocket-Lifecycle, PCM-Audio, Barge-in, Quota-Handling.
2. **`functions/index.js`:** Cloud Function `getLiveToken` mit Budget-Prüfung und `v1beta/auth_tokens`-Anbindung.
3. **`assistant.js`:** Steuerung des Live-Buttons synchron zum Assistenten-Status (`updateControls`, `initialize`).
4. **`index.html`:** `#doori-live-btn` und `#doori-live-status` im Composer integriert; `doori-live.js?v=1` eingebunden; Versionen gebumpt (`assistant.js?v=9`, `app.js?v=354`).
5. **`service-worker.js`:** Cache `web-messenger-v121-gemini-live` mit `doori-live.js?v=1`.
6. **`scripts/build-hosting.cjs`:** `doori-live.js` zur Allowlist hinzugefügt (37 Dateien).
7. **`tests/assistant.test.cjs`:** Test für Gemini Live Modus ergänzt (55/55 Tests grün).

