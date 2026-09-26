#!/usr/bin/env bash
# Run in Google Cloud Shell, after cloning HadooriSK/doorimessenger.
set -Eeuo pipefail
cd "$(dirname "$0")"
if [ "$(git branch --show-current)" != main ]; then
  echo 'Bitte den Branch main auschecken.' >&2
  exit 1
fi
echo '=== Doori Messenger: Abhängigkeiten ==='
node --version
npm ci
npm ci --prefix functions

echo '=== Alle regulären Projekttests ==='
npm test

echo '=== Firebase-Hosting-Build ==='
npm run build
test -s dist/live-media.js
test -s dist/media-lounge-player.css
grep -q 'media-lounge-player.css?v=1' dist/index.html

echo '=== Firebase Hosting: Produktiv-Deployment ==='
echo 'Firebase verwendet deine Google-Cloud-Shell-Anmeldung; falls erforderlich, wird ein Login angefordert.'
npx --yes firebase-tools@15.31.0 deploy --only hosting --project doori-messenger --non-interactive

echo '=== Live-Version prüfen ==='
for attempt in 1 2 3 4 5; do
  if curl --fail --silent --show-error --max-time 15 'https://doori-messenger.de/' | grep -q 'media-lounge-player.css?v=1' &&
     curl --fail --silent --show-error --max-time 15 'https://doori-messenger.de/media-lounge-player.css?v=1' | grep -q 'media-lounge-controls'; then
    echo 'Erfolg: Der neue Media-Lounge-Player ist live auf https://doori-messenger.de/'
    exit 0
  fi
  echo "Warte auf Live-Aktualisierung ($attempt/5) ..."
  sleep 5
done
echo 'Firebase-Deploy meldete Erfolg, aber die Domain zeigt noch nicht die neue Version. Prüfe Firebase Hosting und Domain-Zuordnung.' >&2
exit 1
