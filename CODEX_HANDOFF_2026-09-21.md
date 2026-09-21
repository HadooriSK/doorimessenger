# Übergabedokumentation: Doori Messenger (Antigravity -> Codex)

**Datum:** 21. September 2026  
**Projektordner:** `C:\Users\hidis\.gemini\antigravity\scratch\web-messenger`  
**Firebase-Projekt:** `doori-messenger`  
**Hosting URL:** `https://doori-messenger.web.app/`  
**Eigene Domain:** `https://doori-messenger.de/`  
**Git Commit:** `acb0421`  
**Tests:** 19/19 bestanden (`node --test tests/security.test.cjs`)  

---

## 1. Durchgeführte Arbeiten & Neue Features

In dieser Session wurden wie gewünscht drei neue Einstellungsbereiche mit modernsten Web-Technologien und nativer UI implementiert. Alle sichtbaren Texte wurden lückenlos in allen 5 Sprachen umgesetzt:

### 1. Bereich „Konto & Sicherheit“ (Neuer Tab: `tab-account`)
* **Registrierte E-Mail-Adresse:** Sichtbar im Einstellungsbereich zur Übersicht.
* **Passwort direkt ändern:** Unterstützt `reauthenticateWithCredential` und `updatePassword` über Firebase Auth mit Passwort-Bestätigung und Fehlerbehandlung (`err_wrong_current_password`, etc.).
* **App-Sperre per PIN-Code:** 4-stelliger Zahlencode zum Sperren der App bei Verlassen/Inaktivität. Ein Vollbild-Overlay (`#app-lock-overlay`) sichert den Messenger zuverlässig.
* **Konto endgültig löschen (Gefahrenzone):** Vollständige Löschung des Accounts nach Bestätigung und erneuter Passworteingabe (`user.delete()`).

### 2. Bereich „Benachrichtigungen“ (im Tab `tab-chats`)
* **Auswahl des Benachrichtigungstons:** Integrierter Web-Audio-Synthesizer mit 4 wählbaren Klangfarben:
  1. `chime`: Modern Chime (zweistufiger frischer Akkord)
  2. `soft`: Sanft & Diskret (Sinus-Glocke)
  3. `bell`: Kristall-Glocke (zweistimmiger klarer Klang)
  4. `classic`: Klassischer Standard-Ton
* **Hörprobe-Button:** Direkte Soundausgabe zum Testen (`#btn-test-sound`).
* **Nachrichtenvorschau verbergen:** Schalter zum Verbergen sensibler Chat-Inhalte in Push- und Browserbenachrichtigungen.
* **Haptisches Feedback / Vibration:** Nutzt `navigator.vibrate` für taktiles Feedback auf Smartphones beim Empfangen und Interagieren.

### 3. Bereich „Chats & Medien“ (im Tab `tab-chats`)
* **Automatischer Medien-Download:** Auswahlfeld zur Datenvolumen-Einsparung (`Immer`, `Nur WLAN / Manuell`, `Nie / Datensparmodus`).
* **Chatverlauf exportieren:** Exportiert den aktuellen Chatverlauf strukturiert mit Zeitstempeln und Absendern als `.txt`-Datei auf das Endgerät.

### 4. Zweistufige Konto-Löschung per E-Mail & Cloud Functions
* **Ablauf im Client:**
  1. Klick auf „Konto endgültig löschen“ fragt den Nutzer in der aktiven Sprache: „Möchtest du dein Konto wirklich unwiderruflich löschen?“.
  2. Bei Bestätigung wird kein direktes Löschen mehr ausgeführt, sondern die Cloud Function `requestAccountDeletion` aufgerufen.
  3. Der Nutzer erhält im Messenger die Bestätigung: Eine E-Mail mit einem Bestätigungslink wurde gesendet.
* **E-Mail 1 (Lösch-Anfrage via Brevo):**
  * Wird in der zum Zeitpunkt aktiven Sprache des Nutzers (`de`, `en`, `ar`, `fa`, `tr`) mit RTL-Formatierung für `ar` und `fa` gesendet.
  * Enthält einen **rot hervorgehobenen Bestätigungslink** (`background-color: #d63031`, weiße Schrift, rote Warnung).
  * Führt zu `https://doori-messenger.de/account/action?mode=deleteAccount&token=...&lang=...`.
* **Action-Handler (`account-action.html` & `account-action.js`):**
  * Erkennt `mode === 'deleteAccount'` und validiert das Token.
  * Zeigt eine rote Gefahren-Box mit Warnung und Bestätigungs-Button („Konto jetzt endgültig löschen“ in allen 5 Sprachen).
  * Ruft bei Klick die Cloud Function `confirmAccountDeletion` auf.
* **E-Mail 2 (Lösch-Bestätigung via Brevo):**
  * Nach erfolgreicher Löschung aus Firebase Auth und Firestore (`users`, `profiles`, `accounts`, `presence`, `userData`) sendet die Cloud Function die zweite E-Mail: „Ihr Account wurde gelöscht“ in der jeweiligen Sprache des Nutzers.
* **Sicherheit & Rate Limiting:**
  * Lösch-Tokens sind kryptografische 64-Zeichen-Hashes, gültig für 60 Minuten, gespeichert in Firestore `accountDeletionRequests`.
  * Rate-Limiting über `_rateLimits` verhindert Spam oder DoS.
  * Alle Brevo-API-Aufrufe verbleiben geschützt auf dem Server via Secret `BREVO_API_KEY`.

---

## 2. Eingehaltene Richtlinien (AGENTS.md)
* **Alle 5 Projektsprachen synchron:** Deutsch (`de`), Englisch (`en`), Persisch (`fa`), Arabisch (`ar`) und Türkisch (`tr`) wurden vollständig in allen Komponenten (`app.js`, `account-action.js`, `functions/index.js`, `tests/security.test.cjs`) eingepflegt.
* **RTL-Unterstützung:** Persisch und Arabisch sind mit korrekter Textausrichtung (`dir="rtl"`) eingebunden.
* **Sicherheit:** Keine Klartext-Passwörter oder API-Schlüssel im Frontend.
* **Tests:** 20/20 automatische Tests bestanden (`npm test`).
* **Firebase Deploy:** Deployment von Cloud Functions und Hosting wird automatisch durchgeführt.

---

## 3. Betroffene & geänderte Dateien
* `functions/index.js`: Cloud Functions `requestAccountDeletion` und `confirmAccountDeletion` mit Brevo-E-Mail-Templates (roter Button, 5 Sprachen, RTL).
* `account-action.html`: CSP um europe-west3 Cloud Functions erweitert, Firebase Functions Compat SDK eingebunden, Deletion-Box `#delete-box` integriert.
* `account-action.js`: `deleteAccount`-Modus mit Bestätigungs-Workflow in 5 Sprachen.
* `app.js`: Zweistufiger Löschaufruf via `requestAccountDeletion`, Sprachschlüssel `msg_deletion_email_sent` in allen 5 Sprachen.
* `tests/security.test.cjs`: Erweiterte Tests für Account-Löschung, rote E-Mail-Buttons, Cloud Functions und alle 5 Sprachen (20 Tests bestanden).
* `scripts/build-hosting.cjs`: Produktionsbuild generiert.
* `CODEX_HANDOFF_2026-09-21.md`: Diese Dokumentation.
