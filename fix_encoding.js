const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app.js');
let content = fs.readFileSync(file, 'utf8');

const replacements = {
    "Ã¤": "ä",
    "Ã¶": "ö",
    "Ã¼": "ü",
    "ÃŸ": "ß",
    "Ã„": "Ä",
    "Ã–": "Ö",
    "Ãœ": "Ü",
    "â ¤ï¸ ": "❤️",
    "ðŸ‘ ": "👍",
    "ðŸ˜‚": "😂",
    "ðŸ‘Ž": "👎",
    "ðŸ”¥": "🔥",
    "â†ªï¸ ": "↪️",
    "ðŸ—‘ï¸ ": "🗑️",
    "âœ–": "✖",
    "ðŸ“¹": "📹",
    "ðŸ“·": "📷",
    "â– ": "■",
    "âŒ›": "⏳",
    "ðŸ“Ž": "📎",
    "ðŸ”’": "🔒",
    "ðŸ•’": "🕘",
    "ðŸ’¾": "💾",
    "âœ“âœ“": "✓✓",
    "âœ“": "✓",
    "Y\"'": "🔒",
    "Y-'?": "🗑️",
    "Y '": "🕘",
    "-": "▶",
    "Ø¹Ø±Ø¨ÙŠ": "عربي",
    "Ù Ø§Ø±Ø³ÛŒ": "فارسی",
    "Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©": "العربية"
};

let modified = false;
for (const [bad, good] of Object.entries(replacements)) {
    if (content.includes(bad)) {
        content = content.split(bad).join(good);
        modified = true;
        console.log(`Replaced: ${bad} -> ${good}`);
    }
}

// Special case: we saw "Y\"'" in powershell output which is weird, let's just make sure 
// we replace common mojibake in app.js
if (modified) {
    fs.writeFileSync(file, content, 'utf8');
    console.log("Successfully fixed app.js");
} else {
    console.log("No mojibake found");
}
