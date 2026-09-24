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

