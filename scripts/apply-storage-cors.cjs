// Applies S3 PutBucketCors to Cloudflare R2 and Backblaze B2 so browsers can
// upload/download large media directly via presigned URLs.
// Credentials stay in process memory and are never printed or stored.
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const storage = require('../functions/large-media-storage');

function readSecret(name) {
    const cli = path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib/bin/firebase.js');
    try {
        return execFileSync(
            process.execPath,
            [cli, 'functions:secrets:access', name, '--project', 'doori-messenger'],
            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
        ).trim();
    } catch {
        return '';
    }
}

async function verifyCors(config) {
    const url = `https://${config.endpoint}/${encodeURIComponent(config.bucketName)}/media/__cors_probe__`;
    const res = await fetch(url, {
        method: 'OPTIONS',
        headers: {
            'Origin': 'https://doori-messenger.web.app',
            'Access-Control-Request-Method': 'PUT',
            'Access-Control-Request-Headers': 'content-type'
        }
    });
    return {
        status: res.status,
        allowOrigin: res.headers.get('access-control-allow-origin'),
        allowMethods: res.headers.get('access-control-allow-methods'),
        allowHeaders: res.headers.get('access-control-allow-headers')
    };
}

(async () => {
    process.env.CLOUDFLARE_R2_CONFIG = readSecret('CLOUDFLARE_R2_CONFIG');
    process.env.BACKBLAZE_B2_CONFIG = readSecret('BACKBLAZE_B2_CONFIG');

    const r2 = storage.getR2Config(process.env);
    const b2 = storage.getB2Config(process.env);

    const results = {};
    if (r2) results.r2 = await storage.putBucketCors({ config: r2, provider: 'r2' });
    if (b2) results.b2 = await storage.putBucketCors({ config: b2, provider: 'b2' });

    let anyFailed = false;
    for (const [name, r] of Object.entries(results)) {
        console.log(`${name}: HTTP ${r.status} ${r.ok ? 'OK' : 'FAILED'}${r.code ? ' ' + r.code : ''}${r.message ? ' ' + r.message : ''}`);
        if (!r || !r.ok) anyFailed = true;
    }

    // Verify the bucket now answers the browser CORS preflight.
    for (const [name, config] of Object.entries({ r2, b2 }).filter(([, c]) => c)) {
        const preflight = await verifyCors(config);
        console.log(`${name} preflight: HTTP ${preflight.status} origin=${preflight.allowOrigin || '-'} methods=${preflight.allowMethods || '-'} headers=${preflight.allowHeaders || '-'}`);
        if (preflight.status < 200 || preflight.status >= 300) anyFailed = true;
    }

    if (Object.keys(results).length === 0) {
        console.log('No storage providers configured.');
        process.exitCode = 1;
    } else if (anyFailed) {
        process.exitCode = 1;
    }
})().catch(err => {
    console.error('Apply CORS failed:', err.message);
    process.exitCode = 1;
});
