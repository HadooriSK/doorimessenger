'use strict';
const {createHash, createHmac} = require('node:crypto');
const {RtcTokenBuilder, RtcRole} = require('agora-token');

const AGORA_APP_ID = '275401ea48a74f4b9f9cac0107362c6c';
const STREAM_PUBLIC_KEY = 's6n7gqy7w2v6';

const telephonyDefaults = {
  agoraMonthlyMinutes: 10000,
  dailyMonthlyMinutes: 10000,
  getstreamMonthlyMinutes: 66000,
  failoverTimeoutMs: 6000,
  telephonyOrder: ['agora', 'daily', 'getstream']
};

function telephonyMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(date);
  const v = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${v.year}-${v.month}`;
}

function telephonyDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const v = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}

async function getTelephonyConfig(db) {
  try {
    const doc = await db.collection('_telephonyConfig').doc('global').get();
    return {...telephonyDefaults, ...(doc.data() || {})};
  } catch {
    return {...telephonyDefaults};
  }
}

async function createAgoraSession({channel, accountKey, certificate}) {
  if (!certificate) throw new Error('AGORA_CERTIFICATE_MISSING');
  const expiresIn = 3600;
  const token = RtcTokenBuilder.buildTokenWithUserAccount(
    AGORA_APP_ID,
    certificate,
    channel,
    accountKey,
    RtcRole.PUBLISHER,
    expiresIn,
    expiresIn
  );
  return {
    provider: 'agora',
    appId: AGORA_APP_ID,
    token,
    channel,
    uid: accountKey,
    expiresIn
  };
}

async function createDailySession({channel, accountKey, username, isOwner, dailyKey, type, fetchImpl = fetch}) {
  if (!dailyKey) throw new Error('DAILY_KEY_MISSING');
  const safeName = 'doori_' + channel.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 50);
  
  // Create or get room
  let roomUrl = '';
  try {
    const createRes = await fetchImpl('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dailyKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: safeName,
        privacy: 'public',
        properties: {
          exp: Math.floor(Date.now() / 1000) + 3600,
          enable_chat: false,
          enable_screenshare: true,
          start_audio_off: false,
          start_video_off: (type === 'audio')
        }
      }),
      signal: AbortSignal.timeout(4500)
    });
    
    if (createRes.ok) {
      const data = await createRes.json();
      roomUrl = data.url;
    } else {
      // Room might already exist
      const getRes = await fetchImpl(`https://api.daily.co/v1/rooms/${safeName}`, {
        headers: {Authorization: `Bearer ${dailyKey}`},
        signal: AbortSignal.timeout(4500)
      });
      if (getRes.ok) {
        const data = await getRes.json();
        roomUrl = data.url;
      } else {
        throw new Error('DAILY_ROOM_FAILED_' + createRes.status);
      }
    }
  } catch (err) {
    if (err.name === 'TimeoutError' || err.code === 'DAILY_ROOM_FAILED') throw err;
    throw new Error('DAILY_API_ERROR: ' + (err.message || 'unknown'));
  }

  // Create meeting token
  let token = '';
  try {
    const tokenRes = await fetchImpl('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dailyKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          room_name: safeName,
          user_name: username || accountKey,
          is_owner: !!isOwner,
          exp: Math.floor(Date.now() / 1000) + 3600
        }
      }),
      signal: AbortSignal.timeout(4000)
    });
    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      token = tokenData.token || '';
    }
  } catch (tokenErr) {
    console.warn('Daily token optional generation warning:', tokenErr.message);
  }

  return {
    provider: 'daily',
    url: roomUrl,
    roomName: safeName,
    token
  };
}

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function generateStreamToken(apiKey, apiSecret, userId, channel) {
  const header = base64url(JSON.stringify({alg: 'HS256', typ: 'JWT'}));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(JSON.stringify({
    user_id: userId,
    call_cids: channel ? ['default:' + channel] : undefined,
    iat: now,
    exp: now + 3600
  }));
  const signature = base64url(createHmac('sha256', apiSecret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${signature}`;
}

async function createStreamSession({channel, accountKey, apiKey, apiSecret, fetchImpl = fetch}) {
  const key = apiKey || STREAM_PUBLIC_KEY;
  if (!apiSecret) throw new Error('STREAM_SECRET_MISSING');
  
  const token = generateStreamToken(key, apiSecret, accountKey, channel);
  const serverToken = generateStreamToken(key, apiSecret, 'doori_server', channel);
  
  // Ensure call exists in Stream Video API
  try {
    await fetchImpl(`https://video.stream-io-api.com/api/v2/video/call/default/${encodeURIComponent(channel)}?api_key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stream-Auth-Type': 'jwt',
        Authorization: serverToken
      },
      body: JSON.stringify({
        data: {
          created_by_id: accountKey,
          members: [{user_id: accountKey, role: 'admin'}]
        }
      }),
      signal: AbortSignal.timeout(4500)
    });
  } catch (err) {
    console.warn('Stream call ensure warning:', err.message);
  }

  return {
    provider: 'getstream',
    apiKey: key,
    token,
    callId: channel,
    userId: accountKey
  };
}

async function resolveTelephonySession({
  db,
  channel,
  accountKey,
  username,
  scope,
  type,
  failedProviders = [],
  secrets = {},
  isOwner = false,
  fetchImpl = fetch
}) {
  const config = await getTelephonyConfig(db);
  const order = Array.isArray(config.telephonyOrder) && config.telephonyOrder.length ? config.telephonyOrder : ['agora', 'daily', 'getstream'];
  const month = telephonyMonth();
  const day = telephonyDay();

  const candidates = order.filter(p => !failedProviders.includes(p));
  if (!candidates.length) {
    throw new Error('ALL_TELEPHONY_PROVIDERS_EXHAUSTED');
  }

  let chosen = null;
  let chosenProvider = null;
  let chosenRole = null;
  let errors = [];

  for (let i = 0; i < candidates.length; i++) {
    const provider = candidates[i];
    const role = provider === order[0] ? 'primary' : (provider === order[1] ? 'fallback1' : 'fallback2');

    // Check monthly quota
    try {
      const budgetDoc = await db.collection('_telephonyBudgets').doc(`${provider}-${month}`).get();
      const budgetData = budgetDoc.data() || {};
      const totalSeconds = Number(budgetData.totalSeconds || 0);
      const limitMinutes = Number(config[`${provider}MonthlyMinutes`] || 10000);
      if (totalSeconds >= limitMinutes * 60) {
        console.warn(`Provider ${provider} reached monthly quota: ${totalSeconds / 60} >= ${limitMinutes} min`);
        await db.collection('_telephonyBudgets').doc(`${provider}-${month}`).set({status: 'limit_reached'}, {merge: true});
        continue;
      }
    } catch (budgetErr) {
      console.warn(`Error reading budget for ${provider}:`, budgetErr.message);
    }

    // Try creating session
    try {
      if (provider === 'agora') {
        chosen = await createAgoraSession({
          channel,
          accountKey,
          certificate: secrets.agoraCertificate
        });
      } else if (provider === 'daily') {
        chosen = await createDailySession({
          channel,
          accountKey,
          username,
          isOwner,
          dailyKey: secrets.dailyKey,
          type,
          fetchImpl
        });
      } else if (provider === 'getstream') {
        chosen = await createStreamSession({
          channel,
          accountKey,
          apiKey: secrets.streamApiKey || STREAM_PUBLIC_KEY,
          apiSecret: secrets.streamSecret,
          fetchImpl
        });
      }

      if (chosen) {
        chosenProvider = provider;
        chosenRole = role;
        break;
      }
    } catch (providerErr) {
      console.warn(`Telephony provider ${provider} failed:`, providerErr.message);
      errors.push({provider, error: providerErr.message});
      
      // Record error metric in Firestore
      try {
        const metricRef = db.collection('_telephonyMetrics').doc(day);
        await db.runTransaction(async tx => {
          const snap = await tx.get(metricRef);
          const data = snap.data() || {day, providers: {}, switches: 0};
          const prov = data.providers?.[provider] || {requests: 0, errors: 0};
          prov.errors = (prov.errors || 0) + 1;
          data.switches = (data.switches || 0) + 1;
          data.providers = data.providers || {};
          data.providers[provider] = prov;
          tx.set(metricRef, data, {merge: true});
        });
      } catch (mErr) {
        console.warn('Metric logging error:', mErr.message);
      }
    }
  }

  if (!chosen) {
    const errorMsg = errors.map(e => `${e.provider}: ${e.error}`).join('; ');
    throw new Error('NO_TELEPHONY_PROVIDER_AVAILABLE: ' + errorMsg);
  }

  return {
    ...chosen,
    provider: chosenProvider,
    role: chosenRole,
    failoverTimeoutMs: config.failoverTimeoutMs || 6000
  };
}

async function recordTelephonyDuration(db, {provider, durationSeconds, callType}) {
  if (!provider || !durationSeconds || durationSeconds <= 0) return;
  const month = telephonyMonth();
  const day = telephonyDay();
  const duration = Math.round(Number(durationSeconds));
  const isVideo = callType === 'video';

  try {
    const budgetRef = db.collection('_telephonyBudgets').doc(`${provider}-${month}`);
    await db.runTransaction(async tx => {
      const snap = await tx.get(budgetRef);
      const data = snap.data() || {
        provider,
        month,
        audioSeconds: 0,
        videoSeconds: 0,
        totalSeconds: 0,
        completedCalls: 0,
        status: 'active'
      };
      if (isVideo) {
        data.videoSeconds = (data.videoSeconds || 0) + duration;
      } else {
        data.audioSeconds = (data.audioSeconds || 0) + duration;
      }
      data.totalSeconds = (data.totalSeconds || 0) + duration;
      data.completedCalls = (data.completedCalls || 0) + 1;
      tx.set(budgetRef, data, {merge: true});
    });

    const metricRef = db.collection('_telephonyMetrics').doc(day);
    await db.runTransaction(async tx => {
      const snap = await tx.get(metricRef);
      const data = snap.data() || {day, providers: {}, audioSeconds: 0, videoSeconds: 0};
      if (isVideo) {
        data.videoSeconds = (data.videoSeconds || 0) + duration;
      } else {
        data.audioSeconds = (data.audioSeconds || 0) + duration;
      }
      const prov = data.providers?.[provider] || {audioSeconds: 0, videoSeconds: 0, calls: 0};
      if (isVideo) {
        prov.videoSeconds = (prov.videoSeconds || 0) + duration;
      } else {
        prov.audioSeconds = (prov.audioSeconds || 0) + duration;
      }
      prov.calls = (prov.calls || 0) + 1;
      data.providers = data.providers || {};
      data.providers[provider] = prov;
      tx.set(metricRef, data, {merge: true});
    });
  } catch (err) {
    console.error('Failed to record telephony duration:', err.message);
  }
}

async function getTelephonyDashboardData(db) {
  const config = await getTelephonyConfig(db);
  const month = telephonyMonth();
  const day = telephonyDay();
  const providers = ['agora', 'daily', 'getstream'];

  const budgetDocs = await Promise.all(
    providers.map(p => db.collection('_telephonyBudgets').doc(`${p}-${month}`).get())
  );

  const metricDoc = await db.collection('_telephonyMetrics').doc(day).get();
  const metricData = metricDoc.data() || {day, providers: {}, switches: 0, audioSeconds: 0, videoSeconds: 0};

  const rows = providers.map((name, index) => {
    const budget = budgetDocs[index].data() || {
      audioSeconds: 0,
      videoSeconds: 0,
      totalSeconds: 0,
      status: 'active'
    };
    const metric = metricData.providers?.[name] || {errors: 0, calls: 0};
    const limitMinutes = Number(config[`${name}MonthlyMinutes`] || (name === 'getstream' ? 66000 : 10000));
    const totalMinutes = Math.round((budget.totalSeconds || 0) / 60);
    const audioMinutes = Math.round((budget.audioSeconds || 0) / 60);
    const videoMinutes = Math.round((budget.videoSeconds || 0) / 60);
    const remainingMinutes = Math.max(0, limitMinutes - totalMinutes);
    const utilization = limitMinutes > 0 ? Math.min(100, Math.round((totalMinutes / limitMinutes) * 100)) : 0;
    
    let status = 'active';
    if (totalMinutes >= limitMinutes) {
      status = 'limit_reached';
    } else if (metric.errors > 0 || budget.status === 'degraded') {
      status = 'degraded';
    }

    const role = index === 0 ? 'primary' : (index === 1 ? 'fallback1' : 'fallback2');

    return {
      name,
      role,
      status,
      audioMinutes,
      videoMinutes,
      totalMinutes,
      monthlyLimit: limitMinutes,
      remainingMinutes,
      utilization,
      errorsToday: metric.errors || 0,
      callsToday: metric.calls || 0
    };
  });

  return {
    month,
    day,
    todayAudioMinutes: Math.round((metricData.audioSeconds || 0) / 60),
    todayVideoMinutes: Math.round((metricData.videoSeconds || 0) / 60),
    todaySwitches: metricData.switches || 0,
    providers: rows,
    config
  };
}

module.exports = {
  AGORA_APP_ID,
  STREAM_PUBLIC_KEY,
  telephonyDefaults,
  telephonyMonth,
  telephonyDay,
  getTelephonyConfig,
  generateStreamToken,
  createAgoraSession,
  createDailySession,
  createStreamSession,
  resolveTelephonySession,
  recordTelephonyDuration,
  getTelephonyDashboardData
};
