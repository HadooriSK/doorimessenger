const path=require('node:path');
const {createRequire}=require('node:module');
const backend=createRequire(path.resolve(__dirname,'../package.json'));
const {initializeApp}=backend('firebase-admin/app');
const {getAuth}=backend('firebase-admin/auth');
const cli=path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib');
const cliAuth=require(path.join(cli,'auth'));
const {requireAuth}=require(path.join(cli,'requireAuth'));

(async()=>{
 const emails=process.argv.slice(2).map(value=>value.trim().toLowerCase());
 if(!emails.length)throw Error('Pass one or more email addresses.');
 const session=cliAuth.getGlobalDefaultAccount();
 if(!session)throw Error('Run firebase login --reauth first.');
 await requireAuth({project:'doori-messenger',user:session.user,tokens:session.tokens,nonInteractive:true});
 initializeApp({projectId:'doori-messenger',credential:{getAccessToken:async()=>{
  const token=await cliAuth.getAccessToken(session.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
  return {access_token:token.access_token,expires_in:token.expires_in||3600};
 }}});
 const auth=getAuth(),results=[];
 for(const email of emails){
  try{const user=await auth.getUserByEmail(email);results.push({email,exists:true,emailVerified:user.emailVerified,disabled:user.disabled});}
  catch(error){if(error.code==='auth/user-not-found')results.push({email,exists:false});else throw error;}
 }
 console.log(JSON.stringify(results));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
