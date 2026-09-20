const fs = require('fs');
let content = fs.readFileSync('app.js', 'utf8');

const additionalLogic = `
// ==========================================
// PHASE 1 FIXES: Fonts, Colors, Wallpapers & Translations
// ==========================================

// Fix Translations globally
if (window.TRANSLATIONS) {
    const extraTrans = {
        de: { lbl_font_family: 'Schriftart', lbl_font_color: 'Schriftfarbe (Eigener Text)', opt_color_default: 'Standard (Weiß)', opt_color_blue: 'Hellblau', opt_color_green: 'Hellgrün', opt_color_pink: 'Hellrosa', btn_custom_wallpaper: 'Eigene...' },
        en: { lbl_font_family: 'Font Family', lbl_font_color: 'Font Color (Own Text)', opt_color_default: 'Default (White)', opt_color_blue: 'Light Blue', opt_color_green: 'Light Green', opt_color_pink: 'Light Pink', btn_custom_wallpaper: 'Custom...' },
        fa: { lbl_font_family: 'نوع فونت', lbl_font_color: 'رنگ فونت (متن خود)', opt_color_default: 'پیش‌فرض (سفید)', opt_color_blue: 'آبی روشن', opt_color_green: 'سبز روشن', opt_color_pink: 'صورتی روشن', btn_custom_wallpaper: 'سفارشی...' },
        ar: { lbl_font_family: 'نوع الخط', lbl_font_color: 'لون الخط (نصك الخاص)', opt_color_default: 'افتراضي (أبيض)', opt_color_blue: 'أزرق فاتح', opt_color_green: 'أخضر فاتح', opt_color_pink: 'وردي فاتح', btn_custom_wallpaper: 'مخصص...' },
        tr: { lbl_font_family: 'Yazı Tipi', lbl_font_color: 'Yazı Rengi (Kendi Metniniz)', opt_color_default: 'Varsayılan (Beyaz)', opt_color_blue: 'Açık Mavi', opt_color_green: 'Açık Yeşil', opt_color_pink: 'Açık Pembe', btn_custom_wallpaper: 'Özel...' }
    };
    
    // Also re-apply the previous translations because the regex replacement failed for de, en, fa earlier
    const prevTrans = {
        de: { tab_design: 'Design', lbl_bio: 'Info / Über mich', lbl_wallpaper: 'Chat-Hintergrundbild', btn_change_wallpaper: 'Bild auswählen', btn_remove_wallpaper: 'Entfernen', lbl_font_size: 'Schriftgröße', opt_font_small: 'Klein', opt_font_normal: 'Normal', opt_font_large: 'Groß' },
        en: { tab_design: 'Design', lbl_bio: 'About / Info', lbl_wallpaper: 'Chat Wallpaper', btn_change_wallpaper: 'Select Image', btn_remove_wallpaper: 'Remove', lbl_font_size: 'Font Size', opt_font_small: 'Small', opt_font_normal: 'Normal', opt_font_large: 'Large' },
        fa: { tab_design: 'طراحی', lbl_bio: 'درباره من', lbl_wallpaper: 'تصویر زمینه چت', btn_change_wallpaper: 'انتخاب تصویر', btn_remove_wallpaper: 'حذف', lbl_font_size: 'اندازه فونت', opt_font_small: 'کوچک', opt_font_normal: 'معمولی', opt_font_large: 'بزرگ' },
        ar: { tab_design: 'التصميم', lbl_bio: 'حول / معلومات', lbl_wallpaper: 'خلفية الدردشة', btn_change_wallpaper: 'اختر صورة', btn_remove_wallpaper: 'إزالة', lbl_font_size: 'حجم الخط', opt_font_small: 'صغير', opt_font_normal: 'عادي', opt_font_large: 'كبير' },
        tr: { tab_design: 'Tasarım', lbl_bio: 'Hakkımda / Bilgi', lbl_wallpaper: 'Sohbet Duvar Kağıdı', btn_change_wallpaper: 'Resim Seç', btn_remove_wallpaper: 'Kaldır', lbl_font_size: 'Yazı Tipi Boyutu', opt_font_small: 'Küçük', opt_font_normal: 'Normal', opt_font_large: 'Büyük' }
    };

    ['de', 'en', 'fa', 'ar', 'tr'].forEach(lang => {
        if(window.TRANSLATIONS && window.TRANSLATIONS[lang]) {
            Object.assign(window.TRANSLATIONS[lang], prevTrans[lang], extraTrans[lang]);
        }
    });
}

// Ensure translations are applied dynamically
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(typeof applyTranslation === 'function') applyTranslation(window.currentLang || 'de');
    }, 1000);
});

// Re-apply when settings tab is opened to be safe
const designTabBtn = document.querySelector('[data-tab="tab-design"]');
if (designTabBtn) {
    designTabBtn.addEventListener('click', () => {
        if(typeof applyTranslation === 'function') applyTranslation(window.currentLang || 'de');
    });
}


// --- Font Family Logic ---
const fontFamilySelect = document.getElementById('setting-font-family');
function applyFontFamily(family) {
    if (family === 'Outfit' || family === 'Poppins') {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=' + family + ':wght@300;400;500;600&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
    document.body.style.fontFamily = "'" + family + "', sans-serif";
}
const savedFontFamily = localStorage.getItem('doori_font_family') || 'Inter';
applyFontFamily(savedFontFamily);
if(fontFamilySelect) {
    fontFamilySelect.value = savedFontFamily;
    fontFamilySelect.addEventListener('change', function(e) {
        const val = e.target.value;
        localStorage.setItem('doori_font_family', val);
        applyFontFamily(val);
    });
}

// --- Font Color Logic (for own messages) ---
const fontColorSelect = document.getElementById('setting-font-color');
function applyFontColor(color) {
    let styleEl = document.getElementById('custom-font-color-style');
    if(!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-font-color-style';
        document.head.appendChild(styleEl);
    }
    if(color === 'default') {
        styleEl.innerHTML = '';
    } else {
        styleEl.innerHTML = \`.msg-sent .msg-bubble { color: \${color} !important; }\`;
    }
}
const savedFontColor = localStorage.getItem('doori_font_color') || 'default';
applyFontColor(savedFontColor);
if(fontColorSelect) {
    fontColorSelect.value = savedFontColor;
    fontColorSelect.addEventListener('change', function(e) {
        const val = e.target.value;
        localStorage.setItem('doori_font_color', val);
        applyFontColor(val);
    });
}

// --- Predefined Wallpaper Logic ---
window.selectPredefinedWallpaper = function(filename) {
    try {
        localStorage.setItem('doori_wallpaper', filename);
        if(typeof applyWallpaper === 'function') {
            applyWallpaper(filename);
        }
    } catch(e) {}
};
`;

content += additionalLogic;
fs.writeFileSync('app.js', content);
console.log("Fixed translations and added new Design logic.");
