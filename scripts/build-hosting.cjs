const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const files = ['index.html', 'account-action.html', 'account-action.js', 'app.js', 'assistant.js', 'tts.js', 'message-cache.js', 'quiz-questions.js', 'games.js', 'agora-calls.js', 'doodle.js', 'firebase-config.js', 'security.js',
    'auth-translations.js', 'account-client.js', 'style.css', 'manifest.json', 'service-worker.js', 'logo.png', 'bg.png',
    'wallpaper_1.png', 'wallpaper_2.png', 'wallpaper_3.png', 'vendor/purify.min.js', 'vendor/DOMPurify-LICENSE',
    'vendor/firebase-app-compat.js', 'vendor/firebase-auth-compat.js', 'vendor/firebase-firestore-compat.js',
    'vendor/firebase-functions-compat.js', 'vendor/agora-rtc-sdk-ng.js', 'vendor/FIREBASE-LICENSE'];
// Refuse extra files rather than accidentally publish previous build leftovers.
function checkDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
        const file = path.join(dir, entry.name);
        if (entry.isSymbolicLink()) throw new Error('Unexpected symlink in dist');
        if (entry.isDirectory()) checkDirectory(file);
        else if (!files.includes(path.relative(output, file).replaceAll('\\', '/'))) throw new Error('Unexpected dist file: ' + entry.name);
    }
}
checkDirectory(output);
for (const file of files) {
    const contents = fs.readFileSync(path.join(root, file));
    if (/\.(js|html|json|css)$/.test(file) && /xkeysib-[A-Za-z0-9_-]+/.test(contents.toString())) throw new Error('SMTP credential in public asset');
    fs.mkdirSync(path.dirname(path.join(output, file)), {recursive:true});
    fs.writeFileSync(path.join(output, file), contents);
}
console.log(`Built ${files.length} allowlisted public files.`);
