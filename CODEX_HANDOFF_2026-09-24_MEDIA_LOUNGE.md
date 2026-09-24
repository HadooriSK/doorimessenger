# Doori Messenger – Übergabe Media Lounge (2026-09-24)

## Einstieg und verbindliche Regeln

- Projektpfad: `C:\Users\hidis\.gemini\antigravity\scratch\web-messenger`
- Branch: `main`
- Letzter vollständig geprüfter und gepushter Funktionsstand: Commit `c4476b7` (`fix: synchronize Media Lounge invitations`), synchron mit `origin/main`.
- Nichts neu aufsetzen und keine bestehenden Funktionen entfernen.
- Jede sichtbare Änderung gleichzeitig in `de`, `en`, `ar`, `fa`, `tr`; RTL für Arabisch und Persisch erhalten.
- Unter Windows vor Tests/Build/Deploy: `$env:NODE_OPTIONS="--use-system-ca"`.
- Vollständiger Sollstand vor dem aktuellen WIP: 71/71 Tests grün, Build exakt 38 allowlistete Dateien.

## Seit der letzten AntiGravity-Übergabe abgeschlossene und live veröffentlichte Arbeiten

### 1. Media Lounge eingeführt

- Private gemeinsame Live-Sitzung in Direktchats für Bilder, Videos und Musik.
- Einladung muss vom anderen Teilnehmer angenommen oder abgelehnt werden.
- Synchronisierte Medienauswahl und Wiedergabeposition.
- Hinweis in allen fünf Sprachen: Medien sind nur vorübergehend für Live-Zwecke und werden spätestens nach 24 Stunden gelöscht.
- Private, zeitlich begrenzte Speicherlinks; eigenes Präfix `live-media/`; Cloudflare R2 primär, Backblaze B2 als Kontingent-Fallback.

### 2. Erster Produktionsfehler behoben – rote Firestore-Fehlerseite

- Ursache: Frontend war live, aber `liveMediaSessions`-Firestore-Regeln und die Funktionen `requestLargeMediaUpload` / `confirmLargeMediaUpload` waren noch nicht veröffentlicht.
- Session-Erstellung ist nun mit `try/catch/finally`, Schutz vor Doppelklicks, Aufräumen partieller Sessions und lokalisierter Fehlermeldung abgesichert.
- Firestore-Regeln, beide Cloud Functions und Hosting wurden erfolgreich veröffentlicht.
- Cache/Assets damals: `web-messenger-v141-media-lounge-fix`, `live-media.js?v=2`.
- Commit: `4bdf65d`.

### 3. Annahme, Ablehnung und Beendigung repariert

- Ursache der wirkungslosen Buttons: Media-Lounge-Karten verwendeten direkte `onclick`-Attribute; DOMPurify entfernte sie absichtlich.
- Umstellung auf den zentralen sicheren `data-doori-action`-Dispatcher in `security.js`.
- Erlaubte Aktionen: `openLiveMediaSession`, `acceptLiveMediaInvite`, `rejectLiveMediaInvite`.
- Jede neue Sitzung speichert eine deterministische `inviteMessageId`.
- Annahme/Ablehnung aktualisiert die ursprüngliche Einladungsnachricht, sodass beide Teilnehmer den endgültigen Status sehen.
- Beim Beenden schreibt die Sitzung `live_media_status: 'ended'` in dieselbe Chatkarte; beide Teilnehmer dürfen diesen Endstatus setzen, nur der Empfänger darf annehmen/ablehnen.
- Firestore-Regeln kompilierten und wurden veröffentlicht; Hosting live geprüft (`LIVE_MEDIA_STATUS_OK`).
- Cache/Assets: `web-messenger-v142-media-lounge-status`, `live-media.js?v=3`.
- Tests: 71/71 grün; Build: exakt 38 Dateien.
- Commit: `c4476b7`, auf `origin/main`.

## Aktuell gemeldeter, noch offener Fehler

- Eine Media-Lounge-Sitzung lässt sich öffnen.
- Sobald einer der Teilnehmer ein Bild, Video oder eine Musikdatei hochlädt, erscheint „Die Medien konnten nicht hochgeladen werden“ / „This media cannot be uploaded“.
- Firebase-Logs wurden geprüft:
  - `requestLargeMediaUpload` wird aufgerufen.
  - Firebase Auth ist `VALID`, App Check ist `MISSING` (App Check wird aktuell nicht erzwungen und ist nicht die unmittelbare Ursache).
  - `confirmLargeMediaUpload` wird bei dem fehlgeschlagenen Versuch nicht erreicht.
- Schlussfolgerung: Die Callable-Funktion liefert wahrscheinlich einen signierten Upload-Plan, aber der direkte Browser-`PUT` zu R2/B2 scheitert vor der Bestätigung. Wahrscheinlich fehlt die Bucket-CORS-Freigabe für die Doori-Webdomains.

## Uncommitted Work in Progress – nicht blind deployen

Der Working Tree enthält aktuell genau diese drei geänderten Dateien:

- `functions/index.js`
- `functions/large-media-storage.js`
- `tests/storage.test.cjs`

Begonnene Lösung:

- Neue Funktion `ensureBucketCors()` erzeugt eine signierte S3-`PutBucketCors`-Anfrage.
- Erlaubte Origins: `https://doori-messenger.de`, `https://www.doori-messenger.de`, `https://doori-messenger.web.app`.
- Methoden: `GET`, `PUT`, `HEAD`; Header `*`; `ETag` exponiert.
- `requestLargeMediaUpload` ruft die Prüfung/Konfiguration vor Erzeugung des Upload-Plans auf.
- Bei Fehler wird serverseitig `Large media browser access setup failed` mit Anbieter und Status geloggt und `STORAGE_BROWSER_ACCESS_FAILED` ausgegeben.
- Ein Unit-Test mit Mock-Fetch prüft signierte Anfrage, Origins und PUT-Regel.

Dieser WIP wurde wegen der angeforderten Übergabe noch **nicht getestet, nicht gebaut, nicht deployed und nicht committed**. Vor Fortsetzung unbedingt prüfen, ob Cloudflare R2 und Backblaze B2 `PutBucketCors` über ihre jeweiligen S3-Endpunkte in dieser Form unterstützen. Falls Cloudflare R2 dies für den verwendeten Schlüssel ablehnt, CORS über die offizielle Cloudflare-R2-API oder einmalig im Bucket-Dashboard konfigurieren. Keine Secrets ausgeben oder ins Repository schreiben.

## Sicherste nächsten Schritte

1. `git status --short` und den Diff der drei WIP-Dateien lesen; nichts zurücksetzen.
2. Die SigV4-Kanonisierung für `PUT /{bucket}?cors` gegen R2 und B2 prüfen. Besonders Query-Kanonisierung `cors=` und XML-Format beachten.
3. Zunächst nur den neuen Speichertest ausführen; danach einmal die vollständige Suite. Erwarteter Gesamtstand nach neuem Test: 72 Tests.
4. Build ausführen; weiterhin exakt 38 Dateien erwarten.
5. Nur `functions:requestLargeMediaUpload` deployen. `confirmLargeMediaUpload` ist für den CORS-WIP unverändert.
6. Mit einem echten kleinen Bild auf iPhone testen und sofort Serverlogs kontrollieren.
7. Wenn die CORS-Konfiguration erfolgreich ist, Upload muss anschließend `confirmLargeMediaUpload` erreichen und das Medium in `liveMediaSessions.items` erscheinen.
8. Danach Commit/Push und beide Hauptübergaben (`CODEX_HANDOFF_2026-09-24.md`, `GOOGLE_ANTIGRAVITY_HANDOFF_2026-09-24.md`) um das bestätigte Endergebnis ergänzen.

## Relevante Dateien

- `live-media.js` – Media-Lounge-Client, Einladung, Upload und Synchronisierung.
- `security.js` – sicherer Aktionsdispatcher.
- `app.js` – Nachrichtenversand und deterministische Nachrichten-ID.
- `firestore.rules` – Session- und Einladungsstatusrechte.
- `functions/index.js` – Upload-Plan und Bestätigung.
- `functions/large-media-storage.js` – R2/B2-Auswahl, SigV4-URLs, Retention und aktueller CORS-WIP.
- `tests/storage.test.cjs` – Speicher- und Media-Lounge-Tests.

## Bereits live erreichbare Backend-Komponenten

- `requestLargeMediaUpload` (europe-west3)
- `confirmLargeMediaUpload` (europe-west3)
- `liveMediaSessions`-Firestore-Regeln
- Hosting mit `live-media.js?v=3`

Der letzte stabile Live-Code ist Commit `c4476b7`; der oben beschriebene CORS-WIP liegt nur lokal im Working Tree.
