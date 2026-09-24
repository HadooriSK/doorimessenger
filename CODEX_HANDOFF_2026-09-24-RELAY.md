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

## Umsetzung: Große Mediendateien via Cloudflare R2 & Backblaze B2 (Stand: 24.09.2026)

Der Betreiber hat die Accounts für Cloudflare R2 (10 GB kostenlos) und Backblaze B2 (10 GB kostenlos) eingerichtet und den Start beauftragt:
- **Kaskadierung:** Primär wird Cloudflare R2 genutzt (bis 9,5 GB). Bei Erreichen des Kontingents oder temporärem Ausfall schaltet das System automatisch auf Backblaze B2 um.
- **S3 SigV4 Architektur:** Beide Anbieter unterstützen S3-kompatible SigV4-APIs. Die Cloud Function `requestLargeMediaUpload` generiert kurzlebige signierte `PUT`-URLs (15 min), sodass Uploads clientseitig direkt in den Objektspeicher erfolgen, ohne Firebase-Bandbreite zu belasten.
- **30-Tage automatische Löschung:**
  1. *Speicherebene (nativ):* Lifecycle Rules in Cloudflare R2 („Delete object after 30 days“) und Backblaze B2 („Delete files after 30 days“).
  2. *Anwendungsebene:* Firestore `large_media` speichert `expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000`. Die Funktion `cleanupExpiredLargeMedia` führt serverseitige Bereinigungen durch.
- **Secrets-Verwaltung:**
  - `firebase functions:secrets:set CLOUDFLARE_R2_CONFIG` (JSON mit `accountId`, `accessKeyId`, `secretAccessKey`, `bucketName`, `publicUrl`)
  - `firebase functions:secrets:set BACKBLAZE_B2_CONFIG` (JSON mit `keyId`, `applicationKey`, `bucketName`, `endpoint`, `publicUrl`)
  - Alternativ werden auch Einzelsecrets unterstützt. Keine Secrets im Code oder Git.
- **Testabdeckung:** `tests/storage.test.cjs` validiert SigV4-Presigning, R2->B2 Kaskadierung, Quota-Grenzen und 30-Tage-Fristen. Gesamte Testsuite: **63/63 Tests bestanden (100% grün)**.

## Dokumentationspflicht

Nach jeder weiteren Arbeitsphase diese Datei sowie `GOOGLE_ANTIGRAVITY_HANDOFF_2026-09-24.md` und `CODEX_HANDOFF_2026-09-24.md` mit Änderungen, Tests, Build und Deployment aktualisieren.

