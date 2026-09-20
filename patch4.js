const fs = require('fs');

let js = fs.readFileSync('app.js', 'utf8');

const additions = {
    de: "lbl_font_group: 'Schrift (Eigener Text)', ph_bio_placeholder: 'Ich bin neu hier...', lbl_font_preview: 'Vorschau', ph_preview_text: 'Hey, ich nutze Doori!', lbl_bio: 'Info / Über mich', lbl_font_color: 'Farbe', lbl_font_size: 'Größe', opt_font_inter: 'Standard (Inter)', opt_font_courier: 'Schreibmaschine', opt_font_georgia: 'Elegant (Serif)', opt_font_comic: 'Locker (Comic)', btn_custom_wallpaper: 'Eigene...', opt_color_pink: 'Hellrosa', opt_color_green: 'Hellgrün', opt_color_blue: 'Hellblau', opt_color_default: 'Standard (Weiß)', lbl_font_family: 'Schriftart', lbl_wallpaper: 'Chat-Hintergrundbild', btn_change_wallpaper: 'Bild auswählen', btn_remove_wallpaper: 'Entfernen', opt_font_small: 'Klein', opt_font_normal: 'Normal', opt_font_large: 'Groß', ",
    en: "lbl_font_group: 'Font (Own Text)', ph_bio_placeholder: 'I am new here...', lbl_font_preview: 'Preview', ph_preview_text: 'Hey, I am using Doori!', lbl_bio: 'About / Info', lbl_font_color: 'Color', lbl_font_size: 'Size', opt_font_inter: 'Standard (Inter)', opt_font_courier: 'Typewriter', opt_font_georgia: 'Elegant (Serif)', opt_font_comic: 'Casual (Comic)', btn_custom_wallpaper: 'Custom...', opt_color_pink: 'Light Pink', opt_color_green: 'Light Green', opt_color_blue: 'Light Blue', opt_color_default: 'Default (White)', lbl_font_family: 'Font Family', lbl_wallpaper: 'Chat Wallpaper', btn_change_wallpaper: 'Select Image', btn_remove_wallpaper: 'Remove', opt_font_small: 'Small', opt_font_normal: 'Normal', opt_font_large: 'Large', ",
    fa: "lbl_font_group: 'فونت (متن خود)', ph_bio_placeholder: 'من اینجا جدید هستم...', lbl_font_preview: 'پیش‌نمایش', ph_preview_text: 'سلام، من از دوری استفاده می‌کنم!', lbl_bio: 'درباره من', lbl_font_color: 'رنگ', lbl_font_size: 'اندازه', opt_font_inter: 'استاندارد (Inter)', opt_font_courier: 'ماشین تحریر', opt_font_georgia: 'ظریف (Serif)', opt_font_comic: 'غیررسمی (Comic)', btn_custom_wallpaper: 'سفارشی...', opt_color_pink: 'صورتی روشن', opt_color_green: 'سبز روشن', opt_color_blue: 'آبی روشن', opt_color_default: 'پیش‌فرض (سفید)', lbl_font_family: 'نوع فونت', lbl_wallpaper: 'تصویر زمینه چت', btn_change_wallpaper: 'انتخاب تصویر', btn_remove_wallpaper: 'حذف', opt_font_small: 'کوچک', opt_font_normal: 'معمولی', opt_font_large: 'بزرگ', ",
    ar: "lbl_font_group: 'الخط (نصك الخاص)', ph_bio_placeholder: 'أنا جديد هنا...', lbl_font_preview: 'معاينة', ph_preview_text: 'مرحبًا، أنا أستخدم دوري!', lbl_bio: 'حول / معلومات', lbl_font_color: 'اللون', lbl_font_size: 'الحجم', opt_font_inter: 'قياسي (Inter)', opt_font_courier: 'آلة كاتبة', opt_font_georgia: 'أنيق (Serif)', opt_font_comic: 'غير رسمي (Comic)', btn_custom_wallpaper: 'مخصص...', opt_color_pink: 'وردي فاتح', opt_color_green: 'أخضر فاتح', opt_color_blue: 'أزرق فاتح', opt_color_default: 'افتراضي (أبيض)', lbl_font_family: 'نوع الخط', lbl_wallpaper: 'خلفية الدردشة', btn_change_wallpaper: 'اختر صورة', btn_remove_wallpaper: 'إزالة', opt_font_small: 'صغير', opt_font_normal: 'عادي', opt_font_large: 'كبير', ",
    tr: "lbl_font_group: 'Yazı (Kendi Metniniz)', ph_bio_placeholder: 'Ben burada yeniyim...', lbl_font_preview: 'Önizleme', ph_preview_text: 'Merhaba, Doori kullanıyorum!', lbl_bio: 'Hakkımda / Bilgi', lbl_font_color: 'Renk', lbl_font_size: 'Boyut', opt_font_inter: 'Standart (Inter)', opt_font_courier: 'Daktilo', opt_font_georgia: 'Zarif (Serif)', opt_font_comic: 'Gündelik (Comic)', btn_custom_wallpaper: 'Özel...', opt_color_pink: 'Açık Pembe', opt_color_green: 'Açık Yeşil', opt_color_blue: 'Açık Mavi', opt_color_default: 'Varsayılan (Beyaz)', lbl_font_family: 'Yazı Tipi', lbl_wallpaper: 'Sohbet Duvar Kağıdı', btn_change_wallpaper: 'Resim Seç', btn_remove_wallpaper: 'Kaldır', opt_font_small: 'Küçük', opt_font_normal: 'Normal', opt_font_large: 'Büyük', "
};

for (const lang of ['de', 'en', 'fa', 'ar', 'tr']) {
    const searchStr = `Object.assign(TRANSLATIONS.${lang}, {`;
    const replaceStr = `Object.assign(TRANSLATIONS.${lang}, { ${additions[lang]}`;
    if (js.includes(searchStr)) {
        js = js.replace(searchStr, replaceStr);
    } else {
        console.log(`Failed to find ${searchStr}`);
    }
}

fs.writeFileSync('app.js', js);
console.log('Translations patched strictly inside TRANSLATIONS object.');
