const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Blocked Contacts in Privacy Tab
if (!html.includes('id="blocked-contacts-list"')) {
    const privacyBlock = `
                        <div class="setting-item" style="flex-direction: column; align-items: flex-start; gap: 10px;">
                            <label data-i18n="lbl_blocked_contacts">Blockierte Kontakte</label>
                            <div id="blocked-contacts-list" style="width: 100%; max-height: 150px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px; font-size: 13px;">
                                <!-- Filled by JS -->
                            </div>
                        </div>
                    </div>`; // Closing the tab-privacy div
    html = html.replace(/<\/div>\s*<\/div>\s*<div id="tab-chats"/, privacyBlock + '\n                    <div id="tab-chats"');
}

// 2. Enter to Send in Chats Tab
if (!html.includes('id="setting-enter-send"')) {
    const enterSendBlock = `
                        <div class="setting-item">
                            <label data-i18n="lbl_enter_to_send">Mit Enter senden</label>
                            <input type="checkbox" id="setting-enter-send" checked>
                        </div>`;
    html = html.replace(/<div id="tab-chats" class="settings-tab-content">/, '<div id="tab-chats" class="settings-tab-content">' + enterSendBlock);
}

// 3. Export Chat button in Sidebar
if (!html.includes('id="export-chat-btn"')) {
    const exportBtnHtml = `
                                <button id="export-chat-btn" class="action-btn text-btn" data-i18n="btn_export_chat">Chat exportieren</button>`;
    html = html.replace(/<button id="add-member-btn"/, exportBtnHtml + '\n                                <button id="add-member-btn"');
}

fs.writeFileSync('index.html', html);
console.log('HTML patched successfully.');
