const fs = require('fs');
const path = 'app.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add translations
const additionalTranslations = {
    de: { lbl_emoji: 'Smilies', lbl_gif: 'GIF', lbl_doodle: 'Doodle zeichnen', lbl_file: 'Datei senden', lbl_location: 'Standort teilen', msg_location: 'Standort ansehen' },
    en: { lbl_emoji: 'Emojis', lbl_gif: 'GIF', lbl_doodle: 'Draw Doodle', lbl_file: 'Send File', lbl_location: 'Share Location', msg_location: 'View Location' },
    fa: { lbl_emoji: 'شکلک ها', lbl_gif: 'گیف', lbl_doodle: 'نقاشی کشیدن', lbl_file: 'ارسال فایل', lbl_location: 'اشتراک مکان', msg_location: 'مشاهده مکان' },
    ar: { lbl_emoji: 'الرموز التعبيرية', lbl_gif: 'ملف GIF', lbl_doodle: 'رسم خربشة', lbl_file: 'إرسال ملف', lbl_location: 'مشاركة الموقع', msg_location: 'عرض الموقع' },
    tr: { lbl_emoji: 'Emojiler', lbl_gif: 'GIF', lbl_doodle: 'Doodle Çiz', lbl_file: 'Dosya Gönder', lbl_location: 'Konum Paylaş', msg_location: 'Konumu Görüntüle' }
};

for (const lang of ['de', 'en', 'fa', 'ar', 'tr']) {
    let props = Object.entries(additionalTranslations[lang]).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
    const searchStr = `Object.assign(TRANSLATIONS.${lang}, {`;
    const replaceStr = `Object.assign(TRANSLATIONS.${lang}, { ${props}, `;
    content = content.replace(searchStr, replaceStr);
}

// 2. Modify renderMessages to support location mediaType
const searchRender = `            else if (msg.mediaType === 'doodle_reject') {`;
const replaceRender = `            else if (msg.mediaType === 'location') {
                contentHtml += \`<a href="https://maps.google.com/?q=\${msg.mediaUrl}" target="_blank" class="location-msg" style="display:inline-flex; align-items:center; gap:8px; background:rgba(0,210,211,0.1); color:var(--accent); padding:10px 15px; border-radius:12px; text-decoration:none; font-weight:600;"><span style="font-size:20px;">📍</span> \${(t.msg_location || 'Standort ansehen')}</a>\`;
            }
            else if (msg.mediaType === 'doodle_reject') {`;

content = content.replace(searchRender, replaceRender);

// 3. Append menu and location logic
const logic = `

// Plus Menu Logic
const plusMenuBtn = document.getElementById('plus-menu-btn');
const plusMenuDropdown = document.getElementById('plus-menu-dropdown');
if (plusMenuBtn && plusMenuDropdown) {
    plusMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        plusMenuDropdown.classList.toggle('hidden');
    });
    
    document.addEventListener('click', (e) => {
        if (!plusMenuBtn.contains(e.target) && !plusMenuDropdown.contains(e.target)) {
            plusMenuDropdown.classList.add('hidden');
        }
    });
    
    // Close menu when clicking items (except doodle which might open a modal)
    plusMenuDropdown.querySelectorAll('.popup-item').forEach(item => {
        item.addEventListener('click', () => {
            if (item.id !== 'doodle-btn') {
                plusMenuDropdown.classList.add('hidden');
            }
        });
    });
}

// Location Sharing Logic
const menuLocationBtn = document.getElementById('menu-location-btn');
if (menuLocationBtn) {
    menuLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert("Dein Browser unterstützt diese Funktion leider nicht.");
            return;
        }
        
        const originalHtml = menuLocationBtn.innerHTML;
        menuLocationBtn.innerHTML = '⏳ <span data-i18n="lbl_location">Standort wird abgerufen...</span>';
        
        navigator.geolocation.getCurrentPosition((position) => {
            menuLocationBtn.innerHTML = originalHtml;
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            sendMessage('', 'location', lat + ',' + lng);
            if (plusMenuDropdown) plusMenuDropdown.classList.add('hidden');
        }, (error) => {
            menuLocationBtn.innerHTML = originalHtml;
            console.error("GPS Fehler:", error);
            alert("Standort konnte nicht abgerufen werden. Bitte überprüfe die Berechtigungen deines Browsers/Geräts.");
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });
}
`;

content += logic;

fs.writeFileSync(path, content);
console.log("Updated app.js successfully.");
