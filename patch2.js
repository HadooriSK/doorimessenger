const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<option value="Inter">Inter \(Standard\)<\/option>[\s\S]*?<option value="Poppins">Poppins<\/option>/, `<option value="Inter" data-i18n="opt_font_inter">Standard (Inter)</option>
                                <option value="'Courier New', monospace" data-i18n="opt_font_courier">Schreibmaschine</option>
                                <option value="Georgia, serif" data-i18n="opt_font_georgia">Elegant (Serif)</option>
                                <option value="'Comic Sans MS', cursive" data-i18n="opt_font_comic">Locker (Comic)</option>`);
fs.writeFileSync('index.html', html);

let js = fs.readFileSync('app.js', 'utf8');
js = js.replace(/function applyFontFamily\([\s\S]*?document.body.style.fontFamily = "'" \+ family \+ "', sans-serif";\r?\n\}/, `function applyFontFamily(family) {
    let styleEl = document.getElementById('custom-font-family-style');
    if(!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'custom-font-family-style';
        document.head.appendChild(styleEl);
    }
    if (family === 'Inter') {
        styleEl.innerHTML = '';
    } else {
        styleEl.innerHTML = \\\`.msg-sent .msg-bubble { font-family: \\\${family} !important; }\\\`;
    }
}`);

// Add translations for the new fonts to the extraTrans object
js = js.replace(/opt_color_pink: 'Hellrosa', btn_custom_wallpaper: 'Eigene\.\.\.'/g, "opt_color_pink: 'Hellrosa', btn_custom_wallpaper: 'Eigene...', opt_font_inter: 'Standard (Inter)', opt_font_courier: 'Schreibmaschine', opt_font_georgia: 'Elegant (Serif)', opt_font_comic: 'Locker (Comic)'");
js = js.replace(/opt_color_pink: 'Light Pink', btn_custom_wallpaper: 'Custom\.\.\.'/g, "opt_color_pink: 'Light Pink', btn_custom_wallpaper: 'Custom...', opt_font_inter: 'Standard (Inter)', opt_font_courier: 'Typewriter', opt_font_georgia: 'Elegant (Serif)', opt_font_comic: 'Casual (Comic)'");
js = js.replace(/opt_color_pink: 'صورتی روشن', btn_custom_wallpaper: 'سفارشی\.\.\.'/g, "opt_color_pink: 'صورتی روشن', btn_custom_wallpaper: 'سفارشی...', opt_font_inter: 'استاندارد (Inter)', opt_font_courier: 'ماشین تحریر', opt_font_georgia: 'ظریف (Serif)', opt_font_comic: 'غیررسمی (Comic)'");
js = js.replace(/opt_color_pink: 'وردي فاتح', btn_custom_wallpaper: 'مخصص\.\.\.'/g, "opt_color_pink: 'وردي فاتح', btn_custom_wallpaper: 'مخصص...', opt_font_inter: 'قياسي (Inter)', opt_font_courier: 'آلة كاتبة', opt_font_georgia: 'أنيق (Serif)', opt_font_comic: 'غير رسمي (Comic)'");
js = js.replace(/opt_color_pink: 'Açık Pembe', btn_custom_wallpaper: 'Özel\.\.\.'/g, "opt_color_pink: 'Açık Pembe', btn_custom_wallpaper: 'Özel...', opt_font_inter: 'Standart (Inter)', opt_font_courier: 'Daktilo', opt_font_georgia: 'Zarif (Serif)', opt_font_comic: 'Gündelik (Comic)'");

fs.writeFileSync('app.js', js);
console.log('Patched fonts and translations.');
