# Sicherheitsupdate – Blaze-Variante

Der Sicherheitsstand wurde am 21. September 2026 im Firebase-Projekt
`doori-messenger` veröffentlicht. Blaze ist aktiv, die Functions laufen in
`europe-west3`, die Firestore-Indizes sind bereit und Hosting sowie Regeln sind live.

## Zielarchitektur

- Firebase Authentication prüft E-Mail und Passwort.
- Cloud Functions speichern den Brevo-Schlüssel als Firebase Secret. Der Schlüssel
  wird niemals an den Browser ausgeliefert.
- Login unterstützt auf jedem Gerät entweder E-Mail oder Benutzername, jeweils mit
  Passwort und sechsstelliger Kontakt-ID.
- „Zugangsdaten vergessen?“ verlangt nur die registrierte E-Mail-Adresse. Die
  Function sendet Benutzername, Kontakt-ID und einen Firebase-Link zum Festlegen
  eines neuen Passworts ausschließlich an diese Adresse. Die Antwort bleibt auch
  bei unbekannten Adressen neutral.
- Die Wiederherstellungsoberfläche und die zugehörige E-Mail sind vollständig auf
  Deutsch, Englisch, Arabisch, Persisch und Türkisch verfügbar.
- Passwort-Reset und E-Mail-Bestätigung führen über die eigene Seite
  `https://doori-messenger.de/account/action`. Firebase prüft den einmaligen Code
  nur im Hintergrund; die sichtbare Seite, URL und Rückkehr zum Login gehören zu
  Doori Messenger. Beide Abläufe unterstützen alle fünf Sprachen und RTL.
- Registrierung reserviert Benutzername, privates Konto und öffentliches Profil
  atomar. Bestehende Konten werden anhand ihrer Firebase-UID übernommen.
- Firebase-E-Mail-Verifikation ersetzt das alte manipulierbare `isVerified`.

## Kostenbegrenzung

- Funktionen laufen in `europe-west3` mit 256 MiB, höchstens 10 Instanzen und
  30 Sekunden Zeitlimit.
- Login ist pro Benutzername/IP begrenzt; Wiederherstellung auf drei Versuche je
  15 Minuten und Konto/IP.
- Direktnachrichten laden höchstens 200 aktuelle Dokumente. Allgemeiner Raum und
  jede Gruppe laden höchstens 50 aktuelle Nachrichten. Beim Hochscrollen werden
  ältere Seiten nachgeladen.
- Zeitversetztes Senden bleibt deaktiviert, bis dafür eine dauerhafte Warteschlange
  mit klarer Kostenbegrenzung existiert.
- Nach Aktivierung von Blaze in Firebase ein monatliches Functions-Ausgabenlimit
  von zunächst 1–2 Euro sowie allgemeine Budgetwarnungen einrichten.

## E-Mail-Zustellung

Öffentlich sichtbar sind bereits ein kombinierter SPF-Eintrag für Firebase/Brevo,
ein Brevo-Code und DMARC mit `p=none`. Vor dem echten Versand in Brevo prüfen, ob
`doori-messenger.de` vollständig authentifiziert ist, und die dort angezeigten
DKIM-Einträge ergänzen. Der alte öffentlich gewordene Brevo-Schlüssel muss im
Brevo-Konto widerrufen werden. Danach einen neuen Schlüssel erzeugen.

## Lokale Prüfung

30 Tests bestehen:

- 8 Frontend-, XSS-, Sprach-, Darstellungs- und Abfragebegrenzungstests
- 19 Auth-/Firestore-Regeltests
- 3 Cloud-Function-Tests für Registrierung, Benutzername-Login und sicheren
  Wiederherstellungsversand

Die Mailprüfung verwendet einen lokalen Stub und versendet keine echte Nachricht.
Build, Syntax, `git diff --check` sowie `npm audit` für Root und Functions sind sauber.

```powershell
npm ci
npm --prefix functions ci
npm test
npm run test:functions
firebase emulators:exec --project demo-doori-security --only firestore,auth "node --test --test-concurrency=1 tests/accounts.test.cjs tests/firestore.test.cjs"
npm run build
```

## Durchgeführte Veröffentlichung

1. Der neue Brevo-API-Schlüssel wurde als Firebase Secret `BREVO_API_KEY` erfasst.
2. Die Migration wurde zuerst trocken geprüft und dann für 7 gültige Konten
   angewendet. Ein verwaistes Dokument ohne Auth-Konto blieb unberührt.
3. `registerAccount`, `ensureAccount`, `loginWithUsername` und
   `recoverAccountDetails` wurden als Functions der zweiten Generation veröffentlicht.
4. Alle vier benötigten Firestore-Indizes erreichten den Status `READY`.
5. Sicherheitsregeln und der aus 23 freigegebenen Dateien bestehende Hosting-Build
   wurden veröffentlicht. `https://doori-messenger.web.app` antwortete danach mit
   HTTP 200 und enthielt die erwarteten neuen Client-Versionen.
6. Alte Functions-Container-Images werden nach einem Tag automatisch gelöscht.

Noch offen ist ein manueller Funktionstest mit zwei echten Konten: beide Loginarten,
E-Mail-Bestätigung, Wiederherstellung, Direktnachrichten, Gruppen, Einladungen,
ältere Nachrichten und Anrufe. Außerdem sollten Budgetwarnungen sowie die in Brevo
angezeigten DKIM-Einträge kontrolliert werden.

Firebase-Ausgabenlimits sind wegen verzögerter Verbrauchsmeldungen keine absolut
sofortigen harten Grenzen. Der anfängliche Grenzwert sollte deshalb deutlich unter
dem maximal akzeptablen Monatsbetrag liegen.
