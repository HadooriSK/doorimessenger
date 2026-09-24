# Übergabe an Google AntiGravity – Doori Messenger

Bitte lies zuerst diese Datei und danach `CODEX_HANDOFF_2026-09-24.md` im Projekt-Hauptverzeichnis vollständig. Setze den bestehenden Code exakt auf diesem Stand fort. Nichts neu aufsetzen, keine bestehenden Messenger-, Spiele-, Telefonie-, Konto- oder KI-Funktionen entfernen.

## Aktueller Stand (Update: 24.09.2026, 16:30 Uhr – R2/B2 Storage LIVE)

- Git-Basis: `main`, synchron mit `origin/main`.
- **Deployments:**
  - Firebase Cloud Functions live: `requestLargeMediaUpload`, `confirmLargeMediaUpload`, `cleanupExpiredLargeMedia`, `askDooriAssistant`, `synthesizeDooriSpeech`, `transcribeDooriSpeech`, `getLiveToken` (alle in `europe-west3`).
  - Firebase Hosting live bereitgestellt: Cache `v136` (`web-messenger-v136-large-media-storage`), `app.js?v=357`, `style.css?v=335`. Live auf `https://www.doori-messenger.de/` und `https://doori-messenger.web.app/`.
- Build: Exakt 37 allowlistete Public-Dateien (`scripts/build-hosting.cjs`).
- Testsuite: **65/65 Tests bestanden (100% grün)** (`npm.cmd test`).
- Keine Secrets, API-Schlüssel oder Tokens in Frontend-Code, Git oder Logs exponiert. Firebase Functions Secrets bleiben maßgeblich.
- Alle sichtbaren Änderungen immer synchron in Deutsch, Englisch, Arabisch, Persisch und Türkisch gepflegt (RTL für ar/fa).

## Update: Große Mediendateien mit Cloudflare R2 & Backblaze B2 (24.09.2026)

- **Anforderung:** Speicherung großer Dateien (Videos, Audio, Fotos, Dokumente bis 500 MB) mit Priorität auf Cloudflare R2 (10 GB kostenlos) und automatischem Kaskaden-Fallback auf Backblaze B2 (10 GB kostenlos) bei Kontingentüberschreitung (9,5 GB Sicherheitslimit). Automatische Löschung aller Dateien nach maximal 30 Tagen.
- **Live-Verifikation beider Speicheranbieter:**
  - **Cloudflare R2:** Secret `CLOUDFLARE_R2_CONFIG` (Version 3) live verifiziert. S3 SigV4 PUT (HTTP 200 OK), GET (HTTP 200 OK, Inhalt bytegenau validiert) und DELETE (HTTP 204 No Content) erfolgreich.
  - **Backblaze B2:** Secret `BACKBLAZE_B2_CONFIG` live verifiziert. S3 SigV4 PUT (HTTP 200 OK) und DELETE (HTTP 200 OK) erfolgreich.
- **Architektur & Bandbreitenschutz:** Direct-to-Storage Presigned S3 SigV4 URLs (`PUT`, 15 min Gültigkeit) über `functions/large-media-storage.js`. Keine Firebase-Server-Bandbreitenkosten.
- **Client-Integration (`app.js`, `index.html`):**
  - Dateiupload (`#media-upload`) akzeptiert alle Dateitypen (`accept="*/*"`).
  - Dateien < 200 KB verbleiben für sofortige Vorschau als Data-URL; Dateien >= 200 KB oder Dokumente werden über die Cloud-Pipeline hochgeladen.
  - Upload-Progress-Toast während des Transfers (`msg_uploading_media`).
  - Anzeige von Dateianhängen (`mediaType === 'file'`) mit Dateiname, Dateigröße und Download-Button.
  - 30-Tage Retentions-Badge (`⏱️ 30d` bzw. `⏱️ Abgelaufen`) im Chat-Nachrichten-Header.
  - Automatisches Hintergrund-Pruning von abgelaufenen Medien (`cleanupExpiredLargeMedia`) beim Benutzer-Login.
- **Mehrsprachigkeit:** Vollständige 5-Sprachen-Unterstützung (`de`, `en`, `ar`, `fa`, `tr`) mit echtem RTL für Arabisch und Persisch.
- **Testabdeckung:** `tests/storage.test.cjs` prüft SigV4 URLs, Kaskadierung, Quoten, 30-Tage Retention, Übersetzungen und RTL. 65/65 Tests grün.

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

## Update: Gemeinsame Stimmenwahl und lange Live-Sitzungen (24.09.2026)

- Die gespeicherte Auswahl `doori_tts_voice_gender` steuert nun beide Sprachwege: normale TTS und Gemini Live.
- Weiblich nutzt in beiden Gemini-Pfaden `Kore`, männlich `Puck`. Live hatte vorher unabhängig von der Auswahl fest `Aoede` verwendet.
- Wenn die Stimme während eines aktiven Live-Gesprächs gewechselt wird, baut der Client die Live-Verbindung kontrolliert mit der neuen Stimme neu auf. Die normale Sprach-KI übernimmt die Auswahl wie bisher sofort.
- Gemini-Live-Setup enthält `contextWindowCompression` mit Sliding Window (Trigger 25.600, Ziel 12.800 Tokens), damit lange Gespräche nicht am vollen Kontextfenster abbrechen.
- `sessionResumption` ist aktiviert. Der Client speichert `sessionResumptionUpdate.newHandle`; bei `goAway` verbindet er sich automatisch mit diesem Handle und einem neuen Ephemeral Token wieder.
- Ein echter Handshake mit der erweiterten Konfiguration wurde von Google mit `setupComplete` bestätigt und sauber mit Code 1000 geschlossen. Es wurden dabei keine Audio- oder Gesprächsdaten gesendet.
- Frontend: `doori-live.js?v=9`, Cache `web-messenger-v132-live-voice-resume`.
- Validierung: 55/55 Tests bestanden; Build exakt 37 Dateien. Kontextkomprimierung und Wiederaufnahme verlängern Sitzungen, können aber Netzwerkausfälle oder Anbieter-/Kontingentgrenzen nicht unbegrenzt überbrücken.

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

## Fortsetzung: Moderne Gruppen und gemeinsames Doodle

Ausgangspunkt war Commit `b55dfa9` auf Branch `main`. Der vorhandene Code wurde fortgesetzt und nicht neu aufgesetzt.

### Gruppen

- Gruppen-Sprach- und Videoanrufe sind jetzt sowohl im Chat-Header als auch in der modernisierten Gruppeninfo sichtbar. Sie verwenden weiterhin die bestehende Agora-Infrastruktur mit serverseitiger Gruppenmitgliedschaftsprüfung.
- Ein Live-Anruf-Banner zeigt Anruftyp und aktuelle Teilnehmerzahl und ermöglicht den direkten Beitritt.
- Die Gruppeninfo enthält nun Gruppenbild, Beschreibung, Mitglieder- und Privatsphäreanzeige, Mitgliedersuche, Rollen, Einladungslink, Nur-Lesen-Modus, gemeinsame Medien sowie Verlassen-/Löschen-Aktionen.
- Admin-Funktionen bleiben durch die vorhandenen Firestore-Regeln abgesichert und werden nur berechtigten Nutzern angezeigt.
- Offene Einladungen können für dieselbe Person und Gruppe nicht mehrfach gesendet werden. Einladungen behalten die nachvollziehbaren Zustände `pending`, `accepted` und `declined`.
- Das Design ist responsiv, unterstützt Hell- und Dunkelmodus und behält RTL für Arabisch und Persisch.

### Doodle

- Das gemeinsame Doodle ist wieder in privaten Direktchats verfügbar und bleibt in Gruppen, Kanälen und beim KI-Assistenten verborgen.
- Der Verbindungsfehler durch eine doppelte `@`-Kennung wurde behoben; beide Teilnehmer landen zuverlässig in derselben Sitzung.
- Die bestehende Firestore-Echtzeitsynchronisation wurde beibehalten und um Farbvorgaben, freie Farbe, größere Pinselstärken, Radierer, vier Hintergründe und PNG-Download ergänzt.
- Normalisierte Koordinaten sorgen weiterhin für geräteübergreifende Synchronisation.
- Die Oberfläche wurde als modernes, responsives Glas-Panel gestaltet.

### Verifikation und relevante Dateien

- Alle neuen sichtbaren Texte sind in Deutsch, Englisch, Arabisch, Persisch und Türkisch vorhanden; `ar` und `fa` bleiben RTL.
- Geändert: `index.html`, `app.js`, `doodle.js`, `style.css`, `service-worker.js`, `tests/calls.test.cjs`, `tests/security.test.cjs` und beide Handoff-Dateien.
- Cache: `web-messenger-v133-modern-groups-doodle`; Assets: `style.css?v=335`, `app.js?v=355`, `doodle.js?v=277`.
- Syntaxprüfungen bestanden; `npm.cmd test`: `57/57` grün; `npm.cmd run build`: exakt `37` Dateien.
## Korrektur: Doodle-Annahme, Anrufstatus und Präsenz

- Das Anhangmenü zeigt in `de`, `en`, `ar`, `fa` und `tr` nur noch die Bezeichnung `Doodle`.
- Ein Doodle öffnet beim Absender erst nach der Annahme durch den Empfänger. Einladung, Ablehnung, Annahme und gemeinsame Firestore-Sitzung bleiben erhalten.
- Direkte Anrufe zeigen `calling`/„Ruft an“, bis das Empfangsgerät die Einladung tatsächlich sieht. Dann folgt `ringing`/„Es klingelt“. `connected` wird ausschließlich nach Annahme gesetzt.
- Der alleinige technische Medienkanal-Beitritt des Anrufers darf keinen verbundenen Zustand mehr auslösen.
- Alle Anrufstatus sind in den fünf Pflichtsprachen vorhanden.
- Präsenzpunkte in Kontakt- und Chatliste werden aus dem Firestore-Dokument `presence/{username}` berechnet. Online erfordert `isOnline === true` und einen maximal 75 Sekunden alten `lastSeen`-Zeitstempel. Grün bedeutet online, Rot online mit besonderem Profilstatus, offline bedeutet kein Punkt.
- Der vorherige blaue Ungelesen-Punkt wurde entfernt, damit er nicht mehr als Online-Präsenz missverstanden wird.
- Cache-/Assetstand: `web-messenger-v134-presence-call-doodle-flow`, `app.js?v=356`, `agora-calls.js?v=4`, `doodle.js?v=278`.
- Syntaxprüfung erfolgreich; `npm.cmd test`: `59/59` bestanden.
## Vereinfachte Chatfilter

- Der Filtertest erwartet nun exakt diese drei Einträge.
- Cache: `web-messenger-v135-chat-filters`.

## Große Mediendateien via Cloudflare R2 & Backblaze B2 (Stand: 24.09.2026)

- Accounts: Cloudflare R2 (10 GB kostenlos) und Backblaze B2 (10 GB kostenlos).
- Kaskadierung: Primär Cloudflare R2 bis 9,5 GB. Bei Erreichen der Quote automatisches Umschalten auf Backblaze B2.
- S3 SigV4: Direkte Presigned-Upload-URLs entlasten Firebase Functions und Server-Bandbreite.
- Automatische 30-Tage-Löschung: Nativ über Lifecycle Rules in R2 und B2 sowie serverseitige Bereinigung via `cleanupExpiredLargeMedia` und `expiresAt`-Metadaten.
- Secrets per Terminal:
  - Code 1: `firebase functions:secrets:set CLOUDFLARE_R2_CONFIG`
  - Code 2: `firebase functions:secrets:set BACKBLAZE_B2_CONFIG`
- Teststand: 63/63 Tests grün (`npm.cmd test`), Build: 37 Dateien (`npm.cmd run build`).

## Media Lounge – Live-Bilder, -Videos und -Musik

- Neuer privater Zwei-Personen-Bereich **Media Lounge** mit Einladung/Annahme und synchroner Medienauswahl sowie synchronem Play/Pause/Seek für Video und Audio.
- Moderne responsive Bühne mit Media-Tray, Live- und Wartezustand sowie Hell-/Dunkelmodus.
- Deutlich sichtbarer Hinweis in allen fünf Pflichtsprachen: Medien sind nur vorübergehend für Live-Zwecke bestimmt und werden spätestens nach 24 Stunden automatisch gelöscht.
- Technisch eigener privater Prefix `live-media/`, keine öffentliche URL und maximale Laufzeit von 24 Stunden; normale Chatmedien bleiben bei 30 Tagen. R2 bleibt primär, B2 ist der bestehende Quota-Fallback.
- Dateien: `live-media.js` (neu), `index.html`, `style.css`, `app.js`, `firestore.rules`, `functions/index.js`, `functions/large-media-storage.js`, `scripts/build-hosting.cjs`, `service-worker.js`, `tests/storage.test.cjs`.
- Prüfstand: vollständige Tests `67/67`, gezielte Speichertests `8/8`, Build `38` Dateien, Syntax und Diff-Prüfung grün.
- Noch offen: Firebase-Deployment von `requestLargeMediaUpload`, `confirmLargeMediaUpload`, Firestore-Regeln und Hosting. Die Codex-Ausführungsfreigabe wurde abgelehnt. Der lokale Regeltest benötigt außerdem Java im PATH; Firebase soll die Regeln beim Deployment validieren.

## Gemini Live: iPhone-Startschleife behoben

- iOS-Lautsprecherecho wurde während der KI-Ausgabe weiterhin als Mikrofoneingabe an Gemini gesendet und konnte wiederholte Begrüßungen auslösen.
- `doori-live.js` überträgt während der Wiedergabe keine Mikrofonpakete mehr, leert dabei den Puffer und nutzt eine 500-ms-Nachlauf- sowie 700-ms-Handshake-Sperre.
- Doori wartet beim Start stumm auf eine vollständige Äußerung, grüßt nicht ungefragt, wiederholt keine Begrüßung und hält die zuerst sicher erkannte Sprache stabil.
- Versionen: `web-messenger-v138-live-ios-start-guard`, `doori-live.js?v=10`.
- Tests: Assistent `15/15`, vollständig `68/68`; Build `38` Dateien.
- Firebase Hosting ist veröffentlicht; die öffentliche Datei `doori-live.js?v=10` enthält nachweislich die neue Echo- und Startunterdrückung.

## Mobile Live-Steuerleiste

- Live-Status, Mikrofon, Live-Schalter, Lautsprecher und Stimmenauswahl bleiben auf Mobilgeräten in einer festen Zeile. Lange Statusmeldungen werden gekürzt und verschieben die Stimmenauswahl nicht mehr.
- Versionen: `web-messenger-v139-live-controls-layout`, `style.css?v=337`; Assistententests `16/16`, Build `38` Dateien.

## Gemeinsame Doori-Erinnerung und TTS-Korrektur

- Normale Text-/Sprach-KI und Gemini Live teilen eine private, UID-gebundene Erinnerung in `_assistantMemory`. Der Kontext ist auf 2.600 Zeichen begrenzt und wird ohne zusätzliche KI-Zusammenfassungsanfragen gepflegt.
- Live nutzt Google Ein-/Ausgabetranskription und speichert vollständige Gesprächsrunden über die neue Function `rememberDooriExchange`. `clearDooriMemory` löscht die Erinnerung auf Nutzerwunsch; die Kontolöschung entfernt sie ebenfalls.
- Einstellungsoberfläche und Löschbestätigung sind in allen fünf Pflichtsprachen vorhanden; die Sammlung ist für direkte Clients nicht freigegeben.
- Die normale Gemini-TTS-Funktion sendet nur noch den eigentlichen Antworttext, sodass technische Stimm-/Sprechanweisungen nicht mehr vorgelesen werden.
- Versionen: `web-messenger-v140-assistant-memory-tts`, `assistant.js?v=13`, `doori-live.js?v=11`; Tests `71/71`, Build `38` Dateien.

