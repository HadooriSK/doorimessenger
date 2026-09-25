# Doori Messenger – Codex-Handoff vom 25.09.2026

## Verbindlicher Ausgangsstand

- Branch: `main`
- Commit: `eb2830015a872c05719cc6f95fbc0c702b905873`
- `origin/main` ist synchron.
- Live: `https://www.doori-messenger.de/` und `https://doori-messenger.web.app/`
- Im Arbeitsverzeichnis liegt außerdem die bereits vorhandene, unversionierte Datei `MASTER_HANDOFF_DOORI_MESSENGER_2026-09-24.md`. Sie wurde in dieser Änderung nicht bearbeitet oder eingecheckt.

## Anlass

Nach einer per E-Mail bestätigten endgültigen Kontolöschung konnte dieselbe E-Mail-Adresse teilweise nicht erneut registriert werden. Außerdem blieb eine bereits geöffnete Messenger-Sitzung nach der Löschung sichtbar angemeldet. Die Ursache war eine nicht atomar wirkende Reihenfolge: Firestore-Daten und Lösch-Token wurden entfernt, bevor der Authentifizierungseintrag gelöscht wurde; Fehler bei dessen Löschung wurden lediglich protokolliert und trotzdem als erfolgreicher Abschluss behandelt.

## Umgesetzte Änderungen

1. `functions/index.js`
   - `confirmAccountDeletion` löscht zuerst zwingend die Authentifizierungsidentität.
   - Nur `auth/user-not-found` wird als idempotenter Erfolgsfall akzeptiert.
   - Andere Fehler brechen den Vorgang mit `unavailable` ab; Erfolgsmail und Erfolgsergebnis werden dann nicht gesendet.
   - Lösch-Token und Firestore-Daten werden erst nach erfolgreicher Freigabe der E-Mail gelöscht. Dadurch bleibt der Vorgang bei einem vorübergehenden Fehler wiederholbar.

2. `app.js`
   - Angemeldete Clients beobachten den privaten Account-Marker. Wird er nachweislich gelöscht, meldet sich die geöffnete Messenger-Sitzung sofort ab und lädt die Anmeldeseite neu.
   - Für Altlasten des früheren Fehlers gibt es eine sichere Wiederaufnahme: Ist die E-Mail noch als Authentifizierungsidentität vorhanden, aber der private Account-Marker fehlt, kann der Nutzer mit dem bisherigen Passwort seine Identität bestätigen und direkt ein vollständig neues Messenger-Profil registrieren.
   - Ein regulär vorhandenes Konto wird dabei niemals überschrieben.

3. `index.html`
   - Technische Laufzeitfehler und interne Anbieter-/Dateinamen werden nicht mehr als große rote Rohdatenanzeige an Nutzer ausgegeben. Die vorgesehenen übersetzten Meldungen der jeweiligen Bedienabläufe bleiben erhalten.

4. Cache und Tests
   - `app.js?v=363`
   - Service-Worker-Cache: `web-messenger-v149-account-deletion`
   - Sicherheitstest prüft die korrekte Löschreihenfolge, die sichere Wiederaufnahme und die automatische Sitzungsbeendigung.

## Verifikation

- `npm.cmd test`: **86/86 Tests bestanden**.
- `npm.cmd run build`: **38 allowlistete Dateien** erfolgreich gebaut.
- Firebase Function `confirmAccountDeletion` erfolgreich in `europe-west3` aktualisiert.
- Hosting erfolgreich veröffentlicht.
- Der neue Löschablauf wurde strukturell und durch die bestehende Testsuite geprüft. Es wurde bewusst kein echtes Benutzerkonto für einen destruktiven Produktionstest gelöscht.

## Hinweise für die Fortsetzung

- Nichts neu aufsetzen; auf Commit `eb28300` weiterarbeiten.
- Vor Windows-Befehlen weiterhin `$env:NODE_OPTIONS="--use-system-ca"` setzen.
- Änderungen weiterhin in Deutsch, Englisch, Arabisch, Persisch und Türkisch pflegen; RTL für Arabisch und Persisch erhalten.
- Falls ein bereits früher beschädigtes Konto bei der erneuten Registrierung ein anderes als das bisherige Passwort verwendet, muss der Nutzer zunächst über „Zugangsdaten vergessen?“ ein neues Passwort setzen und die Registrierung danach erneut starten. Für alle künftig vollständig gelöschten Konten ist die E-Mail unmittelbar frei.
