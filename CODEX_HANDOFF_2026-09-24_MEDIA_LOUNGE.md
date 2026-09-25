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

## Nachtrag 2026-09-24 23:20 UTC – Doodle, Lounge-Start und Laptop-Anmeldung

- **Aktueller Repository-Stand:** `main`, HEAD `c9d9d9f01670ce4d91b0fbd31057c58eafcd1639`; keine Commits oder Pushes in dieser Runde. Der historische WIP-Abschnitt oben beschreibt einen früheren Zustand; die CORS-Änderungen aus der vorigen Sitzung und die aktuellen Diagnoseänderungen bleiben uncommittet. Nichts zurücksetzen oder pauschal stagen.
- **Bereits live:** CORS für Cloudflare R2 und Backblaze B2 wurde in der vorigen Sitzung mittels signiertem PutBucketCors und `Content-MD5` gesetzt; beide antworteten HTTP 200 und erlaubten den Browser-PUT-Preflight. Die separate Admin-Function `configureStorageCors` wurde deployed. Das behebt nicht den nun gemeldeten Firestore-Startfehler.
- **Fehler reproduziert per Konsolen-Screenshot:** `Media Lounge start failed FirebaseError: Missing or insufficient permissions`. Die Firestore-Regeln sind live, aber der verweigerte Schritt (`list-sessions`, `create-session` oder `send-invitation`) war vor der Diagnose nicht erkennbar. Die Ursache ist noch nicht abschließend belegt; Regeln keinesfalls pauschal öffnen.
- **Unabhängiger Doodle-Fehler:** `app.js` rief beim bloßen Rendern historischer `doodle_accept`-/`doodle_close`-Chatkarten Doodle-Handler auf. Dadurch konnte eine alte akzeptierte Doodle-Karte den Canvas wieder öffnen, obwohl der Doodle-Sitzungseintrag `end` war. Diese Render-Nebeneffekte wurden entfernt; aktive Doodle-Sitzungen behalten ihre eigenen Firestore-Listener.
- **Live-Hosting-Release 1:** `web-messenger-v143-media-lounge-diagnostics`, `app.js?v=359`, `live-media.js?v=4`. Der Lounge-Catch protokolliert Phase und Fehlercode. Deployment nach einem transienten Firebase-Hosting-API-Fehler erfolgreich; öffentliche Assets geprüft. Keine Functions oder Regeln neu deployed.
- **Neuer Befund:** Laptop meldet bei E-Mail+Kontakt-ID-Anmeldung nur den allgemeinen UI-Fehler; iPhone funktioniert. Der Auth-Code war beim ersten Release unverändert; alle Anmelde-Assets waren öffentlich HTTP 200. Es ist noch nicht nachgewiesen, ob Firebase Auth, Kontozuordnung/ID-Prüfung, Firestore oder lokaler Browserzustand scheitert. Keine Kontodaten, Passwörter oder Token verändert.
- **Live-Hosting-Release 2:** `web-messenger-v144-login-diagnostics`, `app.js?v=360`, `account-client.js?v=2`. Bei Loginfehlern werden nur Schrittname und Firebase-Fehlercode protokolliert, niemals E-Mail, ID, Passwort oder Token. Deployment nach transientem Hosting-API-Fehler erfolgreich; die öffentlichen neuen Assets wurden geprüft.
- **Prüfungen:** fokussierte Storage-Tests 15/15, fokussierte Security-Tests 27/27; vollständige Suite zuletzt **79/79 grün**, Build **38** allowlistete Dateien, `git diff --check` ohne inhaltliche Fehler. Keine sichtbaren Texte geändert; `de/en/ar/fa/tr` und RTL unverändert.
- **Noch offen:** Die neue Phase des Media-Lounge-Berechtigungsfehlers und der genaue Laptop-Login-Fehlercode wurden nach dem Release noch nicht geliefert. Ohne diese Belege weder Regeln lockern noch Passwörter/IDs ändern. Firestore-MCP-Zugriff meldete abgelaufene Projekt-Credentials; `firebase login --reauth` erfordert bewusste erneute Anmeldung des Projektinhabers. Hosting-Deploy funktionierte dennoch. Kein End-to-End-Lounge- oder Login-Erfolg nach den Releases bestätigt.
- **Uncommittete Dateien:** bereits zuvor gestaged: `CODEX_HANDOFF_2026-09-24-RELAY.md`, `CODEX_HANDOFF_2026-09-24.md`, `GOOGLE_ANTIGRAVITY_HANDOFF_2026-09-24.md`, `functions/index.js`, `functions/large-media-storage.js`, `tests/calls.test.cjs`, `tests/storage.test.cjs` (zusätzlich neue unstaged Tests). Neu unstaged: `account-client.js`, `app.js`, `index.html`, `live-media.js`, `service-worker.js`, `tests/security.test.cjs`, `tests/storage.test.cjs`, dieser Nachtrag. Untracked: `scripts/apply-storage-cors.cjs`, `.kilo/`. `vendor/telephony-providers.js` wird als unstaged modifiziert angezeigt, zeigte zuvor keinen inhaltlichen Diff; vor jeglichem Commit separat prüfen und nicht ungeprüft aufnehmen.
- **Sicherste Fortsetzung:** Je **ein** Screenshot des neuen Konsoleneintrags `Media Lounge start failed <phase> <code>` und `Login failed <phase> <code>` vom betroffenen Laptop (keine Konsoleingaben, keine Zugangsdaten); bei `Email sign-in failed` auch nur Phase/Code. Dann die verweigerte Operation im vorhandenen Code und in den live Regeln gezielt absichern, minimal korrigieren, Sicherheits-Regression testen, vollständige Suite/Build nach Änderung und erst dann die betroffene Komponente deployen. iPhone-Sitzung nicht abmelden.

## Nachtrag 2026-09-25 00:20 UTC – Gemeinsame Aktivitäten, Release blockiert

- **Wunsch und Umfang:** Ältere noch offene Doodle-/Media-Lounge-/Spielanfragen an denselben privaten Chat werden durch eine neue Anfrage ersetzt; historische Karten bleiben als inaktiv sichtbar, angenommene/laufende Sitzungen bleiben unangetastet. Doodle, Lounge und Spiele bleiben separate Oberflächen, im Menü unter „Gemeinsame Aktivitäten“ zusammengefasst. Gruppeneinladungen und Anrufsignalisierung bleiben separat. Neue Lounge-Navigation mit Fotos, Videos und Musik inklusive gemeinsam gewähltem Medium und Musikplayer. Sichtbare Texte in `de/en/ar/fa/tr`, RTL-Tastaturnavigation für `ar/fa`.
- **Lokale Umsetzung, noch NICHT im Hosting veröffentlicht:** `functions/activity-invitations.js` (neuer, adminseitig transaktionaler Ersatz vorheriger offener Einladungen mit paargebundenem Zeiger; keine Client-Schreibfreigabe auf den Zeiger), neue Callable `replaceActivityInvitation` in `functions/index.js`, App-Sendepfad, Doodle-/Spiele-/Lounge-Status und Menü, HTML/CSS/Service-Worker-Versionen (`v145` geplant). Alte aktive Sitzungen werden nicht superseded; unberechtigte Chat-IDs werden abgewiesen. CORS-WIP bleibt erhalten.
- **Validierung:** Gezielt auftretende veraltete Spieltest-Erwartungen und ein Test-Mock für Firestore-Transaktionsrückgaben aktualisiert. Anschließend vollständige Testsuite **84/84 grün**, Build **38 allowlistete Dateien**, Syntaxprüfungen und `git diff --check` erfolgreich. Firebase validierte die geänderten Firestore-Regeln beim Deployment.
- **Tatsächlich deployed:** **Nur Firestore-Regeln** wurden nach erfolgreicher Kompilierung veröffentlicht (erlauben richtungswechselnde Doodle-Einladungen zwischen denselben Teilnehmern bei offener/abgelehnter/beendeter Sitzung). Das ist eine additive Freigabe, kein Löschen bestehender Rechte. Die neue Callable wurde **NICHT** veröffentlicht: erster Versuch brach bei der Eventarc-Service-Identity ab, gezielter Folgeveruch meldete eine Google-Cloud-Runtime-Config-Störung. **Hosting v145 wurde bewusst NICHT deployed**, da sein Einladungs-Sendepfad sonst eine nicht vorhandene Function aufrufen und neue Anfragen scheitern lassen würde. Der öffentliche Hosting-Stand bleibt v144.
- **Noch offen / sicherste Schritte:** Bei Erholung der Google-Cloud-Runtime-Config genau einmal `firebase.cmd deploy --only functions:replaceActivityInvitation --project doori-messenger` (mit `NODE_OPTIONS=--use-system-ca`) ausführen. Erst nach bestätigter Function-Verfügbarkeit `firebase.cmd deploy --only hosting --project doori-messenger`; öffentliche Assets und einen echten Zwei-Geräte-Fall (ältere offene Anfrage ersetzen, alte Annahme gesperrt, neue annehmbar, Musik synchron) verifizieren. Ohne erfolgreiche Function **kein Hosting-Deploy**. Tests/Build nicht unverändert wiederholen. Keine Secrets ausgeben. Keine Commits/Pushes; `main` weiterhin `c9d9d9f01670ce4d91b0fbd31057c58eafcd1639`, sämtliche obigen Änderungen uncommittet einschließlich der früher gestagten CORS-Dateien; `vendor/telephony-providers.js` vor einem späteren Commit gesondert prüfen.
