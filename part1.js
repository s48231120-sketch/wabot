// ============ بوت واتساب (Baileys) — النسخة 3 (نقابات) ============
// التشغيل:  OWNER=21652703823,21621912835 node index.js
(async () => {
const fs = (await import('node:fs')).default;
const mod = await import('@whiskeysockets/baileys');
const makeWASocket = mod.makeWASocket || mod.default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidNormalizedUser, normalizeMessageContent, Browsers } = mod;
process.on('unhandledRejection', e => console.log('⚠️ خطأ غير معالج:', e?.message || e));
process.on('uncaughtException', e => console.log('⚠️ استثناء:', e?.message || e));
const silent = { level: 'silent', child() { return silent; }, trace() {}, debug() {}, info() {}, warn() {}, error() {} };

// ---------- المؤسسون (محميون من الطرد والحظر والتحذير) ----------
const FOUNDERS = [...new Set(['21652703823', '21621912835', ...(process.env.OWNER || process.env.PHONE || '').split(',').map(s => s.trim()).filter(Boolean)])];

// ---------- بيانات دائمة (لكل نقابة سجل مستقل) ----------
const DB = 'data.json';
let db = {};
try { db = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch {}
db.g ||= {};
let saveT = null;
const flush = () => { try { fs.writeFileSync(DB, JSON.stringify(db)); } catch (e) { console.log('save:', e.message); } };
const save = () => { clearTimeout(saveT); saveT = setTimeout(flush, 1500); };
process.on('SIGINT', () => { flush(); process.exit(0); });
process.on('SIGTERM', () => { flush(); process.exit(0); });

const newGuild = () => ({ name: null, autoName: null, bank: {}, titles: {}, extra: {}, medals: {}, earn: {}, wins: {}, msgs: {}, warns: {}, bans: [], stats: { since: Date.now(), counts: {} }, prot: true, blockCC: [], off: [], rules: null, welcome: null });
const gd = chat => {
  const g = (db.g[chat] ||= newGuild());
  g.rank ||= {}; g.slots ||= {}; g.first ||= {}; g.inv ||= {}; g.invd ||= {}; g.viol ||= {};
  if (g.reception === undefined) g.reception = false;
  if (g.titleForm === undefined) g.titleForm = null;   // معرّف رسالة استمارة الألقاب   // true = مجموعة استقبال (تطلب اللقب)
  return g;
};

const BASE_CAP = 10000, FINE = 2000, MAXW = 3;
const capOf = (chat, j) => BASE_CAP + (gd(chat).extra[j] || 0);
const money = n => '💵 ' + Number(n).toLocaleString('en-US') + '$';
function pay(chat, j, n) {
  const g = gd(chat), cur = g.bank[j] || 0, c = Math.max(0, Math.min(n, capOf(chat, j) - cur));
  g.bank[j] = cur + c; save(); return c;
}

// ---------- أدوات ----------
const norm = s => String(s || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[؟?!.,،:;"'()]/g, ' ').replace(/\s+/g, ' ').trim();
const pick = a => a[Math.floor(Math.random() * a.length)];
const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const num = j => String(j).split('@')[0].split(':')[0];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const seen = {};
const sent = new Set();
const menus = new Map();
const mentionMsgs = new Map();
const G = {};
const pend = new Map();
const flood = new Map();
const mcool = new Map();
const startTime = Date.now() / 1000;
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' };
let sock;

const label = (chat, j) => (gd(chat).titles[j] ? `「${gd(chat).titles[j]}」 ` : '') + '@' + num(j);
const normTitle = v => norm(String(v).replace(/[^\p{L}\p{N}\s]/gu, ''));
const gname = (chat) => gd(chat).name || gd(chat).autoName || 'النقابة';

async function send(chat, text, quoted = null) {
  const mentions = [...new Set([...text.matchAll(/@(\d{5,})/g)].map(x => seen[x[1]]).filter(Boolean))];
  try {
    const r = await sock.sendMessage(chat, { text, mentions }, quoted ? { quoted } : {});
    if (r?.key?.id) sent.add(r.key.id);
    return r;
  } catch (e) { console.log('send:', e.message); return null; }
}
async function sendImg(chat, img, caption) {
  const mentions = [...new Set([...caption.matchAll(/@(\d{5,})/g)].map(x => seen[x[1]]).filter(Boolean))];
  const r = await sock.sendMessage(chat, { image: img, caption, mentions });
  if (r?.key?.id) sent.add(r.key.id);
  return r;   // الأخطاء تُلتقط عند المستدعي ثم يُرسل النص بدل الصورة
}
const react = (chat, m, emoji) => sock.sendMessage(chat, { react: { text: emoji, key: m.key } }).catch(() => {});
async function fetchBuf(url) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}
function endGame(chat) {
  const g = G[chat];
  if (!g) return;
  (g.timers || []).forEach(clearTimeout);
  delete G[chat];
}

// ---------- معلومات المجموعة ----------
const mdCache = new Map();
async function meta(chat) {
  const c = mdCache.get(chat);
  if (c && Date.now() - c.t < 30000) return c.md;
  const md = await sock.groupMetadata(chat);
  mdCache.set(chat, { t: Date.now(), md });
  return md;
}
const ids = p => [p.id, p.lid, p.phoneNumber].filter(Boolean);
function phoneOf(md, jid) {
  const p = md?.participants.find(x => ids(x).includes(jid));
  const pn = p?.phoneNumber || (p?.id?.endsWith('@s.whatsapp.net') ? p.id : null);
  if (pn) return num(pn);
  return String(jid).endsWith('@s.whatsapp.net') ? num(jid) : null;
}
const isFounderJid = (md, j) => FOUNDERS.includes(num(j)) || FOUNDERS.includes(phoneOf(md, j));
const isAdminJid = (md, j) => !!md?.participants.some(p => ids(p).includes(j) && p.admin);
const me = () => [sock.user?.id, sock.user?.lid].filter(Boolean).map(num);
function isBotAdmin(md) {
  if (!md) return false;
  const m = me();
  return md.participants.some(p => p.admin && ids(p).some(x => m.includes(num(x))));
}
async function kick(chat, jids) {
  jids = jids.filter(j => !FOUNDERS.includes(num(j)));   // المؤسسون لا يُطردون أبداً
  if (!jids.length) return false;
  try { await sock.groupParticipantsUpdate(chat, jids, 'remove'); mdCache.delete(chat); return true; }
  catch (e) { console.log('kick:', e.message); return false; }
}

// ---------- الميداليات والكؤوس (2016 نوعاً) ----------
const KINDS = [['ميدالية', '🏅', 1], ['كأس', '🏆', 0], ['بطولة', '🎖️', 1], ['جائزة', '🎁', 1], ['وسام', '🏵️', 0], ['درع', '🛡️', 0]];
const TIERS = [['برونزي', 'برونزية', '🥉'], ['فضي', 'فضية', '🥈'], ['ذهبي', 'ذهبية', '🥇'], ['بلاتيني', 'بلاتينية', '💠'], ['ماسي', 'ماسية', '💎'], ['أسطوري', 'أسطورية', '🌟'], ['ملكي', 'ملكية', '👑'], ['إمبراطوري', 'إمبراطورية', '🔱']];
const DOMAINS = ['الذكاء', 'السرعة', 'الحساب الذهني', 'الثقافة العامة', 'التحقيق', 'الأنمي', 'التخمين', 'الكلمات', 'الإملاء', 'الإنقاذ', 'الشجاعة', 'الحظ', 'الصبر', 'الدهاء', 'القيادة', 'التفاعل', 'الكرم', 'الفكاهة', 'الإبداع', 'الحكمة', 'الصداقة', 'الوفاء', 'الاجتهاد', 'النشاط', 'المثابرة', 'الجرأة', 'الهدوء', 'البصيرة', 'الفراسة', 'الحماس', 'الإتقان', 'التميز', 'البطولة', 'الريادة', 'الشرف', 'الإقدام', 'النبل', 'الأصالة', 'الصمود', 'التحدي', 'الانتصار', 'القوة'];
const MEDAL_TOTAL = KINDS.length * TIERS.length * DOMAINS.length;
const TIER_W = [52, 25, 12, 5.5, 3, 1.5, 0.7, 0.3];
function medalInfo(id) {
  const D = DOMAINS.length, d = id % D, t = Math.floor(id / D) % TIERS.length, k = Math.floor(id / (D * TIERS.length));
  const K = KINDS[k], T = TIERS[t];
  return { name: `${K[0]} ${DOMAINS[d]} ${K[2] ? T[1] : T[0]}`, emoji: K[1], tEmoji: T[2], tier: t, kind: k };
}
const GAME_DOMAIN = { det: 'التحقيق', anime: 'الأنمي', quiz: 'الذكاء', culture: 'الثقافة العامة', guess: 'التخمين', math: 'الحساب الذهني', scr: 'الكلمات', typo: 'الإملاء', kid: 'الإنقاذ' };
const GAME_NAME = { det: 'المحقق', anime: 'صور الأنمي', quiz: 'مسابقة الأسئلة', culture: 'الثقافة العامة', guess: 'تخمين الأرقام', math: 'الحساب الذهني', scr: 'الكلمات المتقطعة', typo: 'حدد الأخطاء', kid: 'الإنقاذ' };
function rollTier() {
  let r = Math.random() * TIER_W.reduce((a, b) => a + b, 0);
  for (let i = 0; i < TIER_W.length; i++) { r -= TIER_W[i]; if (r <= 0) return i; }
  return 0;
}
function grantMedal(chat, j, game) {
  const g = gd(chat);
  const dom = DOMAINS.indexOf(GAME_DOMAIN[game]);
  const d = Math.random() < 0.12 || dom < 0 ? R(0, DOMAINS.length - 1) : dom;
  const id = (R(0, KINDS.length - 1) * TIERS.length + rollTier()) * DOMAINS.length + d;
  const m = (g.medals[j] ||= {});
  m[id] = (m[id] || 0) + 1;
  const mi = medalInfo(id);
  return `${mi.emoji}${mi.tEmoji} حصلت على *${mi.name}*${mi.tier >= 4 ? ' ✨ (نادرة جداً!)' : mi.tier >= 3 ? ' (نادرة)' : ''}`;
}
function award(chat, j, n, game, withMedal = true) {
  const g = gd(chat);
  const got = pay(chat, j, n);
  const e = (g.earn[j] ||= { total: 0, games: {} });
  e.total += got; e.games[game] = (e.games[game] || 0) + got;
  const w = (g.wins[j] ||= {}); w[game] = (w[game] || 0) + 1;
  let t = `💰 ربحت ${money(got)} وأُودعت في البنك 🏦`;
  if (got < n) t += '\n⚠️ بنكك ممتلئ وضاع جزء من الجائزة! اشترِ مساحة من .المتجر';
  if (withMedal) t += '\n' + grantMedal(chat, j, game);
  save();
  return t;
}
function medalStats(chat, j) {
  const m = gd(chat).medals[j] || {};
  const byKind = Array(KINDS.length).fill(0), byTier = Array(TIERS.length).fill(0);
  let total = 0, score = 0;
  const list = [];
  for (const [id, n] of Object.entries(m)) {
    const mi = medalInfo(Number(id));
    byKind[mi.kind] += n; byTier[mi.tier] += n; total += n; score += n * (mi.tier + 1);
    list.push({ ...mi, n });
  }
  list.sort((a, b) => b.tier - a.tier || b.n - a.n);
  return { total, score, byKind, byTier, list };
}

// ---------- التحذيرات والمخالفات ----------
function addWarn(chat, jid, pts) {
  const g = gd(chat), k = num(jid);
  g.warns[k] = (g.warns[k] || 0) + pts; g.viol[k] = (g.viol[k] || 0) + 1; save();
  return g.warns[k];
}
// استمارة المخالفة: الفعل + رقم التحذير + المبلغ المطلوب
function violForm(chat, jid, reason, w, kicked) {
  seen[num(jid)] = jid;
  return `╭━━━ 📋 *استمارة مخالفة* ━━━╮\n👤 المخالف: @${num(jid)}\n🏛️ النقابة: ${gname(chat)}\n\n🚫 *الفعل المرتكب:*\n${reason}\n\n⚠️ *التحذير:* ${w}/${MAXW}\n💳 *المبلغ المطلوب سداده:* ${money(w * FINE)}\n⏳ *المتبقي قبل الطرد:* ${Math.max(0, MAXW - w)} تحذير\n\n` +
    (kicked ? `⛔ *القرار:* بلغ الحد الأقصى (${MAXW} تحذيرات) — تم الطرد.` : `✅ *للتسديد:* اكتب *.دفع_مخالفة*\n(يُخصم المبلغ من بنكك وتُمسح إنذاراتك)\n📜 القوانين: *.القوانين*`) + '\n╰━━━━━━━━━━━━━━━━━━╯';
}

// ---------- النصوص الثابتة ----------
const RULES = `📌 قوانين وضوابط مجموعة الواتساب 📌

أهلاً بالجميع. لضمان الحفاظ على بيئة مريحة، منظمة، ومفيدة لكل الأعضاء، نرجو من الجميع الالتزام بالقوانين التالية:

1️⃣ الاحترام المتبادل:
الاحترام بين الأعضاء هو الأساس. يُمنع نهائياً التجريح، السب، الإساءة لأي شخص، أو الدخول في نقاشات حادة وعدائية.

2️⃣ محتوى المجموعة:
يجب أن تكون المشاركات (رسائل، صور، فيديوهات، روابط) هادفة ومتناسبة مع هدف الجروب. يُمنع منعاً باتاً نشر أي محتوى مخل بالآداب أو مخالف للتعاليم الدينية والقوانين.

3️⃣ الخصوصية:
يُمنع منعاً باتاً إزعاج أي عضو على الخاص دون إذنه، أو نشر أو تسريب أي محادثات شخصية أو معلومات تخص الأعضاء خارج الجروب.

4️⃣ الإعلانات والروابط:
يُمنع نشر الروابط الخارجية، الإعلانات التجارية، أو دعوات الانضمام لمجموعات أخرى إلا بعد استئذان المشرفين (الآدمن).

5️⃣ إزعاج الأعضاء والتكرار:
يُرجى تجنب إرسال الرسائل المكررة، السبام، أو الرسائل الطويلة جداً بشكل يزعج بقية الأعضاء.

6️⃣ التعامل مع المشاكل:
في حال حدوث أي تجاوز أو إزعاج، نرجو عدم الرد أو إثارة المشاكل في العام، بل يرجى التواصل فوراً مع أحد المشرفين لاتخاذ الإجراء المناسب.

⚠️ ملاحظة:
مخالفة هذه القوانين قد تعرض العضو للتنبيه، ثم الحذف من المجموعة حفاظاً على مصلحة الجميع.`;

const WELCOME = `🎉 أهلاً ومرحباً بك معنا في العائلة! 🌟

نورّت جروبنا بانضمامك يا غالي / يا غالية 💐
سعداء جداً بوجودك معنا، ونتمنى لك وقتاً ممتعاً ومفيداً بصحبتنا.

مجدداً، أهلاً بك، ونتطلع لرؤية تفاعلك الجميل معنا! ☕✨`;

const FRAMES = [
  ['╭━━━━━━━━━━━━━━╮', '╰━━━━━━━━━━━━━━╯'], ['✦•······•✦•······•✦', '✦•······•✦•······•✦'],
  ['🌸🌸🌸🌸🌸🌸🌸', '🌸🌸🌸🌸🌸🌸🌸'], ['⭐ ━━━━━━━━━ ⭐', '⭐ ━━━━━━━━━ ⭐'],
  ['🔥═══════════🔥', '🔥═══════════🔥'], ['💫 ┈┈┈┈┈┈┈┈ 💫', '💫 ┈┈┈┈┈┈┈┈ 💫'],
  ['🌙 ✦ ━━━━━━ ✦ 🌙', '🌙 ✦ ━━━━━━ ✦ 🌙'], ['⚔️ ═══════ ⚔️', '⚔️ ═══════ ⚔️'],
];
const WCATS = ['waifu', 'neko', 'shinobu', 'megumin', 'smile', 'happy', 'wave', 'hug', 'cuddle'];

// الفعاليات: المفتاح، الاسم، الرمز، أسماء الأمر
const GAMES = {
  det: { n: 'المحقق', e: '🕵️', a: ['محقق', 'المحقق'] },
  anime: { n: 'صور الأنمي', e: '🖼️', a: ['انمي', 'صور', 'الانمي'] },
  quiz: { n: 'مسابقة الأسئلة', e: '❓', a: ['مسابقه', 'اسئله', 'المسابقه'] },
  culture: { n: 'الثقافة العامة', e: '📚', a: ['ثقافه', 'الثقافه', 'ثقافه_عامه'] },
  guess: { n: 'تخمين الأرقام', e: '🔢', a: ['تخمين', 'ارقام', 'الارقام'] },
  math: { n: 'الحساب الذهني', e: '🧮', a: ['حساب', 'الحساب', 'حساب_ذهني'] },
  scr: { n: 'الكلمات المتقطعة', e: '🧩', a: ['كلمات', 'متقطعه', 'الكلمات'] },
  typo: { n: 'حدد الأخطاء', e: '📝', a: ['اخطاء', 'الاخطاء', 'املاء'] },
  wyr: { n: 'لو خيروك', e: '🤔', a: ['خيروك', 'لو_خيروك'] },
  kid: { n: 'الإنقاذ (خطف)', e: '⛓️', a: ['خطف'] },
};
const MENU_ITEMS = [
  ['🕵️', 'المحقق', 'محقق'], ['🖼️', 'صور الأنمي', 'انمي'], ['❓', 'مسابقة الأسئلة', 'مسابقه'], ['📚', 'الثقافة العامة', 'ثقافه'],
  ['🔢', 'تخمين الأرقام', 'تخمين'], ['🧮', 'الحساب الذهني', 'حساب'], ['🧩', 'الكلمات المتقطعة', 'كلمات'], ['📝', 'حدد الأخطاء', 'اخطاء'],
  ['🤔', 'لو خيروك', 'خيروك'], ['🪪', 'بطاقتي', 'بطاقتي'], ['🏅', 'ميدالياتي', 'ميدالياتي'], ['💰', 'رصيدي', 'رصيدي'],
  ['🏦', 'البنك (الأغنياء)', 'البنك'], ['🛒', 'المتجر', 'المتجر'], ['🏆', 'المتصدرون', 'المتصدرون'], ['📊', 'إحصائيات النشاط', 'احصائيات'],
  ['📜', 'القوانين', 'القوانين'], ['👑', 'الألقاب', 'القاب'], ['🎮', 'حالة الفعاليات', 'فعاليات'], ['📖', 'شرح البوت', 'شرح'], ['⛔', 'إيقاف اللعبة', 'ايقاف'],
];
const MENU = `╭━━━ 🤖 *قائمة الأوامر* ━━━╮\n\n${MENU_ITEMS.map((x, i) => `${x[0]} ${i + 1} ⇦ ${x[1]}`).join('\n')}\n\n╰━━━━━━━━━━━━━━━━━━╯\n↩️ *رد على هذه الرسالة برقم اختيارك*\n\n⛓️ للخطف: .خطف @الشخص\n🛡️ للمشرفين: .طرد | .حظر | .انذار | .حماية\n📖 لشرح كل شيء بالتفصيل: .شرح`;

// ---------- المتجر ----------
const SHOP = [
  { t: 'title', e: '🌙', n: 'قمر علوي', p: 9000 }, { t: 'title', e: '🏹', n: 'صياد', p: 2500 }, { t: 'title', e: '🎯', n: 'قناص', p: 3500 },
  { t: 'title', e: '🗡️', n: 'صائد الشياطين', p: 5000 }, { t: 'title', e: '🥷', n: 'نينجا الظل', p: 4500 }, { t: 'title', e: '👁️', n: 'عين الشارينغان', p: 7000 },
  { t: 'title', e: '🔥', n: 'هاشيرا', p: 6000 }, { t: 'title', e: '🐉', n: 'صائد التنانين', p: 6500 }, { t: 'title', e: '🌸', n: 'فارس الساكورا', p: 4000 },
  { t: 'title', e: '👑', n: 'إمبراطور', p: 15000 },
  { t: 'cap', e: '🏦', n: 'مساحة إضافية +10,000', p: 4000, v: 10000 }, { t: 'cap', e: '🏦', n: 'مساحة إضافية +40,000', p: 14000, v: 40000 },
  { t: 'cap', e: '🏦', n: 'مساحة إضافية +150,000', p: 45000, v: 150000 },
];
const SHOP_NAMES = SHOP.filter(x => x.t === 'title').map(x => normTitle(x.n));
function shopText() {
  let o = '🛒 *المتجر*\n\n👑 *الألقاب* (يظهر لقبك للجميع):\n';
  SHOP.forEach((x, i) => { if (x.t === 'title') o += `${i + 1}) ${x.e} ${x.n} ⇦ ${money(x.p)}\n`; });
  o += '\n🏦 *مساحة البنك* (الحد الأساسي ' + money(BASE_CAP) + '):\n';
  SHOP.forEach((x, i) => { if (x.t === 'cap') o += `${i + 1}) ${x.n} ⇦ ${money(x.p)}\n`; });
  return o + '\n🛍️ للشراء اكتب: *.شراء رقم*\nمثال: .شراء 2';
}

// ---------- الحماية (لكل نقابة إعداداتها) ----------
const URL_RE = /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me\/|\b[a-z0-9-]{2,}\.(com|net|org|io|me|ly|xyz|ru|info|tk|gg|cc|top|site|online|link)\b)/i;
const PHONE_RE = /(\+?\d[\s\-.]?){9,}/;
const BAD_FILE = /\.(apk|exe|bat|cmd|scr|vbs|jar|msi|lnk|ps1|dex|apks|xapk)$/i;
const INVIS_RE = /[​-‏‪-‮⁠-⁯﻿̀-ͯؐ-ًؚ-ٟ]/g;

async function protect(c, text, content) {
  const g = gd(c.chat);
  if (!c.isGroup || c.senderAdmin || g.prot === false || !c.botAdmin) return false;
  let reason = null, pts = 1, kickNow = false;
  const invis = (text.match(INVIS_RE) || []).length;
  if (text.length > 6000 || invis > 400) { reason = 'رسالة تخريبية (كراش) 🚨'; kickNow = true; }
  else if (content.documentMessage?.fileName && BAD_FILE.test(content.documentMessage.fileName)) { reason = 'ملف مشبوه قد يحوي برامج خبيثة'; pts = 2; }
  else if (content.contactMessage || content.contactsArrayMessage) reason = 'ممنوع نشر جهات الاتصال (حماية أرقام الأعضاء)';
  else if (PHONE_RE.test(text)) reason = 'ممنوع نشر أرقام الهواتف (حماية خصوصية الأعضاء)';
  else if (URL_RE.test(text)) reason = 'ممنوع نشر الروابط';
  else {
    const k = c.chat + c.sender, now = Date.now();
    const a = (flood.get(k) || []).filter(t => now - t < 8000); a.push(now); flood.set(k, a);
    if (a.length >= 8) { reason = 'سبام (رسائل متتالية)'; flood.set(k, []); }
  }
  if (!reason) return false;
  try { await sock.sendMessage(c.chat, { delete: c.m.key }); } catch (e) { console.log('delete:', e.message); }
  seen[num(c.sender)] = c.sender;
  if (kickNow) {
    await kick(c.chat, [c.sender]);
    await send(c.chat, `🚨 تم طرد @${num(c.sender)} — ${reason}`);
    return true;
  }
  const w = addWarn(c.chat, c.sender, pts);
  if (w >= MAXW) {
    delete g.warns[num(c.sender)]; save();
    await kick(c.chat, [c.sender]);
    await send(c.chat, violForm(c.chat, c.sender, reason, MAXW, true));
  } else await send(c.chat, violForm(c.chat, c.sender, reason, w, false));
  return true;
}
function scanNumber(idl, pn, chat) {
  const g = gd(chat), nums = idl.map(num);
  if (nums.some(x => FOUNDERS.includes(x))) return null;
  if (g.bans.some(b => nums.includes(b))) return 'رقم محظور';
  if (pn) {
    const d = num(pn);
    if (d.length < 8 || d.length > 15) return 'طول الرقم غير طبيعي';
    if (/^(\d)\1{7,}/.test(d) || /^0/.test(d)) return 'نمط رقم مشبوه';
    if (g.blockCC.some(cc => d.startsWith(cc))) return 'مفتاح دولة ممنوع';
  }
  return null;
}

// ---------- حماية المؤسسين: لا يُطردون ولا يُنزَّلون من الإشراف ----------
async function guardFounders(id, parts, action, author) {
  if (!['remove', 'demote'].includes(action) || !author) return;
  let md = null; try { mdCache.delete(id); md = await meta(id); } catch {}
  const bot = me(), an = num(author);
  const authorIsOk = bot.includes(an) || FOUNDERS.includes(an) || FOUNDERS.includes(phoneOf(md, author));
  for (const p of parts) {
    const o = typeof p === 'string' ? { id: p } : p;
    const idl = [o.id, o.lid, o.phoneNumber].filter(Boolean);
    if (!idl.some(x => FOUNDERS.includes(num(x)))) continue;
    if (authorIsOk || idl.some(x => num(x) === an)) continue;   // هو بنفسه أو مؤسس آخر
    const jid = o.id || o.phoneNumber;
    seen[an] = author;
    try {
      await sock.groupParticipantsUpdate(id, [jid], action === 'remove' ? 'add' : 'promote');
      await send(id, `🛡️ @${an} لا يحق لك ${action === 'remove' ? 'طرد' : 'إنزال'} المؤسس! تمت إعادته${action === 'remove' ? '' : ' مشرفاً'}.`);
    } catch (e) { console.log('إعادة المؤسس:', e.message); await send(id, `🛡️ @${an} حاول ${action === 'remove' ? 'طرد' : 'إنزال'} أحد المؤسسين! (تعذّرت إعادته تلقائياً، أضيفوه يدوياً)`); }
    if (isBotAdmin(md)) { try { await sock.groupParticipantsUpdate(id, [author], 'demote'); await send(id, `⛔ تم سحب إشراف @${an} بسبب مخالفته.`); } catch {} }
  }
}

// ---------- الترحيب واللقب ----------
async function welcome(id, jid) {
  seen[num(jid)] = jid;
  const g = gd(id);
  const [top, bot] = pick(FRAMES);
  const caption = `${top}\n\n${g.welcome || WELCOME}\n\n👤 العضو الجديد: @${num(jid)}\n🏛️ النقابة: *${gname(id)}*\n\n${bot}`;
  let ok = false;
  for (const src of [async () => fetchBuf((await (await fetch(`https://api.waifu.pics/sfw/${pick(WCATS)}`, { headers: UA, signal: AbortSignal.timeout(12000) })).json()).url),
                     async () => fetchBuf((await (await fetch('https://nekos.best/api/v2/' + pick(['neko', 'waifu', 'smile', 'happy', 'wave']), { headers: UA, signal: AbortSignal.timeout(12000) })).json()).results[0].url)]) {
    try { await sendImg(id, await src(), caption); ok = true; break; } catch (e) { console.log('صورة الترحيب:', e.message); }
  }
  if (!ok) await send(id, caption);
  await sleep(1500);
  if (g.reception) await send(id, `👋 @${num(jid)} قبل ما تبدأ... اختر لقباً يميّزك بين الأعضاء 👑\n\n✍️ اكتب لقبك الآن (ولو كان طويلاً، بدون روابط أو أرقام هواتف) مثل: ناروتو، قناص الظلام، ساسكي\n🚫 إذا كان اللقب يحمله عضو آخر سأخبرك لتغيّره\n⏭️ اكتب *تخطي* إن لم ترد\n🛒 ويمكنك شراء ألقاب مميزة من .المتجر\n🪪 وبطاقتك الشخصية بـ .بطاقتي`);
}
async function onJoin(id, parts) {
  mdCache.delete(id);
  let md = null; try { md = await meta(id); } catch {}
  const botAdmin = isBotAdmin(md), m = me();
  for (const p of parts) {
    const o = typeof p === 'string' ? { id: p } : p;
    const jid = o.id || o.phoneNumber;
    if (!jid || m.includes(num(jid))) continue;
    const full = md?.participants.find(x => ids(x).includes(jid)) || o;
    const idl = [...new Set([...ids(full), ...ids(o)])];
    idl.forEach(x => { seen[num(x)] = jid; });
    const pn = full.phoneNumber || o.phoneNumber || (jid.endsWith('@s.whatsapp.net') ? jid : null);
    const bad = scanNumber(idl, pn, id);
    if (bad) {
      if (botAdmin && await kick(id, [jid])) await send(id, `🚨 تم طرد رقم مشبوه فور دخوله (${bad}) — حماية النقابة ✅`);
      else console.log('رقم مشبوه لكن البوت ليس مشرفاً:', bad);
      continue;
    }
    if (idl.some(x => FOUNDERS.includes(num(x)))) { await send(id, `🏛️ المؤسس @${num(jid)} انضم إلينا! أهلاً بالقائد 👑✨`); continue; }
    if (gd(id).reception) { const entry = { chat: id, exp: Date.now() + 15 * 60 * 1000, jid }; idl.forEach(x => pend.set(num(x), entry)); }
    await welcome(id, jid);
  }
}
async function titleFlow(c, text) {
  const keys = [num(c.sender), c.phone].filter(Boolean);
  const k = keys.find(x => pend.has(x));
  if (!k) return false;
  const p = pend.get(k), g = gd(c.chat);
  if (p.chat !== c.chat || p.exp < Date.now()) { pend.delete(k); return false; }
  if (!text || text.startsWith('.') || (G[c.chat] && text.length <= 3)) return false;
  const clear = () => { for (const [kk, v] of pend) if (v === p) pend.delete(kk); };
  if (/^(تخطي|لا اريد|skip)$/i.test(norm(text))) { clear(); await send(c.chat, `تمام @${num(c.sender)} 👍 تقدر تشتري لقباً بأي وقت من .المتجر`, c.m); await askReferral(c.chat, c.sender); return true; }
  const t = text.replace(/@\d+/g, '').trim();
  if (t.length < 2 || t.length > 100) { await send(c.chat, `@${num(c.sender)} اللقب لازم يكون بين 2 و 100 حرف 🔁 جرّب مرة ثانية`, c.m); return true; }
  if (PHONE_RE.test(t) || URL_RE.test(t)) { await send(c.chat, `@${num(c.sender)} بدون أرقام هواتف أو روابط من فضلك 🔁`, c.m); return true; }
  if (SHOP_NAMES.includes(normTitle(t))) { await send(c.chat, `@${num(c.sender)} هذا اللقب حصري للمتجر 🛒 اختر لقباً آخر أو اشتره من .المتجر`, c.m); return true; }
  const holder = Object.entries(g.titles).find(([, v]) => normTitle(v) === normTitle(t));
  if (holder) {
    seen[num(holder[0])] = holder[0];
    await send(c.chat, `@${num(c.sender)} اللقب «${t}» يحمله @${num(holder[0])} بالفعل 🙅 غيّر لقبك واختر آخر`, c.m);
    return true;
  }
  g.titles[c.sender] = t; save(); clear();
  await send(c.chat, `✅ تم تثبيت لقبك: 「${t}」\nأهلاً بك @${num(c.sender)} يا ${t} 👑✨ سيظهر لقبك للجميع`, c.m);
  await askReferral(c.chat, c.sender);
  return true;
}

// ---------- المنشن ----------
async function handleMentions(c) {
  const m = me();
  let n = 0;
  for (const j of (c.ctx?.mentionedJid || [])) {
    if (n >= 2) break;
    if (m.includes(num(j)) || j === c.sender) continue;
    const k = c.chat + num(j);
    if (Date.now() - (mcool.get(k) || 0) < 30000) continue;
    mcool.set(k, Date.now()); n++;
    seen[num(j)] = j;
    const founder = isFounderJid(c.md, j);
    const t = founder
      ? `حضرة المؤسس والقائد، وجودك يضفي وزناً وقيمة لكل نقاش، ننتظر بصمتك: @${num(j)} 🌟`
      : `اطلع من التخفي يا زلمة وتعال شاركنا، ما في حدا غريب! @${num(j)} 👀🚀`;
    const r = await send(c.chat, t, c.m);
    if (founder && r?.key?.id) { mentionMsgs.set(r.key.id, j); if (mentionMsgs.size > 200) mentionMsgs.delete(mentionMsgs.keys().next().value); }
    await sleep(800);
  }
}

// ---------- الإحصائيات (كل 8 ساعات) ----------
const REPORT_MS = 8 * 3600 * 1000;
async function statsText(chat, final) {
  const s = gd(chat).stats;
  const md = await meta(chat).catch(() => null);
  const members = md?.participants.length || 0;
  const entries = Object.entries(s.counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const pct = members ? Math.round(entries.length / members * 100) : 0;
  const total = entries.reduce((a, b) => a + b[1], 0);
  entries.forEach(([j]) => { seen[num(j)] = j; });
  const hrs = Math.max(1, Math.round((Date.now() - s.since) / 3600000));
  return `📊 *تقرير نشاط ${gname(chat)}${final ? ' (كل 8 ساعات)' : ''}*\n⏱️ آخر ${hrs} ساعة\n\n👥 الأعضاء: ${members}\n✍️ الكاتبون: ${entries.length}\n📈 نسبة التفاعل: *${pct}%*\n💬 عدد الرسائل: ${total}\n\n🏆 *الأكثر نشاطاً:*\n` +
    entries.slice(0, 7).map(([j, n], i) => `${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'} ${label(chat, j)} ⇦ ${n} رسالة`).join('\n');
}
async function reportAll() {
  for (const chat of Object.keys(db.g)) {
    const g = db.g[chat];
    if (Date.now() - g.stats.since < REPORT_MS) continue;
    try {
      const t = await statsText(chat, true);
      if (t) await send(chat, t);
      g.stats = { since: Date.now(), counts: {} }; save();
    } catch (e) { console.log('تقرير:', e.message); }
  }
}
