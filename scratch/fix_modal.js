const fs = require('fs');
let code = fs.readFileSync('C:/Users/hidis/.gemini/antigravity/scratch/web-messenger/doodle.js', 'utf8');

const modalCode = `
let currentPendingDoodleCaller = null;
window.showDoodleInviteModal = function(caller) {
    currentPendingDoodleCaller = caller;
    const modal = document.getElementById('doodle-invite-modal');
    const text = document.getElementById('doodle-invite-text');
    if(modal && text) {
        text.textContent = '@' + caller + ' möchte mit dir zeichnen!';
        modal.classList.remove('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const accBtn = document.getElementById('doodle-accept-btn');
    const rejBtn = document.getElementById('doodle-reject-btn');
    if(accBtn) accBtn.addEventListener('click', () => {
        document.getElementById('doodle-invite-modal').classList.add('hidden');
        if(currentPendingDoodleCaller && window.acceptDoodleInvite) {
            window.acceptDoodleInvite(currentPendingDoodleCaller);
        }
    });
    if(rejBtn) rejBtn.addEventListener('click', () => {
        document.getElementById('doodle-invite-modal').classList.add('hidden');
        if(currentPendingDoodleCaller && window.rejectDoodleInvite) {
            window.rejectDoodleInvite(currentPendingDoodleCaller);
        }
    });
});
`;

if(!code.includes('showDoodleInviteModal')) {
    code += '\n' + modalCode;
    fs.writeFileSync('C:/Users/hidis/.gemini/antigravity/scratch/web-messenger/doodle.js', code);
    console.log('Added showDoodleInviteModal');
}
