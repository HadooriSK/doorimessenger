'use strict';

const crypto = require('node:crypto');

// 9.5 GB soft limit to safely stay within the 10 GB free tier for each provider
const QUOTA_LIMIT_BYTES = 9.5 * 1024 * 1024 * 1024;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const LIVE_MEDIA_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

function hmac(key, data) {
    return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Parses Cloudflare R2 configuration from secret or env.
 */
function getR2Config(env = process.env) {
    if (env.CLOUDFLARE_R2_CONFIG) {
        try {
            const parsed = typeof env.CLOUDFLARE_R2_CONFIG === 'string'
                ? JSON.parse(env.CLOUDFLARE_R2_CONFIG)
                : env.CLOUDFLARE_R2_CONFIG;
            if (parsed && parsed.accountId && parsed.accessKeyId && parsed.secretAccessKey && parsed.bucketName) {
                return {
                    accountId: parsed.accountId,
                    accessKeyId: parsed.accessKeyId,
                    secretAccessKey: parsed.secretAccessKey,
                    bucketName: parsed.bucketName,
                    endpoint: `${parsed.accountId}.r2.cloudflarestorage.com`,
                    region: 'auto',
                    publicUrl: parsed.publicUrl ? String(parsed.publicUrl).replace(/\/$/, '') : null
                };
            }
        } catch {}
    }
    if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME) {
        return {
            accountId: env.R2_ACCOUNT_ID,
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
            bucketName: env.R2_BUCKET_NAME,
            endpoint: `${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            region: 'auto',
            publicUrl: env.R2_PUBLIC_URL ? String(env.R2_PUBLIC_URL).replace(/\/$/, '') : null
        };
    }
    return null;
}

/**
 * Parses Backblaze B2 configuration from secret or env.
 */
function getB2Config(env = process.env) {
    if (env.BACKBLAZE_B2_CONFIG) {
        try {
            const parsed = typeof env.BACKBLAZE_B2_CONFIG === 'string'
                ? JSON.parse(env.BACKBLAZE_B2_CONFIG)
                : env.BACKBLAZE_B2_CONFIG;
            if (parsed && parsed.keyId && parsed.applicationKey && parsed.bucketName) {
                const endpoint = (parsed.endpoint || 's3.us-east-005.backblazeb2.com')
                    .replace(/^https?:\/\//, '')
                    .replace(/\/$/, '');
                const regionMatch = endpoint.match(/^s3\.([a-z0-9-]+)\.backblazeb2\.com$/i);
                const region = regionMatch ? regionMatch[1] : 'us-east-005';
                return {
                    keyId: parsed.keyId,
                    applicationKey: parsed.applicationKey,
                    bucketName: parsed.bucketName,
                    endpoint,
                    region,
                    publicUrl: parsed.publicUrl ? String(parsed.publicUrl).replace(/\/$/, '') : null
                };
            }
        } catch {}
    }
    if (env.B2_KEY_ID && env.B2_APPLICATION_KEY && env.B2_BUCKET_NAME) {
        const endpoint = (env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com')
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '');
        const regionMatch = endpoint.match(/^s3\.([a-z0-9-]+)\.backblazeb2\.com$/i);
        const region = regionMatch ? regionMatch[1] : 'us-east-005';
        return {
            keyId: env.B2_KEY_ID,
            applicationKey: env.B2_APPLICATION_KEY,
            bucketName: env.B2_BUCKET_NAME,
            endpoint,
            region,
            publicUrl: env.B2_PUBLIC_URL ? String(env.B2_PUBLIC_URL).replace(/\/$/, '') : null
        };
    }
    return null;
}

/**
 * Generates an AWS S3 SigV4 presigned URL (PUT or GET).
 */
function generatePresignedUrl({ method = 'PUT', endpoint, accessKeyId, secretAccessKey, bucket, key, region = 'auto', expiresIn = 900, contentType = null }) {
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

    const host = endpoint.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const canonicalUri = '/' + encodeURIComponent(bucket) + '/' + key.split('/').map(encodeURIComponent).join('/');
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

    const queryParams = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
        'X-Amz-Date': amzDate,
        'X-Amz-Expires': String(expiresIn),
        'X-Amz-SignedHeaders': 'host'
    };

    const canonicalQuery = Object.keys(queryParams)
        .sort()
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
        .join('&');

    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
        method.toUpperCase(),
        canonicalUri,
        canonicalQuery,
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join('\n');

    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256Hex(canonicalRequest)
    ].join('\n');

    const kDate = hmac('AWS4' + secretAccessKey, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, 's3');
    const kSigning = hmac(kService, 'aws4_request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/**
 * Resolves the primary or fallback storage provider based on free tier quotas.
 * Priority:
 * 1. Cloudflare R2 (up to 9.5 GB of active files)
 * 2. Backblaze B2 (up to 9.5 GB of active files)
 */
async function selectStorageProvider(db, requestedBytes = 0, env = process.env) {
    const r2Config = getR2Config(env);
    const b2Config = getB2Config(env);

    if (!r2Config && !b2Config) {
        return { error: 'STORAGE_NOT_CONFIGURED', provider: null };
    }

    let r2Bytes = 0;
    let b2Bytes = 0;

    if (db) {
        try {
            const statsDoc = await db.collection('system_stats').doc('storage').get();
            if (statsDoc.exists) {
                const data = statsDoc.data();
                r2Bytes = Number(data.r2_bytes) || 0;
                b2Bytes = Number(data.b2_bytes) || 0;
            }
        } catch (e) {
            console.warn('Could not read storage stats, defaulting to 0:', e.message);
        }
    }

    // Try Cloudflare R2 first
    if (r2Config && (r2Bytes + requestedBytes <= QUOTA_LIMIT_BYTES)) {
        return {
            provider: 'r2',
            config: r2Config,
            currentUsageBytes: r2Bytes,
            limitBytes: QUOTA_LIMIT_BYTES
        };
    }

    // Cascade to Backblaze B2 if R2 is full or unconfigured
    if (b2Config && (b2Bytes + requestedBytes <= QUOTA_LIMIT_BYTES)) {
        return {
            provider: 'b2',
            config: b2Config,
            currentUsageBytes: b2Bytes,
            limitBytes: QUOTA_LIMIT_BYTES,
            cascadedFromR2: !!r2Config
        };
    }

    return { error: 'STORAGE_QUOTA_EXCEEDED', provider: null };
}

/**
 * Generates an upload plan for a large media file.
 */
function createUploadPlan({ provider, config, chatId, fileName, fileSize, mimeType, purpose = 'chat', retentionMs = RETENTION_MS }) {
    const randomId = crypto.randomBytes(8).toString('hex');
    const safeName = String(fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const prefix = purpose === 'live_media' ? 'live-media' : 'media';
    const storageKey = `${prefix}/${chatId || 'general'}/${Date.now()}_${randomId}_${safeName}`;
    const safeRetentionMs = purpose === 'live_media'
        ? LIVE_MEDIA_RETENTION_MS
        : Math.min(Math.max(Number(retentionMs) || RETENTION_MS, 60 * 60 * 1000), RETENTION_MS);
    const expiresAt = Date.now() + safeRetentionMs;
    const downloadSeconds = Math.max(60, Math.min(Math.floor(safeRetentionMs / 1000), 86400 * 7));

    let uploadUrl = '';
    let downloadUrl = '';

    if (provider === 'r2') {
        uploadUrl = generatePresignedUrl({
            method: 'PUT',
            endpoint: config.endpoint,
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            bucket: config.bucketName,
            key: storageKey,
            region: config.region,
            expiresIn: 900 // 15 min upload window
        });

        downloadUrl = config.publicUrl && purpose !== 'live_media'
            ? `${config.publicUrl}/${storageKey}`
            : generatePresignedUrl({
                method: 'GET',
                endpoint: config.endpoint,
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
                bucket: config.bucketName,
                key: storageKey,
                region: config.region,
                expiresIn: downloadSeconds
            });
    } else if (provider === 'b2') {
        uploadUrl = generatePresignedUrl({
            method: 'PUT',
            endpoint: config.endpoint,
            accessKeyId: config.keyId,
            secretAccessKey: config.applicationKey,
            bucket: config.bucketName,
            key: storageKey,
            region: config.region,
            expiresIn: 900
        });

        downloadUrl = config.publicUrl && purpose !== 'live_media'
            ? `${config.publicUrl}/${storageKey}`
            : generatePresignedUrl({
                method: 'GET',
                endpoint: config.endpoint,
                accessKeyId: config.keyId,
                secretAccessKey: config.applicationKey,
                bucket: config.bucketName,
                key: storageKey,
                region: config.region,
                expiresIn: downloadSeconds
            });
    }

    return {
        fileId: `${provider}_${randomId}`,
        provider,
        storageKey,
        uploadUrl,
        downloadUrl,
        expiresAt,
        fileName: safeName,
        fileSize: Number(fileSize) || 0,
        mimeType: mimeType || 'application/octet-stream',
        purpose
    };
}

/**
 * Sends a signed S3 DELETE request to remove an object.
 */
async function deleteS3Object({ config, provider, key }) {
    const accessKeyId = provider === 'r2' ? config.accessKeyId : config.keyId;
    const secretAccessKey = provider === 'r2' ? config.secretAccessKey : config.applicationKey;
    const deleteUrl = generatePresignedUrl({
        method: 'DELETE',
        endpoint: config.endpoint,
        accessKeyId,
        secretAccessKey,
        bucket: config.bucketName,
        key,
        region: config.region,
        expiresIn: 300
    });

    try {
        const response = await fetch(deleteUrl, { method: 'DELETE' });
        return response.ok || response.status === 404;
    } catch (err) {
        console.error(`Failed to delete S3 object ${key} on ${provider}:`, err);
        return false;
    }
}

module.exports = {
    QUOTA_LIMIT_BYTES,
    RETENTION_MS,
    LIVE_MEDIA_RETENTION_MS,
    getR2Config,
    getB2Config,
    generatePresignedUrl,
    selectStorageProvider,
    createUploadPlan,
    deleteS3Object
};
