// Read-only: use the existing Firebase CLI session without printing credentials.
const path = require('node:path');
const cli = path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib');
const {getGlobalDefaultAccount} = require(path.join(cli,'auth'));
const {requireAuth} = require(path.join(cli,'requireAuth'));
const rules = require(path.join(cli,'gcp/rules'));
const {execFileSync} = require('node:child_process');
(async () => {
 const account = getGlobalDefaultAccount();
 if (!account) throw Error('No Firebase CLI session');
 await requireAuth({project:'doori-messenger',user:account.user,tokens:account.tokens,nonInteractive:true});
 const releases = await rules.listAllReleases('doori-messenger');
 const name = await rules.getLatestRulesetName('doori-messenger','cloud.firestore',releases);
 const files = await rules.getRulesetContent(name);
 const live = files.map(file=>file.content).join('\n');
 const original = execFileSync('git',['-C',path.resolve(__dirname,'..'),'show','HEAD:firestore.rules'],{encoding:'utf8'});
 console.log(JSON.stringify({ruleset:name,identicalToOriginal:live.replace(/\r\n/g,'\n').trim()===original.replace(/\r\n/g,'\n').trim(),
  authenticatedCatchAll:/match\s*\/\{document=\*\*\}[\s\S]*?allow read, write: if isAuthenticated\(\)/.test(live),
  publicUsers:/match\s*\/users\/\{username\}\s*\{\s*allow read: if true/.test(live)}));
})().catch(error=>{console.error('Read-only rules check failed:',error.message);process.exitCode=1;});
