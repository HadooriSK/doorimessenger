const fs = require('fs');
let js = fs.readFileSync('app.js', 'utf8');

// 1. Fix CSS injection selectors
js = js.replace(/\.msg-sent \.msg-bubble, #message-input/g, '.msg-sent .msg-bubble, .message.sent .message-bubble, #message-input');

// 2. Add font attributes to sendMessage
const msgObjRegex = /const msgObj = \{\s*id: [^}]*reactions: \{\}\s*\};/m;
const matchMsgObj = js.match(msgObjRegex);
if(matchMsgObj) {
    const replacementMsgObj = matchMsgObj[0].replace('reactions: {}', `reactions: {},
            fontFamily: localStorage.getItem('doori_font_family') || 'Inter',
            fontColor: localStorage.getItem('doori_font_color') || 'default',
            fontSize: localStorage.getItem('doori_font_size') || 'normal'`);
    js = js.replace(msgObjRegex, replacementMsgObj);
} else {
    console.log("Failed to patch sendMessage msgObj.");
}

// 3. Apply inline styles in renderMessages
const renderRegex = /expectedInner = `<div class="message-sender">\$\{isSentByMe \? 'Du' : msg\.sender_username\}<\/div><div class="message-bubble"><div>\$\{contentHtml\}<\/div><\/div>\$\{reactionsHtml\}<div class="message-time">\$\{ttlHtml\} \$\{statusHtml\} \$\{timeStr\}\$\{ticks\}<\/div>`;/;
const matchRender = js.match(renderRegex);
if(matchRender) {
    const replacementRender = `
                let customStyle = '';
                if(msg.fontFamily && msg.fontFamily !== 'Inter') {
                    customStyle += \`font-family: \${msg.fontFamily}; \`;
                    // Dynamically load Google Font if needed
                    if(msg.fontFamily === 'Outfit' || msg.fontFamily === 'Poppins') {
                        if(!document.getElementById('font-'+msg.fontFamily)) {
                            const link = document.createElement('link');
                            link.id = 'font-'+msg.fontFamily;
                            link.href = 'https://fonts.googleapis.com/css2?family=' + msg.fontFamily + ':wght@300;400;500;600&display=swap';
                            link.rel = 'stylesheet';
                            document.head.appendChild(link);
                        }
                    }
                }
                if(msg.fontColor && msg.fontColor !== 'default') customStyle += \`color: \${msg.fontColor}; \`;
                if(msg.fontSize) {
                    let px = '15px';
                    if(msg.fontSize === 'small') px = '13px';
                    if(msg.fontSize === 'large') px = '18px';
                    if(msg.fontSize !== 'normal') customStyle += \`font-size: \${px}; \`;
                }
                let styleAttr = customStyle ? \` style="\${customStyle}"\` : '';
                expectedInner = \`<div class="message-sender">\${isSentByMe ? 'Du' : msg.sender_username}</div><div class="message-bubble"\${styleAttr}><div>\${contentHtml}</div></div>\${reactionsHtml}<div class="message-time">\${ttlHtml} \${statusHtml} \${timeStr}\${ticks}</div>\`;
    `;
    js = js.replace(renderRegex, replacementRender);
} else {
    console.log("Failed to patch renderMessages.");
}

fs.writeFileSync('app.js', js);
console.log('patch5 completed successfully.');
