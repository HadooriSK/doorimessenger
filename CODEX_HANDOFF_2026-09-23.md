# Übergabedokumentation an Codex – Doori Messenger

**Datum:** 23. September 2026  
**Aktueller Stand:** Commit `cefd574` (*"feat(telephony): multi-provider fallback (Agora -> Daily -> GetStream) and operator console"*)  
**Vorheriger Ausgangspunkt:** Commit `ea57bad` (*"docs: document Doori AI assistant, operator console and speech fixes"*)  
**Projektordner:** `C:\Users\hidis\.gemini\antigravity\scratch\web-messenger`  
**Firebase-Projekt:** `doori-messenger` (Region: `europe-west3`)  
**Eigene Produktiv-Domain:** `https://www.doori-messenger.de/`  
**Firebase Hosting URL:** `https://doori-messenger.web.app/`  
**Aktuelle Frontend-Version:** `agora-calls.js?v=2`, `operator.html`, `operator.js?v=2`, `operator.css?v=2`, `service-worker.js` (Cache: `web-messenger-v112-telephony-fallback`)  
**Aktueller Test-Status:** **51/51 Tests bestanden** (100% grün, `npm test`)  
**Aktueller Build-Status:** 35/35 allowlistete Dateien erfolgreich gebaut und per Firebase Hosting live bereitgestellt.

---

## 1. Unveränderliche Grundanforderungen & Richtlinien (AGENTS.md)

Jede neue oder geänderte sichtbare Funktion muss ausnahmslos folgende Vorgaben erfüllen:

1. **Synchron in allen 5 Sprachen verfügbar:**
   - Deutsch (`de`)
   - Englisch (`en`)
   - Arabisch (`ar`)
   - Persisch / Farsi (`fa`)
   - Türkisch (`tr`)
2. **Strikte RTL-Unterstützung:**
   - Arabisch (`ar`) und Persisch (`fa`) müssen stets die korrekte Leserichtung (`dir="rtl"`) aufweisen. Alle neuen Formulare, Buttons, Badges und Textausrichtungen sind RTL-kompatibel aufgebaut.
3. **Keine Klartext-Secrets im Client:**
   - API-Schlüssel, Secrets und Zertifikate (`BREVO_API_KEY`, `AGORA_APP_CERTIFICATE`, `DAILY_API_KEY`, `STREAM_API_SECRET`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `CLOUDFLARE_API_TOKEN`) verbleiben serverseitig in Cloud Functions / Google Cloud Secret Manager.
4. **Allowlist-Build:**
   - Das Produktiv-Deployment nutzt `npm run build` (`scripts/build-hosting.cjs`). Nur explizit in der Allowlist geführte Dateien gelangen in das Verzeichnis `dist/`. Änderungen müssen in den Quelldateien vorgenommen werden, niemals direkt in `dist/`.
5. **Testing & Stabilität:**
   - Kein Deploy ohne vorherigen Durchlauf von `npm test` mit 0 Fehlern.

---

## 2. Hauptaufgabe heute: Multi-Provider Telefonie mit Fallback-Kaskade

### 2.1 Ziel & Problemstellung
Bislang war für Audio- und Videoanrufe ausschließlich Agora integriert. Fiel Agora aus oder war das monatliche Freikontingent erschöpft, brachen Anrufe ab. Die Telefonie sollte daher um zwei zusätzliche Anbieter (**Daily.co** und **GetStream**) erweitert werden, inklusive eines intelligenten, automatischen Fallback-Systems ohne Unterbrechung der bestehenden Anrufoberfläche.

### 2.2 Die Kaskaden-Reihenfolge
1. **Agora RTC (Hauptanbieter):** 10.000 Freiminuten / Monat.
2. **Daily.co (Fallback 1):** 10.000 Freiminuten / Monat.
3. **GetStream Video (Fallback 2):** 66.000 Freiminuten / Monat (Maker Tier).

### 2.3 Quoten-Architektur: Warum internes Firestore-Billing statt Provider-APIs?
Die Abrechnungs- und Verbrauchs-APIs von Agora, Daily und GetStream aktualisieren Daten mit einer **Verzögerung von bis zu 24 Stunden**. Ein Echtzeit-Schutz vor unerwarteten Kosten über Drittanbieter-Webhooks oder REST-Abfragen ist technisch nicht verlässlich.  
**Lösung in Doori:**
- Beim Start/Beenden eines Anrufs erfasst Doori die Gesprächszeiten atomar in Firestore (`_telephonyBudgets/{provider}-{month}` und `_telephonyMetrics/{day}`).
- Getrennte Zählung von **Audio- und Videominuten**.
- Sobald ein Anbieter sein Monatskontingent erreicht, markiert das Backend den Status als `limit_reached` und die Kaskade schaltet sofort auf den nächsten Anbieter um.

---

## 3. Architektur & Implementierungsdetails

### 3.1 Backend: `functions/telephony-router.js` & `functions/index.js`
- **`getTelephonySession` (Cloud Function v2, HTTPS Callable):**
  - Parameter: `{ scope: 'direct'|'group', id, type: 'audio'|'video', failedProviders: [] }`.
  - Secrets: `[AGORA_APP_CERTIFICATE, DAILY_API_KEY, STREAM_API_SECRET]`.
  - Prüft Berechtigung des Nutzers (nur Call-Teilnehmer bzw. aktive Gruppenmitglieder).
  - Prüft das monatliche Minutenbudget (`_telephonyBudgets`). Überschreitet ein Anbieter sein Limit oder ist er in `failedProviders`, wird er übersprungen.
  - Erzeugt die providerspezifische Sitzung:
    - **Agora:** Baut ein RTC-Publisher-Token via `agora-token` (`buildTokenWithUserAccount`).
    - **Daily.co:** Legt via REST API (`POST https://api.daily.co/v1/rooms`) bei Bedarf einen Raum an und erzeugt ein Meeting-Token.
    - **GetStream:** Generiert serverseitig ein sicheres JWT (HMAC-SHA256 nativ mit Node.js `crypto`) und verifiziert die Call-ID bei der Stream Video API.
  - Gibt das Sitzungsobjekt mit `provider`, `role`, `failoverTimeoutMs` (Default: 6000ms) und Zugangsdaten zurück.
- **`recordCallDuration` (Cloud Function v2, HTTPS Callable):**
  - Parameter: `{ provider, durationSeconds, callType: 'audio'|'video' }`.
  - Aktualisiert atomar in Firestore `_telephonyBudgets/{provider}-{month}` (Gesamtsekunden, Audio, Video, abgeschlossene Anrufe) und `_telephonyMetrics/{day}`.
- **`updateTelephonyAdminConfig` (Cloud Function v2, HTTPS Callable):**
  - Erlaubt dem Betreiber, Monatskontingente (`agoraMonthlyMinutes`, `dailyMonthlyMinutes`, `getstreamMonthlyMinutes`), Failover-Timeout (`failoverTimeoutMs`) und die Kaskaden-Reihenfolge zur Laufzeit anzupassen.
- **`getAssistantAdminDashboard`:**
  - Liefert zusätzlich das vollständige Telefonie-Dashboard-Objekt (`telephony`) an die Betreiber-Konsole.

### 3.2 Frontend: `agora-calls.js`
- **Vollständiger Erhalt der Benutzeroberfläche:**
  - Alle Modals (`#call-modal`, `#video-call-modal`, `#group-call-modal`), Buttons, Timer, Kachel-Raster (`#video-grid`, `#video-remote`, `#video-local`), Controls (Stumm, Lautsprecher, Kamera, Kamera-Wechsel, Screen-Sharing, Vollbild) bleiben unverändert.
- **Automatischer Failover-Mechanismus:**
  - `joinTelephonyCall(scope, id, type, failedProviders)` startet einen Verbindungstimer (`failoverTimeoutMs`).
  - Gelingt die Verbindung nicht innerhalb des Zeitfensters oder bricht die Verbindung ab, fängt der Client dies ab, bereinigt die bisherigen Media-Tracks (`cleanupProvider`) und fordert nahtlos den nächsten Anbieter an.
  - Das Anruf-Modal bleibt geöffnet, der Nutzer sieht keine Fehlermeldung, und die Verbindung wird transparent wiederhergestellt.
- **Dauererfassung bei Anrufende:**
  - Beim Auflegen oder Beenden (`finish(update)`) berechnet der Client die Dauer in Sekunden und ruft `recordCallDuration` auf.
  - Im Anrufverlauf (`callHistory`) wird der tatsächlich genutzte Provider (`call.currentProvider`) dokumentiert.
- **Media-Control-Abstraktion:**
  - `getActiveAudio()`, `toggleMute()`, `toggleCamera()`, `switchCamera()`, `shareScreen()` unterstützen sowohl Agora-Tracks als auch Standard-WebRTC-MediaStreams.

### 3.3 Betreiber-Konsole: `operator.html`, `operator.js`, `operator.css`
- **Übersichtliche Aufteilung in zwei Hauptbereiche:**
  1. **Sprachassistent (KI):**
     - Nur die KI-Anbieter: Groq, Gemini, Cloudflare.
     - Metriken: Aktive KI-Nutzer heute, Textnachrichten, Sprachzeit, automatische KI-Wechsel, Token-Zähler.
     - Zentrale KI-Tageslimits.
  2. **Sprach- und Videotelefonie:**
     - Telefonie-Anbieter: Agora RTC, Daily.co, GetStream Video.
     - Rollen-Badges: `Hauptanbieter`, `Fallback 1`, `Fallback 2`.
     - Status-Pills: `Aktiv` (grün), `Fehler / Gestört` (gelb), `Limit erreicht` (rot).
     - Tabellenspalten: Audio (Monat), Video (Monat), Gesamt (Monat), Auslastungsbalken (%), Verbleibendes Kontingent, Monatslimit, Messmethode.
     - Informations-Banner zur Quotenmessung (Erläuterung der Echtzeit-Erfassung vs. 24h Verzögerung bei Anbieter-APIs).
     - Einstellungsformular für Monatskontingente und Failover-Timeout.
- **Vollständige Lokalisierung:**
  - Alle neuen Texte und Tabellenspalten sind in allen 5 Sprachen (`de`, `en`, `ar`, `fa`, `tr`) hinterlegt.
  - RTL-Darstellung für Arabisch und Persisch vollständig unterstützt.

---

## 4. Übersicht der weiteren heutigen Arbeiten (KI-Assistent & Audio)

Vor der Telefonie-Erweiterung wurden heute folgende Verbesserungen im KI-Assistenten implementiert (Commits `d13ad97` bis `e8e1507`):
1. **Multi-Provider KI-Routing:** Groq (`openai/gpt-oss-20b`) $\to$ Gemini (`gemini-2.5-flash-lite`) $\to$ Cloudflare (`@cf/meta/llama-3.2-1b-instruct`).
2. **Mehrsprachiges Whisper:** Groq Whisper Large v3 Turbo mit Fallback auf Gemini Audio Transcription für Spracheingaben.
3. **Sprachausgabe-Feinschliff:**
   - KI-Antworten werden **nur noch bei Spracheingaben vorgelesen**, niemals bei getipptem Text.
   - Doppelklick-Schutz auf dem Mikrofon-Button verhindert gleichzeitige Mehrfachaufnahmen.
   - Lokalisierte Hinweismeldung bei verweigertem Mikrofonzugriff (`t().speechUnavailable`).
   - Keine doppelten Event-Listener durch Mehrfachinitialisierung.

---

## 5. Terminal-Befehle: Secrets lokal / in Firebase konfigurieren

Um die API-Schlüssel und Secrets für die Telefonie einzutragen oder zu aktualisieren:

```powershell
# 1. Daily.co API-Key (nur Backend)
firebase functions:secrets:set DAILY_API_KEY

# 2. GetStream API Secret (nur Backend)
firebase functions:secrets:set STREAM_API_SECRET

# 3. Agora App-Zertifikat (nur Backend - bereits vorhanden)
firebase functions:secrets:set AGORA_APP_CERTIFICATE
```

### Öffentliche Client-Identifikatoren:
- **Agora App ID:** `275401ea48a74f4b9f9cac0107362c6c` (bereits konfiguriert)
- **GetStream API Key:** `s6n7gqy7w2v6` (im Code als `STREAM_PUBLIC_KEY` hinterlegt)
- **Keine Plaintext-Secrets im Frontend!**

---

## 6. Verifikationsstatus & Test-Suite

Die Test-Suite wurde um spezifische Tests für die Multi-Provider-Kaskade, Quotenabrechnung und die Betreiber-Konsole erweitert.

```powershell
npm.cmd test
```

**Ergebnis:**
- **51/51 Tests bestanden** (100% grün).
- Geprüft werden:
  - Vollständigkeit der Call-Controls und Barrierefreiheit (`aria-modal="true"`)
  - Konsistenz aller Schlüssel über alle 5 Sprachen (`de`, `en`, `ar`, `fa`, `tr`)
  - Fallback-Kaskade: `agora` $\to$ `daily` $\to$ `getstream`
  - Quoten-Abrechnung und automatische Weiterschaltung bei `limit_reached`
  - Getrennte Bereiche der Betreiber-Konsole für KI und Telefonie
  - Sicherheit der Secrets (keine Leaks in Frontend-Dateien)
  - Firestore Security Rules für Teilnehmer und Signalisierung

### Build & Deploy:
- `npm.cmd run build` erzeugt 35 allowlistete Dateien in `dist/`.
- Deployment auf Firebase Hosting (`www.doori-messenger.de`) erfolgreich abgeschlossen.
- Git-Commit `cefd574` ist auf `origin/main` gepusht.

---

## 7. Offene Punkte / Nächste sinnvolle Schritte für Codex

1. **Optionale Daily.co / Stream Video SDK-Bundles:**
   - Aktuell nutzt Doori für Agora das lokale SDK `vendor/agora-rtc-sdk-ng.js` und für Daily/Stream standardkonforme native WebRTC-Peers bzw. REST-Raum-Tokens. Falls gewünscht, kann ein gebündeltes `@daily-co/daily-js` für Call-Objects in die Build-Allowlist aufgenommen werden.
2. **Live-Verifikation mit echten Daily & Stream API-Keys:**
   - Sobald die echten Secrets via `firebase functions:secrets:set` eingetragen sind, kann ein Testanruf mit simuliertem Agora-Ausfall durchgeführt werden.
