# Übergabe an Google Anti-Gravity – Doori Messenger

**Stand:** 21. September 2026, nach erfolgreichem Live-Test von Chatverlauf und Sprachnachrichten  
**Projektordner:** `C:\Users\hidis\.gemini\antigravity\scratch\web-messenger`  
**Firebase-Projekt:** `doori-messenger`  
**Live-Domain:** `https://doori-messenger.de/`  
**Firebase Hosting:** `https://doori-messenger.web.app/`  
**Aktuelle Frontend-Version:** `app.js?v=340`  
**Aktueller Service-Worker-Cache:** `web-messenger-v96-audio-source`

## 1. Unveränderliche Projektanforderung

Jede neue oder geänderte sichtbare Funktion muss gleichzeitig in allen fünf Sprachen umgesetzt und geprüft werden:

- Deutsch (`de`)
- Englisch (`en`)
- Arabisch (`ar`)
- Persisch (`fa`)
- Türkisch (`tr`)

Arabisch und Persisch müssen ihre RTL-Darstellung behalten. Diese Regel steht zusätzlich in `AGENTS.md`. Keine sichtbare Zeichenkette darf nur in einer Sprache veröffentlicht werden.

## 2. Ausgangslage und Sicherheitsproblem

Zu Beginn dieser Arbeitsphase verwendete der Messenger eine weitgehend clientseitige Konto- und Anmeldelogik. Die wichtigsten Probleme waren:

- Kontodaten und sicherheitsrelevante Zuordnungen waren im Browser beziehungsweise über zu breite Firestore-Zugriffe erreichbar oder manipulierbar.
- Die frühere Bestätigungslogik konnte nicht als zuverlässige Firebase-E-Mail-Verifikation gelten.
- Eine reine Anmeldung und Suche über leicht erratbare Benutzernamen war aus Sicht des Besitzers zu offen.
- Der frühere Ablauf „Benutzername/ID vergessen“ verschickte zwar E-Mails, die zugrunde liegende Architektur musste aber vor Missbrauch und Enumeration geschützt werden.
- API-/SMTP-Schlüssel durften nicht im Frontend stehen.
- Mehrere Firestore-Regeln und Abfragen mussten enger auf das angemeldete und bestätigte Konto begrenzt werden.

Der Benutzer hat entschieden, das bestehende Prinzip aus **Benutzername plus sechsstelliger Kontakt-ID** beizubehalten. Ein Benutzer soll einen anderen Benutzer nur finden können, wenn Benutzername und zugehörige Kontakt-ID bekannt sind. Die Kontakt-ID ist kein Passwort, bildet aber eine zusätzliche Hürde gegen zufälliges Finden.

## 3. Neue Konto- und Login-Architektur

Firebase Authentication ist jetzt die Grundlage für E-Mail und Passwort. Zusätzlich existieren serverseitige Cloud Functions der zweiten Generation in `functions/index.js`.

### Registrierung

- Registrierung verlangt Benutzername, E-Mail-Adresse und Passwort.
- Benutzername muss mindestens 10 Zeichen haben und darf Buchstaben verschiedener Alphabete, Zahlen, `_`, `.`, und `-` enthalten.
- Ein führendes `@` wird unterstützt; intern wird der Name kanonisch mit `@` gespeichert.
- Die sechsstellige Kontakt-ID wird serverseitig erzeugt.
- Benutzername, privates Konto und öffentliches Profil werden atomar reserviert.
- Firebase sendet keine Standardmail direkt aus dem Browser. Die Function `sendVerificationEmail` erzeugt den Link und versendet die eigene mehrsprachige Brevo-Mail.
- Neue Konten müssen ihre echte Firebase-E-Mail-Adresse bestätigen.

### Login

Das sichtbare Formular verlangt:

1. Benutzername **oder** E-Mail-Adresse
2. Passwort
3. sechsstellige Kontakt-ID

Ein Benutzername funktioniert mit und ohne führendes `@`. Beispiele: `@hedisubs` und `hedisubs` werden identisch normalisiert. Die serverseitige Function `loginWithUsername` löst den Benutzernamen sicher zur hinterlegten E-Mail auf und meldet anschließend über Firebase Auth an. Bei direkter E-Mail-Anmeldung bleibt ebenfalls die Kontakt-ID-Prüfung erhalten, weil dies ausdrücklich gewünscht wurde.

Der Username-Login war zwischenzeitlich defekt, weil der Laufzeit-Service-Account keine Signaturberechtigung besaß. Dem Service-Account `774100584948-compute@developer.gserviceaccount.com` wurde deshalb auf Projektebene `roles/iam.serviceAccountTokenCreator` gegeben. Danach funktionierte die serverseitige Token-Erzeugung.

### Firestore-Kontostruktur

- `accounts/{uid}`: private UID-zu-Benutzername-Zuordnung für das eigene Konto
- `users/{usernameKey}`: private Daten wie UID, E-Mail und Kontakt-ID
- `profiles/{usernameKey}`: begrenztes öffentliches Profil, nur für verifizierte Benutzer lesbar
- `userData/{username}`: benutzereigene Einstellungen/Daten

Die Regeln in `firestore.rules` verwenden Firebase Auth, `email_verified`, das eigene Kontodokument und kanonische Benutzernamen. Nicht aufgeführte Pfade sind standardmäßig gesperrt.

## 4. „Zugangsdaten vergessen?“ und E-Mail-Versand

Der frühere getrennte oder verwirrende Ablauf wurde vereinheitlicht:

- Der Link heißt sinngemäß „Zugangsdaten vergessen?“ und erscheint **nur im Login**, nicht bei der Registrierung.
- Der Benutzer gibt nur seine registrierte E-Mail-Adresse ein.
- Die Cloud Function `recoverAccountDetails` sendet in einer E-Mail:
  - Benutzername
  - sechsstellige Kontakt-ID
  - Link zum Festlegen eines neuen Passworts
- Die E-Mail wird in genau der Sprache versendet, die im Messenger beim Anfordern aktiv war: de, en, ar, fa oder tr.
- Arabische und persische E-Mails verwenden RTL.
- Bei einer unbekannten E-Mail-Adresse bleibt die sichtbare Antwort absichtlich neutral. Es wird nicht verraten, ob ein Konto existiert. Das verhindert, dass fremde Personen registrierte Adressen systematisch ermitteln.
- Es gibt serverseitige Begrenzungen für E-Mail-Adresse/Konto und IP.

### Brevo

- Versand erfolgt über die Brevo HTTP API, nicht direkt aus dem Browser.
- Absender ist `Doori Messenger <noreply@doori-messenger.de>`.
- Der aktuelle Brevo-Schlüssel liegt als Firebase Secret `BREVO_API_KEY` vor.
- Der Schlüssel darf niemals in Frontend-Dateien, Git oder diese Dokumentation geschrieben werden.
- Im Verlauf wurden mehrere Brevo-Schlüssel im Chat offengelegt. Alle nicht mehr benötigten oder früher geposteten Schlüssel müssen im Brevo-Konto widerrufen bleiben. Auch der zuletzt gepostete Schlüssel sollte vorsichtshalber rotiert werden, wenn der Chat nicht als sicherer Geheimnisspeicher gelten soll.
- Die E-Mail-Zustellung landete anfangs bei Yahoo im Spam. Nach Anpassung/Authentifizierung der Versanddomain bestätigte der Benutzer, dass die Mail nicht mehr im Spam landete. SPF, DKIM und DMARC in Brevo/DNS trotzdem regelmäßig kontrollieren.
- Ein MCP-Brevo-Schlüssel ist für den Messenger nicht erforderlich. Benötigt wird nur ein normaler Brevo-API-Schlüssel im Firebase Secret.

## 5. Eigene Passwort-Reset- und Bestätigungsseite

Der Benutzer wollte nicht, dass Endnutzer auf einer sichtbaren Firebase-Seite landen.

Dafür wurden erstellt:

- `account-action.html`
- `account-action.js`
- `account-client.js`

Firebase Hosting leitet `/account/action` auf die eigene Doori-Seite um. Die Seite verarbeitet Firebase-Action-Codes im Hintergrund, zeigt aber nur Doori-Branding und die eigene Domain. Sie unterstützt:

- Passwort zurücksetzen
- E-Mail-Adresse bestätigen
- Fehlermeldungen für ungültige oder abgelaufene Links
- de, en, ar, fa, tr
- RTL für ar/fa

Wichtig: Firebase akzeptierte die eigene Continue-URL anfangs nicht. Die Functions erzeugen deshalb intern Links mit der autorisierten URL `https://doori-messenger.web.app/` und schreiben sie anschließend auf die sichtbare Doori-Adresse `https://doori-messenger.de/account/action` um. Dies ist in `customActionLink()` in `functions/index.js` umgesetzt.

## 6. Firestore-Sicherheit, Datenschutz und Kostenbegrenzung

Die Regeln wurden stark eingeengt:

- Nur verifizierte Konten dürfen die Messenger-Daten verwenden.
- Direktnachrichten sind nur für die Teilnehmer lesbar.
- Gespeicherte Nachrichten (`saved`) bleiben privat beim eigenen Benutzer.
- Gruppen sind abhängig von Mitgliedschaft, Rolle und Privatsphäre lesbar.
- Gruppenänderungen, Einladungen, Administratorrechte, Stummschaltung und Nur-Lesen-Modus werden geprüft.
- Präsenzdaten respektieren die Sichtbarkeitseinstellungen.
- Anruf- und Doodle-Daten sind auf Teilnehmer begrenzt.
- Private Kontoidentitäten können nicht beliebig über den Browser geändert werden.

Kostenbegrenzungen:

- Functions: Region `europe-west3`, 256 MiB, maximal 10 Instanzen, 30 Sekunden Timeout.
- Direktnachrichten laden zunächst maximal 200 Dokumente.
- Allgemeiner Raum und Gruppen laden zunächst maximal 50 Nachrichten.
- Ältere Nachrichten werden beim Hochscrollen seitenweise nachgeladen.
- Zeitversetztes Senden ist deaktiviert, bis eine kontrollierte serverseitige Warteschlange existiert.
- Blaze wurde vom Benutzer aktiviert. Budgetwarnungen und ein anfangs sehr kleines Functions-Budget (beispielsweise 1–2 Euro monatlich) wurden empfohlen. Firebase-Budgets sind Warnungen beziehungsweise verzögert und kein absolut sofortiger Stopp.

Die benötigten Firestore-Indizes stehen in `firestore.indexes.json` und wurden veröffentlicht. Beim Deploy erschien einmal eine Nachfrage, ob ein alter Nachrichtenindex gelöscht werden soll; ohne bewusste Prüfung nicht automatisch löschen.

## 7. Login- und Registrierungsoberfläche

Folgende sichtbare Fehler wurden korrigiert:

- Login startet immer im Dunkelmodus.
- Heller Modus bleibt auswählbar; seine Farben wurden aufeinander abgestimmt.
- Ein fälschlich oben rechts sichtbarer „Abbrechen“-Button stammte aus fehlerhaft verschachteltem Modal-HTML. Das Add-Contact-Modal wurde repariert.
- Login- und Registrieren-Tabs wechseln jetzt sichtbar Farbe und Unterstreichung.
- Die Überschrift oberhalb des Formulars beschreibt jetzt den aktuellen Modus und ist nicht mehr dauerhaft „Bitte wähle einen Benutzernamen“.
- Registrierung zeigt eigene Feldbezeichnungen und Hinweise:
  - Benutzername festlegen
  - E-Mail-Adresse eingeben und Bestätigung erhalten
  - Passwort festlegen
- „Zugangsdaten vergessen?“ wird nur im Login angezeigt.
- Login zeigt Benutzername oder E-Mail-Adresse, Passwort und Kontakt-ID.
- Sämtliche neuen Texte wurden in allen fünf Sprachen ergänzt.

Ein Testkonto mit der im Gespräch genannten Gmail-Adresse wurde am 21.09.2026 erstellt. Vor der Registrierung existierte es noch nicht; nach dem fehlgeschlagen wirkenden Registrierungsversuch existierte es bereits in Firebase Auth, war aber zunächst unbestätigt. Der damalige sichtbare Fehler entstand erst beim Generieren der Bestätigungsmail, nicht beim Erzeugen des Auth-Kontos.

## 8. Nachrichtenfeld und Werkzeugleiste

Die Anordnung im Chat wurde auf Wunsch geändert:

- Neben dem Texteingabefeld befindet sich nur noch ein deutlich größerer Senden-Pfeil.
- Das Pluszeichen wurde in die untere Werkzeugleiste verschoben.
- Dort stehen außerdem Ablaufzeit/TTL, Buzz, Mikrofon und Video.
- Titel/Tooltips wurden in allen fünf Sprachen ergänzt.

## 9. Sprachnachrichten – Fehleranalyse und endgültige Korrektur

Es gab mehrere Symptome:

- Edge zeigte zunächst: `The play() request was interrupted by a call to pause()`.
- Danach reagierte der Player ohne Fehlermeldung nicht und zeigte `0:00 / 0:00`.
- Dasselbe Verhalten trat auf dem iPhone auf.

Die endgültige Ursache war **nicht nur** der zuvor vermutete regelmäßige Re-Render. `getCachedBlobUrl()` wandelte gespeicherte Data-URLs in `blob:`-URLs um. Danach lief das HTML durch DOMPurify. Die Sicherheitskonfiguration entfernt absichtlich unbekannte Protokolle und entfernte deshalb das komplette `src="blob:..."`. Der Player war sichtbar, besaß intern aber keine Quelle.

Endgültige Lösung in `app.js`:

- Audio/Video behalten die gespeicherte `data:audio/...;base64,...` beziehungsweise `data:video/...`-Quelle.
- Der MIME-Header wird bereinigt, ohne eine `blob:`-URL zu erzeugen.
- Es gibt keinen `URL.createObjectURL(blob)`-Pfad mehr für Chatmedien.
- Der Player ignoriert nur den harmlosen Pause/Play-Abbruch und meldet echte Fehler lokalisiert.
- Die Aufnahme wählt mit `MediaRecorder.isTypeSupported()` das beste vom Gerät unterstützte Format.
- `MediaRecorder.start(250)` erzeugt alle 250 ms Datenblöcke, damit iOS/Safari und Chromium keine leere Abschlussaufnahme liefern.
- Leere Aufnahmen werden nicht versendet.
- Verarbeitungs- und Fehlermeldungen existieren in allen fünf Sprachen.

Der Benutzer hat nach Live-Version 340 bestätigt: **„Jetzt scheint es zu funktionieren. Jetzt ist alles wieder gut.“**

## 10. Regression: leerer Chatverlauf

Beim Entfernen des sekündlichen `renderMessages()` entstand eine Regression: Ein frisch geöffnetes Chatfenster blieb leer, bis eine neue Nachricht geschrieben wurde. Ursache war, dass `selectChat()` vorher keinen direkten Render-Aufruf hatte und ungewollt von dem Intervall abhängig war.

Endgültige Lösung:

- `selectChat()` ruft unmittelbar `renderMessages()` auf.
- Danach wird `markMessagesAsRead(id)` gestartet.
- Der sekündliche vollständige Neuaufbau bleibt entfernt, damit Medienplayer nicht zurückgesetzt werden.

Der Benutzer bestätigte auch diesen Stand zusammen mit der Audiofunktion als wieder funktionsfähig.

## 11. Spiele

Die früher eingebauten externen Spiele gefielen dem Benutzer nicht und wurden aus dem öffentlichen Messenger entfernt. Tests prüfen, dass unter anderem alte Game-Menüs, Iframes und bekannte externe Spiele-URLs nicht mehr im ausgelieferten Projekt vorkommen.

Für eine spätere neue Spielephase wurden vier eigene Zwei-Spieler-Ideen ausgewählt: die zuvor vorgeschlagenen Nummern **1, 3, 4 und 5**; Nummer 2 wurde bewusst verworfen, weil sie Nummer 1 zu ähnlich war. Die Namen/Detailregeln dieser nummerierten Vorschläge sind in den aktuellen Projektdateien nicht zuverlässig dokumentiert. Vor der Implementierung deshalb den Benutzer die vier konkreten Spielnamen noch einmal bestätigen lassen. Gewünscht sind stabile, direkt im Messenger funktionierende Zwei-Spieler-Spiele ohne fremde eingebettete Webseiten.

## 12. Tests und Build

Aktuell zuletzt erfolgreich ausgeführt:

```powershell
npm test
npm run build
```

Letzter Stand:

- 18 von 18 Frontend-/Sicherheits-/Regressionstests erfolgreich
- Produktions-Build erfolgreich
- 25 freigegebene öffentliche Dateien in `dist`
- Version 340 erfolgreich auf Firebase Hosting veröffentlicht
- Live-Domain liefert `app.js?v=340`
- Live-Code enthält die Data-URL-Audiokorrektur sowie `renderMessages()` und `markMessagesAsRead(id)` in `selectChat()`

Zusätzliche Emulator-Suites existieren:

```powershell
npm run test:rules
npm run test:accounts
npm run test:functions
```

In einer früheren vollständigen Sicherheitsprüfung bestanden insgesamt 30 Tests (Frontend, Auth/Firestore-Regeln und Functions). Vor größeren weiteren Änderungen alle Suites erneut ausführen.

Die wichtigsten neuen Regressionstests in `tests/security.test.cjs` prüfen:

- Login-Benutzername mit und ohne `@`
- Ziel-Chat bleibt beim asynchronen Senden korrekt
- XSS-Sanitizer
- fünfsprachige Auth-Erweiterungen
- Dunkelmodus und Registrierungs-/Login-Anzeige
- Add-Contact-Modal
- Composer-Anordnung
- Audioaufnahme mit nichtleeren periodischen Datenblöcken
- DOMPurify behält gespeicherte Audio-Data-URLs
- `selectChat()` rendert vorhandenen Verlauf sofort
- entfernte Spiele fehlen im öffentlichen Build
- eigene Account-Action-Seite in fünf Sprachen

## 13. Deployment-Hinweise

Hosting:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
firebase deploy --only hosting
```

Die Option ist auf diesem Rechner notwendig, weil Node 24/Firebase CLI andernfalls mit `unable to verify the first certificate` scheitert.

Vollständige Firebase-Komponenten nur gezielt deployen, beispielsweise:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
firebase deploy --only functions,firestore:rules,firestore:indexes,hosting
```

Vor einem Functions-Deploy prüfen, dass `BREVO_API_KEY` als Secret gebunden ist. Keine Schlüssel in der Shell-Ausgabe, in Dateien oder Git protokollieren.

## 14. Wichtige produktive Dateien

- `index.html` – Login, Registrierung und Messenger-Markup
- `app.js` – zentrale Frontendlogik; aktuell produktiv v340
- `style.css` – gesamte Darstellung, Dark/Light und Chat
- `auth-translations.js` – Auth-Texte in fünf Sprachen
- `security.js` – Escaping, DOMPurify, Normalisierung, sichere Ziele
- `account-client.js` – Client-Aufrufe der Account-Functions
- `account-action.html` / `account-action.js` – eigene Reset-/Bestätigungsseite
- `functions/index.js` – Registrierung, Username-Login, Recovery, Verifikationsmail
- `firestore.rules` – aktuelle Sicherheitsregeln
- `firestore.indexes.json` – benötigte Indizes
- `firebase.json` – Hosting, Functions, Firestore und Emulatoren
- `service-worker.js` – Cache; derzeit v96
- `scripts/build-hosting.cjs` – Allowlist-Build nach `dist`
- `tests/` – Frontend-, Rules-, Auth- und Functions-Tests
- `SECURITY-ROLLOUT.md` – ergänzende Dokumentation des Sicherheits-Rollouts
- `AGENTS.md` – verbindliche Fünf-Sprachen-Regel

`dist/` ist generiert und darf nicht als primäre Quelle editiert werden. Dateien wie `app_live.js`, `app_fixed.js`, Patch-/Fix-Skripte und alte Hilfsdateien sind Altbestand beziehungsweise Entwicklungsartefakte. Änderungen immer zuerst an den produktiven Quelldateien vornehmen und anschließend `npm run build` ausführen.

## 15. Git-Zustand und dringend empfohlener nächster Schritt

Das Repository besitzt derzeit nur den ursprünglichen Commit `2890194 Initial commit`. Fast alle hier beschriebenen Arbeiten liegen als uncommittete Änderungen und neue Dateien im Arbeitsverzeichnis. **Nichts davon mit `git reset --hard`, Checkout über Dateien oder pauschalem Clean verwerfen.**

Vor der nächsten Funktionsentwicklung:

1. `git status` und Diff prüfen.
2. Sicherstellen, dass keine API-/SMTP-Schlüssel im Diff stehen.
3. Alle relevanten Tests ausführen.
4. Einen vollständigen Sicherungs-Commit des bestätigten funktionierenden Stands erstellen.
5. Erst danach Spiele oder größere neue Funktionen beginnen.

## 16. Noch offene Prüfungen und sinnvolle nächste Arbeiten

- Vollständiger manueller Test mit zwei echten, bestätigten Konten:
  - Registrierung
  - Bestätigungsmail in jeder der fünf Sprachen
  - Login per E-Mail
  - Login per Benutzername mit und ohne `@`
  - falsche/richtige Kontakt-ID
  - Zugangsdaten-Wiederherstellung
  - Direktnachrichten und ältere Nachrichten
  - Gruppen, Einladungen und Rollen
  - Sprach-/Videonachrichten zwischen iPhone und Desktop
  - Audio- und Videoanrufe
- Brevo-Domainstatus, DKIM, SPF und DMARC nochmals dokumentieren.
- Firebase/Google-Cloud-Budgetwarnungen kontrollieren.
- Alte offengelegte Brevo-Schlüssel widerrufen/rotieren.
- Alte Hilfs- und Backup-Dateien erst nach einem sicheren Commit geordnet bereinigen.
- Vor den neuen Spielen die vier gewünschten Spielideen namentlich erneut bestätigen und dann als eigene, getestete Zwei-Spieler-Komponenten ohne externe Iframes entwickeln.

## 17. Letzter bestätigter Zustand

Zum Zeitpunkt dieser Übergabe gilt:

- Live-Version 340 ist veröffentlicht.
- Chatverlauf erscheint beim Öffnen wieder sofort.
- Sprachnachrichten lassen sich wiedergeben.
- Der Benutzer bestätigte ausdrücklich, dass aktuell wieder alles funktioniert.
- Ab diesem Punkt keine frühere Audio- oder Intervalllösung wiederherstellen; insbesondere keine Umwandlung der Medienquelle in eine anschließend von DOMPurify entfernte `blob:`-URL und kein sekündliches vollständiges `renderMessages()`.

