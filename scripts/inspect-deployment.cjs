const path=require('node:path');
const cli=path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib');
const {getGlobalDefaultAccount}=require(path.join(cli,'auth'));
const {requireAuth}=require(path.join(cli,'requireAuth'));
const {Client}=require(path.join(cli,'apiv2'));
const api=require(path.join(cli,'api'));
(async()=>{
 const session=getGlobalDefaultAccount();
 if(!session)throw Error('Firebase login required');
 await requireAuth({project:'doori-messenger',user:session.user,tokens:session.tokens,nonInteractive:true});
 const billing=new Client({urlPrefix:api.cloudbillingOrigin(),apiVersion:'v1'});
 const info=await billing.get('/projects/doori-messenger/billingInfo',{skipLog:{resBody:true}});
 console.log(JSON.stringify({project:'doori-messenger',billingEnabled:info.body.billingEnabled===true}));
})().catch(error=>{console.error('Read-only deployment check failed:',error.message);process.exitCode=1;});
