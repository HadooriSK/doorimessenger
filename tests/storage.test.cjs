'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const storage = require('../functions/large-media-storage');

test('R2 and B2 config parsers handle both JSON and individual env vars', () => {
    // 1. R2 JSON
    const r2Json = {
        accountId: 'acc123',
        accessKeyId: 'r2_key',
        secretAccessKey: 'r2_secret',
        bucketName: 'doori-r2'
    };
    const parsedR2 = storage.getR2Config({ CLOUDFLARE_R2_CONFIG: JSON.stringify(r2Json) });
    assert.equal(parsedR2.accountId, 'acc123');
    assert.equal(parsedR2.endpoint, 'acc123.r2.cloudflarestorage.com');
    assert.equal(parsedR2.bucketName, 'doori-r2');

    // 2. R2 Individual
    const parsedR2Indiv = storage.getR2Config({
        R2_ACCOUNT_ID: 'acc456',
        R2_ACCESS_KEY_ID: 'k1',
        R2_SECRET_ACCESS_KEY: 's1',
        R2_BUCKET_NAME: 'bucket-indiv'
    });
    assert.equal(parsedR2Indiv.accountId, 'acc456');

    // 3. B2 JSON
    const b2Json = {
        keyId: 'b2_key_id',
        applicationKey: 'b2_app_key',
        bucketName: 'doori-b2',
        endpoint: 's3.eu-central-003.backblazeb2.com'
    };
    const parsedB2 = storage.getB2Config({ BACKBLAZE_B2_CONFIG: JSON.stringify(b2Json) });
    assert.equal(parsedB2.keyId, 'b2_key_id');
    assert.equal(parsedB2.region, 'eu-central-003');
    assert.equal(parsedB2.bucketName, 'doori-b2');

    // 4. B2 Individual
    const parsedB2Indiv = storage.getB2Config({
        B2_KEY_ID: 'b2_id',
        B2_APPLICATION_KEY: 'b2_sec',
        B2_BUCKET_NAME: 'b2-indiv',
        B2_ENDPOINT: 's3.us-east-005.backblazeb2.com'
    });
    assert.equal(parsedB2Indiv.region, 'us-east-005');
});

test('Storage provider cascades from R2 to B2 once R2 reaches quota', async () => {
    const mockEnv = {
        CLOUDFLARE_R2_CONFIG: JSON.stringify({
            accountId: 'acc1', accessKeyId: 'k1', secretAccessKey: 's1', bucketName: 'r2-b'
        }),
        BACKBLAZE_B2_CONFIG: JSON.stringify({
            keyId: 'k2', applicationKey: 's2', bucketName: 'b2-b', endpoint: 's3.us-east-005.backblazeb2.com'
        })
    };

    // Scenario 1: Under quota -> R2 chosen
    const mockDbLow = {
        collection: () => ({
            doc: () => ({
                get: async () => ({ exists: true, data: () => ({ r2_bytes: 1024 * 1024, b2_bytes: 0 }) })
            })
        })
    };
    const choice1 = await storage.selectStorageProvider(mockDbLow, 1024 * 1024, mockEnv);
    assert.equal(choice1.provider, 'r2');

    // Scenario 2: R2 quota reached (>= 9.5 GB) -> Cascades to B2
    const mockDbR2Full = {
        collection: () => ({
            doc: () => ({
                get: async () => ({ exists: true, data: () => ({ r2_bytes: 9.6 * 1024 * 1024 * 1024, b2_bytes: 1024 }) })
            })
        })
    };
    const choice2 = await storage.selectStorageProvider(mockDbR2Full, 1024 * 1024, mockEnv);
    assert.equal(choice2.provider, 'b2');
    assert.equal(choice2.cascadedFromR2, true);

    // Scenario 3: Both R2 and B2 full -> Error
    const mockDbBothFull = {
        collection: () => ({
            doc: () => ({
                get: async () => ({
                    exists: true,
                    data: () => ({
                        r2_bytes: 9.6 * 1024 * 1024 * 1024,
                        b2_bytes: 9.6 * 1024 * 1024 * 1024
                    })
                })
            })
        })
    };
    const choice3 = await storage.selectStorageProvider(mockDbBothFull, 1024 * 1024, mockEnv);
    assert.equal(choice3.error, 'STORAGE_QUOTA_EXCEEDED');

    // Scenario 4: Neither configured -> Error
    const choice4 = await storage.selectStorageProvider(mockDbLow, 1024, {});
    assert.equal(choice4.error, 'STORAGE_NOT_CONFIGURED');
});

test('Upload plan creates 30-day retention and S3 SigV4 URLs', () => {
    const config = {
        accountId: 'acc1',
        accessKeyId: 'key123',
        secretAccessKey: 'secret456',
        bucketName: 'my-bucket',
        endpoint: 'acc1.r2.cloudflarestorage.com',
        region: 'auto'
    };

    const before = Date.now();
    const plan = storage.createUploadPlan({
        provider: 'r2',
        config,
        chatId: 'dm_user1_user2',
        fileName: 'vacation video.mp4',
        fileSize: 15 * 1024 * 1024,
        mimeType: 'video/mp4'
    });
    const after = Date.now();

    assert.equal(plan.provider, 'r2');
    assert.match(plan.uploadUrl, /^https:\/\/acc1\.r2\.cloudflarestorage\.com\/my-bucket\/media\/dm_user1_user2\//);
    assert.match(plan.uploadUrl, /X-Amz-Algorithm=AWS4-HMAC-SHA256/);
    assert.match(plan.uploadUrl, /X-Amz-Signature=[0-9a-f]{64}/);
    assert.equal(plan.fileName, 'vacation_video.mp4');
    assert.equal(plan.fileSize, 15 * 1024 * 1024);
    assert.equal(plan.mimeType, 'video/mp4');

    // Exactly 30 days retention window
    const expectedExpiry = before + 30 * 24 * 60 * 60 * 1000;
    assert.ok(plan.expiresAt >= expectedExpiry && plan.expiresAt <= after + 30 * 24 * 60 * 60 * 1000);
});

test('Media Lounge upload plans use private 24-hour links and a separate storage prefix', () => {
    const config = {
        accountId: 'acc1', accessKeyId: 'AKID', secretAccessKey: 'SECRET',
        bucketName: 'my-bucket', region: 'auto', endpoint: 'https://acc1.r2.cloudflarestorage.com',
        publicUrl: 'https://public.example.test'
    };
    const before = Date.now();
    const plan = storage.createUploadPlan({
        provider: 'r2', config, chatId: 'session-1', fileName: 'live.mp4',
        fileSize: 1024, mimeType: 'video/mp4', purpose: 'live_media'
    });
    const after = Date.now();
    assert.match(plan.uploadUrl, /\/my-bucket\/live-media\/session-1\//);
    assert.match(plan.downloadUrl, /^https:\/\/acc1\.r2\.cloudflarestorage\.com\//);
    assert.doesNotMatch(plan.downloadUrl, /^https:\/\/public\.example\.test\//);
    assert.equal(plan.purpose, 'live_media');
    assert.ok(plan.expiresAt >= before + 24 * 60 * 60 * 1000);
    assert.ok(plan.expiresAt <= after + 24 * 60 * 60 * 1000);
});

test('Media Lounge UI includes invitation, synchronization hooks, five languages and 24-hour notice', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.join(__dirname, '../live-media.js'), 'utf8');
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const rules = fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8');
    assert.match(html, /id="media-lounge-modal"/);
    assert.match(html, /id="media-lounge-btn"/);
    assert.match(source, /liveMediaSessions/);
    assert.match(source, /live_media_invite/);
    assert.match(source, /actionAttrs/);
    assert.doesNotMatch(source, /onclick="(?:accept|reject|open)LiveMedia/);
    assert.match(source, /inviteMessageId/);
    assert.match(source, /live_media_status:'ended'/);
    assert.match(source, /syncPlayback/);
    assert.match(source, /24 \* 60 \* 60 \* 1000/);
    assert.match(rules, /match \/liveMediaSessions\/\{sessionId\}/);
    for (const lang of ['de','en','ar','fa','tr']) assert.match(source, new RegExp(`\\b${lang}: \\{`));
    assert.match(source, /[\u0600-\u06FF]/);
});

test('Media Lounge separates photos, videos and music with a shared selected item', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const {JSDOM} = require('jsdom');
    const source = fs.readFileSync(path.join(__dirname, '../live-media.js'), 'utf8');
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    for (const category of ['image','video','audio']) assert.match(html, new RegExp(`data-media-category="${category}"`));
    for (const language of ['de','en','ar','fa','tr']) {
        const translations = source.split('\n').find(line => line.trimStart().startsWith(`${language}: {`));
        assert.ok(translations, `${language} translations`);
        for (const key of ['media_lounge_photos','media_lounge_videos','media_lounge_music','media_lounge_music_player','media_lounge_empty_category']) {
            assert.ok(translations.includes(`${key}:`), `${language}: ${key}`);
        }
    }
    const dom = new JSDOM(`<!doctype html><button id="media-lounge-btn"></button><div id="media-lounge-modal" class="hidden">
        <nav id="media-lounge-categories">${['image','video','audio'].map(type=>`<button data-media-category="${type}"><small></small></button>`).join('')}</nav>
        <div id="media-lounge-waiting"></div><button id="media-lounge-add"></button><input id="media-lounge-upload">
        <div id="media-lounge-empty"><p id="media-lounge-empty-text"></p></div><div id="media-lounge-viewer"></div>
        <button id="media-lounge-prev"></button><button id="media-lounge-next"></button><span id="media-lounge-counter"></span>
        <strong id="media-lounge-file-name"></strong><section id="media-lounge-tray"></section>
        <button id="media-lounge-close"></button><button id="media-lounge-end"></button></div>`, {runScripts:'outside-only'});
    const {window} = dom;
    window.currentUser='@alice'; window.currentLang='en'; window.setInterval=()=>0;
    window.HTMLMediaElement.prototype.pause=()=>{};
    const updates=[];
    const future=Date.now()+60_000;
    const session={status:'active',expiresAt:future,items:[
        {id:'photo',type:'image',url:'https://example.test/photo',name:'photo.jpg',expiresAt:future},
        {id:'video',type:'video',url:'https://example.test/video',name:'video.mp4',expiresAt:future},
        {id:'song',type:'audio',url:'https://example.test/song',name:'song.mp3',expiresAt:future}
    ],currentIndex:0,playback:{playing:false,position:0,changedBy:'@alice'}};
    window.db={collection:()=>({doc:()=>({onSnapshot:callback=>{callback({exists:true,id:'session',data:()=>session});return ()=>{};},update:patch=>{updates.push(patch);return Promise.resolve();}})})};
    window.eval(source);
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    try {
        for (const lang of ['de','en','ar','fa','tr']) {
            for (const key of ['shared_activities','activity_invite_superseded','activity_already_active','media_lounge_active_exists']) {
                assert.ok(window.DooriLiveMediaTest.I18N[lang][key],`${lang}: ${key}`);
            }
        }
        window.openLiveMediaSession('session');
        assert.equal(window.document.querySelector('#media-lounge-tray').children.length,1);
        const music=window.document.querySelector('[data-media-category="audio"]');
        music.click();
        assert.equal(music.getAttribute('aria-selected'),'true');
        assert.ok(window.document.querySelector('#media-lounge-upload').accept.startsWith('audio/*'));
        assert.ok(window.document.querySelector('#media-lounge-upload').accept.includes('.mp3'));
        assert.equal(window.document.querySelector('#media-lounge-tray').children.length,1);
        assert.ok(window.document.querySelector('.media-lounge-player-audio audio'));
        assert.ok(window.document.querySelector('.media-lounge-player-audio .media-lounge-controls .media-lounge-seek'));
        for (const lang of ['de','en','ar','fa','tr']) {
            for (const key of ['media_lounge_play','media_lounge_pause','media_lounge_seek','media_lounge_volume','media_lounge_mute','media_lounge_fullscreen','media_lounge_playback_error']) {
                assert.ok(window.DooriLiveMediaTest.I18N[lang][key],`${lang}: ${key}`);
            }
        }
        assert.equal(updates[0].currentIndex,2);
        assert.equal(updates[0].playback.playing,false);
        music.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
        assert.equal(updates[1].currentIndex,1);
        window.currentLang='ar';
        window.document.querySelector('[data-media-category="video"]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
        assert.equal(updates[2].currentIndex,0);
    } finally {
        window.close();
    }
});

test('old doodle chat statuses do not reopen the Doodle canvas during message rendering', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const appSource = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
    const doodleSource = fs.readFileSync(path.join(__dirname, '../doodle.js'), 'utf8');
    assert.doesNotMatch(appSource, /window\.handleDoodle(?:Accept|Close)\(msg\.timestamp\)/);
    assert.match(doodleSource, /data\.type === 'accept'[\s\S]*?openDoodleWorkspace\(\)/);
    assert.match(doodleSource, /data\.type === 'end'[\s\S]*?endDoodle\(\)/);
});

test('Media Lounge start reports its Firestore stage without logging user or session details', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.join(__dirname, '../live-media.js'), 'utf8');
    assert.match(source, /stage = 'list-sessions'/);
    assert.match(source, /stage = 'create-session'/);
    assert.match(source, /console\.error\('Media Lounge start failed', stage, error\?\.code/);
});

test('Firebase functions export large media endpoints with 30-day lifecycle', () => {
    process.env.GCLOUD_PROJECT = 'demo-doori-security';
    const functions = require('../functions/index');
    assert.ok(typeof functions.requestLargeMediaUpload === 'function');
    assert.ok(typeof functions.confirmLargeMediaUpload === 'function');
    assert.ok(typeof functions.cleanupExpiredLargeMedia === 'function');
});

test('large media translations cover all five languages and preserve RTL for ar and fa', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const appSource = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

    const requiredKeys = [
        'msg_uploading_media',
        'badge_cloud_30d',
        'badge_cloud_expired',
        'err_upload_failed',
        'err_storage_quota',
        'cloud_retention_info'
    ];

    const languages = ['de', 'en', 'fa', 'ar', 'tr'];
    for (const lang of languages) {
        for (const key of requiredKeys) {
            assert.match(appSource, new RegExp(`TRANSLATIONS\\.${lang}[\\s\\S]*?${key}:`), `Missing ${key} for ${lang}`);
        }
    }

    // Verify Arabic and Persian strings specifically contain RTL characters in their storage blocks
    const arStorageBlock = appSource.slice(appSource.lastIndexOf('Object.assign(TRANSLATIONS.ar, {'));
    const arMatch = arStorageBlock.match(/msg_uploading_media:\s*'([^']+)'/);
    assert.ok(arMatch && /[\u0600-\u06FF]/.test(arMatch[1]), 'Arabic storage translation must contain RTL characters');

    const faStorageBlock = appSource.slice(appSource.lastIndexOf('Object.assign(TRANSLATIONS.fa, {'));
    const faMatch = faStorageBlock.match(/msg_uploading_media:\s*'([^']+)'/);
    assert.ok(faMatch && /[\u0600-\u06FF]/.test(faMatch[1]), 'Persian storage translation must contain RTL characters');
});

test('app.js and index.html support cloud storage pipeline and file attachments', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const appSource = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
    const htmlSource = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

    // Verification of media-upload accepting all files
    assert.match(htmlSource, /<input type="file" id="media-upload" class="hidden" accept="\*\/\*">/);

    // Verification of uploadMediaFile pipeline
    assert.match(appSource, /async function uploadMediaFile\(file\)/);
    assert.match(appSource, /requestLargeMediaUpload/);
    assert.match(appSource, /confirmLargeMediaUpload/);
    assert.match(appSource, /cleanupExpiredLargeMedia/);

    // Verification of 30-day retention badge rendering
    assert.match(appSource, /cloud-retention-badge/);
    assert.match(appSource, /Math\.ceil\(\(msg\.expires_at - now\) \/ \(1000 \* 60 \* 60 \* 24\)\)/);

    // Verification of file attachment bubble rendering
    assert.match(appSource, /msg\.mediaType === 'file'/);
    assert.match(appSource, /class="file-attachment"/);
});

test('buildCorsConfigurationXml produces valid S3 CORS XML with allowed origins and methods', () => {
    const xml = storage.buildCorsConfigurationXml({
        allowedOrigins: ['https://doori-messenger.web.app'],
        allowedMethods: ['PUT', 'GET']
    });
    assert.match(xml, /<CORSConfiguration xmlns="http:\/\/s3\.amazonaws\.com\/doc\/2006-03-01\/">/);
    assert.match(xml, /<AllowedOrigin>https:\/\/doori-messenger\.web\.app<\/AllowedOrigin>/);
    assert.match(xml, /<AllowedMethod>PUT<\/AllowedMethod>/);
    assert.match(xml, /<AllowedMethod>GET<\/AllowedMethod>/);
    assert.match(xml, /<AllowedHeader>\*<\/AllowedHeader>/);
    assert.match(xml, /<MaxAgeSeconds>3600<\/MaxAgeSeconds>/);
});

test('signPutBucketCorsRequest signs the cors subresource with trailing-slash canonical URI (R2)', () => {
    const crypto = require('node:crypto');
    const config = {
        accessKeyId: 'key123',
        secretAccessKey: 'secret456',
        bucketName: 'my-bucket',
        endpoint: 'acc1.r2.cloudflarestorage.com',
        region: 'auto'
    };
    const body = storage.buildCorsConfigurationXml({});
    const now = new Date('2026-09-24T21:00:00Z');
    const signed = storage.signPutBucketCorsRequest({ config, provider: 'r2', body, now });

    assert.equal(signed.url, 'https://acc1.r2.cloudflarestorage.com/my-bucket/?cors');
    assert.match(
        signed.headers['Authorization'],
        /^AWS4-HMAC-SHA256 Credential=key123\/20260924\/auto\/s3\/aws4_request, SignedHeaders=content-md5;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/
    );
    assert.match(signed.canonicalRequest, /^PUT\n\/my-bucket\/\ncors=\ncontent-md5:/);
    assert.equal(signed.headers['x-amz-date'], '20260924T210000Z');
    assert.equal(signed.headers['x-amz-content-sha256'], crypto.createHash('sha256').update(body).digest('hex'));
    assert.equal(signed.headers['Content-MD5'], crypto.createHash('md5').update(body).digest('base64'));
});

test('signPutBucketCorsRequest uses B2 keyId/applicationKey and endpoint region', () => {
    const config = {
        keyId: 'b2key',
        applicationKey: 'b2secret',
        bucketName: 'doori-b2',
        endpoint: 's3.eu-central-003.backblazeb2.com',
        region: 'eu-central-003'
    };
    const body = storage.buildCorsConfigurationXml({});
    const now = new Date('2026-09-24T21:00:00Z');
    const signed = storage.signPutBucketCorsRequest({ config, provider: 'b2', body, now });

    assert.equal(signed.url, 'https://s3.eu-central-003.backblazeb2.com/doori-b2/?cors');
    assert.match(signed.headers['Authorization'], /Credential=b2key\/20260924\/eu-central-003\/s3\/aws4_request/);
});

test('putBucketCors sends a signed PUT to the cors subresource and reports success', async () => {
    const originalFetch = global.fetch;
    let captured = null;
    global.fetch = async (url, init) => {
        captured = { url, init };
        return { ok: true, status: 200 };
    };
    try {
        const config = {
            accessKeyId: 'key123',
            secretAccessKey: 'secret456',
            bucketName: 'my-bucket',
            endpoint: 'acc1.r2.cloudflarestorage.com',
            region: 'auto'
        };
        const result = await storage.putBucketCors({ config, provider: 'r2' });
        assert.equal(result.ok, true);
        assert.equal(result.status, 200);
        assert.equal(captured.url, 'https://acc1.r2.cloudflarestorage.com/my-bucket/?cors');
        assert.equal(captured.init.method, 'PUT');
        assert.match(captured.init.headers['Authorization'], /^AWS4-HMAC-SHA256 /);
        assert.match(captured.init.body, /<CORSConfiguration /);
    } finally {
        global.fetch = originalFetch;
    }
});

test('putBucketCors sanitizes error bodies without leaking credentials', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
        ok: false,
        status: 403,
        text: async () => '<Error><Code>SignatureDoesNotMatch</Code><Message>wrong signature</Message><AWSAccessKeyId>key123</AWSAccessKeyId></Error>'
    });
    try {
        const config = {
            accessKeyId: 'key123',
            secretAccessKey: 'secret456',
            bucketName: 'my-bucket',
            endpoint: 'acc1.r2.cloudflarestorage.com',
            region: 'auto'
        };
        const result = await storage.putBucketCors({ config, provider: 'r2' });
        assert.equal(result.ok, false);
        assert.equal(result.code, 'SignatureDoesNotMatch');
        assert.equal(result.message, 'wrong signature');
        assert.equal(result.message.includes('key123'), false);
    } finally {
        global.fetch = originalFetch;
    }
});
test('chat clear handles both raw and @ keys and marks peer messages as deletedFor', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const appSource = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
    const cacheSource = fs.readFileSync(path.join(__dirname, '../message-cache.js'), 'utf8');
    assert.ok(appSource.includes('async function clearCurrentChat'));
    assert.ok(appSource.includes('MessageCache.clearChat'));
    assert.ok(appSource.includes('msg.deletedFor'));
    assert.ok(cacheSource.includes('clearChat(chatId)'));
});

test('Media Lounge start normalizes peer and provides clock skew protection', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const liveSource = fs.readFileSync(path.join(__dirname, '../live-media.js'), 'utf8');
    const rulesSource = fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8');
    assert.ok(liveSource.includes('normalizeUser(chat.id)'));
    assert.ok(liveSource.includes('SESSION_MS - (2 * 60 * 1000)'));
    assert.ok(rulesSource.includes('expiresAt <= request.time.toMillis() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000'));
});
