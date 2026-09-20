const fs = require('fs');
let code = fs.readFileSync('C:/Users/hidis/.gemini/antigravity/scratch/web-messenger/doodle.js', 'utf8');

const globalListener = `
let globalDoodleInviteUnsubscribe = null;
function initGlobalDoodleListener() {
    if(!window.currentUser || !window.db) return;
    if(globalDoodleInviteUnsubscribe) globalDoodleInviteUnsubscribe();
    
    globalDoodleInviteUnsubscribe = window.db.collection('doodle_sessions')
        .where('receiver', '==', window.currentUser.toLowerCase())
        .where('type', '==', 'invite')
        .onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                if(change.type === 'added' || change.type === 'modified') {
                    const data = change.doc.data();
                    // Check if it's a new invite (within last 30 seconds)
                    if(data.ts && Date.now() - data.ts < 30000) {
                        if(window.showDoodleInviteModal) {
                            window.showDoodleInviteModal(data.caller);
                        }
                    }
                }
            });
        });
}

// Call initGlobalDoodleListener when currentUser is set
const checkUserInterval = setInterval(() => {
    if(window.currentUser) {
        initGlobalDoodleListener();
        clearInterval(checkUserInterval);
    }
}, 1000);
`;

if(!code.includes('initGlobalDoodleListener')) {
    code += '\n' + globalListener;
    fs.writeFileSync('C:/Users/hidis/.gemini/antigravity/scratch/web-messenger/doodle.js', code);
    console.log('Added global doodle listener');
}
