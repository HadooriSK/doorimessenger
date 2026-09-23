(function(){'use strict';
const T={
de:{
 title:'Doori Betreiber-Konsole',subtitle:'Geschützte KI- & Telefonie-Verbrauchsübersicht',login:'Betreiber-Anmeldung',email:'E-Mail',password:'Passwort',loginButton:'Anmelden',refresh:'Aktualisieren',logout:'Abmelden',
 sectionAi:'Sprachassistent (KI)',activeUsers:'Aktive Nutzer heute',textRequests:'Textnachrichten heute',voiceTime:'Sprachzeit heute',switches:'Automatische KI-Wechsel',providers:'KI-Anbieter heute',provider:'Anbieter',requests:'Requests',tokens:'Tokens',utilization:'Auslastung',remaining:'Verbleibend',errors:'Fehler',timeouts:'Timeouts',limits:'Zentrale KI-Tageslimits',textLimit:'Text pro Nutzer',voiceLimit:'Sprachminuten pro Nutzer',speechLimit:'Whisper-Stunden gesamt',geminiSpeechLimit:'Gemini-Spracherkennungen',timeout:'Wechsel nach Millisekunden',save:'Speichern',saved:'Gespeichert',denied:'Zugriff verweigert.',
 sectionTelephony:'Sprach- und Videotelefonie',telephonySubtitle:'Multi-Provider Kaskade: Agora → Daily → GetStream → WebRTC',telephonyNotice:'Hinweis zur Quotenmessung: Die Schnittstellen der Telefonie-Anbieter melden Verbrauchsdaten oft mit bis zu 24 Stunden Verzögerung. Doori erfasst Anrufsekunden daher sekundengenau im Backend in Firestore (_telephonyBudgets), um ein Überschreiten des Freikontingents sofort zu verhindern.',telephonyAudioToday:'Audio-Minuten heute',telephonyVideoToday:'Video-Minuten heute',telephonySwitchesToday:'Telefonie-Failover heute',telephonyProvidersTitle:'Telefonie-Anbieter & Kaskade',telephonyConfigTitle:'Telefonie-Monatskontingente & Failover',role:'Rolle',status:'Status',audioMin:'Audio (Monat)',videoMin:'Video (Monat)',totalMin:'Gesamt',monthlyLimit:'Monatslimit',trackingMethod:'Messung',trackingInfo:'Echtzeit Firestore',rolePrimary:'Hauptanbieter',roleFallback1:'Fallback 1',roleFallback2:'Fallback 2',roleFallback3:'Fallback 3',statusActive:'Aktiv',statusDegraded:'Fehler / Gestört',statusLimitReached:'Limit erreicht',agoraLimit:'Agora Freiminuten / Monat',dailyLimit:'Daily Freiminuten / Monat',streamLimit:'GetStream Freiminuten / Monat',failoverTimeout:'Failover Timeout (ms)'
},
en:{
 title:'Doori Operator Console',subtitle:'Protected AI & telephony usage overview',login:'Operator sign in',email:'Email',password:'Password',loginButton:'Sign in',refresh:'Refresh',logout:'Sign out',
 sectionAi:'Voice Assistant (AI)',activeUsers:'Active users today',textRequests:'Text messages today',voiceTime:'Voice time today',switches:'Automatic AI switches',providers:'AI providers today',provider:'Provider',requests:'Requests',tokens:'Tokens',utilization:'Utilization',remaining:'Remaining',errors:'Errors',timeouts:'Timeouts',limits:'Central AI daily limits',textLimit:'Text per user',voiceLimit:'Voice minutes per user',speechLimit:'Total Whisper hours',geminiSpeechLimit:'Gemini speech transcriptions',timeout:'Switch after milliseconds',save:'Save',saved:'Saved',denied:'Access denied.',
 sectionTelephony:'Voice and Video Telephony',telephonySubtitle:'Multi-provider cascade: Agora → Daily → GetStream → WebRTC',telephonyNotice:'Quota tracking notice: Provider APIs report usage with up to 24 hours delay. Doori tracks call seconds in real-time in Firestore (_telephonyBudgets) to instantly prevent exceeding free tiers.',telephonyAudioToday:'Audio minutes today',telephonyVideoToday:'Video minutes today',telephonySwitchesToday:'Telephony failovers today',telephonyProvidersTitle:'Telephony Providers & Cascade',telephonyConfigTitle:'Telephony Monthly Quotas & Failover',role:'Role',status:'Status',audioMin:'Audio (month)',videoMin:'Video (month)',totalMin:'Total',monthlyLimit:'Monthly limit',trackingMethod:'Tracking',trackingInfo:'Real-time Firestore',rolePrimary:'Primary',roleFallback1:'Fallback 1',roleFallback2:'Fallback 2',roleFallback3:'Fallback 3',statusActive:'Active',statusDegraded:'Degraded / Error',statusLimitReached:'Limit reached',agoraLimit:'Agora free minutes / month',dailyLimit:'Daily free minutes / month',streamLimit:'GetStream free minutes / month',failoverTimeout:'Failover timeout (ms)'
},
ar:{
 title:'لوحة تشغيل Doori',subtitle:'نظرة محمية على استهلاك الذكاء الاصطناعي والاتصال',login:'تسجيل دخول المشغّل',email:'البريد الإلكتروني',password:'كلمة المرور',loginButton:'تسجيل الدخول',refresh:'تحديث',logout:'تسجيل الخروج',
 sectionAi:'المساعد الصوتي (الذكاء الاصطناعي)',activeUsers:'المستخدمون النشطون اليوم',textRequests:'الرسائل النصية اليوم',voiceTime:'الوقت الصوتي اليوم',switches:'التبديل التلقائي للذكاء الاصطناعي',providers:'مزودو الذكاء الاصطناعي اليوم',provider:'المزود',requests:'الطلبات',tokens:'الرموز',utilization:'الاستخدام',remaining:'المتبقي',errors:'الأخطاء',timeouts:'انتهاء المهلة',limits:'حدود الذكاء الاصطناعي اليومية',textLimit:'النص لكل مستخدم',voiceLimit:'دقائق الصوت لكل مستخدم',speechLimit:'إجمالي ساعات Whisper',geminiSpeechLimit:'عمليات التعرّف الصوتي عبر Gemini',timeout:'التبديل بعد مللي ثانية',save:'حفظ',saved:'تم الحفظ',denied:'تم رفض الوصول.',
 sectionTelephony:'الاتصال الصوتي والمرئي',telephonySubtitle:'تتابع المزودين المتعددين: Agora ← Daily ← GetStream ← WebRTC',telephonyNotice:'ملاحظة حول تتبع الحصص: تسجل واجهات المزودين البيانات بتأخير يصل إلى 24 ساعة. لذلك يتتبع Doori ثواني المكالمات فورياً في Firestore لمنع تجاوز الباقات المجانية.',telephonyAudioToday:'دقائق الصوت اليوم',telephonyVideoToday:'دقائق الفيديو اليوم',telephonySwitchesToday:'تحويلات الاتصال التلقائية اليوم',telephonyProvidersTitle:'مزودو الاتصال وتتابع الخدمة',telephonyConfigTitle:'حصص الاتصال الشهرية والتحويل التلقائي',role:'الدور',status:'الحالة',audioMin:'صوت (شهري)',videoMin:'فيديو (شهري)',totalMin:'الإجمالي',monthlyLimit:'الحد الشهري',trackingMethod:'طريقة القياس',trackingInfo:'خلفية فورية Firestore',rolePrimary:'المزود الرئيسي',roleFallback1:'الاحتياطي 1',roleFallback2:'الاحتياطي 2',roleFallback3:'الاحتياطي 3',statusActive:'نشط',statusDegraded:'خلل / معطّل',statusLimitReached:'تم بلوغ الحد',agoraLimit:'دقائق Agora المجانية / شهر',dailyLimit:'دقائق Daily المجانية / شهر',streamLimit:'دقائق GetStream المجانية / شهر',failoverTimeout:'مهلة التبديل (مللي ثانية)'
},
fa:{
 title:'کنسول مدیریت Doori',subtitle:'نمای محافظت‌شده مصرف هوش مصنوعی و تماس‌ها',login:'ورود مدیر',email:'ایمیل',password:'گذرواژه',loginButton:'ورود',refresh:'به‌روزرسانی',logout:'خروج',
 sectionAi:'دستیار صوتی (هوش مصنوعی)',activeUsers:'کاربران فعال امروز',textRequests:'پیام‌های متنی امروز',voiceTime:'زمان صوتی امروز',switches:'تغییر خودکار هوش مصنوعی',providers:'ارائه‌دهندگان هوش مصنوعی امروز',provider:'ارائه‌دهنده',requests:'درخواست‌ها',tokens:'توکن‌ها',utilization:'مصرف',remaining:'باقی‌مانده',errors:'خطاها',timeouts:'پایان مهلت',limits:'محدودیت‌های روزانه هوش مصنوعی',textLimit:'متن برای هر کاربر',voiceLimit:'دقایق صوتی هر کاربر',speechLimit:'مجموع ساعت‌های Whisper',geminiSpeechLimit:'تشخیص‌های گفتار Gemini',timeout:'تغییر پس از میلی‌ثانیه',save:'ذخیره',saved:'ذخیره شد',denied:'دسترسی رد شد.',
 sectionTelephony:'تماس صوتی و تصویری',telephonySubtitle:'آبشار چند ارائه‌دهنده: Agora ← Daily ← GetStream ← WebRTC',telephonyNotice:'یادداشت سهمیه: ای‌پی‌آی ارائه‌دهندگان اطلاعات مصرف را با تاخیر تا ۲۴ ساعت اعلام می‌کنند. بنابراین دوری ثانیه‌های تماس را در لحظه در Firestore ثبت می‌کند تا سقف رایگان رد نشود.',telephonyAudioToday:'دقایق صوتی امروز',telephonyVideoToday:'دقایق ویدیویی امروز',telephonySwitchesToday:'تغییر خودکار تماس امروز',telephonyProvidersTitle:'ارائه‌دهندگان تماس و آبشار پشتیبان',telephonyConfigTitle:'سهمیه‌های ماهانه تماس و تغییر خودکار',role:'نقش',status:'وضعیت',audioMin:'صدا (ماهانه)',videoMin:'ویدیو (ماهانه)',totalMin:'مجموع',monthlyLimit:'محدودیت ماهانه',trackingMethod:'روش سنجش',trackingInfo:'لحظه‌ای Firestore',rolePrimary:'ارائه‌دهنده اصلی',roleFallback1:'پشتیبان ۱',roleFallback2:'پشتیبان ۲',roleFallback3:'پشتیبان ۳',statusActive:'فعال',statusDegraded:'دارای خطا / مختل',statusLimitReached:'سقف مصرف تکمیل شد',agoraLimit:'دقایق رایگان Agora در ماه',dailyLimit:'دقایق رایگان Daily در ماه',streamLimit:'دقایق رایگان GetStream در ماه',failoverTimeout:'مهلت تغییر خودکار (میلی‌ثانیه)'
},
tr:{
 title:'Doori Operatör Konsolu',subtitle:'Korumalı yapay zekâ ve telefon kullanım özeti',login:'Operatör girişi',email:'E-posta',password:'Şifre',loginButton:'Giriş yap',refresh:'Yenile',logout:'Çıkış yap',
 sectionAi:'Sesli Asistan (Yapay Zekâ)',activeUsers:'Bugün aktif kullanıcılar',textRequests:'Bugünkü metin mesajları',voiceTime:'Bugünkü ses süresi',switches:'Otomatik yapay zekâ geçişleri',providers:'Bugünkü yapay zekâ sağlayıcıları',provider:'Sağlayıcı',requests:'İstekler',tokens:'Tokenlar',utilization:'Kullanım',remaining:'Kalan',errors:'Hatalar',timeouts:'Zaman aşımı',limits:'Merkezi yapay zekâ günlük limitleri',textLimit:'Kullanıcı başına metin',voiceLimit:'Kullanıcı başına ses dakikası',speechLimit:'Toplam Whisper saati',geminiSpeechLimit:'Gemini konuşma tanımaları',timeout:'Milisaniye sonra geç',save:'Kaydet',saved:'Kaydedildi',denied:'Erişim reddedildi.',
 sectionTelephony:'Sesli ve Görüntülü Telefon',telephonySubtitle:'Çoklu sağlayıcı kademesi: Agora → Daily → GetStream → WebRTC',telephonyNotice:'Kota bildirim notu: Sağlayıcı API’leri kullanım verilerini 24 saate varan gecikmeyle aktarır. Doori, ücretsiz limitlerin aşılmasını anında önlemek için arama sürelerini Firestore üzerinde gerçek zamanlı kaydeder.',telephonyAudioToday:'Bugünkü ses dakikası',telephonyVideoToday:'Bugünkü video dakikası',telephonySwitchesToday:'Bugünkü telefon yedek geçişleri',telephonyProvidersTitle:'Telefon Sağlayıcıları ve Kademe',telephonyConfigTitle:'Telefon Aylık Kotaları ve Yedek Geçiş',role:'Rol',status:'Durum',audioMin:'Ses (aylık)',videoMin:'Video (aylık)',totalMin:'Toplam',monthlyLimit:'Aylık limit',trackingMethod:'Ölçüm',trackingInfo:'Gerçek zamanlı Firestore',rolePrimary:'Birincil',roleFallback1:'Yedek 1',roleFallback2:'Yedek 2',roleFallback3:'Yedek 3',statusActive:'Aktif',statusDegraded:'Hata / Kesinti',statusLimitReached:'Limit aşıldı',agoraLimit:'Agora ücretsiz dakika / ay',dailyLimit:'Daily ücretsiz dakika / ay',streamLimit:'GetStream ücretsiz dakika / ay',failoverTimeout:'Yedek geçiş zaman aşımı (ms)'
}
};
Object.assign(T.de,{speechLimit:'Whisper-Stunden gesamt',geminiSpeechLimit:'Gemini-Spracherkennungen'});Object.assign(T.en,{speechLimit:'Total Whisper hours',geminiSpeechLimit:'Gemini speech transcriptions'});Object.assign(T.ar,{speechLimit:'إجمالي ساعات Whisper',geminiSpeechLimit:'عمليات التعرّف الصوتي عبر Gemini'});Object.assign(T.fa,{speechLimit:'مجموع ساعت‌های Whisper',geminiSpeechLimit:'تشخیص‌های گفتار Gemini'});Object.assign(T.tr,{speechLimit:'Toplam Whisper saati',geminiSpeechLimit:'Gemini konuşma tanımaları'});
Object.assign(T.de,{geminiTtsLimit:'Gemini-Sprachausgaben',groqSafetyLimit:'Groq Doori-Schutzlimit/Tag',geminiSafetyLimit:'Gemini Doori-Schutzlimit/Tag',cloudflareNeuronLimit:'Cloudflare Neurons pro UTC-Tag',aiMetricNotice:'Groq und Gemini zeigen ausschließlich interne Doori-Schutzlimits pro Tag, keine Monatslimits und keine vom Anbieter gemeldeten Restkontingente. Cloudflare wird anhand der gemeldeten Tokens in geschätzte Neurons umgerechnet; das offizielle Kontingent wird täglich um 00:00 UTC zurückgesetzt.',estimatedNeurons:'geschätzte Neurons',internalRequests:'Doori-interne Requests',internalUsage:'Doori-Schutzlimit'});
Object.assign(T.en,{geminiTtsLimit:'Gemini voice outputs',groqSafetyLimit:'Groq Doori safety cap/day',geminiSafetyLimit:'Gemini Doori safety cap/day',cloudflareNeuronLimit:'Cloudflare Neurons per UTC day',aiMetricNotice:'Groq and Gemini show only internal Doori daily safety caps, not monthly limits or provider-reported remaining quotas. Cloudflare tokens are converted to estimated Neurons; the official allocation resets daily at 00:00 UTC.',estimatedNeurons:'estimated Neurons',internalRequests:'Doori internal requests',internalUsage:'Doori safety cap'});
Object.assign(T.ar,{geminiTtsLimit:'مخرجات Gemini الصوتية',groqSafetyLimit:'حد حماية Groq في Doori يومياً',geminiSafetyLimit:'حد حماية Gemini في Doori يومياً',cloudflareNeuronLimit:'وحدات Neurons لـ Cloudflare لكل يوم UTC',aiMetricNotice:'يعرض Groq وGemini حدود الحماية اليومية الداخلية في Doori فقط، وليست حدوداً شهرية أو حصصاً متبقية يعلنها المزود. تُحوّل رموز Cloudflare إلى Neurons تقديرية، وتُعاد الحصة الرسمية يومياً عند 00:00 UTC.',estimatedNeurons:'Neurons تقديرية',internalRequests:'طلبات Doori الداخلية',internalUsage:'حد حماية Doori'});
Object.assign(T.fa,{geminiTtsLimit:'خروجی‌های صوتی Gemini',groqSafetyLimit:'سقف حفاظتی روزانه Groq در Doori',geminiSafetyLimit:'سقف حفاظتی روزانه Gemini در Doori',cloudflareNeuronLimit:'واحدهای Neurons کلادفلر در هر روز UTC',aiMetricNotice:'Groq و Gemini فقط سقف‌های حفاظتی روزانه داخلی Doori را نشان می‌دهند؛ این اعداد محدودیت ماهانه یا سهمیه باقی‌مانده اعلام‌شده از سوی ارائه‌دهنده نیستند. توکن‌های Cloudflare به Neurons تخمینی تبدیل می‌شوند و سهمیه رسمی هر روز ساعت ۰۰:۰۰ UTC بازنشانی می‌شود.',estimatedNeurons:'Neurons تخمینی',internalRequests:'درخواست‌های داخلی Doori',internalUsage:'سقف حفاظتی Doori'});
Object.assign(T.tr,{geminiTtsLimit:'Gemini sesli yanıtları',groqSafetyLimit:'Groq Doori günlük güvenlik sınırı',geminiSafetyLimit:'Gemini Doori günlük güvenlik sınırı',cloudflareNeuronLimit:'UTC günü başına Cloudflare Neurons',aiMetricNotice:'Groq ve Gemini yalnızca Doori’nin dahili günlük güvenlik sınırlarını gösterir; bunlar aylık limitler veya sağlayıcının bildirdiği kalan kotalar değildir. Cloudflare tokenları tahmini Neurons değerine dönüştürülür; resmi kota her gün 00:00 UTC’de sıfırlanır.',estimatedNeurons:'tahmini Neurons',internalRequests:'Doori dahili istekleri',internalUsage:'Doori güvenlik sınırı'});
Object.assign(T.de,{loadFailed:'Anmeldung erfolgreich, aber die Verbrauchsdaten konnten nicht geladen werden. Bitte aktualisiere die Seite.'});
Object.assign(T.en,{loadFailed:'Sign-in succeeded, but usage data could not be loaded. Please refresh the page.'});
Object.assign(T.ar,{loadFailed:'تم تسجيل الدخول، لكن تعذر تحميل بيانات الاستخدام. يرجى تحديث الصفحة.'});
Object.assign(T.fa,{loadFailed:'ورود انجام شد، اما داده‌های مصرف بارگذاری نشد. لطفاً صفحه را تازه‌سازی کنید.'});
Object.assign(T.tr,{loadFailed:'Giriş başarılı, ancak kullanım verileri yüklenemedi. Lütfen sayfayı yenileyin.'});

let lang=localStorage.getItem('doori_operator_lang')||'de';
const $=id=>document.getElementById(id),copy=()=>T[lang]||T.en;

function translate(){
 document.documentElement.lang=lang;
 document.body.classList.toggle('rtl',lang==='ar'||lang==='fa');
 document.querySelectorAll('[data-t]').forEach(el=>el.textContent=copy()[el.dataset.t]||el.textContent);
 document.querySelectorAll('[data-p]').forEach(el=>el.placeholder=copy()[el.dataset.p]||el.placeholder);
 $('lang').value=lang;
}

const dashboardCall=()=>window.accountFunctions.httpsCallable('getAssistantAdminDashboard')({}).then(r=>r.data);
const updateAiCall=data=>window.accountFunctions.httpsCallable('updateAssistantAdminConfig')(data).then(r=>r.data);
const updateTelephonyCall=data=>window.accountFunctions.httpsCallable('updateTelephonyAdminConfig')(data).then(r=>r.data);

function render(data){
 // AI Section
 $('active-users').textContent=data.users.active;
 $('text-total').textContent=data.users.textRequests;
 $('voice-total').textContent=(data.users.voiceSeconds/60).toFixed(1)+' min';
 const today=data.days.find(d=>d.day===data.today)||{providers:{},automaticSwitches:0};
 $('switch-total').textContent=today.automaticSwitches||0;
 const limits={groq:data.config.groqDailyRequests,gemini:data.config.geminiDailyRequests,cloudflare:data.config.cloudflareDailyNeurons};
 $('provider-rows').innerHTML=['groq','gemini','cloudflare'].map(name=>{
  const p=today.providers?.[name]||{},requests=Number(p.requests||0),isCloudflare=name==='cloudflare';
  const used=isCloudflare?Number(data.cloudflareUsage?.neurons||0):requests,max=Number(limits[name]||0),pct=max>0?Math.min(100,used/max*100):0;
  const pctLabel=pct>0&&pct<0.1?'&lt;0.1%':`${pct.toFixed(1)}%`,remaining=Math.max(0,max-used);
  const unit=isCloudflare?copy().estimatedNeurons:copy().internalRequests;
  return `<tr><td>${name[0].toUpperCase()+name.slice(1)}</td><td>${requests}</td><td>${(p.inputTokens||0)+(p.outputTokens||0)}${isCloudflare?`<br><small>${used.toFixed(4)} ${copy().estimatedNeurons}</small>`:''}</td><td>${pctLabel}${isCloudflare?'':`<br><small>${copy().internalUsage}</small>`}<div class="meter"><i style="width:${pct}%"></i></div></td><td>${isCloudflare?remaining.toFixed(4):Math.floor(remaining)} <small>${unit}</small></td><td>${(p.errors||0)+(p.limits||0)}</td><td>${p.timeouts||0}</td></tr>`;
 }).join('');

 const f=$('config-form');
 for(const key of ['textMessagesPerUser','geminiSpeechDailyRequests','geminiTtsDailyRequests','groqDailyRequests','geminiDailyRequests','cloudflareDailyNeurons','providerTimeoutMs'])f.elements[key].value=data.config[key];
 f.elements.voiceMinutes.value=data.config.voiceSecondsPerUser/60;
 f.elements.speechRecognitionHours.value=(data.config.speechRecognitionSecondsPerDay/3600).toFixed(1);

 // Telephony Section
 const tel=data.telephony||{};
 $('telephony-audio-today').textContent=(tel.todayAudioMinutes||0)+' min';
 $('telephony-video-today').textContent=(tel.todayVideoMinutes||0)+' min';
 $('telephony-switches-today').textContent=tel.todaySwitches||0;

 const roleMap={primary:copy().rolePrimary,fallback1:copy().roleFallback1,fallback2:copy().roleFallback2,fallback3:copy().roleFallback3};
 const statusMap={active:copy().statusActive,degraded:copy().statusDegraded,limit_reached:copy().statusLimitReached};
 const providerNames={agora:'Agora RTC',daily:'Daily.co',getstream:'GetStream Video'};

 $('telephony-rows').innerHTML=(tel.providers||[]).map(p=>{
  const name=providerNames[p.name]||p.name;
  const roleLabel=roleMap[p.role]||p.role;
  const statusLabel=statusMap[p.status]||p.status;
  const pct=Math.min(100,p.utilization||0);
  return `<tr>
   <td><strong>${name}</strong></td>
   <td><span class="role-badge role-${p.role}">${roleLabel}</span></td>
   <td><span class="status-pill status-${p.status}">${statusLabel}</span></td>
   <td>${p.audioMinutes} min</td>
   <td>${p.videoMinutes} min</td>
   <td><strong>${p.totalMinutes} min</strong></td>
   <td>${pct}%<div class="meter"><i style="width:${pct}%"></i></div></td>
   <td>${p.remainingMinutes} min</td>
   <td>${p.monthlyLimit} min</td>
   <td><small style="color:var(--muted)">${copy().trackingInfo}</small></td>
  </tr>`;
 }).join('');

 const tf=$('telephony-config-form');
 if(tf&&tel.config){
  tf.elements.agoraMonthlyMinutes.value=tel.config.agoraMonthlyMinutes||10000;
  tf.elements.dailyMonthlyMinutes.value=tel.config.dailyMonthlyMinutes||10000;
  tf.elements.getstreamMonthlyMinutes.value=tel.config.getstreamMonthlyMinutes||66000;
  tf.elements.failoverTimeoutMs.value=tel.config.failoverTimeoutMs||6000;
 }

 $('updated').textContent=new Date(data.generatedAt).toLocaleString();
}

async function load(){
 try{
  const data=await dashboardCall();
  render(data);
  $('login').classList.add('hidden');
  $('dashboard').classList.remove('hidden');
 }catch(error){
  $('login-error').textContent=String(error?.code||'').includes('permission-denied')?copy().denied:copy().loadFailed;
  $('dashboard').classList.add('hidden');
 }
}

$('login-btn').onclick=async()=>{
 try{
  await firebase.auth().signInWithEmailAndPassword($('email').value,$('password').value);
  await load();
 }catch{
  $('login-error').textContent=copy().denied;
 }
};

$('logout').onclick=()=>firebase.auth().signOut();
$('refresh').onclick=load;
$('lang').onchange=e=>{lang=e.target.value;localStorage.setItem('doori_operator_lang',lang);translate();};

$('config-form').onsubmit=async e=>{
 e.preventDefault();
 const f=e.currentTarget;
 try{
  await updateAiCall({
   textMessagesPerUser:Number(f.elements.textMessagesPerUser.value),
   voiceSecondsPerUser:Number(f.elements.voiceMinutes.value)*60,
   speechRecognitionSecondsPerDay:Math.round(Number(f.elements.speechRecognitionHours.value)*3600),
   geminiSpeechDailyRequests:Number(f.elements.geminiSpeechDailyRequests.value),
   geminiTtsDailyRequests:Number(f.elements.geminiTtsDailyRequests.value),
   groqDailyRequests:Number(f.elements.groqDailyRequests.value),
   geminiDailyRequests:Number(f.elements.geminiDailyRequests.value),
   cloudflareDailyNeurons:Number(f.elements.cloudflareDailyNeurons.value),
   providerTimeoutMs:Number(f.elements.providerTimeoutMs.value)
  });
  $('save-state').textContent=copy().saved;
  await load();
 }catch{
  $('save-state').textContent=copy().denied;
 }
};

$('telephony-config-form').onsubmit=async e=>{
 e.preventDefault();
 const f=e.currentTarget;
 try{
  await updateTelephonyCall({
   agoraMonthlyMinutes:Number(f.elements.agoraMonthlyMinutes.value),
   dailyMonthlyMinutes:Number(f.elements.dailyMonthlyMinutes.value),
   getstreamMonthlyMinutes:Number(f.elements.getstreamMonthlyMinutes.value),
   failoverTimeoutMs:Number(f.elements.failoverTimeoutMs.value)
  });
  $('telephony-save-state').textContent=copy().saved;
  await load();
 }catch{
  $('telephony-save-state').textContent=copy().denied;
 }
};

firebase.auth().onAuthStateChanged(user=>{
 if(user)load();
 else{
  $('login').classList.remove('hidden');
  $('dashboard').classList.add('hidden');
 }
});

translate();
})();
