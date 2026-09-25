# Doori Messenger — AntiGravity Handoff Summary

**Stand:** 2026-09-25 02:22 UTC | Branch: `main` | Hosting: **v147** LIVE | Tests: **86/86 grün**

---

## Was wurde gemacht (komplett)

### 1. iPhone / iOS Musikdateien-Auswahl behoben — **LIVE in Hosting v147**
- **Ursache:** 
  - Auf iOS Safari führt ein `<input type="file" accept="audio/*">` dazu, dass im iOS-Dateien-Auswahldialog (UIDocumentPickerViewController) alle Musikdateien (.mp3, .m4a, .wav etc.) ausgegraut / ausgeblendet werden. Apple ordnet lokale Dateien in der Dateien-App standardmäßig nicht `public.audio` zu, wenn die Dateiendungen nicht explizit im `accept`-Attribut aufgelistet sind.
  - Zudem liefert iOS Safari beim Auswählen von Dateien aus der Dateien-App häufig einen leeren MIME-Type (`file.type === ""`), was zu fälschlichen `media_lounge_type_error`-Meldungen führte.
- **Fix:**
  - In `live-media.js`: `ACCEPT_BY_CATEGORY.audio` auf `audio/*,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,audio/aac,audio/ogg,audio/flac,.mp3,.m4a,.wav,.aac,.flac,.ogg,.opus,.m4r,.aiff,.wma` erweitert.
  - In `index.html`: `accept`-Attribut des Media-Lounge-Uploaders um dieselben Dateiendungen ergänzt.
  - In `live-media.js`: `resolveMediaType(file)` implementiert, das bei leerem `file.type` zuverlässig die Dateiendung für Kategorie (`audio`/`video`/`image`) und MIME-Type ermittelt.
  - Hosting v147 mit `live-media.js?v=7` live bereitgestellt.

### 2. Media Lounge Start-Fehler behoben — **LIVE in Hosting v146/v147 & Firestore Rules**
- **Ursache:** 
  1. Clock-Skew: Wenn die lokale Gerätezeit (PC/Handy) minimal vor der Google Firestore-Serverzeit lag, schlug `request.resource.data.expiresAt <= request.time.toMillis() + 24h` mit `permission-denied` fehl.
  2. `creator` und `peer` wurden teils ohne führendes `@` übergeben.
  3. `list-sessions` Query war nicht fehlertolerant.
- **Fix:**
  - `live-media.js`: `creator = me()` und `peer = normalizeUser(chat.id)` erzwingen `@username`.
  - `live-media.js`: `expiresAt` wird mit 2 Minuten Puffer gesetzt (`now + SESSION_MS - 2min`).
  - `firestore.rules`: 5-Minuten Clock-Skew-Toleranz hinzugefügt (`expiresAt <= request.time.toMillis() + 24h + 5min`). Live deployed.

### 3. „Chat leeren“ (Clear Chat) repariert — **LIVE in Hosting v146/v147**
- **Ursache:**
  1. Key-Mismatch: DMs werden intern unter `@username` abgelegt, `currentChat.id` war teils ohne `@`.
  2. Firestore Delete-Rechte: Firestore verbietet `delete()` auf fremden Nachrichten.
  3. `MessageCache` bot keine `clearChat`-Methode.
- **Fix:**
  - `message-cache.js`: `clearChat(chatId)` hinzugefügt (IndexedDB & memoryFallback).
  - `app.js`: Zentrale Funktion `clearCurrentChat()` implementiert (Löscht Aliase, eigene Nachrichten per `delete()`, fremde per `deletedFor: [...currentUser]`).

### 4. Deployments & Status
- **Hosting v147:** LIVE auf `https://doori-messenger.web.app` (`app.js?v=362`, `live-media.js?v=7`, `security.js?v=2`, `message-cache.js?v=2`).
- **Firestore Rules:** LIVE deployed (Clock-Skew-Toleranz aktiv).
- **Cloud Functions:** `replaceActivityInvitation` in `europe-west3` deployed.
- **Tests:** **86/86 Tests grün (100%)** (`npm.cmd test`).
- **Build:** **38 allowlistete Public-Dateien** (`scripts/build-hosting.cjs`).