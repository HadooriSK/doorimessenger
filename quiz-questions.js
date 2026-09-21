(function (root) {
  'use strict';

  const FACTS = {
    de: [
      ['Welcher Ozean ist der größte?', ['Atlantik','Pazifik','Indischer Ozean','Arktischer Ozean'], 1],
      ['Wer schrieb „Der kleine Prinz“?', ['Jules Verne','Victor Hugo','Antoine de Saint-Exupéry','Albert Camus'], 2],
      ['Welches chemische Symbol hat Gold?', ['Au','Ag','Fe','Go'], 0],
      ['Was ist die Hauptstadt von Kanada?', ['Toronto','Vancouver','Montreal','Ottawa'], 3],
      ['Wie viele Knochen hat ein erwachsener Mensch normalerweise?', ['196','206','216','226'], 1],
      ['Welcher Fluss ist der längste Europas?', ['Donau','Rhein','Wolga','Elbe'], 2],
      ['Wer malte „Sternennacht“?', ['Vincent van Gogh','Claude Monet','Pablo Picasso','Salvador Dalí'], 0],
      ['Welcher Planet wird der rote Planet genannt?', ['Venus','Jupiter','Saturn','Mars'], 3],
      ['Welche Sprache wird hauptsächlich in Brasilien gesprochen?', ['Spanisch','Portugiesisch','Französisch','Englisch'], 1],
      ['In welchem Jahr fiel die Berliner Mauer?', ['1987','1988','1989','1990'], 2],
      ['Was ist die kleinste Primzahl?', ['2','1','3','0'], 0],
      ['Welches Organ produziert Insulin?', ['Leber','Niere','Milz','Bauchspeicheldrüse'], 3],
      ['Was ist die Hauptstadt Australiens?', ['Sydney','Canberra','Melbourne','Perth'], 1],
      ['Welches Element hat das Symbol O?', ['Osmium','Gold','Sauerstoff','Zinn'], 2],
      ['Wie viele Kontinente durchquert der Äquator?', ['3','2','4','5'], 0],
      ['Wie schnell ist Licht ungefähr?', ['30.000 km/s','150.000 km/s','500.000 km/s','300.000 km/s'], 3],
      ['Welcher Monat war im alten römischen Kalender ursprünglich der erste?', ['Januar','März','April','Juni'], 1],
      ['Welche ist die größte Wüste der Erde?', ['Sahara','Gobi','Antarktis','Arabische Wüste'], 2],
      ['Welche Form beschreibt die DNA?', ['Doppelhelix','Kugel','Würfel','Ring'], 0],
      ['Was ist die Quadratwurzel von 144?', ['10','11','13','12'], 3]
    ],
    en: [
      ['Which ocean is the largest?', ['Atlantic','Pacific','Indian','Arctic'], 1],
      ['Who wrote “The Little Prince”?', ['Jules Verne','Victor Hugo','Antoine de Saint-Exupéry','Albert Camus'], 2],
      ['What is the chemical symbol for gold?', ['Au','Ag','Fe','Go'], 0],
      ['What is the capital of Canada?', ['Toronto','Vancouver','Montreal','Ottawa'], 3],
      ['How many bones does an adult human normally have?', ['196','206','216','226'], 1],
      ['Which river is the longest in Europe?', ['Danube','Rhine','Volga','Elbe'], 2],
      ['Who painted “The Starry Night”?', ['Vincent van Gogh','Claude Monet','Pablo Picasso','Salvador Dalí'], 0],
      ['Which planet is called the red planet?', ['Venus','Jupiter','Saturn','Mars'], 3],
      ['Which language is mainly spoken in Brazil?', ['Spanish','Portuguese','French','English'], 1],
      ['In which year did the Berlin Wall fall?', ['1987','1988','1989','1990'], 2],
      ['What is the smallest prime number?', ['2','1','3','0'], 0],
      ['Which organ produces insulin?', ['Liver','Kidney','Spleen','Pancreas'], 3],
      ['What is the capital of Australia?', ['Sydney','Canberra','Melbourne','Perth'], 1],
      ['Which element has the symbol O?', ['Osmium','Gold','Oxygen','Tin'], 2],
      ['How many continents does the equator cross?', ['3','2','4','5'], 0],
      ['Approximately how fast is light?', ['30,000 km/s','150,000 km/s','500,000 km/s','300,000 km/s'], 3],
      ['Which month was originally first in the ancient Roman calendar?', ['January','March','April','June'], 1],
      ['What is the largest desert on Earth?', ['Sahara','Gobi','Antarctica','Arabian Desert'], 2],
      ['Which shape describes DNA?', ['Double helix','Sphere','Cube','Ring'], 0],
      ['What is the square root of 144?', ['10','11','13','12'], 3]
    ],
    ar: [
      ['ما أكبر محيط في العالم؟', ['الأطلسي','الهادئ','الهندي','المتجمد الشمالي'], 1],
      ['من كتب «الأمير الصغير»؟', ['جول فيرن','فيكتور هوغو','أنطوان دو سانت إكزوبيري','ألبير كامو'], 2],
      ['ما الرمز الكيميائي للذهب؟', ['Au','Ag','Fe','Go'], 0],
      ['ما عاصمة كندا؟', ['تورونتو','فانكوفر','مونتريال','أوتاوا'], 3],
      ['كم عظمة توجد عادة في جسم الإنسان البالغ؟', ['196','206','216','226'], 1],
      ['ما أطول نهر في أوروبا؟', ['الدانوب','الراين','الفولغا','إلبه'], 2],
      ['من رسم «ليلة النجوم»؟', ['فنسنت فان غوخ','كلود مونيه','بابلو بيكاسو','سلفادور دالي'], 0],
      ['أي كوكب يسمى الكوكب الأحمر؟', ['الزهرة','المشتري','زحل','المريخ'], 3],
      ['ما اللغة الرئيسية في البرازيل؟', ['الإسبانية','البرتغالية','الفرنسية','الإنجليزية'], 1],
      ['في أي عام سقط جدار برلين؟', ['1987','1988','1989','1990'], 2],
      ['ما أصغر عدد أولي؟', ['2','1','3','0'], 0],
      ['أي عضو ينتج الإنسولين؟', ['الكبد','الكلية','الطحال','البنكرياس'], 3],
      ['ما عاصمة أستراليا؟', ['سيدني','كانبرا','ملبورن','بيرث'], 1],
      ['أي عنصر رمزه O؟', ['الأوزميوم','الذهب','الأكسجين','القصدير'], 2],
      ['كم قارة يمر بها خط الاستواء؟', ['3','2','4','5'], 0],
      ['ما سرعة الضوء تقريبًا؟', ['30,000 كم/ث','150,000 كم/ث','500,000 كم/ث','300,000 كم/ث'], 3],
      ['أي شهر كان الأول في التقويم الروماني القديم؟', ['يناير','مارس','أبريل','يونيو'], 1],
      ['ما أكبر صحراء على الأرض؟', ['الصحراء الكبرى','غوبي','القارة القطبية الجنوبية','الصحراء العربية'], 2],
      ['ما الشكل الذي يصف الحمض النووي؟', ['لولب مزدوج','كرة','مكعب','حلقة'], 0],
      ['ما الجذر التربيعي للعدد 144؟', ['10','11','13','12'], 3]
    ],
    fa: [
      ['بزرگ‌ترین اقیانوس جهان کدام است؟', ['اطلس','آرام','هند','منجمد شمالی'], 1],
      ['نویسنده «شازده کوچولو» کیست؟', ['ژول ورن','ویکتور هوگو','آنتوان دو سنت‌اگزوپری','آلبر کامو'], 2],
      ['نماد شیمیایی طلا چیست؟', ['Au','Ag','Fe','Go'], 0],
      ['پایتخت کانادا کدام است؟', ['تورنتو','ونکوور','مونترال','اتاوا'], 3],
      ['بدن یک انسان بالغ معمولاً چند استخوان دارد؟', ['196','206','216','226'], 1],
      ['طولانی‌ترین رود اروپا کدام است؟', ['دانوب','راین','ولگا','الب'], 2],
      ['تابلوی «شب پرستاره» را چه کسی کشید؟', ['ونسان ون گوگ','کلود مونه','پابلو پیکاسو','سالوادور دالی'], 0],
      ['کدام سیاره، سیاره سرخ نامیده می‌شود؟', ['زهره','مشتری','زحل','مریخ'], 3],
      ['زبان اصلی برزیل چیست؟', ['اسپانیایی','پرتغالی','فرانسوی','انگلیسی'], 1],
      ['دیوار برلین در چه سالی فرو ریخت؟', ['1987','1988','1989','1990'], 2],
      ['کوچک‌ترین عدد اول چیست؟', ['2','1','3','0'], 0],
      ['کدام اندام انسولین تولید می‌کند؟', ['کبد','کلیه','طحال','لوزالمعده'], 3],
      ['پایتخت استرالیا کدام است؟', ['سیدنی','کانبرا','ملبورن','پرت'], 1],
      ['نماد O مربوط به کدام عنصر است؟', ['اسمیم','طلا','اکسیژن','قلع'], 2],
      ['خط استوا از چند قاره می‌گذرد؟', ['3','2','4','5'], 0],
      ['سرعت نور تقریباً چقدر است؟', ['30,000 کیلومتر/ثانیه','150,000 کیلومتر/ثانیه','500,000 کیلومتر/ثانیه','300,000 کیلومتر/ثانیه'], 3],
      ['در تقویم روم باستان کدام ماه ابتدا ماه اول بود؟', ['ژانویه','مارس','آوریل','ژوئن'], 1],
      ['بزرگ‌ترین بیابان زمین کدام است؟', ['صحرا','گبی','جنوبگان','بیابان عربستان'], 2],
      ['کدام شکل ساختار DNA را توصیف می‌کند؟', ['مارپیچ دوگانه','کره','مکعب','حلقه'], 0],
      ['جذر 144 چند است؟', ['10','11','13','12'], 3]
    ],
    tr: [
      ['Dünyanın en büyük okyanusu hangisidir?', ['Atlas','Pasifik','Hint','Arktik'], 1],
      ['“Küçük Prens”i kim yazdı?', ['Jules Verne','Victor Hugo','Antoine de Saint-Exupéry','Albert Camus'], 2],
      ['Altının kimyasal sembolü nedir?', ['Au','Ag','Fe','Go'], 0],
      ['Kanada’nın başkenti neresidir?', ['Toronto','Vancouver','Montreal','Ottawa'], 3],
      ['Yetişkin bir insanda normalde kaç kemik vardır?', ['196','206','216','226'], 1],
      ['Avrupa’nın en uzun nehri hangisidir?', ['Tuna','Ren','Volga','Elbe'], 2],
      ['“Yıldızlı Gece”yi kim yaptı?', ['Vincent van Gogh','Claude Monet','Pablo Picasso','Salvador Dalí'], 0],
      ['Kızıl gezegen olarak bilinen gezegen hangisidir?', ['Venüs','Jüpiter','Satürn','Mars'], 3],
      ['Brezilya’da ağırlıklı olarak hangi dil konuşulur?', ['İspanyolca','Portekizce','Fransızca','İngilizce'], 1],
      ['Berlin Duvarı hangi yıl yıkıldı?', ['1987','1988','1989','1990'], 2],
      ['En küçük asal sayı hangisidir?', ['2','1','3','0'], 0],
      ['İnsülini hangi organ üretir?', ['Karaciğer','Böbrek','Dalak','Pankreas'], 3],
      ['Avustralya’nın başkenti neresidir?', ['Sidney','Canberra','Melbourne','Perth'], 1],
      ['O sembolü hangi elemente aittir?', ['Osmiyum','Altın','Oksijen','Kalay'], 2],
      ['Ekvator kaç kıtadan geçer?', ['3','2','4','5'], 0],
      ['Işığın hızı yaklaşık kaçtır?', ['30.000 km/sn','150.000 km/sn','500.000 km/sn','300.000 km/sn'], 3],
      ['Eski Roma takviminde başlangıçta ilk ay hangisiydi?', ['Ocak','Mart','Nisan','Haziran'], 1],
      ['Dünyanın en büyük çölü hangisidir?', ['Sahra','Gobi','Antarktika','Arabistan Çölü'], 2],
      ['DNA’nın yapısını hangi şekil tanımlar?', ['Çift sarmal','Küre','Küp','Halka'], 0],
      ['144’ün karekökü kaçtır?', ['10','11','13','12'], 3]
    ]
  };

  const TEXT = {
    de:{mul:(a,b)=>`Wie viel ist ${a} × ${b}?`,pct:(p,n)=>`Wie viel sind ${p} % von ${n}?`,seq:(a,d)=>`Welche Zahl folgt? ${a}, ${a+d}, ${a+2*d}, ${a+3*d}, …`,avg:a=>`Wie groß ist der Durchschnitt von ${a.join(', ')}?`,pow:(a,b)=>`Wie viel ist ${a} hoch ${b}?`,time:h=>`Wie viele Minuten sind ${h} Stunden?`,frac:(a,b,n)=>`Wie viel ist ${a}/${b} von ${n}?`},
    en:{mul:(a,b)=>`What is ${a} × ${b}?`,pct:(p,n)=>`What is ${p}% of ${n}?`,seq:(a,d)=>`Which number comes next? ${a}, ${a+d}, ${a+2*d}, ${a+3*d}, …`,avg:a=>`What is the average of ${a.join(', ')}?`,pow:(a,b)=>`What is ${a} to the power of ${b}?`,time:h=>`How many minutes are ${h} hours?`,frac:(a,b,n)=>`What is ${a}/${b} of ${n}?`},
    ar:{mul:(a,b)=>`كم يساوي ${a} × ${b}؟`,pct:(p,n)=>`كم يساوي ${p}٪ من ${n}؟`,seq:(a,d)=>`ما العدد التالي؟ ${a}، ${a+d}، ${a+2*d}، ${a+3*d}، …`,avg:a=>`ما متوسط الأعداد ${a.join('، ')}؟`,pow:(a,b)=>`كم يساوي ${a} أس ${b}؟`,time:h=>`كم دقيقة في ${h} ساعات؟`,frac:(a,b,n)=>`كم يساوي ${a}/${b} من ${n}؟`},
    fa:{mul:(a,b)=>`${a} × ${b} چند می‌شود؟`,pct:(p,n)=>`${p}٪ از ${n} چند می‌شود؟`,seq:(a,d)=>`عدد بعدی چیست؟ ${a}، ${a+d}، ${a+2*d}، ${a+3*d}، …`,avg:a=>`میانگین ${a.join('، ')} چند است؟`,pow:(a,b)=>`${a} به توان ${b} چند می‌شود؟`,time:h=>`${h} ساعت چند دقیقه است؟`,frac:(a,b,n)=>`${a}/${b} از ${n} چند می‌شود؟`},
    tr:{mul:(a,b)=>`${a} × ${b} kaçtır?`,pct:(p,n)=>`${n} sayısının %${p} kadarı kaçtır?`,seq:(a,d)=>`Sıradaki sayı hangisidir? ${a}, ${a+d}, ${a+2*d}, ${a+3*d}, …`,avg:a=>`${a.join(', ')} sayılarının ortalaması kaçtır?`,pow:(a,b)=>`${a} üzeri ${b} kaçtır?`,time:h=>`${h} saat kaç dakikadır?`,frac:(a,b,n)=>`${n} sayısının ${a}/${b} kadarı kaçtır?`}
  };

  function numeric(question, answer, wrong, seed) {
    const values = [answer, ...wrong].map(String);
    const shift = seed % 4;
    const options = values.slice(shift).concat(values.slice(0, shift));
    return [question, options, options.indexOf(String(answer))];
  }

  function generated(language) {
    const t=TEXT[language], out=[];
    [[12,8],[14,7],[16,6],[18,9],[24,7],[13,11],[15,12],[17,8],[19,6],[22,9]].forEach(([a,b],i)=>{const n=a*b;out.push(numeric(t.mul(a,b),n,[n-a,n+b,n+10],i));});
    [[15,240],[25,360],[30,450],[12,500],[35,200],[18,350],[40,280],[22,400],[75,160],[8,625]].forEach(([p,n],i)=>{const v=p*n/100;out.push(numeric(t.pct(p,n),v,[v+10,v-5,v*2],i+10));});
    [[7,4],[13,5],[22,6],[5,7],[31,8],[9,9],[42,3],[18,11],[64,5],[27,12]].forEach(([a,d],i)=>{const v=a+4*d;out.push(numeric(t.seq(a,d),v,[v-d,v+d,v+2*d],i+20));});
    [[12,18,24,30],[15,25,35,45],[8,16,24,32],[21,27,33,39],[14,22,30,38]].forEach((a,i)=>{const v=a.reduce((x,y)=>x+y,0)/a.length;out.push(numeric(t.avg(a),v,[v-2,v+2,v+5],i+30));});
    [[2,7],[3,4],[4,3],[5,3],[6,3]].forEach(([a,b],i)=>{const v=a**b;out.push(numeric(t.pow(a,b),v,[v-a,v+a,v*2],i+35));});
    [2.5,3.5,4.25,6.5,7.75].forEach((h,i)=>{const v=h*60;out.push(numeric(t.time(h),v,[v-30,v+30,v+60],i+40));});
    [[3,4,120],[2,5,250],[5,8,320],[7,10,450],[4,9,360]].forEach(([a,b,n],i)=>{const v=a*n/b;out.push(numeric(t.frac(a,b,n),v,[v-10,v+10,v*2],i+45));});
    return out;
  }

  root.DOORI_QUIZ_QUESTIONS = Object.fromEntries(Object.keys(FACTS).map(language => [language, [...FACTS[language], ...generated(language)]]));
})(window);
