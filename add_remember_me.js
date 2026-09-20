const fs = require('fs');

const path = 'app.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add translations
const translations = {
    de: { lbl_remember_me: 'Angemeldet bleiben' },
    en: { lbl_remember_me: 'Remember me' },
    fa: { lbl_remember_me: 'مرا به خاطر بسپار' },
    ar: { lbl_remember_me: 'تذكرني' },
    tr: { lbl_remember_me: 'Beni hatırla' }
};

for (const lang of ['de', 'en', 'fa', 'ar', 'tr']) {
    let props = Object.entries(translations[lang]).map(([k,v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
    const searchStr = `Object.assign(TRANSLATIONS.${lang}, {`;
    const replaceStr = `Object.assign(TRANSLATIONS.${lang}, { ${props}, `;
    content = content.replace(searchStr, replaceStr);
}

// 2. Define elements
content = content.replace(
    "const forgotPasswordLink = document.getElementById('forgot-password-link'); const forgotUsernameIdLink = document.getElementById('forgot-username-id-link'); const resendVerificationLink = document.getElementById('resend-verification-link'); const resendVerificationContainer = document.getElementById('resend-verification-container');",
    "const forgotPasswordLink = document.getElementById('forgot-password-link'); const forgotUsernameIdLink = document.getElementById('forgot-username-id-link'); const resendVerificationLink = document.getElementById('resend-verification-link'); const resendVerificationContainer = document.getElementById('resend-verification-container'); const rememberMeCheckbox = document.getElementById('remember-me-checkbox'); const rememberMeContainer = document.getElementById('remember-me-container');"
);

// 3. Setup auto-fill from localStorage on load
// Find the end of element definitions (e.g. after `let isRegisterMode = false;`)
content = content.replace(
    "    let isRegisterMode = false;",
    "    let isRegisterMode = false;\n\n    // Pre-fill username and id from localStorage\n    if (localStorage.getItem('doori_saved_username')) {\n        usernameInput.value = localStorage.getItem('doori_saved_username');\n        idInput.value = localStorage.getItem('doori_saved_id') || '';\n    }\n"
);

// 4. Show/Hide checkbox on tabs
content = content.replace(
    "        if (resendVerificationContainer) resendVerificationContainer.style.display = 'none';\n        document.getElementById('forgot-links').style.display = 'none';",
    "        if (resendVerificationContainer) resendVerificationContainer.style.display = 'none';\n        if (rememberMeContainer) rememberMeContainer.style.display = 'flex';\n        document.getElementById('forgot-links').style.display = 'none';"
);
content = content.replace(
    "        if (resendVerificationContainer) resendVerificationContainer.style.display = 'none';\n        loginSubmitBtn.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).tab_register || 'Registrieren'; loginSubmitBtn.style.display = 'block';",
    "        if (resendVerificationContainer) resendVerificationContainer.style.display = 'none';\n        if (rememberMeContainer) rememberMeContainer.style.display = 'none';\n        loginSubmitBtn.textContent = (TRANSLATIONS[currentLang] || TRANSLATIONS.en).tab_register || 'Registrieren'; loginSubmitBtn.style.display = 'block';"
);

// 5. Firebase persistence and save to localStorage
// Find the login block:
const loginAuthStr = "const userCredential = await window.auth.signInWithEmailAndPassword(userEmail, password);";
const replacementAuthStr = `
                    // Set persistence
                    if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                        await window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                        localStorage.setItem('doori_saved_username', username);
                        localStorage.setItem('doori_saved_id', idVal);
                    } else {
                        await window.auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
                        localStorage.removeItem('doori_saved_username');
                        localStorage.removeItem('doori_saved_id');
                    }
                    const userCredential = await window.auth.signInWithEmailAndPassword(userEmail, password);
`;
content = content.replace(loginAuthStr, replacementAuthStr);

fs.writeFileSync(path, content);
console.log("Done adding remember me.");
