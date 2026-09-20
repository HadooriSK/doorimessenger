const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

// 1. Translations
const newTranslations = {
    de: { tab_design: 'Design', lbl_bio: 'Info / Über mich', lbl_wallpaper: 'Chat-Hintergrundbild', btn_change_wallpaper: 'Bild auswählen', btn_remove_wallpaper: 'Entfernen', lbl_font_size: 'Schriftgröße', opt_font_small: 'Klein', opt_font_normal: 'Normal', opt_font_large: 'Groß' },
    en: { tab_design: 'Design', lbl_bio: 'About / Info', lbl_wallpaper: 'Chat Wallpaper', btn_change_wallpaper: 'Select Image', btn_remove_wallpaper: 'Remove', lbl_font_size: 'Font Size', opt_font_small: 'Small', opt_font_normal: 'Normal', opt_font_large: 'Large' },
    fa: { tab_design: 'طراحی', lbl_bio: 'درباره من', lbl_wallpaper: 'تصویر زمینه چت', btn_change_wallpaper: 'انتخاب تصویر', btn_remove_wallpaper: 'حذف', lbl_font_size: 'اندازه فونت', opt_font_small: 'کوچک', opt_font_normal: 'معمولی', opt_font_large: 'بزرگ' },
    ar: { tab_design: 'التصميم', lbl_bio: 'حول / معلومات', lbl_wallpaper: 'خلفية الدردشة', btn_change_wallpaper: 'اختر صورة', btn_remove_wallpaper: 'إزالة', lbl_font_size: 'حجم الخط', opt_font_small: 'صغير', opt_font_normal: 'عادي', opt_font_large: 'كبير' },
    tr: { tab_design: 'Tasarım', lbl_bio: 'Hakkımda / Bilgi', lbl_wallpaper: 'Sohbet Duvar Kağıdı', btn_change_wallpaper: 'Resim Seç', btn_remove_wallpaper: 'Kaldır', lbl_font_size: 'Yazı Tipi Boyutu', opt_font_small: 'Küçük', opt_font_normal: 'Normal', opt_font_large: 'Büyük' }
};

for (const lang of ['de', 'en', 'fa', 'ar', 'tr']) {
    let props = Object.entries(newTranslations[lang]).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
    const searchStr = `Object.assign(TRANSLATIONS.${lang}, {`;
    const replaceStr = `Object.assign(TRANSLATIONS.${lang}, { ${props}, `;
    content = content.replace(searchStr, replaceStr);
}

// 2. Logic (append to bottom)
const logic = `
// ==========================================
// PHASE 1: Design & Profil Einstellungen
// ==========================================

// --- Wallpaper Logic ---
const wallpaperUpload = document.getElementById('wallpaper-upload');
const removeWallpaperBtn = document.getElementById('remove-wallpaper-btn');
const messagesContainerEl = document.getElementById('messages'); // The chat area

function applyWallpaper(dataUrl) {
    if(dataUrl) {
        messagesContainerEl.style.backgroundImage = 'url(' + dataUrl + ')';
        messagesContainerEl.style.backgroundSize = 'cover';
        messagesContainerEl.style.backgroundPosition = 'center';
        messagesContainerEl.style.backgroundAttachment = 'fixed';
        if(removeWallpaperBtn) removeWallpaperBtn.classList.remove('hidden');
    } else {
        messagesContainerEl.style.backgroundImage = 'none';
        if(removeWallpaperBtn) removeWallpaperBtn.classList.add('hidden');
    }
}

const savedWallpaper = localStorage.getItem('doori_wallpaper');
if(savedWallpaper) applyWallpaper(savedWallpaper);

if(wallpaperUpload) {
    wallpaperUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            const dataUrl = evt.target.result;
            try {
                localStorage.setItem('doori_wallpaper', dataUrl);
                applyWallpaper(dataUrl);
            } catch(err) {
                alert("Das Bild ist zu groß zum Speichern. Bitte wähle ein kleineres Bild.");
            }
        };
        reader.readAsDataURL(file);
    });
}

if(removeWallpaperBtn) {
    removeWallpaperBtn.addEventListener('click', function() {
        localStorage.removeItem('doori_wallpaper');
        applyWallpaper(null);
    });
}

// --- Font Size Logic ---
const fontSizeSelect = document.getElementById('setting-font-size');

function applyFontSize(size) {
    let px = '15px'; // normal
    if(size === 'small') px = '13px';
    if(size === 'large') px = '18px';
    messagesContainerEl.style.fontSize = px;
}

const savedFontSize = localStorage.getItem('doori_font_size') || 'normal';
applyFontSize(savedFontSize);
if(fontSizeSelect) {
    fontSizeSelect.value = savedFontSize;
    fontSizeSelect.addEventListener('change', function(e) {
        const size = e.target.value;
        localStorage.setItem('doori_font_size', size);
        applyFontSize(size);
    });
}

// --- Bio Logic ---
const bioInput = document.getElementById('setting-bio');
let bioSaveTimeout;

if(bioInput) {
    bioInput.addEventListener('input', function(e) {
        clearTimeout(bioSaveTimeout);
        const newBio = e.target.value.trim();
        bioSaveTimeout = setTimeout(() => {
            if(window.currentUser) {
                window.db.collection('users').doc(window.currentUser).set({ bio: newBio }, { merge: true }).catch(console.error);
                if(window.users && window.users.has(window.currentUser)) {
                    let uData = window.users.get(window.currentUser);
                    uData.bio = newBio;
                    window.users.set(window.currentUser, uData);
                }
            }
        }, 1000);
    });
}

// Subscribe to auth state or listen for currentUser changes to populate bio
if(window.firebase) {
    firebase.auth().onAuthStateChanged(user => {
        if(user && user.displayName) {
            window.db.collection('users').doc(user.displayName).get().then(doc => {
                if(doc.exists && doc.data().bio && bioInput) {
                    bioInput.value = doc.data().bio;
                }
            });
        }
    });
}

// Show Bio in Group Info / Contact Info
const originalRenderGroupInfo = window.renderGroupInfo;
if(originalRenderGroupInfo) {
    window.renderGroupInfo = function() {
        originalRenderGroupInfo();
        setTimeout(() => {
            const sideHeader = document.querySelector('.group-info-header');
            if(sideHeader && window.currentChat && window.currentChat.type === 'dm') {
                const targetUser = window.currentChat.id;
                const uData = window.users ? window.users.get(targetUser) : null;
                if(uData && uData.bio) {
                    // Avoid duplicate bio insertion
                    if(!document.getElementById('profile-bio-display')) {
                        const bioEl = document.createElement('div');
                        bioEl.id = 'profile-bio-display';
                        bioEl.style.marginTop = '10px';
                        bioEl.style.padding = '10px';
                        bioEl.style.background = 'rgba(255,255,255,0.05)';
                        bioEl.style.borderRadius = '8px';
                        bioEl.style.fontStyle = 'italic';
                        bioEl.style.color = 'var(--text-secondary)';
                        bioEl.style.fontSize = '13px';
                        bioEl.textContent = '"' + uData.bio + '"';
                        sideHeader.appendChild(bioEl);
                    }
                }
            }
        }, 100);
    };
}
`;

content += logic;
fs.writeFileSync('app.js', content);
console.log("Updated app.js for Phase 1.");
