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

## Dokumentationspflicht

Nach jeder weiteren Arbeitsphase diese Datei sowie `GOOGLE_ANTIGRAVITY_HANDOFF_2026-09-24.md` und `CODEX_HANDOFF_2026-09-24.md` mit Änderungen, Tests, Build und Deployment aktualisieren.

