const fs = require('fs');

// 1. Rewrite index.html
let html = fs.readFileSync('index.html', 'utf8');

// Find the section that starts with Schriftart and ends with Schriftgröße and replace it with a grouped div
const regexHTML = /<div class="setting-item">\s*<label data-i18n="lbl_font_family">Schriftart<\/label>[\s\S]*?<div class="setting-item">\s*<label data-i18n="lbl_font_size">Schriftgröße<\/label>\s*<select id="setting-font-size">\s*<option value="small" data-i18n="opt_font_small">Klein<\/option>\s*<option value="normal" data-i18n="opt_font_normal">Normal<\/option>\s*<option value="large" data-i18n="opt_font_large">Groß<\/option>\s*<\/select>\s*<\/div>/;

const newHTML = `<div class="setting-group" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">
    <label data-i18n="lbl_font_group" style="font-weight: bold; color: var(--primary-color); display: block; margin-bottom: 10px;">Schrift (Eigener Text)</label>
    
    <div class="setting-item">
        <label data-i18n="lbl_font_family">Schriftart</label>
        <select id="setting-font-family">
            <option value="Inter" data-i18n="opt_font_inter">Standard (Inter)</option>
            <option value="'Courier New', monospace" data-i18n="opt_font_courier">Schreibmaschine</option>
            <option value="Georgia, serif" data-i18n="opt_font_georgia">Elegant (Serif)</option>
            <option value="'Comic Sans MS', cursive" data-i18n="opt_font_comic">Locker (Comic)</option>
        </select>
    </div>
    <div class="setting-item">
        <label data-i18n="lbl_font_color">Farbe</label>
        <select id="setting-font-color">
            <option value="default" data-i18n="opt_color_default">Standard (Weiß)</option>
            <option value="#c2e0ff" data-i18n="opt_color_blue">Hellblau</option>
            <option value="#c2ffc2" data-i18n="opt_color_green">Hellgrün</option>
            <option value="#ffc2e0" data-i18n="opt_color_pink">Hellrosa</option>
        </select>
    </div>
    <div class="setting-item">
        <label data-i18n="lbl_font_size">Größe</label>
        <select id="setting-font-size">
            <option value="small" data-i18n="opt_font_small">Klein</option>
            <option value="normal" data-i18n="opt_font_normal">Normal</option>
            <option value="large" data-i18n="opt_font_large">Groß</option>
        </select>
    </div>
</div>`;

if(html.match(regexHTML)) {
    html = html.replace(regexHTML, newHTML);
} else {
    console.log("Regex HTML match failed!");
}

fs.writeFileSync('index.html', html);

// 2. Rewrite app.js
let js = fs.readFileSync('app.js', 'utf8');

// Update applyFontSize to inject CSS instead of modifying the container
const regexJS1 = /function applyFontSize\(size\) \{[\s\S]*?messagesContainerEl\.style\.fontSize = px;\r?\n\}/;
const newJS1 = `function applyFontSize(size) {
    let px = '15px'; // normal
    if(size === 'small') px = '13px';
    if(size === 'large') px = '18px';
    
    let styleEl = document.getElementById('custom-font-size-style');
    if(!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-font-size-style';
        document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = \`.msg-sent .msg-bubble { font-size: \${px} !important; }\`;
}`;

if(js.match(regexJS1)) {
    js = js.replace(regexJS1, newJS1);
} else {
    console.log("Regex JS1 match failed!");
}

// Add translations for lbl_font_group and re-add lbl_bio to be 100% sure
// We can just append a small script that overrides TRANSLATIONS again and calls applyTranslation.
js += `
// ====== PHASE 1.3: GROUP TRANSLATIONS ======
if (window.TRANSLATIONS) {
    const tAdd = {
        de: { lbl_font_group: 'Schrift (Eigener Text)', lbl_bio: 'Info / Über mich', lbl_font_color: 'Farbe', lbl_font_size: 'Größe' },
        en: { lbl_font_group: 'Font (Own Text)', lbl_bio: 'About / Info', lbl_font_color: 'Color', lbl_font_size: 'Size' },
        fa: { lbl_font_group: 'فونت (متن خود)', lbl_bio: 'درباره من', lbl_font_color: 'رنگ', lbl_font_size: 'اندازه' },
        ar: { lbl_font_group: 'الخط (نصك الخاص)', lbl_bio: 'حول / معلومات', lbl_font_color: 'اللون', lbl_font_size: 'الحجم' },
        tr: { lbl_font_group: 'Yazı (Kendi Metniniz)', lbl_bio: 'Hakkımda / Bilgi', lbl_font_color: 'Renk', lbl_font_size: 'Boyut' }
    };
    ['de', 'en', 'fa', 'ar', 'tr'].forEach(lang => {
        if(window.TRANSLATIONS[lang]) {
            Object.assign(window.TRANSLATIONS[lang], tAdd[lang]);
        }
    });
}
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if(typeof applyTranslation === 'function') applyTranslation(window.currentLang || 'de'); }, 1500);
});
`;

fs.writeFileSync('app.js', js);
console.log("Patched grouping and font-size logic.");
