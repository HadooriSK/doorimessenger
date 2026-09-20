const fs = require('fs');
const path = 'app.js';
let content = fs.readFileSync(path, 'utf8');

const additionalTranslations = {
    de: { ph_search_content: 'Inhalte durchsuchen...', ph_id: 'ID', ph_search: 'Suchen...', ph_search_user: 'Benutzer suchen (@name)...' },
    en: { ph_search_content: 'Search content...', ph_id: 'ID', ph_search: 'Search...', ph_search_user: 'Search user (@name)...' },
    fa: { ph_search_content: 'جستجوی محتوا...', ph_id: 'شناسه', ph_search: 'جستجو...', ph_search_user: 'جستجوی کاربر (@name)...' },
    ar: { ph_search_content: 'البحث في المحتوى...', ph_id: 'المعرف', ph_search: 'بحث...', ph_search_user: 'بحث عن مستخدم (@name)...' },
    tr: { ph_search_content: 'İçerik ara...', ph_id: 'ID', ph_search: 'Ara...', ph_search_user: 'Kullanıcı ara (@name)...' }
};

for (const lang of ['de', 'en', 'fa', 'ar', 'tr']) {
    let props = Object.entries(additionalTranslations[lang]).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
    const searchStr = `Object.assign(TRANSLATIONS.${lang}, {`;
    const replaceStr = `Object.assign(TRANSLATIONS.${lang}, { ${props}, `;
    content = content.replace(searchStr, replaceStr);
}

// Fix textarea bug in applyTranslation
const translationLogicSearch = `                if (el.tagName === 'INPUT') el.placeholder = t[key];
                else el.textContent = t[key];`;

const translationLogicReplace = `                if (el.tagName === 'INPUT') {
                    el.placeholder = t[key];
                } else if (el.tagName === 'TEXTAREA' && el.hasAttribute('placeholder')) {
                    el.placeholder = t[key];
                } else {
                    el.textContent = t[key];
                }`;

content = content.replace(translationLogicSearch, translationLogicReplace);

fs.writeFileSync(path, content);
console.log("Placeholders added.");
