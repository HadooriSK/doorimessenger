# Übergabe – Doori Messenger

**Stand:** 24.09.2026, vor dem geplanten R2/Watch-Together-Ausbau.  
**Arbeitsprinzip:** Bestehendes Projekt fortsetzen, nichts neu einrichten und keine vorhandenen Funktionen entfernen. Alle sichtbaren Texte stets zeitgleich in `de`, `en`, `ar`, `fa` und `tr`; Arabisch und Persisch bleiben RTL.

## Verbindlicher bestehender Stand

- Projekt: Doori Messenger, Firebase Hosting und Functions sind die bestehende Plattform.
- Die vorigen Handoff-Dateien zuerst lesen:
  - `GOOGLE_ANTIGRAVITY_HANDOFF_2026-09-24.md`
  - `CODEX_HANDOFF_2026-09-24.md`
- Letzter zuvor dokumentierter technischer Zustand: Branch `main`, die bisherigen Handoffs nennen die zugehörigen Commits, Test- und Build-Schritte.
- Unter Windows vor Befehlen: `$env:NODE_OPTIONS="--use-system-ca"`.
- Nach echten Codeänderungen nur gezielte Tests ausführen; vollständige Tests und Build erst vor Deployment. Erwartung aus dem letzten Stand: `npm.cmd test` vollständig grün und `npm.cmd run build` mit 37 allowlisteten Dateien.

## Bereits umgesetzt und nicht zurückbauen

1. **Messenger-Kern:** Firebase Authentication, Firestore-Nachrichten, Kontakte, Gruppen, Spiele, Doodle, Medienanzeige, Anrufe und KI-Assistent bleiben erhalten.
2. **Gruppen und Doodle:** Moderne Gruppenfunktionen, Gruppen-Admin-/Einladungslogik, Doodle ausschließlich in privaten Chats mit Anfrage/Annahme, fünfsprachige Texte.
3. **Anrufe/Präsenz:** Anrufstatus unterscheidet „ruft an“, „es klingelt“ und echte Verbindung. Präsenzpunkte zeigen online nur bei frischer Anwesenheit grün; Sonderstatus rot; offline kein Punkt.
4. **KI-Assistent:** Provider-/TTS-/Live-Architektur, zwei Stimmen, Gemini Live sowie die bestehenden Mobile-Härtungen nicht entfernen. Frühere Übergaben dokumentieren die bekannten iPhone-Einschränkungen und den aktuellen Stand.
5. **Medien heute:** Normale Anhänge werden derzeit nicht in einem separaten externen Objektspeicher wie R2 abgelegt. Der bestehende Client verarbeitet Medien als `mediaUrl`/Datendaten in Nachrichten; es gibt strikte kleine Größenlimits. R2 ist noch nicht aktiviert und es wurden keine R2-Zugangsdaten erstellt oder gespeichert.

## Neues Thema: große Medien und Watch Together – noch NICHT implementiert

Der Betreiber prüft Cloudflare R2 als Speicher für späteres Versenden großer Videos, Musik und Dateien sowie für Watch Together. Es wurde bisher **nur beraten**, kein Code, kein Bucket und kein Secret angelegt.

### Beschlossene Zielarchitektur, falls der Betreiber ausdrücklich startet

- Firebase bleibt für Auth, Firestore-Metadaten, Rechte, Chats und Ablaufdaten.
- Cloudflare R2 speichert ausschließlich große Medien. Keine langfristigen R2-Zugangsdaten im Client oder Repository.
- Upload-/Downloadrechte über Firebase Functions prüfen; Client erhält nur kurzlebige signierte URLs.
- Metadaten in Firestore: Besitzer, Chat-ID, erlaubte Empfänger, Größe, MIME-Typ, R2-Key, Ablaufzeit, Löschstatus.
- Watch-Together-Medien: Standard Storage, 480p, automatische Löschung nach drei Tagen. **Nicht** R2 Infrequent Access verwenden, weil dort eine Mindestdauer von 30 Tagen gilt.
- Missbrauchsschutz: globale Speicherobergrenze, maximale Datei-/Videodauer, erlaubte MIME-Typen, serverseitige Eigentums- und Chat-Mitgliedschaftsprüfung, Rate Limits und automatische Löschung.
- Kein automatisches kostenpflichtiges Zusatzprodukt aktivieren und keine Kosten ohne explizite Zustimmung des Betreibers verursachen.

### Kostenwissen, bereits geprüft

- R2 Standard: 10 GB-Monate, 1 Mio. Class-A und 10 Mio. Class-B Vorgänge monatlich kostenlos. Darüber $0.015/GB-Monat Speicher, $4.50/Mio. Class A, $0.36/Mio. Class B. Internet-Egress von R2 ist kostenlos.
- Wichtig: R2 benötigt trotz Null-Grundpreis eine aktivierte Abrechnung. Technische Limits im Messenger sind nötig, damit Nutzung nicht unerwartet Mehrkosten erzeugt.
- Bei 480p und Löschen nach drei Tagen ist Speicher meist sehr günstig: 1.000 Nutzer mit durchschnittlich 30 Minuten hochgeladenem Video je Monat entsprechen grob $0.19 R2-Speicher; eine Stunde je Nutzer grob $0.53. Das sind Schätzungen, wenn 480p auch wirklich erzwungen wird.
- Firebase Storage ist für Medien nicht pauschal ersetzen: Es ist weiterhin sinnvoll für kleine bestehende Assets, während R2 für häufig wiedergegebene große Medien wirtschaftlicher ist.

## Umsetzung: Große Mediendateien via Cloudflare R2 & Backblaze B2 (Stand: 24.09.2026 – VOLLSTÄNDIG LIVE)

Der Betreiber hat die Accounts für Cloudflare R2 (10 GB kostenlos) und Backblaze B2 (10 GB kostenlos) eingerichtet. Die Implementierung, Live-Verifikation und das Deployment sind vollständig abgeschlossen:
- **Live-Verifikation beider Speicheranbieter:**
  1. **Cloudflare R2:** Secret `CLOUDFLARE_R2_CONFIG` (Version 3) live getestet. SigV4 Presigned `PUT` Upload (HTTP 200 OK), SigV4 `GET` (HTTP 200 OK, Inhalt 100% verifiziert) und SigV4 `DELETE` (HTTP 204 No Content) erfolgreich.
  2. **Backblaze B2:** Secret `BACKBLAZE_B2_CONFIG` live getestet. SigV4 Presigned `PUT` Upload (HTTP 200 OK) und SigV4 `DELETE` (HTTP 200 OK) erfolgreich.
- **Kaskadierung:** Primär wird Cloudflare R2 genutzt (bis 9,5 GB Sicherheitslimit). Bei Erreichen des Kontingents oder temporärem Ausfall schaltet das System automatisch auf Backblaze B2 um.
- **Cloud Functions:**
  - `requestLargeMediaUpload`, `confirmLargeMediaUpload` und `cleanupExpiredLargeMedia` erfolgreich in `europe-west3` mit Zugriff auf `CLOUDFLARE_R2_CONFIG` und `BACKBLAZE_B2_CONFIG` deployt.
  - Direct Client-to-Storage Upload per Presigned S3 `PUT` URL (15 min) ohne Belastung der Firebase-Bandbreite.
- **Client-Integration (`app.js`, `index.html`):**
  - Upload-Pipeline `uploadMediaFile(file)` für Dateien aller Typen (`accept="*/*"`), inklusive Fortschritts-Toast.
  - Chat-Darstellung von Datei-Anhängen (`mediaType === 'file'`) mit Download-Button und 30-Tage Gültigkeits-Badge (`⏱️ 30d` bzw. `⏱️ Abgelaufen`).
  - Automatisches Hintergrund-Pruning von abgelaufenen Medien (`cleanupExpiredLargeMedia`) beim Benutzer-Login.
  - Alle Texte synchron in 5 Sprachen (`de`, `en`, `ar`, `fa`, `tr`), RTL für `ar` und `fa` gewahrt.
- **Testabdeckung & Hosting-Deploy:**
  - Testsuite: **65/65 Tests bestanden (100% grün)** (`npm.cmd test`).
  - Build: **Exakt 37 allowlistete Public-Dateien** (`scripts/build-hosting.cjs`).
  - Firebase Hosting: Live auf `https://www.doori-messenger.de/` und `https://doori-messenger.web.app/` (Cache `web-messenger-v136-large-media-storage`, `app.js?v=357`).

## Korrektur: Browser-CORS für R2/B2 Upload (24.09.2026)

- **Fehler:** Upload großer Dateien schlug zwischen `requestLargeMediaUpload` und `confirmLargeMediaUpload` fehl. Der direkte Browser-`PUT` auf die Presigned-URL erzeugt immer einen CORS-Preflight; R2 und B2 hatten keine CORS-Regeln.
- **Klarstellung:** `PutBucketCors` (S3, SigV4) ist mit **beiden** Anbietern kompatibel. Live verifiziert: R2 **HTTP 200**, B2 **HTTP 200**. Backblaze B2 benötigt dabei zwingend `Content-MD5` (sonst HTTP 400).
- **Geändert:** `functions/large-media-storage.js` (CORS-XML + SigV4-PutBucketCors), `functions/index.js` (neue admin-geschützte Funktion `configureStorageCors`), `scripts/apply-storage-cors.cjs` (anwenden + Preflight-Verify, Secrets nur im Speicher), `tests/storage.test.cjs` (5 neue Tests), `tests/calls.test.cjs` (vorbestehender CRLF-Fix).
- **Verifikation:** OPTIONS-Preflight liefert auf R2 und B2 korrekte `Access-Control-Allow-Origin`/`Access-Control-Allow-Headers` und erlaubtes `PUT`.
- **Stand:** 70/70 Tests grün; Build 37 Dateien; `configureStorageCors` (europe-west3) deployed. Keine sichtbaren Texte geändert. Änderungen **nicht committet** (Basis `main`, `31880e2`).

## Dokumentationspflicht

Nach jeder weiteren Arbeitsphase diese Datei sowie `GOOGLE_ANTIGRAVITY_HANDOFF_2026-09-24.md` und `CODEX_HANDOFF_2026-09-24.md` mit Änderungen, Tests, Build und Deployment aktualisieren.

## Zwischenstand 24.09.2026 23:20 UTC
- Nach `git pull` ist `main` auf `c9d9d9f`; die obige Basisangabe `31880e2` ist historisch. CORS-Arbeit blieb erhalten und ist weiterhin uncommittet.
- Doodle wurde durch alte `doodle_accept`-Einträge beim Nachrichtenrendern unbeabsichtigt wieder geöffnet. Hosting v143 veröffentlicht den gezielten Fix und Lounge-Startphasen-Logs. Hosting v144 ergänzt nur datensparsame Login-Phasen-Logs.
- Media-Lounge-Start: `permission-denied`, exakte Phase noch ausstehend; Laptop-Login scheitert, konkreter Fehlercode noch ausstehend. Keine Regel/Accountdaten auf Verdacht verändert. Letzte Tests **79/79**, Build **38** Dateien, kein Commit/Push. Ausführlicher Status und Dateiliste: Nachtrag in `CODEX_HANDOFF_2026-09-24_MEDIA_LOUNGE.md`.

## Nachtrag 25.09.2026 00:20 UTC
- Laptop-Anmeldung laut Nutzer wieder möglich; die früheren Login-/Lounge-Fehler nicht mehr als offene Release-Blocker behandeln, ohne einen neuen End-to-End-Test zu behaupten.
- Neue lokale Aktivitäts- und Lounge-Erweiterung: **84/84 Tests grün**, Build 38 Dateien. **Nur Firestore-Regeln deployed**; neue Function wegen Google-Cloud-Runtime-Config-/Eventarc-Störung nicht veröffentlicht, **Hosting v145 absichtlich zurückgehalten**. Kein Commit/Push, `main`/`c9d9d9f`. Fortsetzung und genaue Dateiliste: `CODEX_HANDOFF_2026-09-24_MEDIA_LOUNGE.md`, Nachtrag 00:20 UTC.
## 24. Nachtrag 25.09.2026 02:15 UTC – Media Lounge Start-Fix & „Chat leeren“ Reparatur (Hosting v146)
- **Media Lounge Start-Fehler behoben:**
  - Nutzer-Identifikatoren in `live-media.js` via `normalizeUser` auf kanonisches `@username` gebracht (`creator` und `peer`), wodurch Firestore-Rule-Mismatches und Parameterfehler in `replaceActivityInvitation` verhindert werden.
  - Clock-Skew-Schutz: Lokale Uhrzeiten, die der Google-Serverzeit minimal voraus sind, ließen `expiresAt <= request.time.toMillis() + 24h` scheitern. Client zieht 2 Minuten Sicherheitsabstand ab; `firestore.rules` gewährt 5 Minuten Puffer.
  - Fehlerbehandlung um `list-sessions` gekapselt, sodass Index- oder Netzwerkverzögerungen den Start nicht abbrechen.
- **„Chat leeren“ repariert:**
  - In `message-cache.js` `clearChat(chatId)` implementiert (löscht IndexedDB-Cursor und memoryFallback für den Chat).
  - In `app.js` `clearCurrentChat()` vereinheitlicht: räumt alle Chat-Keys (`currentChat.id`, `@...`, raw) im In-Memory `messages`-Store und im IndexedDB-Cache ab.
  - Firestore-Sync: Eigene Nachrichten werden per `delete()` gelöscht; fremde Nachrichten werden regelkonform via `update({ deletedFor: [...currentUser] })` für den Nutzer verborgen (`difference.hasOnly([name()])`).
  - `renderMessages()` filtert alle Nachrichten mit `deletedFor.includes(currentUser)` zuverlässig heraus.
- **Deployments:**
  - Firestore Rules live deployt.
  - Cloud Function `replaceActivityInvitation` live deployt.
  - Hosting **v146** live auf `https://doori-messenger.web.app` mit `app.js?v=362`, `live-media.js?v=6`, `security.js?v=2`, `message-cache.js?v=2`.
- **Validierung:** 86/86 Tests grün (100%), Build 38 Public-Dateien sauber.
## 25. Nachtrag 25.09.2026 02:22 UTC – iPhone Dateien-App Musik-Auswahl (Hosting v147)
- **Problem:** Auf iOS Safari im Bereich „Musik“ der Media Lounge waren im Datei-Dialog (Dateien-App) alle Musikdateien ausgegraut/ausgeblendet.
- **Ursache:** Apple Safari bewertet `accept="audio/*"` strikt über UTType (`public.audio`). Dateien in der iOS-Dateien-App (iCloud Drive / Downloads / WhatsApp) sind oft mit generischen UTIs hinterlegt und werden nur freigegeben, wenn die Dateiendungen (`.mp3`, `.m4a`, `.wav` etc.) explizit im `accept`-Attribut stehen. Zudem liefert iOS für ausgewählte Dateien oft `file.type = ""`, was die Validierung fälschlich blockierte.
- **Fix:**
  - `live-media.js`: `ACCEPT_BY_CATEGORY.audio` um alle gängigen Endungen (`.mp3,.m4a,.wav,.aac,.flac,.ogg,.opus,.m4r,.aiff,.wma`) erweitert.
  - `live-media.js`: `resolveMediaType(file)` ergänzt, sodass bei leerem `file.type` automatisch über die Dateiendung die korrekte Kategorie und der MIME-Type zugewiesen wird.
  - `index.html`: Input-Accept angepasst.
  - `tests/storage.test.cjs`: Test erweitert und verifiziert.
- **Deploy:** Hosting v147 mit `live-media.js?v=7` live auf `https://doori-messenger.web.app`. 86/86 Tests grün.
