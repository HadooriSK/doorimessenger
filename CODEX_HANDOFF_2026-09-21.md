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

### 5. Fünf moderne Messenger-Features (Vollständig in 5 Sprachen)
* **1. Chat-Filter-Tabs (Telegram-Style):**
  * Horizontale Filter-Pill-Leiste (`#chat-filter-bar`) im Chats-Reiter: `Alle`, `Direkt`, `Gruppen`, `Ungelesen`.
  * Reagiert in Echtzeit und filtert die Chat-Liste ohne Page-Reload.
* **2. Sprachnachrichten-Wiedergabegeschwindigkeit (1x / 1.5x / 2x):**
  * Schneller Umschalt-Pill (`.player-speed-btn`) in den Player-Controls jeder Sprachnachricht.
  * Zykliert `1x` $\to$ `1.5x` $\to$ `2x` $\to$ `1x`, steuert die Audio-Engine per `playbackRate` sofort und speichert die Vorliebe in `localStorage` (`doori_audio_speed`).
* **3. Markierte & wichtige Nachrichten (Starred Messages):**
  * Nachrichten-Kontextmenü bietet `⭐ Nachricht markieren` / `⭐ Markierung entfernen`.
  * Markierte Nachrichten tragen ein elegantes goldenes ⭐-Symbol neben Zeit und Lesebestätigung.
  * Eigener Button im Chat-Header (`#chat-starred-btn`) und Dropdown öffnet `#starred-messages-modal` mit Nachrichten-Vorschau und „Zum Chat springen“-Navigation samt Hervorhebungseffekt.
* **4. Profil-Status & Bio mit Emojis:**
  * Vordefinierte Status-Presets (`🟢 Verfügbar`, `☕ Beschäftigt`, `🚀 Bei der Arbeit`, `🚗 Unterwegs`, `🏖️ Im Urlaub`, `💤 Schlafen`) sowie ein eigenes Textfeld in den Profil-Einstellungen.
  * Speicherung im Firestore-Profil (`bio`), wodurch andere Kontakte den Status sicher und regeltreu abrufen können.
  * Anzeige des Status im Chat-Header-Badge (`#current-chat-status-badge`), in der Chatliste neben Kontaktnamen und im Profil-Modal (`#user-profile-bio`).
* **5. Medienspeicher & Chat-Galerie (Shared Media Viewer):**
  * Eigener Button im Chat-Header (`#chat-media-btn`) und Header-Dropdown öffnet `#shared-media-modal`.
  * Drei übersichtliche Kategorien: `Fotos & Videos` (Thumbnail-Grid mit Klick-Vollbildansicht), `Sprachnachrichten` (mit interaktivem Player) und `Dateien` (mit direktem Download-Link).

---

## 2. Eingehaltene Richtlinien (AGENTS.md)
* **Alle 5 Projektsprachen synchron:** Deutsch (`de`), Englisch (`en`), Persisch (`fa`), Arabisch (`ar`) und Türkisch (`tr`) wurden ausnahmslos in allen 5 neuen Features und allen Modalen eingepflegt.
* **RTL-Unterstützung:** Persisch und Arabisch sind mit korrekter Textausrichtung (`dir="rtl"`) eingebunden.
* **Sicherheit:** Strikte Beachtung der Firestore Security Rules (`profiles/{username}` erlaubt `bio`, `userData/{username}` speichert erweiterte Nutzerdaten).
* **Tests:** 21/21 automatische Tests bestanden (`npm test`).
* **Firebase Deploy:** Deployment von Hosting (`https://doori-messenger.web.app`) erfolgreich durchgeführt.

---

## 3. Betroffene & geänderte Dateien
* `index.html`: Chat-Filter-Pills, Header-Aktionsbuttons (Starred, Media), Profil-Status-Presets, User-Profile-Bio, Modale für markierte Nachrichten und geteilte Medien.
* `style.css`: Styling für Filter-Pills, Speed-Buttons, Star-Badges, Status-Presets und Shared-Media-Grid.
* `app.js`: Vollständige Übersetzungen (de, en, fa, ar, tr) für alle 5 Features, Filter-Engine, Player-PlaybackRate-Logik, Starred-Messages-Management, Firestore-Bio-Synchronisation und Media-Galerie.
* `tests/security.test.cjs`: Vollständigkeitsprüfung aller Übersetzungsschlüssel und E2E/Unit-Tests für die 5 modernen Messenger-Funktionen (21/21 Tests grün).
* `CODEX_HANDOFF_2026-09-21.md`: Aktualisierte Dokumentation.
