# Übergabedokumentation an Codex – Doori Messenger

**Datum:** 21. September 2026  
**Ausgangspunkt / Baseline:** Commit `f6aafb9` (*"Confirmed Codex Handoff State"*)  
**Aktueller Arbeitsstand:** Commit `724265e` (*"Optimize message loading with IndexedDB caching, pagination and parentheses status display"*)  
**Projektordner:** `C:\Users\hidis\.gemini\antigravity\scratch\web-messenger`  
**Firebase-Projekt:** `doori-messenger` (Region: `europe-west3`)  
**Eigene Produktiv-Domain:** `https://www.doori-messenger.de/`  
**Firebase Hosting URL:** `https://doori-messenger.web.app/`  
**Aktuelle Frontend-Version:** `app.js?v=340` (mit `message-cache.js?v=1`)  
**Aktueller Build-Status:** 26/26 Dateien freigegeben (`scripts/build-hosting.cjs`)  
**Aktueller Test-Status:** **21/21 Tests bestanden** (100% grün, `node --test tests/security.test.cjs`)  

---

## 1. Unveränderliche Grundanforderungen & Richtlinien (AGENTS.md)

Jede Erweiterung und jede sichtbare Benutzeroberfläche muss ausnahmslos folgende Vorgaben erfüllen:

1. **Synchron in allen 5 Sprachen verfügbar:**
   - Deutsch (`de`)
   - Englisch (`en`)
   - Persisch / Farsi (`fa`)
   - Arabisch (`ar`)
   - Türkisch (`tr`)
2. **Strikte RTL-Unterstützung:**
   - Arabisch (`ar`) und Persisch (`fa`) müssen stets die korrekte Leserichtung (`dir="rtl"`) aufweisen. Alle neuen Formulare, Buttons, Badges und Textausrichtungen sind RTL-kompatibel aufgebaut.
3. **Keine Klartext-Secrets im Client:**
   - E-Mail-, SMTP- und API-Schlüssel (insbesondere `BREVO_API_KEY`) dürfen niemals im Frontend, im Git-Repository oder in Build-Artefakten stehen. Sie verbleiben serverseitig in Google Cloud Secret Manager / Cloud Functions.
4. **Allowlist-Build:**
   - Das Produktiv-Deployment nutzt `npm run build` (`scripts/build-hosting.cjs`). Nur explizit in der Allowlist geführte Dateien gelangen in das Verzeichnis `dist/`. Änderungen müssen in den Quelldateien vorgenommen werden, niemals direkt in `dist/`.
5. **Testing & Stabilität:**
   - Kein Deploy ohne vorherigen Durchlauf von `npm test` mit 0 Fehlern.

---

## 2. Chronologie der Änderungen seit Baseline `f6aafb9`

Seit dem Übernahme-Commit `f6aafb9` wurden 5 strukturierte Releases entwickelt, getestet, committet und live bereitgestellt:

| Commit | Titel / Beschreibung | Kerninhalte |
| :--- | :--- | :--- |
| **`acb0421`** | *Add modern settings for account, notifications, chats in 5 languages* | 3 neue Einstellungsbereiche: Konto & Sicherheit (Passwortänderung, PIN-Sperre), Benachrichtigungen (Web Audio Synthesizer, Vorschau verbergen, Haptik), Chats & Medien (Auto-Download, Chat-Export). |
| **`f359256`** | *Implement 2-step account deletion via email and Cloud Functions with 5 languages* | Zweistufige Accountlöschung: Client-Trigger $\to$ Brevo-Mail mit rotem Gefahren-Link $\to$ Branded Action-Page $\to$ atomare serverseitige Firestore- & Auth-Löschung $\to$ Bestätigungsmail. |
| **`4a00323`** | *Add 5 modern messenger features in 5 languages and deploy* | 5 moderne Messenger-Features: Telegram-Filter-Pills, Audio-Wiedergabegeschwindigkeit (1x/1.5x/2x), Starred Messages mit Sprung-Navigation, Profil-Status & Bio mit Emojis, Shared Media Viewer (Fotos/Audios/Dateien). |
| **`4ea49f7`** | *fix(i18n): synchronize profile status preset across all languages and views* | Dynamischer Sprach-Parser für Status-Presets (`getPresetKeyFromStatus`), automatische Übersetzung bei Sprachwechsel in Einstellungen, Chatliste, Chat-Header und Profil-Info. |
| **`724265e`** | *Optimize message loading with IndexedDB caching, pagination and parentheses status display* | IndexedDB Message-Cache (`message-cache.js`), Nachrichten-Paginierung (`PAGE_SIZE = 40`), Tiered Infinite Scroll upwards, Lazy Loading & `preload="none"`, Statusanzeige in Klammern `(...)` neben Namen ohne Beeinträchtigung des Online-Präsenzstatus. |

---

## 3. Detaillierte Dokumentation aller umgesetzten Features

### 3.1 Erweiterte Einstellungsbereiche (`index.html`, `app.js`, `style.css`)

In den Einstellungen (`#settings-modal`) wurden drei moderne Hauptbereiche implementiert:

#### A. Bereich „Konto & Sicherheit“ (Neuer Tab: `tab-account`)
- **Registrierte E-Mail-Adresse:**
  - Element `#account-email-display` zeigt die mit dem Konto verknüpfte E-Mail-Adresse aus `firebase.auth().currentUser.email` schreibgeschützt an.
- **Passwort direkt ändern:**
  - Formular `#change-password-form` mit `#input-current-password`, `#input-new-password` und `#input-confirm-password`.
  - Führt clientseitig zuerst eine Re-Authentifizierung durch (`reauthenticateWithCredential` via `EmailAuthProvider.credential`), prüft auf Passwortübereinstimmung und Mindestlänge (6 Zeichen) und führt anschließend `updatePassword` aus.
  - Vollständige lokalisierte Fehlermeldungen für falsches aktuelles Passwort (`err_wrong_current_password`), schwaches Passwort (`err_weak_password`) oder Abweichungen (`err_password_mismatch`).
- **App-Sperre per PIN-Code:**
  - Checkbox `#setting-app-lock` und PIN-Eingabefeld `#setting-app-pin` (4 Ziffern).
  - PIN wird via SHA-256 gehasht in `localStorage` (`doori_app_pin_hash`, `doori_app_pin_enabled`) abgelegt.
  - Bei aktiver PIN-Sperre wird ein Vollbild-Overlay `#app-lock-overlay` eingeblendet:
    - Sofort bei Inaktivität (nach 5 Minuten)
    - Sofort beim Verlassen des Fensters bzw. Minimieren des Tabs (`visibilitychange`, `blur`).
  - Das Overlay bietet ein Ziffern-Tastenfeld (0–9) sowie ein Passwortfeld zur Eingabe; bei korrekter PIN wird der Messenger wieder freigegeben.
- **Konto endgültig löschen (Gefahrenzone):**
  - Roter Button `#btn-delete-account` am Ende des Tabs.

#### B. Bereich „Benachrichtigungen“ (im Tab `tab-chats`)
- **Auswahl des Benachrichtigungstons:**
  - Dropdown `#setting-notif-sound` mit 4 Klangfarben:
    1. `chime`: Modern Chime (frischer zweistufiger Dur-Akkord auf 523.25 Hz C5 und 659.25 Hz E5 mit Exponential-Decay).
    2. `soft`: Sanft & Diskret (reine Sinus-Glocke auf 440 Hz A4 mit weichem Ein- und Ausblenden).
    3. `bell`: Kristall-Glocke (zweistimmig auf 880 Hz A5 und 1318.51 Hz E6).
    4. `classic`: Klassischer Standard-Signalton.
  - **Integrierter Web Audio Synthesizer:** Alle Töne werden direkt im Browser über `AudioContext`, `createOscillator()` und `createGain()` erzeugt. Es müssen keine externen MP3-Dateien geladen werden.
- **Hörprobe-Button:**
  - Button `#btn-test-sound` spielt den aktuell ausgewählten Ton sofort ab.
- **Nachrichtenvorschau verbergen:**
  - Checkbox `#setting-hide-preview` (gespeichert in `localStorage` als `doori_hide_preview`).
  - Verhindert, dass sensible Chat-Inhalte in Desktop- oder System-Push-Benachrichtigungen angezeigt werden; stattdessen erscheint nur „Neue Nachricht empfangen“.
- **Haptisches Feedback / Vibration:**
  - Checkbox `#setting-vibrate` (gespeichert in `localStorage` als `doori_vibrate_enabled`).
  - Nutzt `navigator.vibrate([100, 50, 100])` auf Mobilgeräten beim Eintreffen neuer Nachrichten.

#### C. Bereich „Chats & Medien“ (im Tab `tab-chats`)
- **Automatischer Medien-Download:**
  - Dropdown `#setting-auto-download` mit 3 Optionen: `always` (Immer), `wifi` (Nur WLAN / Manuell), `never` (Nie / Datensparmodus).
- **Chatverlauf exportieren:**
  - Button `#btn-export-chat`.
  - Exportiert den Verlauf des aktuell geöffneten Chats als formatierte `.txt`-Datei mit Zeitstempeln (`[DD.MM.YYYY, HH:mm] Absender: Nachricht`) als direkter Browser-Download.

---

### 3.2 Zweistufige Konto-Löschung per E-Mail & Cloud Functions (`functions/index.js`, `account-action.*`)

Um Missbrauch oder versehentliche Löschungen auszuschließen und absolute DSGVO-Konformität zu gewährleisten:

1. **Client-Ablauf:**
   - Klick auf `#btn-delete-account` öffnet eine lokalisierte Bestätigungsabfrage (`dlg_delete_account_confirm`).
   - Bei Bestätigung ruft `account-client.js` die Cloud Function `requestAccountDeletion({ lang })` auf.
   - Der Client erhält die Bestätigung und informiert den Benutzer: Eine E-Mail mit einem Bestätigungslink wurde gesendet.
2. **Cloud Function `requestAccountDeletion`:**
   - Validiert die Authentifizierung des Nutzers (`context.auth.uid`).
   - Prüft Rate-Limiting in `_rateLimits` (max. 3 Anfragen pro Stunde).
   - Erzeugt ein kryptografisches 64-Zeichen-Hex-Token (`crypto.randomBytes(32).toString('hex')`).
   - Speichert den Request in Firestore `accountDeletionRequests/{token}` mit Ablaufzeit (TTL 60 Minuten).
   - Sendet via Brevo HTTP API (`https://api.brevo.com/v3/smtp/email`) eine E-Mail mit **rot hervorgehobenem Bestätigungs-Button** (`background-color: #d63031`, weiße Schrift) in der Nutzersprache (`de`, `en`, `ar`, `fa`, `tr`) mit RTL-Formatierung für `ar`/`fa`.
   - Der Link verweist auf: `https://doori-messenger.de/account/action?mode=deleteAccount&token=...&lang=...`.
3. **Branded Action Page (`account-action.html` & `account-action.js`):**
   - Verarbeitet den Modus `mode === 'deleteAccount'`.
   - Zeigt eine markante rote Gefahren-Box (`#delete-box`) mit lokalisierten Warnhinweisen und dem endgültigen Bestätigungs-Button `#delete-confirm-button`.
   - Bei Klick ruft die Seite `confirmAccountDeletion({ token })` auf.
4. **Cloud Function `confirmAccountDeletion`:**
   - Validiert das Token und prüft `expiresAt > Date.now()`.
   - Löscht atomar alle Daten des Nutzers aus Firestore:
     - `users/{usernameKey}`
     - `profiles/{usernameKey}`
     - `accounts/{uid}`
     - `presence/{usernameKey}`
     - `userData/{username}`
     - `accountDeletionRequests/{token}`
   - Löscht den Auth-Nutzer aus Firebase Authentication (`admin.auth().deleteUser(uid)`).
   - Sendet via Brevo die 2. E-Mail („Ihr Account wurde erfolgreich gelöscht“) in der Nutzersprache an die Adresse des Nutzers.

---

### 3.3 Fünf moderne Messenger-Features

#### 1. 📂 Chat-Filter-Tabs (Telegram-Style)
- **UI:** Horizontale Leiste `#chat-filter-bar` oberhalb der Chatliste mit 4 Filter-Pills: `Alle` (`all`), `Direkt` (`direct`), `Gruppen` (`groups`), `Ungelesen` (`unread`).
- **Funktionsweise:** Reagiert ohne Seiten-Reload in Echtzeit. Aktiver Filter wird optisch mit `var(--accent)` akzentuiert. `renderChatList()` filtert die angezeigten Chats unmittelbar nach Chat-Typ (`dm`, `room`, `channel`) oder unread-Status (`unreadChats.has(c.id)`).

#### 2. ⚡ Sprachnachrichten-Geschwindigkeit (1x / 1.5x / 2x)
- **UI:** Schneller Pill-Button `.player-speed-btn` direkt in der Steuerleiste jedes Custom-Audio-Players.
- **Funktionsweise:** Klick zykliert die Abspielgeschwindigkeit: `1x` $\to$ `1.5x` $\to$ `2x` $\to$ `1x`. Setzt `media.playbackRate` sofort um und speichert die Vorliebe des Nutzers dauerhaft in `localStorage` (`doori_audio_speed`).

#### 3. ⭐ Markierte & wichtige Nachrichten (Starred Messages)
- **UI & Kontextmenü:** Kontextmenü (Rechtsklick / Long-Press auf Nachrichten) bietet `⭐ Nachricht markieren` bzw. `⭐ Markierung entfernen`.
- **Anzeige:** Markierte Nachrichten tragen ein elegantes goldenes Stern-Icon (`#ffd700`) neben Zeitstempel und Lesestatus.
- **Header-Button & Modal:**
  - Neuer Button `#chat-starred-btn` im Chat-Header sowie Dropdown-Menü öffnet `#starred-messages-modal`.
  - Listet alle markierten Nachrichten des aktuellen Chats mit Absender, Vorschautext und Datum auf.
  - **Sprungnavigation:** Klick auf einen Eintrag springt sofort zur Nachricht im Chat, scrollt sie weich ins Zentrum (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) und hebt sie für 2 Sekunden mit einer pulsierenden gelben Animation (`@keyframes star-pulse`) hervor.

#### 4. 🎭 Profil-Status & Bio mit Emojis
- **UI:** Status-Presets (`🟢 Verfügbar`, `☕ Beschäftigt`, `🚀 Bei der Arbeit`, `🚗 Unterwegs`, `🏖️ Im Urlaub`, `💤 Schlafen`) sowie Freitextfeld `#setting-custom-status` in den Profileinstellungen.
- **Speicherung:** Gespeichert in Firestore unter `profiles/{username}.bio`, sodass der Status nach den Firestore-Sicherheitsregeln für Kontakte sicher abrufbar ist.
- **Mehrsprachiger Parser (`getPresetKeyFromStatus`):**
  - Erkennt Presets unabhängig davon, in welcher Sprache sie gespeichert wurden, unter Bereinigung von Emojis und Sonderzeichen.
  - `syncSettingsStatusUI()` synchronisiert das Eingabefeld und die Preset-Highlights bei jedem Sprachwechsel und beim Öffnen der Einstellungen automatisch in die aktive Sprache.
  - Kontakte sehen vordefinierte Presets stets in ihrer eigenen gewählten Sprache!

#### 5. 🔍 Medienspeicher & Chat-Galerie (Shared Media Viewer)
- **UI:** Button `#chat-media-btn` im Chat-Header sowie Dropdown-Menü öffnet `#shared-media-modal`.
- **3 strukturierte Kategorien:**
  1. `Fotos & Videos`: Responsive Rasteransicht aller gesendeten Bilder und Videos. Klick öffnet eine Lightbox-Großansicht.
  2. `Sprachnachrichten`: Vollständige Liste aller Audionachrichten mit Absender, Zeitstempel und eigenem Custom-Audio-Player.
  3. `Dateien`: Liste aller Dokumente, Standorte und Anhänge mit Dateinamen, Größe und direktem Download-Link.

---

### 3.4 Chat- & Medien-Paginierung mit lokalem IndexedDB-Cache (`message-cache.js`)

Zur drastischen Reduzierung von Firebase-Lesevorgängen, Datenverkehr und Speicherzugriffen:

#### A. Lokaler HTML5 IndexedDB-Cache (`message-cache.js`)
- **Architektur:** Eigenständiges Modul `message-cache.js` auf Basis der nativen Browser-IndexedDB.
- **Datenbank:** `doori_message_cache` (Version 1).
- **Object Store:** `messages` mit KeyPath `[chatId, id]` und zusammengesetztem Index `chatId_timestamp` (`['chatId', 'timestamp']`).
- **In-Memory-Fallback:** Läuft die App in einer Umgebung ohne IndexedDB (z. B. Node.js/JSDOM oder privater Modus ohne Storage-Rechte), schaltet das Modul automatisch und unterbrechungsfrei auf eine Map-basierte In-Memory-Speicherung um.
- **API:**
  - `window.MessageCache.saveMessages(chatId, msgs)`: Speichert Nachrichten atomar im Store.
  - `window.MessageCache.getLatestMessages(chatId, limit)`: Holt die neuesten $N$ Nachrichten sortiert nach Zeitstempel.
  - `window.MessageCache.getOlderMessages(chatId, beforeTimestamp, limit)`: Holt ältere Nachrichten vor einem bestimmten Zeitstempel.
  - `window.MessageCache.clearCache()`: Leert den Cache (auch verknüpft mit `#clear-cache-btn`).

#### B. Nachrichten-Paginierung (`PAGE_SIZE = 40`)
- Beim Öffnen eines Chats (`selectChat`) werden initial **nur die neuesten 40 Nachrichten** gerendert (`PAGE_SIZE = 40`).
- Nachrichten werden zunächst aus dem lokalen `MessageCache` oder Arbeitsspeicher hydriert, wodurch das Chatfenster sofort ohne Wartezeit erscheint.
- Echtzeit-Nachrichten aus dem Firestore-Listener (`onSnapshot`) werden automatisch in den lokalen Cache weggeschrieben.

#### C. Dreistufiger Infinite Scroll nach oben (`messagesContainer.onscroll`)
Wenn der Nutzer im Chat nach oben scrollt (`scrollTop < 60`), lädt das System ältere Nachrichten nahtlos nach:
1. **Stufe 1 (Memory):** Befinden sich ältere Nachrichten bereits im Arbeitsspeicher, wird das sichtbare Limit um `PAGE_SIZE` erhöht (`limit += 40`).
2. **Stufe 2 (IndexedDB Cache):** Sind im Arbeitsspeicher keine älteren Daten vorhanden, fragt der Messenger `MessageCache.getOlderMessages(chatId, oldestTimestamp, PAGE_SIZE)` ab.
3. **Stufe 3 (Firestore Cursor):** Ist auch der lokale Cache erschöpft, wird eine gezielte Firestore-Abfrage mit Cursor `startAfter(oldestDoc).limit(PAGE_SIZE)` ausgeführt.
4. **Präzise Scrollposition:** Nach dem Einfügen älterer Nachrichten wird die Scroll-Position exakt ausgeglichen:
   ```javascript
   messagesContainer.scrollTop += messagesContainer.scrollHeight - prevScrollHeight;
   ```
   Dadurch springt der Chat nicht und der Lesefluss bleibt vollkommen stabil.

#### D. Medien- & Bandbreitenschutz
- **Bilder und GIFs:** Werden mit `loading="lazy"` und `decoding="async"` gerendert.
- **Audio- und Video-Player:** Alle Player in `renderCustomPlayer()` und `shared-media-modal` nutzen `preload="none"`. Mediendateien laden erst dann Daten herunter, wenn der Nutzer tatsächlich auf den Abspiel-Button klickt.

---

### 3.5 Statusanzeige in Klammern `(...)`

- **Anforderung:** Wenn ein Nutzer einen Status wählt (z. B. `☕ Beschäftigt` oder Freitext), soll dieser in Klammern `(...)` neben seinem Namen in Listen und Headern erscheinen, **ohne** den unabhängigen Online-/Präsenz-Status im Chat-Header zu beeinträchtigen.
- **Umsetzung:**
  1. **Chat- & Kontaktliste (`renderChatList`):**
     Neben dem Chat- oder Kontaktnamen wird der Status formatiert als:
     ```html
     <span class="user-status-badge" style="font-size: 11px; opacity: 0.85; margin-left: 4px; color: var(--accent); font-weight: normal;">(☕ Beschäftigt)</span>
     ```
     gerendert (ausgeblendet, wenn der Status leer oder Standard „Online“ ist).
  2. **Seitenleisten-Header (`updateCurrentUserDisplay`):**
     Element `#current-user-status-display` neben `#current-user-display`:
     `Angemeldet als: @username (☕ Beschäftigt)`.
  3. **Chat-Header (Strikte Trennung):**
     - `#current-chat-status-badge` zeigt den Profilstatus in Klammern: `(☕ Beschäftigt)`.
     - `#current-chat-status` zeigt unabhängig davon den Live-Präsenzstatus: `Online` oder `Zuletzt online vor...`.

---

## 4. Übersicht der modifizierten & neuen Dateien

| Datei | Status | Beschreibung |
| :--- | :--- | :--- |
| **`message-cache.js`** | **NEU** | IndexedDB Message-Cache (`doori_message_cache`) mit Store `messages`, Index `chatId_timestamp` und Memory-Fallback. |
| **`scripts/build-hosting.cjs`** | Modifiziert | `message-cache.js` zur Allowlist hinzugefügt (jetzt 26 Dateien). |
| **`index.html`** | Modifiziert | Filter-Pills, Header-Buttons (Starred, Media), Profile-Status-Presets mit `data-status-key`, `#current-user-status-display`, Modale für Starred Messages und Shared Media, PIN-Lock-Overlay. |
| **`style.css`** | Modifiziert | CSS für Filter-Pills, Speed-Buttons, Star-Badges, Star-Pulse-Animation, Media-Grid, Status-Presets, PIN-Lock. |
| **`app.js`** | Modifiziert | Paginierungs-Engine (`visibleMessageLimits`, `PAGE_SIZE`), Infinite Scroll, IndexedDB-Anbindung, Status in Klammern `(...)`, Übersetzungsschlüssel in allen 5 Sprachen (de, en, fa, ar, tr), Presets-Synchronisation (`getPresetKeyFromStatus`, `syncSettingsStatusUI`), Web Audio Synthesizer, Chat-Export. |
| **`functions/index.js`** | Modifiziert | Cloud Functions `requestAccountDeletion` und `confirmAccountDeletion` mit Brevo E-Mail-Templates in 5 Sprachen und RTL. |
| **`account-action.html`** | Modifiziert | Rote Gefahrenbox `#delete-box` für Accountlöschung. |
| **`account-action.js`** | Modifiziert | Handler für `mode === 'deleteAccount'` mit lokalisierter Bestätigung. |
| **`tests/security.test.cjs`** | Modifiziert | Erweiterung um Tests für moderne Features, Paginierung, IndexedDB-Cache, Parentheses-Statusanzeige und Mehrsprachigkeit. |
| **`CODEX_HANDOFF_2026-09-21.md`**| Modifiziert | Vollständige Übergabedokumentation. |

---

## 5. Test-Suite & Verifikation

Die Test-Suite in `tests/security.test.cjs` wurde erweitert und deckt alle sicherheits- und funktionsrelevanten Bereiche ab:

```powershell
npm test
```

### Testergebnisse (21 von 21 bestanden, 100% grün):
1. `✔ mentions preserve canonical @ and support all supported alphabets`
2. `✔ login usernames resolve identically with or without an at sign`
3. `✔ destination survives switching chats and saved messages are private`
4. `✔ actual sendMessage keeps the original destination across asynchronous work`
5. `✔ sanitizer removes executable markup and keeps display text`
6. `✔ action arguments cannot break out of HTML attributes or become code`
7. `✔ authentication additions cover five languages`
8. `✔ application always starts dark and still supports switching to light mode`
9. `✔ add-contact actions stay inside their hidden modal and are translated`
10. `✔ composer keeps only send beside the message field and moves plus to tools`
11. `✔ voice playback survives periodic chat refreshes`
12. `✔ sanitizer keeps stored audio data URLs playable`
13. `✔ opening a chat renders its existing history immediately`
14. `✔ voice recording emits non-empty periodic chunks in a supported format`
15. `✔ Blaze deployment keeps mail secrets server-side and limits message listeners`
16. `✔ email action links use an authorized continue domain and keep the branded destination`
17. `✔ removed third-party games are absent from the public application`
18. `✔ branded account action page covers all five languages and hides the default handler`
19. `✔ modern settings additions cover all five languages and preserve RTL for ar and fa`
20. `✔ two-step account deletion sends red confirmation email and second deleted email in 5 languages`
21. `✔ five modern features (chat filter, voice speed, starred messages, profile status, shared media) are fully functional` (inklusive Validierung von `MessageCache`, Paginierung auf 40 Nachrichten und Statusanzeige in Klammern).

---

## 6. Build & Deployment

### Build-Vorgang
```powershell
npm run build
```
- Kopiert die 26 freigegebenen Dateien aus der Allowlist in `scripts/build-hosting.cjs` in den Ordner `dist/`.

### Firebase Hosting Deployment
Aufgrund von Windows / Node 24 Zertifikatsvalidierungen muss das Deployment mit `--use-system-ca` ausgeführt werden:
```powershell
cmd.exe /c "set NODE_OPTIONS=--use-system-ca && firebase.cmd deploy --only hosting"
```
**Aktueller Status:** Erfolgreich auf Live-Produktion (`https://www.doori-messenger.de/` und `https://doori-messenger.web.app/`) ausgerollt.

### Git Status
Alle Änderungen sind auf Branch `main` committet und auf `origin/main` (`https://github.com/HadooriSK/doorimessenger.git`) synchronisiert.

---

## 7. Wichtige Hinweise & nächste Schritte für Codex

1. **Geplante Spiele-Phase (Zwei-Spieler-Spiele):**
   - Der Benutzer hatte früher externe Spiele abgelehnt und wünscht native Zwei-Spieler-Spiele direkt im Messenger (ohne externe Iframes).
   - In einer früheren Phase wurden die Spielideen **1, 3, 4 und 5** favorisiert (Idee 2 verworfen).
   - *Empfehlung für Codex:* Vor Implementierungsbeginn die 4 Spielideen kurz mit dem Benutzer namentlich abgleichen und bestätigen lassen, danach modular und in allen 5 Sprachen mit nativer Logik entwickeln.
2. **Brevo API Key:**
   - Liegt sicher als Cloud Function Secret `BREVO_API_KEY`. Niemals im Frontend verwenden.
3. **Paginierung & IndexedDB-Cache beachten:**
   - Bei künftigen Änderungen an `renderMessages()` oder dem Chat-Listener stets berücksichtigen, dass `visibleMessageLimits` und `window.MessageCache` aktiv sind. Keine synchronen Schleifen über unbegrenzte Nachrichtenmengen einbauen, um den Firebase-Kosten- und Performance-Vorteil nicht zu verlieren.
4. **Mehrsprachigkeit & RTL:**
   - Weiterhin streng die 5-Sprachen-Regel (`de`, `en`, `ar`, `fa`, `tr`) für alle neuen Strings, Buttons, Tooltips und Platzhalter einhalten.

---

## 8. Codex-Fortsetzung: Native Zwei-Spieler-Spiele

**Commit:** `242f851` – *Add native two-player game center in five languages*  
**Live veröffentlicht:** Hosting und Firestore-Regeln  
**Frontend:** `app.js?v=342`, `games.js?v=1`, `style.css?v=323`  
**Service Worker:** `web-messenger-v97-native-games`

Die Spieleauswahl wurde endgültig festgelegt und umgesetzt:

1. **Klassiker-Duell** mit zwei auswählbaren Varianten:
   - Tic-Tac-Toe
   - Vier gewinnt
2. **Memory-Duell**
3. **Quiz-Duell**
4. **Schiffe versenken** mit automatisch platzierter Flotte

Technische Umsetzung:

- Neues produktives Modul `games.js`, in der Hosting-Allowlist enthalten.
- Spielezentrum über `🎮 Spiele` im Plus-Menü eines privaten Chats.
- Keine externen Webseiten oder Iframes.
- Firestore-Sitzungen unter `gameSessions/{gameId}`.
- Teilnehmerbasierte Firestore-Regeln; Spieltyp, Ersteller und Teilnehmer sind bei Updates unveränderlich.
- Spielzüge verwenden Firestore-Transaktionen, damit parallele Klicks keinen Stand überschreiben.
- Spieleinladungen erscheinen als eigene Karte im Chat und öffnen die gemeinsame Partie.
- Laufende Spiele können aus dem Spielezentrum wieder geöffnet werden.
- Revanche setzt die gewählte Variante sauber zurück.
- Responsive Darstellung, heller/dunkler Modus und RTL-Unterstützung.
- Sämtliche sichtbaren Texte in `de`, `en`, `ar`, `fa`, `tr`.

Validierung:

- `npm.cmd test`: **22/22 Tests bestanden**.
- `npm.cmd run build`: **27 allowlistete Dateien** erfolgreich gebaut.
- `firestore.rules` wurde beim Deployment erfolgreich von Firebase kompiliert.
- Live-Domain liefert alle fünf internen Spieltypen: `tictactoe`, `connect4`, `memory`, `quiz`, `battleship`.
- Lokaler Firestore-Emulatortest konnte nicht starten, weil Java auf dem Rechner nicht installiert bzw. nicht im PATH ist. Dies war kein Regeltestfehler; die produktive Firebase-Regelkompilierung war erfolgreich.
