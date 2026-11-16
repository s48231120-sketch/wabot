// ============ بوت واتساب (Baileys) — النسخة 3 (نقابات) ============
// التشغيل:  OWNER=21652703823,21621912835 node index.js
(async () => {
const fs = (await import('node:fs')).default;
const path = (await import('node:path')).default;
const { fileURLToPath } = await import('node:url');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const mod = await import('@whiskeysockets/baileys');
const makeWASocket = mod.makeWASocket || mod.default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, jidNormalizedUser, normalizeMessageContent, Browsers } = mod;
process.on('unhandledRejection', e => console.log('⚠️ خطأ غير معالج:', e?.message || e));
process.on('uncaughtException', e => console.log('⚠️ استثناء:', e?.message || e));
const silent = { level: 'silent', child() { return silent; }, trace() {}, debug() {}, info() {}, warn() {}, error() {} };

// ---------- المؤسسون (محميون من الطرد والحظر والتحذير) ----------
const FOUNDERS = [...new Set(['21652703823', '21621912835', ...(process.env.OWNER || process.env.PHONE || '').split(',').map(s => s.trim()).filter(Boolean)])];

// ---------- بيانات دائمة (لكل نقابة سجل مستقل) ----------
const DB = path.join(DATA_DIR, 'data.json');
let db = {};
try { db = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch {}
db.g ||= {};
let saveT = null;
const flush = () => { try { const tmp = DB + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DB); } catch (e) { console.log('save:', e.message); } };
const save = () => { clearTimeout(saveT); saveT = setTimeout(flush, 1500); };

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
  n = n * monthMult(chat, game);
  const got = pay(chat, j, n);
  try { moAdd(chat, j, 'earn', got); moAdd(chat, j, 'wins', 1); } catch {}
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
  else if (content.documentMessage?.fileName && (db.pack?.protect?.badExt || []).some(x => content.documentMessage.fileName.toLowerCase().endsWith('.' + String(x).replace(/^\./, '').toLowerCase()))) { reason = 'ملف مشبوه (امتداد ممنوع)'; pts = 2; }
  else if ((db.pack?.protect?.scam || []).some(x => norm(text).includes(norm(x)))) reason = 'رسالة احتيال/إعلان مشبوه';
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
    if (gd(id).reception) { const entry = { chat: id, exp: Date.now() + 15 * 60 * 1000, jid }; idl.forEach(x => pend.set(id + '|' + num(x), entry)); }
    await welcome(id, jid);
  }
}
async function titleFlow(c, text) {
  const keys = [num(c.sender), c.phone].filter(Boolean);
  const k = keys.map(x => c.chat + '|' + x).find(x => pend.has(x));
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

// ---------- قضايا المحقق ----------
const C = (title, story, sus, ci, extras) => ({ title, story, sus, ci, extras });
const CASES = [
  C('سرقة الماسة الزرقاء',
    'متحف المدينة، الساعة 2 فجراً. اختفت الماسة الزرقاء من خزانة زجاجية مغلقة. الزجاج سليم لم يُكسر، والإنذار لم يعمل.\n\nالمشتبه بهم: الحارس، أمين المتحف، عامل النظافة، الزائر الأجنبي.',
    [['حارس'], ['امين', 'المدير'], ['نظافه', 'عامل'], ['زائر', 'اجنبي']], 0, [
      [[['كسر', 'حطم', 'تكسير']], false], [[['مفتاح']], true], [[['انذار']], false], [[['كاميرا', 'كاميرات']], true],
      [[['ليل', 'فجر', 'ليلا']], true], [[['داخل المتحف', 'داخل']], true], [[['موظف', 'يعمل']], true],
      [[['امراه', 'انثي', 'سيده']], false], [[['مال', 'دين', 'ديون']], true], [[['شخصين', 'شريك', 'اكثر من']], false],
    ]),
  C('تسريب الامتحان',
    'تسربت أسئلة الامتحان النهائي قبل موعده بيوم. كانت الورقة في خزانة مغلقة بمكتب المدير ولم تُكسر الخزانة.\n\nالمشتبه بهم: المعلم، السكرتير، الطالب المتفوق، عامل المقصف.',
    [['معلم', 'مدرس'], ['سكرتير'], ['طالب'], ['مقصف', 'عامل']], 1, [
      [[['كسر', 'حطم']], false], [[['مفتاح']], true], [[['صور', 'تصوير', 'نسخ']], true], [[['هاتف', 'جوال', 'واتس', 'ارسل']], true],
      [[['ليل', 'ليلا']], false], [[['نهار', 'صباح', 'ظهر']], true], [[['رشو', 'مقابل', 'مال', 'فلوس']], true],
      [[['داخل المدرسه', 'داخل']], true], [[['امراه', 'انثي']], false],
    ]),
  C('لغز صندوق المخبز',
    'اختفى صندوق المال من مخبز الحي صباحاً قبل الفتح. الباب الأمامي لم يُكسر، ولم يرَ أحد شيئاً.\n\nالمشتبه بهم: العامل الجديد، صاحب المخبز، الزبون الدائم، سائق التوصيل.',
    [['عامل'], ['صاحب'], ['زبون'], ['سائق', 'توصيل']], 3, [
      [[['باب'], ['كسر', 'حطم']], false], [[['خلفي']], true], [[['دراجه', 'موتور']], true], [[['صباح']], true],
      [[['يعرف'], ['مكان', 'الصندوق']], true], [[['سلاح', 'سكين', 'بالقوه', 'تهديد']], false], [[['ليل', 'ليلا']], false],
      [[['هرب', 'فر']], true], [[['امراه', 'انثي']], false],
    ]),
  C('اختفاء اللوحة',
    'ليلة افتتاح المعرض اختفت لوحة نادرة، وعُلّقت مكانها نسخة مقلّدة متقنة لم ينتبه لها أحد.\n\nالمشتبه بهم: الرسام، المصور، صاحبة المعرض، خبير الفن.',
    [['رسام'], ['مصور'], ['صاحبه'], ['خبير']], 0, [
      [[['نسخه', 'مقلد', 'مزور', 'تزوير']], true], [[['رسم', 'رسمها', 'يرسم']], true], [[['افتتاح', 'ليل', 'ليلا']], true],
      [[['كسر', 'حطم']], false], [[['انذار']], false], [[['امراه', 'انثي']], false], [[['مال', 'فلوس', 'دين', 'بيع']], true], [[['داخل', 'المعرض']], true],
    ]),
];

// ---------- أسئلة المسابقة (الصغيرة) ----------
const QUIZ = [
  { q: 'ما هي عاصمة اليابان؟', o: ['سيول', 'طوكيو', 'بكين', 'بانكوك'], a: 1 },
  { q: 'كم عدد أيام السنة الميلادية العادية؟', o: ['364', '365', '366', '360'], a: 1 },
  { q: 'ما أكبر كوكب في المجموعة الشمسية؟', o: ['الأرض', 'زحل', 'المشتري', 'المريخ'], a: 2 },
  { q: 'ما هو أسرع حيوان بري؟', o: ['الأسد', 'الفهد', 'النمر', 'الحصان'], a: 1 },
  { q: 'في أي قارة تقع مصر؟', o: ['آسيا', 'أوروبا', 'أفريقيا', 'أمريكا'], a: 2 },
  { q: 'ما ناتج 12 × 12؟', o: ['124', '134', '144', '154'], a: 2 },
  { q: 'ما أكبر محيط في العالم؟', o: ['الأطلسي', 'الهندي', 'المتجمد', 'الهادي'], a: 3 },
  { q: 'كم عدد حروف اللغة العربية؟', o: ['26', '28', '30', '32'], a: 1 },
  { q: 'من هو مؤلف مانغا ون بيس؟', o: ['إيتشيرو أودا', 'ماساشي كيشيموتو', 'أكيرا توريياما', 'ناوكي أوراساوا'], a: 0 },
  { q: 'ما هو الغاز الذي نتنفسه ليبقينا أحياء؟', o: ['النيتروجين', 'الأكسجين', 'الهيدروجين', 'الهيليوم'], a: 1 },
  { q: 'ما عاصمة تونس؟', o: ['صفاقس', 'سوسة', 'تونس', 'بنزرت'], a: 2 },
  { q: 'كم عدد قارات العالم؟', o: ['5', '6', '7', '8'], a: 2 },
  { q: 'في أنمي ناروتو، ما اسم قرية ناروتو؟', o: ['كونوها', 'سونا', 'كيري', 'إيوا'], a: 0 },
  { q: 'ما اسم الفاكهة الشيطانية الشهيرة التي أكلها لوفي؟', o: ['غومو غومو', 'ميرا ميرا', 'هيتو هيتو', 'ماغو ماغو'], a: 0 },
  { q: 'ما هو أصغر كوكب في المجموعة الشمسية؟', o: ['عطارد', 'المريخ', 'الزهرة', 'نبتون'], a: 0 },
  { q: 'كم عدد أضلاع المسدس؟', o: ['5', '6', '7', '8'], a: 1 },
  { q: 'ما هي عاصمة الجزائر؟', o: ['وهران', 'قسنطينة', 'الجزائر', 'عنابة'], a: 2 },
  { q: 'ما اسم عاصمة المغرب؟', o: ['الدار البيضاء', 'الرباط', 'مراكش', 'فاس'], a: 1 },
  { q: 'ما هو العنصر الكيميائي الذي رمزه Au؟', o: ['الفضة', 'الحديد', 'الذهب', 'النحاس'], a: 2 },
];

// ---------- بنك الثقافة العامة (جداول + أسئلة جاهزة، تُولَّد منها آلاف الصيغ) ----------
// [الدولة، العاصمة، القارة (أو null إن كانت تمتد على قارتين)]
const CAPS = [
  ['السعودية', 'الرياض', 'آسيا'], ['مصر', 'القاهرة', 'أفريقيا'], ['الإمارات', 'أبوظبي', 'آسيا'], ['قطر', 'الدوحة', 'آسيا'], ['الكويت', 'مدينة الكويت', 'آسيا'],
  ['البحرين', 'المنامة', 'آسيا'], ['عُمان', 'مسقط', 'آسيا'], ['اليمن', 'صنعاء', 'آسيا'], ['العراق', 'بغداد', 'آسيا'], ['سوريا', 'دمشق', 'آسيا'],
  ['لبنان', 'بيروت', 'آسيا'], ['الأردن', 'عمّان', 'آسيا'], ['السودان', 'الخرطوم', 'أفريقيا'], ['ليبيا', 'طرابلس', 'أفريقيا'], ['تونس', 'تونس', 'أفريقيا'],
  ['الجزائر', 'الجزائر', 'أفريقيا'], ['المغرب', 'الرباط', 'أفريقيا'], ['موريتانيا', 'نواكشوط', 'أفريقيا'], ['الصومال', 'مقديشو', 'أفريقيا'], ['جيبوتي', 'جيبوتي', 'أفريقيا'],
  ['جزر القمر', 'موروني', 'أفريقيا'], ['تركيا', 'أنقرة', null], ['إيران', 'طهران', 'آسيا'], ['أفغانستان', 'كابل', 'آسيا'], ['باكستان', 'إسلام آباد', 'آسيا'],
  ['الهند', 'نيودلهي', 'آسيا'], ['بنغلاديش', 'دكا', 'آسيا'], ['الصين', 'بكين', 'آسيا'], ['اليابان', 'طوكيو', 'آسيا'], ['كوريا الجنوبية', 'سيول', 'آسيا'],
  ['تايلاند', 'بانكوك', 'آسيا'], ['فيتنام', 'هانوي', 'آسيا'], ['إندونيسيا', 'جاكرتا', 'آسيا'], ['ماليزيا', 'كوالالمبور', 'آسيا'], ['الفلبين', 'مانيلا', 'آسيا'],
  ['أستراليا', 'كانبرا', 'أستراليا'], ['نيوزيلندا', 'ويلنغتون', 'أستراليا'], ['روسيا', 'موسكو', null], ['أوكرانيا', 'كييف', 'أوروبا'], ['بولندا', 'وارسو', 'أوروبا'],
  ['ألمانيا', 'برلين', 'أوروبا'], ['فرنسا', 'باريس', 'أوروبا'], ['إيطاليا', 'روما', 'أوروبا'], ['إسبانيا', 'مدريد', 'أوروبا'], ['البرتغال', 'لشبونة', 'أوروبا'],
  ['بريطانيا', 'لندن', 'أوروبا'], ['أيرلندا', 'دبلن', 'أوروبا'], ['هولندا', 'أمستردام', 'أوروبا'], ['بلجيكا', 'بروكسل', 'أوروبا'], ['سويسرا', 'برن', 'أوروبا'],
  ['النمسا', 'فيينا', 'أوروبا'], ['السويد', 'ستوكهولم', 'أوروبا'], ['النرويج', 'أوسلو', 'أوروبا'], ['الدنمارك', 'كوبنهاغن', 'أوروبا'], ['فنلندا', 'هلسنكي', 'أوروبا'],
  ['اليونان', 'أثينا', 'أوروبا'], ['رومانيا', 'بوخارست', 'أوروبا'], ['المجر', 'بودابست', 'أوروبا'], ['التشيك', 'براغ', 'أوروبا'], ['كندا', 'أوتاوا', 'أمريكا الشمالية'],
  ['الولايات المتحدة', 'واشنطن', 'أمريكا الشمالية'], ['المكسيك', 'مكسيكو سيتي', 'أمريكا الشمالية'], ['كوبا', 'هافانا', 'أمريكا الشمالية'], ['البرازيل', 'برازيليا', 'أمريكا الجنوبية'],
  ['الأرجنتين', 'بوينس آيرس', 'أمريكا الجنوبية'], ['تشيلي', 'سانتياغو', 'أمريكا الجنوبية'], ['كولومبيا', 'بوغوتا', 'أمريكا الجنوبية'], ['بيرو', 'ليما', 'أمريكا الجنوبية'],
  ['فنزويلا', 'كاراكاس', 'أمريكا الجنوبية'], ['نيجيريا', 'أبوجا', 'أفريقيا'], ['كينيا', 'نيروبي', 'أفريقيا'], ['إثيوبيا', 'أديس أبابا', 'أفريقيا'], ['غانا', 'أكرا', 'أفريقيا'],
  ['السنغال', 'داكار', 'أفريقيا'], ['مالي', 'باماكو', 'أفريقيا'], ['تنزانيا', 'دودوما', 'أفريقيا'], ['أوغندا', 'كمبالا', 'أفريقيا'], ['كازاخستان', 'أستانا', null],
  ['أذربيجان', 'باكو', null], ['نيبال', 'كاتماندو', 'آسيا'],
];
const CONTS = ['آسيا', 'أفريقيا', 'أوروبا', 'أمريكا الشمالية', 'أمريكا الجنوبية', 'أستراليا'];
const CUR = [
  ['السعودية', 'ريال'], ['الإمارات', 'درهم'], ['مصر', 'جنيه'], ['الكويت', 'دينار'], ['اليابان', 'ين'], ['بريطانيا', 'جنيه إسترليني'], ['الهند', 'روبية'], ['الصين', 'يوان'],
  ['روسيا', 'روبل'], ['تركيا', 'ليرة'], ['سويسرا', 'فرنك'], ['كوريا الجنوبية', 'وون'], ['المكسيك', 'بيزو'], ['جنوب أفريقيا', 'راند'], ['المغرب', 'درهم'], ['تونس', 'دينار'],
  ['الجزائر', 'دينار'], ['الأردن', 'دينار'], ['العراق', 'دينار'], ['لبنان', 'ليرة'], ['السويد', 'كرونة'], ['النرويج', 'كرونة'], ['بولندا', 'زلوتي'], ['أستراليا', 'دولار'],
  ['كندا', 'دولار'], ['الولايات المتحدة', 'دولار'], ['ألمانيا', 'يورو'], ['فرنسا', 'يورو'], ['إيطاليا', 'يورو'], ['إسبانيا', 'يورو'], ['قطر', 'ريال'], ['البحرين', 'دينار'],
  ['عُمان', 'ريال'], ['إيران', 'ريال'], ['تايلاند', 'بات'], ['إندونيسيا', 'روبية'], ['نيجيريا', 'نيرا'], ['البرازيل', 'ريال'],
];
const CURPOOL = [...new Set(CUR.map(x => x[1]))];
const ELEM = [['H', 'الهيدروجين'], ['He', 'الهيليوم'], ['Li', 'الليثيوم'], ['C', 'الكربون'], ['N', 'النيتروجين'], ['O', 'الأكسجين'], ['F', 'الفلور'], ['Ne', 'النيون'], ['Na', 'الصوديوم'],
  ['Mg', 'المغنيسيوم'], ['Al', 'الألمنيوم'], ['Si', 'السيليكون'], ['P', 'الفوسفور'], ['S', 'الكبريت'], ['Cl', 'الكلور'], ['K', 'البوتاسيوم'], ['Ca', 'الكالسيوم'], ['Fe', 'الحديد'],
  ['Cu', 'النحاس'], ['Zn', 'الزنك'], ['Ag', 'الفضة'], ['Sn', 'القصدير'], ['Au', 'الذهب'], ['Hg', 'الزئبق'], ['Pb', 'الرصاص'], ['U', 'اليورانيوم'], ['I', 'اليود'], ['Ni', 'النيكل'], ['Pt', 'البلاتين']];
// [السؤال، الصحيح، خطأ1، خطأ2، خطأ3]
const FACTS = [
  ['ما أقرب كوكب إلى الشمس؟', 'عطارد', 'الزهرة', 'المريخ', 'الأرض'],
  ['ما الكوكب المعروف بالكوكب الأحمر؟', 'المريخ', 'المشتري', 'زحل', 'عطارد'],
  ['كم عدد كواكب المجموعة الشمسية؟', '8', '7', '9', '10'],
  ['ما أعلى قمة جبلية في العالم؟', 'جبل إيفرست', 'كي 2', 'مونت بلان', 'كليمنجارو'],
  ['ما أكبر قارة في العالم مساحة؟', 'آسيا', 'أفريقيا', 'أوروبا', 'أمريكا الشمالية'],
  ['ما أكبر حيوان على وجه الأرض؟', 'الحوت الأزرق', 'الفيل الأفريقي', 'القرش الحوتي', 'الزرافة'],
  ['ما أطول حيوان في العالم؟', 'الزرافة', 'الفيل', 'النعامة', 'الجمل'],
  ['ما أكبر الطيور حجماً؟', 'النعامة', 'النسر', 'البطريق', 'الإوز'],
  ['ما الحيوان الثديي الوحيد القادر على الطيران؟', 'الخفاش', 'السنجاب الطائر', 'الببغاء', 'البومة'],
  ['كم عدد أسنان الإنسان البالغ؟', '32', '28', '30', '36'],
  ['كم عدد عظام جسم الإنسان البالغ تقريباً؟', '206', '150', '300', '106'],
  ['ما أكبر عضو في جسم الإنسان؟', 'الجلد', 'الكبد', 'الرئة', 'القلب'],
  ['كم عدد حواس الإنسان الأساسية؟', '5', '4', '6', '7'],
  ['ما الغاز الذي تحتاجه النباتات في عملية البناء الضوئي؟', 'ثاني أكسيد الكربون', 'الأكسجين', 'النيتروجين', 'الهيدروجين'],
  ['ما المعدن الوحيد السائل في درجة حرارة الغرفة؟', 'الزئبق', 'الحديد', 'الذهب', 'الألمنيوم'],
  ['ما أصلب مادة طبيعية معروفة؟', 'الألماس', 'الذهب', 'الحديد', 'الجرانيت'],
  ['ما الصيغة الكيميائية للماء؟', 'H2O', 'CO2', 'O2', 'NaCl'],
  ['عند أي درجة مئوية يغلي الماء عند مستوى سطح البحر؟', '100', '90', '80', '120'],
  ['ما اللون الناتج عن مزج الأزرق والأصفر؟', 'الأخضر', 'البرتقالي', 'البنفسجي', 'البني'],
  ['ما اللون الناتج عن مزج الأحمر والأصفر؟', 'البرتقالي', 'الأخضر', 'الوردي', 'الأزرق'],
  ['كم عدد ألوان قوس قزح؟', '7', '5', '6', '8'],
  ['كم مجموع زوايا المثلث؟', '180 درجة', '90 درجة', '360 درجة', '270 درجة'],
  ['ما الجذر التربيعي للعدد 144؟', '12', '14', '11', '13'],
  ['كم ناتج 7 × 8؟', '56', '54', '48', '63'],
  ['كم عدد ساعات اليوم؟', '24', '12', '48', '20'],
  ['ما الكوكب الأشهر بحلقاته الواضحة؟', 'زحل', 'المشتري', 'المريخ', 'عطارد'],
  ['ما اسم المجرة التي تقع فيها الأرض؟', 'درب التبانة', 'أندروميدا', 'المثلث', 'الدوامة'],
  ['من أول إنسان وطئت قدمه سطح القمر؟', 'نيل أرمسترونغ', 'يوري غاغارين', 'جون غلين', 'ألان شيبرد'],
  ['من أول إنسان سافر إلى الفضاء؟', 'يوري غاغارين', 'نيل أرمسترونغ', 'جون غلين', 'ألان شيبرد'],
  ['ما الحيوان الذي يُعرف بسفينة الصحراء؟', 'الجمل', 'الحصان', 'الفيل', 'الحمار'],
  ['كم عدد قلوب الأخطبوط؟', '3', '1', '2', '4'],
  ['ما أكبر صحراء حارة في العالم؟', 'الصحراء الكبرى', 'صحراء كالاهاري', 'الربع الخالي', 'صحراء غوبي'],
  ['أي هذه الطيور لا يستطيع الطيران؟', 'البطريق', 'الصقر', 'الحمامة', 'العصفور'],
  ['أي هذه الأعضاء يضخ الدم في الجسم؟', 'القلب', 'الكبد', 'الكلية', 'الرئة'],
  ['ما الفيتامين الذي نحصل عليه من أشعة الشمس؟', 'فيتامين د', 'فيتامين سي', 'فيتامين أ', 'فيتامين ب12'],
  ['في أي مدينة يقع برج إيفل؟', 'باريس', 'لندن', 'روما', 'مدريد'],
  ['في أي دولة تقع أهرامات الجيزة؟', 'مصر', 'السودان', 'الأردن', 'المكسيك'],
  ['في أي دولة توجد مدينة البتراء الأثرية؟', 'الأردن', 'سوريا', 'العراق', 'السعودية'],
  ['في أي مدينة يقع تمثال الحرية؟', 'نيويورك', 'واشنطن', 'لوس أنجلوس', 'شيكاغو'],
  ['في أي دولة يقع برج بيزا المائل؟', 'إيطاليا', 'فرنسا', 'إسبانيا', 'اليونان'],
  ['ما أكبر دولة في العالم مساحة؟', 'روسيا', 'الصين', 'كندا', 'الولايات المتحدة'],
  ['ما أكثر دولة سكاناً في العالم حالياً؟', 'الهند', 'الصين', 'الولايات المتحدة', 'إندونيسيا'],
  ['ما اللغة الرسمية في البرازيل؟', 'البرتغالية', 'الإسبانية', 'الإنجليزية', 'الفرنسية'],
  ['ما أعمق بحيرة في العالم؟', 'بحيرة بايكال', 'بحيرة فيكتوريا', 'بحيرة سوبيريور', 'بحيرة تشاد'],
  ['ما اسم أطول سور في العالم؟', 'سور الصين العظيم', 'سور برلين', 'سور القلعة', 'سور بابل'],
  ['ما القناة التي تربط البحر المتوسط بالبحر الأحمر؟', 'قناة السويس', 'قناة بنما', 'قناة كيل', 'قناة بنغال'],
  ['من فاز بكأس العالم لكرة القدم 2022؟', 'الأرجنتين', 'فرنسا', 'البرازيل', 'كرواتيا'],
  ['من فاز بكأس العالم لكرة القدم 2018؟', 'فرنسا', 'كرواتيا', 'بلجيكا', 'البرازيل'],
  ['أي دولة استضافت أول كأس عالم عام 1930؟', 'الأوروغواي', 'البرازيل', 'إيطاليا', 'فرنسا'],
  ['كم عدد الحلقات المتشابكة في شعار الأولمبياد؟', '5', '4', '6', '7'],
  ['كم عدد لاعبي فريق كرة السلة داخل الملعب؟', '5', '6', '7', '11'],
  ['في أي رياضة تُستخدم الريشة والمضرب؟', 'الريشة الطائرة', 'كرة الطاولة', 'الإسكواش', 'الغولف'],
  ['في أي رياضة تُستخدم الحلبة والقفازات؟', 'الملاكمة', 'المصارعة', 'الجودو', 'الكاراتيه'],
  ['من هو مؤلف السيرة الذاتية «الأيام»؟', 'طه حسين', 'نجيب محفوظ', 'توفيق الحكيم', 'العقاد'],
  ['من هو مؤلف كتاب «المقدمة» في التاريخ وعلم الاجتماع؟', 'ابن خلدون', 'ابن بطوطة', 'ابن سينا', 'الفارابي'],
  ['من هو الرحالة المغربي صاحب «تحفة النظار»؟', 'ابن بطوطة', 'ابن جبير', 'ابن ماجد', 'ابن فضلان'],
  ['من هو صاحب كتاب «القانون في الطب»؟', 'ابن سينا', 'ابن رشد', 'الرازي', 'ابن النفيس'],
  ['من هو العالم المعروف بمؤسس علم الجبر؟', 'الخوارزمي', 'ابن الهيثم', 'البيروني', 'الكندي'],
  ['من يُلقَّب بـ «أبو البصريات»؟', 'ابن الهيثم', 'جابر بن حيان', 'الخوارزمي', 'البيروني'],
  ['من اكتشف البنسلين؟', 'ألكسندر فليمنغ', 'لويس باستور', 'ماري كوري', 'إدوارد جينر'],
  ['من اشتهر بتطوير المصباح الكهربائي؟', 'توماس إديسون', 'نيكولا تسلا', 'غراهام بل', 'ألبرت أينشتاين'],
  ['من صاحب نظرية النسبية؟', 'ألبرت أينشتاين', 'إسحاق نيوتن', 'غاليليو', 'نيلز بور'],
  ['من صاغ قانون الجذب العام؟', 'إسحاق نيوتن', 'أينشتاين', 'غاليليو', 'كوبرنيكوس'],
  ['من اشتهر باختراع الهاتف؟', 'ألكسندر غراهام بل', 'إديسون', 'ماركوني', 'تسلا'],
  ['من ابتكر الشبكة العنكبوتية العالمية (الويب)؟', 'تيم بيرنرز لي', 'بيل غيتس', 'ستيف جوبز', 'مارك زوكربيرغ'],
  ['من مؤسس شركة مايكروسوفت؟', 'بيل غيتس', 'ستيف جوبز', 'إيلون ماسك', 'مارك زوكربيرغ'],
  ['من صاحب كتاب «أصل الأنواع» ونظرية التطور؟', 'تشارلز داروين', 'غريغور مندل', 'لويس باستور', 'ألفريد والاس'],
  ['من العالمة التي نالت جائزة نوبل مرتين واكتشفت الراديوم؟', 'ماري كوري', 'روزاليند فرانكلين', 'ليز مايتنر', 'إيرين كوري'],
  ['من مؤلف رواية «الشيخ والبحر»؟', 'إرنست همنغواي', 'جورج أورويل', 'تولستوي', 'ماركيز'],
  ['من مؤلف رواية «مزرعة الحيوان»؟', 'جورج أورويل', 'أولدوس هكسلي', 'تشارلز ديكنز', 'همنغواي'],
  ['من مؤلف رواية «البؤساء»؟', 'فيكتور هوغو', 'ألكسندر دوما', 'بلزاك', 'موليير'],
  ['من مؤلف رواية «مئة عام من العزلة»؟', 'غابرييل غارسيا ماركيز', 'ماريو بارغاس يوسا', 'بورخيس', 'إيزابيل الليندي'],
  ['من مؤلف رواية «الأمير الصغير»؟', 'أنطوان دو سانت إكزوبيري', 'فيكتور هوغو', 'جول فيرن', 'ألبير كامو'],
  ['من مؤلفة سلسلة «هاري بوتر»؟', 'ج. ك. رولينغ', 'سوزان كولينز', 'أغاثا كريستي', 'ستيفاني ماير'],
  ['من مؤلف «ثلاثية القاهرة» (بين القصرين)؟', 'نجيب محفوظ', 'طه حسين', 'يوسف إدريس', 'إحسان عبد القدوس'],
  ['من مؤلف رواية «رجال في الشمس»؟', 'غسان كنفاني', 'جبرا إبراهيم جبرا', 'الطيب صالح', 'عبد الرحمن منيف'],
  ['من مؤلف رواية «موسم الهجرة إلى الشمال»؟', 'الطيب صالح', 'نجيب محفوظ', 'غسان كنفاني', 'عبد الرحمن منيف'],
  ['من مؤلف مسرحية «هاملت»؟', 'ويليام شكسبير', 'موليير', 'تشيخوف', 'إبسن'],
  ['من رسم لوحة «الموناليزا»؟', 'ليوناردو دا فينشي', 'مايكل أنجلو', 'بيكاسو', 'فان غوخ'],
  ['من رسم لوحة «ليلة النجوم»؟', 'فنسنت فان غوخ', 'كلود مونيه', 'سلفادور دالي', 'رامبرانت'],
  ['من الملحن العبقري الذي فقد سمعه في آخر حياته؟', 'بيتهوفن', 'موتسارت', 'باخ', 'شوبان'],
  ['ما معنى الاختصار CPU؟', 'وحدة المعالجة المركزية', 'وحدة الذاكرة', 'بطاقة الشاشة', 'لوحة المفاتيح'],
  ['أي لغة برمجة تحمل اسم جزيرة إندونيسية؟', 'جافا', 'بايثون', 'روبي', 'سي'],
  ['أي شركة تطوّر نظام التشغيل أندرويد؟', 'جوجل', 'آبل', 'مايكروسوفت', 'نوكيا'],
  ['كم عدد أشهر السنة؟', '12', '10', '11', '13'],
  ['ما أقصر شهر في السنة الميلادية؟', 'فبراير', 'أبريل', 'يونيو', 'سبتمبر'],
  ['ما اللون الذي يدل على التوقف في إشارة المرور؟', 'الأحمر', 'الأخضر', 'الأصفر', 'الأزرق'],
  ['كم عدد أوجه المكعب؟', '6', '4', '8', '12'],
  ['أي شكل له ثلاثة أضلاع؟', 'المثلث', 'المربع', 'الدائرة', 'المعين'],
  ['ما أكثر لغة يتحدثها الناس كلغة أم؟', 'الصينية (الماندرين)', 'الإنجليزية', 'الإسبانية', 'العربية'],
  ['في أنمي ناروتو، ما اسم الثعلب ذي الذيول التسعة؟', 'كورما', 'شوكاكو', 'ماتاتابي', 'غيوكي'],
  ['في أنمي ون بيس، ما اسم السفينة الأولى لطاقم قبعة القش؟', 'غوينغ ميري', 'ثاوزند صني', 'ريد فورس', 'موبي ديك'],
  ['في أنمي دراغون بول، كم عدد كرات التنين؟', '7', '5', '9', '3'],
  ['في أنمي هجوم العمالقة، ما اسم البطل الرئيسي؟', 'إرين ييغر', 'ليفاي', 'ميكاسا', 'أرمين'],
  ['في أنمي قاتل الشياطين، ما اسم البطل الرئيسي؟', 'تانجيرو كامادو', 'زينيتسو', 'إينوسكي', 'غيو توميوكا'],
  ['في أنمي هانتر × هانتر، ما اسم البطل؟', 'غون فريكس', 'كيلوا', 'كورابيكا', 'ليوريو'],
  ['ما اسم عائلة الأخوين بطلي أنمي فول ميتال ألكيميست؟', 'إلريك', 'أوتشيها', 'ييغر', 'كامادو'],
  ['في أنمي ون بانش مان، ما اسم البطل؟', 'سايتاما', 'جينوس', 'تاتسوماكي', 'موب'],
  ['في أنمي مذكرة الموت، ما اسم الشاب الذي يجد الدفتر؟', 'لايت ياغامي', 'إل', 'ريوك', 'ميسا'],
  ['ما الرياضة التي يدور حولها أنمي سلام دانك؟', 'كرة السلة', 'كرة القدم', 'الكرة الطائرة', 'التنس'],
  ['ما الرياضة التي يدور حولها أنمي هايكيو؟', 'الكرة الطائرة', 'كرة السلة', 'كرة القدم', 'البيسبول'],
  ['في أنمي ناروتو، من هو صديق ناروتو الذي ينتمي لعشيرة أوتشيها؟', 'ساسكي', 'شيكامارو', 'نيجي', 'كيبا'],
  ['ما أشهر بوكيمون أصفر اللون؟', 'بيكاتشو', 'تشارماندر', 'سكويرتل', 'بولباساور'],
  ['في أنمي المحقق كونان، ما الاسم الحقيقي لكونان قبل تحوله؟', 'شينيتشي كودو', 'هيجي هاتوري', 'كايتو كيد', 'ران موري'],
  ['في أنمي ناروتو، ما اسم النينجا الملقب بـ «النينجا المقلد»؟', 'كاكاشي هاتاكي', 'غاي', 'أسوما', 'ميناتو'],
  ['في أنمي دراغون بول، ما اسم البطل الرئيسي؟', 'غوكو', 'فيجيتا', 'غوهان', 'كريلين'],
];
function mkOpts(q, correct, pool) {
  const wrong = shuffle([...new Set(pool)].filter(x => x !== correct)).slice(0, 3);
  const o = shuffle([correct, ...wrong]);
  return { q, o, a: o.indexOf(correct) };
}
const CULT = [];
CAPS.forEach(([cn, cap, cont]) => {
  CULT.push(() => mkOpts(`ما عاصمة ${cn}؟`, cap, CAPS.map(x => x[1])));
  if (cap !== cn) CULT.push(() => mkOpts(`${cap} هي عاصمة أي دولة؟`, cn, CAPS.map(x => x[0])));
  if (cont) CULT.push(() => mkOpts(`في أي قارة تقع ${cn}؟`, cont, CONTS));
});
CUR.forEach(([cn, cu]) => CULT.push(() => mkOpts(`ما العملة الرسمية في ${cn}؟`, cu, CURPOOL)));
ELEM.forEach(([s, n]) => {
  CULT.push(() => mkOpts(`ما الرمز الكيميائي لعنصر ${n}؟`, s, ELEM.map(x => x[0])));
  CULT.push(() => mkOpts(`ما العنصر الذي رمزه ${s}؟`, n, ELEM.map(x => x[1])));
});
FACTS.forEach(([q, a, ...w]) => CULT.push(() => { const o = shuffle([a, ...w]); return { q, o, a: o.indexOf(a) }; }));
QUIZ.forEach(x => CULT.push(() => { const o = shuffle(x.o.map((t, i) => [t, i === x.a])); return { q: x.q, o: o.map(y => y[0]), a: o.findIndex(y => y[1]) }; }));
let cultRecent = [];
function cultureQuestion() {
  if (cultRecent.length >= CULT.length - 1) cultRecent = [];
  let i; do { i = R(0, CULT.length - 1); } while (cultRecent.includes(i));
  cultRecent.push(i);
  return CULT[i]();
}

// ---------- كلمات متقطعة ----------
const WORDS = ['مدرسة', 'سيارة', 'طائرة', 'مكتبة', 'حديقة', 'مستشفى', 'برتقال', 'شجرة', 'كمبيوتر', 'تفاحة', 'صحراء', 'جبل', 'بحيرة', 'نافذة', 'مفتاح', 'ساعة', 'دفتر', 'قلم', 'مطار', 'قطار', 'سفينة', 'عصفور', 'دجاجة', 'أسد', 'فراشة', 'نجمة', 'قمر', 'شمس', 'مطر', 'ثلج', 'رياح', 'سحابة', 'مطبخ', 'غرفة', 'سرير', 'كرسي', 'طاولة', 'هاتف', 'شاشة', 'لوحة', 'موسيقى', 'مغامرة', 'صداقة', 'سعادة', 'شجاعة', 'ذاكرة', 'خريطة', 'كنز', 'قلعة', 'فارس', 'ساموراي', 'نينجا', 'تنين', 'ساحر', 'أنمي', 'مانغا', 'بطولة', 'شوكولاتة', 'بطيخ', 'ياسمين'];
const PROVERBS = ['العلم نور والجهل ظلام', 'من جد وجد ومن زرع حصد', 'الصبر مفتاح الفرج', 'خير الكلام ما قل ودل', 'الصديق وقت الضيق', 'القناعة كنز لا يفنى', 'الجار قبل الدار', 'الحاجة أم الاختراع', 'درهم وقاية خير من قنطار علاج', 'من سار على الدرب وصل', 'الوقت من ذهب', 'اطلبوا العلم من المهد إلى اللحد', 'ما ضاع حق وراءه مطالب', 'العقل السليم في الجسم السليم', 'لا تؤجل عمل اليوم إلى الغد'];

// ---------- لو خيروك ----------
const WYR_PAIRS = [
  ['تعيش للأبد بدون أصدقاء', 'تعيش 60 سنة وحولك كل من تحب'], ['تقدر تطير لكن ببطء شديد', 'تركض أسرع من السيارة لكن لساعة بس باليوم'],
  ['تاكل بيتزا كل يوم بقية حياتك', 'تاكل شاورما كل يوم بقية حياتك'], ['تعرف متى ستموت', 'تعرف كيف ستموت'],
  ['تفقد جوالك للأبد', 'تفقد أحب أصدقائك لمدة سنة'], ['تصير أقوى شخص بالعالم وتكون وحيد', 'تكون عادي وسط عائلة كبيرة تحبك'],
  ['ما تنام أبداً وتشتغل كل الوقت', 'تنام 20 ساعة باليوم وتعيش مرتاح'], ['تسافر للماضي', 'تسافر للمستقبل'],
  ['تتكلم مع الحيوانات', 'تفهم كل لغات البشر'], ['تعيش في أنمي ناروتو', 'تعيش في أنمي ون بيس'], ['تكون هوكاجي', 'تكون ملك القراصنة'],
  ['تمتلك قوة الشارينغان', 'تمتلك قوة الجير الخامس'], ['تصير نينجا خطير بدون فلوس', 'تصير مليونير بدون أي مهارة'],
  ['كل ما تحكي كذبة ينطق أنفك', 'كل ما تحكي الحقيقة تضحك غصب عنك'], ['تسمع أفكار كل الناس طول الوقت', 'تصير غير مرئي لكن ما أحد يسمعك'],
  ['تعيش في الصحراء بقصر فخم', 'تعيش في الثلج بكوخ بسيط'], ['تخسر كل ذكرياتك وتبدأ من جديد', 'تتذكر كل شيء حتى أصغر الأخطاء'],
  ['ما تأكل الحلويات أبداً', 'ما تشرب القهوة والشاي أبداً'],
];
const POS = ['تصير غني جداً', 'تقدر تطير', 'تعيش 200 سنة', 'تتكلم كل لغات العالم', 'تصير مشهور عالمياً', 'تقرأ أفكار الناس', 'تسافر بالزمن', 'ما تحتاج تنام', 'تاكل أي شي بدون ما تسمن', 'تكون أذكى شخص بالعالم', 'تملك جزيرة خاصة', 'تختفي وقت ما تبغى', 'تصير أقوى شخص', 'تحصل على بيت أحلامك', 'تنتقل لأي مكان بلحظة', 'ما تتعب أبداً'];
const NEG = ['بس ما تقدر تشوف أهلك أبداً', 'بس تضحك بدون توقف كل ما أحد حكى معك', 'بس كل الناس تنسى اسمك', 'بس تعيش لحالك بجزيرة', 'بس ما تقدر تاكل الحلويات', 'بس جوالك يضل بـ 1% بطارية', 'بس ما تقدر تستخدم النت', 'بس تتكلم بالشعر فقط', 'بس كل ليلة تحلم بكوابيس مضحكة', 'بس تضل مبلول دايماً', 'بس ما تقدر تكذب أبداً', 'بس تفقد ذاكرتك كل أسبوع', 'بس تمشي للخلف فقط', 'بس ما تلبس إلا ملابس زهرية', 'بس صوتك يصير مثل صوت الكرتون', 'بس تضل جعان طول الوقت'];
const wyrRecent = [];
function wyrQuestion() {
  for (let i = 0; i < 20; i++) {
    let a, b;
    if (Math.random() < 0.35) [a, b] = pick(WYR_PAIRS);
    else { const p = shuffle(POS.map((_, k) => k)).slice(0, 2), n = shuffle(NEG.map((_, k) => k)).slice(0, 2); a = `${POS[p[0]]} ${NEG[n[0]]}`; b = `${POS[p[1]]} ${NEG[n[1]]}`; }
    const key = a + '|' + b;
    if (!wyrRecent.includes(key)) { wyrRecent.push(key); if (wyrRecent.length > 80) wyrRecent.shift(); return [a, b]; }
  }
  return pick(WYR_PAIRS);
}
const LAUGH = ['😂😂😂 هههههه يا ساتر، جواب خطير!', '🤣 مستحيل! ضحكتني بجد', 'هههههه الله يعطيك العافية 😂', '😂 ما توقعت هالمنطق أبداً!', '🤣🤣 فنان والله!'];
const WOW = ['😳 معقول؟! ما توقعت هالجواب', '🤨 همممم... جواب غريب بصراحة', '😮 يا سلام! أول مرة أسمع هيك تفكير', '🧐 والله غريبة... بس مقنعة شوي', '😶 ...ماني عارف أضحك ولا أستغرب'];

// ---------- ألغاز الإنقاذ ----------
const RIDDLES = [
  ['ما الشيء الذي يمشي بلا أرجل ويبكي بلا عيون؟', ['السحاب', 'الغيم', 'سحاب', 'غيم']],
  ['ما الشيء الذي له أسنان ولا يعض؟', ['المشط', 'مشط']],
  ['ما الشيء الذي كلما أخذت منه كبر؟', ['الحفرة', 'حفرة']],
  ['ما الشيء الذي يكتب ولا يقرأ؟', ['القلم', 'قلم']],
  ['ما الشيء الذي يسمع بلا أذن ويتكلم بلا لسان؟', ['الهاتف', 'هاتف', 'التلفون', 'الجوال']],
  ['ما الشيء الذي له عين ولا يرى؟', ['الابره', 'ابره', 'الإبرة']],
  ['ما الشيء الذي كلما زاد نقص؟', ['العمر', 'عمر']],
  ['ما الشيء الذي يوجد في وسط باريس؟', ['حرف الراء', 'الراء', 'راء']],
  ['ما الشيء الذي يطير بلا جناح؟', ['الوقت', 'وقت', 'الزمن']],
  ['ما الشيء الذي تراه في الليل ثلاث مرات وفي النهار مرة واحدة؟', ['حرف اللام', 'اللام', 'لام']],
  ['ما الشيء الذي نملكه لكن غيرنا يستخدمه أكثر منا؟', ['الاسم', 'اسم', 'اسمك']],
  ['ما الشيء الذي يدور حول العالم وهو ثابت في مكانه؟', ['الطابع', 'طابع', 'طابع البريد']],
  ['ما الشيء الذي يكون أسود حين تشتريه وأحمر حين تستخدمه ورمادي حين ترميه؟', ['الفحم', 'فحم']],
  ['ما الشيء الذي إذا لمسته صاح؟', ['الجرس', 'جرس']],
  ['ما هو الحيوان الذي يمشي على أربع صباحاً واثنتين ظهراً وثلاث مساءً؟', ['الانسان', 'انسان', 'الإنسان']],
];

// ---------- حدد الأخطاء: {خطأ|صواب} ----------
const PARAS = [
  'ذهب خالد {الى|إلى} {المدرسه|المدرسة} في الصباح الباكر، وقال لصديقه: {هاذا|هذا} الدرس سهل {لاكن|لكن} الواجب كثير، وسأنهيه {اذا|إذا} عدت إلى البيت {انشاء|إن شاء} الله.',
  'قرأت اليوم كتاباً عن {الضروف|الظروف} الصعبة التي مرّ بها الناس قبل {مئه|مئة} عام، وكان {ذالك|ذلك} الزمان صعباً، فلا {شئ|شيء} يأتي بسهولة {الا|إلا} بالصبر، مثل الأشخاص {اللذين|الذين} كافحوا.',
  'اشترى الأب {خمسه|خمسة} كتب جديدة {لاولاده|لأولاده} في {العطله|العطلة} الصيفية، {وكانو|وكانوا} سعداء جداً، فقد {قراو|قرأوا} {القصه|القصة} كلها في يوم واحد.',
  'يعيش في {غابه|غابة} بعيدة {اسد|أسد} قوي، {ينضر|ينظر} إلى الحيوانات بعينين حادتين، ويخرج في {الضلام|الظلام} ليبحث عن طعامه، ثم {مشي|مشى} نحو النهر {اللذي|الذي} يشرب منه.',
  '{الصداقه|الصداقة} {الحقيقيه|الحقيقية} كنز لا يفنى، ومن {يضلم|يظلم} صديقه فقد {الثقه|الثقة} به، {ولاكن|ولكن} الاعتذار الصادق يعيد المحبة.',
  'سافرت {العائله|العائلة} {الي|إلى} {مدينه|مدينة} ساحلية، وركب أفرادها {الباخره|الباخرة} {لاكن|لكن} الموج كان عالياً، فنزلوا {ورجعو|ورجعوا} سالمين.',
  'قال المعلم لطلابه: {انا|أنا} {احب|أحب} {المطالعه|المطالعة} {لانها|لأنها} تفتح الآفاق، ومن {يقرا|يقرأ} كثيراً يصبح واسع الثقافة.',
  'نزل المطر غزيراً فاخضرت {الارض|الأرض} وتفتحت {الازهار|الأزهار} على {اشجار|أشجار} الحديقة {اللتي|التي} زرعها الجد، وفرح {الفلاحين|الفلاحون} بالموسم.',
  '{الرياضه|الرياضة} {مفيده|مفيدة} للجسم والعقل، ومن يمارسها كل يوم {يحضى|يحظى} بصحة {جيده|جيدة}، {لذالك|لذلك} ننصح الجميع بها.',
  '{اعلن|أعلن} المدير {ان|أن} {الاجازه|الإجازة} ستبدأ {الاسبوع|الأسبوع} القادم، {واتمنى|وأتمنى} لكل {الطلبه|الطلبة} عطلة سعيدة.',
  'ذهبت سارة {الي|إلى} {المكتبه|المكتبة} لتستعير كتاباً عن الكواكب، {واخبرت|وأخبرت} {امينة|أمينة} المكتبة {انها|أنها} سترجعه بعد {اسبوع|أسبوع}.',
  'يعتبر {الانترنت|الإنترنت} {اداه|أداة} {مهمه|مهمة} للتعلم، {لاكن|لكن} {الافراط|الإفراط} في استخدامه يضر {بالصحه|بالصحة}.',
];

// =====================================================================
// الجزء 3: الفعاليات
// =====================================================================
const gate = async (c, key) => {
  if (G[c.chat]) { await send(c.chat, '⚠️ هناك لعبة جارية! اكتب .ايقاف لإنهائها.'); return false; }
  if (gd(c.chat).off.includes(key)) { await send(c.chat, `🚫 فعالية «${GAMES[key].n}» معطّلة في هذه النقابة.`); return false; }
  return true;
};
const targetOf = c => c.ctx?.mentionedJid?.[0] || c.ctx?.participant || null;
const medalLine = t => t.split('\n').filter(x => /حصلت على/.test(x)).join('\n');

// ---------- المحقق ----------
async function startDetective(c) {
  const chat = c.chat, cs = pick(CASES);
  G[chat] = { type: 'det', c: cs, timers: [setTimeout(async () => { await send(chat, `⌛ انتهى الوقت! الجاني هو: *${cs.sus[cs.ci][0]}* 🕵️`); endGame(chat); }, 20 * 60 * 1000)] };
  await send(chat, `🕵️ *ملف القضية: ${cs.title}*\n\n${cs.story}\n\n━━━━━━━━━━\n❓ اكتب نقطة ثم سؤالك، مثال:\n. هل كان في الليل؟\nوسأجيب بـ نعم أو لا.\n\n✅ للإجابة النهائية:\n. الجاني الاسم\n\n🏆 الجائزة: ${money(1000)} + ميدالية`);
}
async function detInput(c, rest) {
  const g = G[c.chat], cs = g.c, n = norm(rest);
  if (/^(الحل|الجاني|اتهم|هو)( |$)/.test(n)) {
    if (cs.sus[cs.ci].some(k => n.includes(norm(k)))) {
      await send(c.chat, `🎉 أحسنت ${label(c.chat, c.sender)}!\nالجاني هو *${cs.sus[cs.ci][0]}* وقد حللت القضية 🕵️\n${award(c.chat, c.sender, 1000, 'det')}`);
      endGame(c.chat);
    } else await send(c.chat, '❌ ليس هو! تابعوا التحقيق...');
    return;
  }
  for (const [groups, ans] of cs.extras) if (groups.every(gr => gr.some(k => n.includes(norm(k))))) return send(c.chat, ans ? '✅ نعم' : '❌ لا');
  for (let i = 0; i < cs.sus.length; i++) if (cs.sus[i].some(k => n.includes(norm(k)))) return send(c.chat, i === cs.ci ? '✅ نعم' : '❌ لا');
  await send(c.chat, '🤷 لا علاقة لذلك بالقضية، جرّب صياغة أخرى.');
}

// ---------- صور الأنمي (AniList ثم Jikan) ----------
const recentChars = [];
async function animeAniList() {
  const q = 'query($p:Int){Page(page:$p,perPage:25){characters(sort:FAVOURITES_DESC){name{full first last alternative} image{large}}}}';
  const r = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...UA }, body: JSON.stringify({ query: q, variables: { p: R(1, 80) } }), signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('AniList HTTP ' + r.status);
  const ch = pick((await r.json()).data.Page.characters.filter(x => x.image?.large && !/default/i.test(x.image.large)));
  const toks = new Set();
  [ch.name.full, ch.name.first, ch.name.last, ...(ch.name.alternative || [])].forEach(s => norm(s || '').split(' ').forEach(w => { if (w.length >= 3 && /^[a-z]+$/.test(w)) toks.add(w); }));
  if (!toks.size) throw new Error('no tokens');
  return { name: ch.name.full, img: ch.image.large, tokens: [...toks] };
}
async function animeJikan() {
  const r = await fetch(`https://api.jikan.moe/v4/top/characters?page=${R(1, 40)}&limit=25`, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error('Jikan HTTP ' + r.status);
  const d = pick((await r.json()).data.filter(x => x.images?.jpg?.image_url && !x.images.jpg.image_url.includes('questionmark')));
  const toks = norm(d.name).split(' ').filter(w => w.length >= 3 && /^[a-z]+$/.test(w));
  if (!toks.length) throw new Error('no tokens');
  return { name: d.name.replace(',', ''), img: d.images.jpg.image_url, tokens: toks };
}
async function pickAnime() {
  for (let round = 0; round < 3; round++) for (const f of [animeAniList, animeJikan]) {
    try {
      const ch = await f();
      if (recentChars.includes(ch.name)) continue;
      ch.buf = await fetchBuf(ch.img);
      recentChars.push(ch.name); if (recentChars.length > 80) recentChars.shift();
      return ch;
    } catch (e) { console.log('مصدر الأنمي فشل:', e.message); }
  }
  return null;
}
async function startAnime(c) {
  const chat = c.chat;
  G[chat] = { type: 'loading' };
  await send(chat, '🔎 أبحث عن شخصية جديدة...');
  const ch = await pickAnime();
  if (!ch) { delete G[chat]; return send(chat, '😕 تعذّر الاتصال بمواقع الصور الآن (تأكد من الإنترنت في الهاتف) وحاول بعد قليل.'); }
  G[chat] = { type: 'anime', ch, timers: [] };
  const caption = `🖼️ *من هذه الشخصية؟*\nاكتب اسمها بالإنجليزية (الاسم الأول أو الأخير يكفي)\n🏆 الجائزة: ${money(500)} + ميدالية\n⏱️ 90 ثانية`;
  try { await sendImg(chat, ch.buf, caption); } catch (e) { console.log('صورة فعالية الأنمي:', e.message); await send(chat, caption); }
  G[chat].timers.push(setTimeout(() => send(chat, `💡 تلميح: الاسم يبدأ بحرف *${ch.name[0].toUpperCase()}* وطوله ${ch.name.length} حرفاً`), 45000));
  G[chat].timers.push(setTimeout(async () => { await send(chat, `⌛ انتهى الوقت! الشخصية هي: *${ch.name}*`); endGame(chat); }, 90000));
}
async function animeInput(c, text) {
  const g = G[c.chat], words = norm(text).split(' ');
  if (g.ch.tokens.some(t => words.includes(t))) {
    await send(c.chat, `🎉 صحيح ${label(c.chat, c.sender)}! إنها *${g.ch.name}*\n${award(c.chat, c.sender, 500, 'anime')}`);
    endGame(c.chat);
  }
}

// ---------- مسابقة الأسئلة والثقافة العامة (تصويت) ----------
async function startQuiz(c, kind) {
  const chat = c.chat, q = kind === 'culture' ? cultureQuestion() : pick(QUIZ);
  const g = G[chat] = { type: 'quiz', kind, q, votes: new Map(), timers: [] };
  await send(chat, `${kind === 'culture' ? '📚 *الثقافة العامة*' : '❓ *مسابقة الأسئلة*'}\n\n${q.q}\n\n1️⃣ ${q.o[0]}\n2️⃣ ${q.o[1]}\n3️⃣ ${q.o[2]}\n4️⃣ ${q.o[3]}\n\n🗳️ صوّتوا بإرسال رقم الخيار (1-4)\n⏱️ لديكم 30 ثانية — الأسرع في الإجابة الصحيحة يربح أكثر!`);
  g.timers.push(setTimeout(async () => {
    const correct = [...g.votes.entries()].filter(([, v]) => v.c === q.a).sort((a, b) => a[1].t - b[1].t);
    const wrong = [...g.votes.entries()].filter(([, v]) => v.c !== q.a);
    const ladder = [500, 400, 300, 200];
    let out = `⏰ *انتهى التصويت!*\n✅ الإجابة الصحيحة: *${q.o[q.a]}*\n\n`;
    if (correct.length) {
      out += '🏆 *الرابحون:*\n';
      correct.forEach(([j], i) => {
        const w = ladder[i] ?? 100, t = award(chat, j, w, kind, i === 0);
        out += `${['🥇', '🥈', '🥉'][i] || '🎖️'} ${label(chat, j)} ⇦ ${money(w)}\n`;
        if (i === 0) out += `   ${medalLine(t)}\n`;
      });
    } else out += '😅 لم يُجب أحد بشكل صحيح!\n';
    if (wrong.length) out += '\n❌ *الخاسرون:*\n' + wrong.map(([j]) => `• ${label(chat, j)}`).join('\n');
    await send(chat, out);
    endGame(chat);
  }, 30000));
}

// ---------- تخمين الأرقام ----------
async function startGuess(c) {
  const chat = c.chat, secret = R(1, 100);
  G[chat] = { type: 'guess', secret, timers: [setTimeout(async () => { await send(chat, `⌛ انتهى الوقت! الرقم كان *${secret}*`); endGame(chat); }, 180000)] };
  await send(chat, `🔢 *تخمين الأرقام*\nاخترت رقماً سرياً بين 1 و 100\nأرسلوا تخميناتكم، وسأرد بـ ⬆️ أو ⬇️\n🏆 الجائزة: ${money(500)} + ميدالية\n⏱️ 3 دقائق`);
}
async function guessInput(c, text) {
  const n = Number(text), g = G[c.chat];
  if (n === g.secret) { await send(c.chat, `🎉 مبروك ${label(c.chat, c.sender)}! الرقم هو *${n}*\n${award(c.chat, c.sender, 500, 'guess')}`); endGame(c.chat); }
  else react(c.chat, c.m, n < g.secret ? '⬆️' : '⬇️');
}

// ---------- لو خيروك ----------
async function startWyr(c) {
  const chat = c.chat, [a, b] = wyrQuestion();
  const g = G[chat] = { type: 'wyr', a, b, picks: new Map(), waiting: new Set(), timers: [] };
  await send(chat, `🤔 *لو خيروك...*\n\n1️⃣ ${a}\n\n2️⃣ ${b}\n\n✍️ اكتب *1* أو *2* لتختار، وسأسألك عن السبب 😏\n⏱️ 4 دقائق`);
  g.timers.push(setTimeout(async () => {
    const n1 = [...g.picks.values()].filter(v => v === 1).length, n2 = [...g.picks.values()].filter(v => v === 2).length;
    await send(chat, `📊 *نتيجة لو خيروك*\n1️⃣ ${n1} صوت\n2️⃣ ${n2} صوت\n\n🔁 لسؤال جديد اكتب *.خيروك*`);
    endGame(chat);
  }, 4 * 60 * 1000));
}
async function wyrInput(c, text) {
  const g = G[c.chat];
  if (/^[12]$/.test(text) && !g.picks.has(c.sender)) {
    const ch = Number(text);
    g.picks.set(c.sender, ch); g.waiting.add(c.sender);
    return send(c.chat, `${label(c.chat, c.sender)} اخترت (${ch === 1 ? g.a : g.b})؟ 🧐\nليش اخترت هيك؟ اشرح لنا السبب! 👇`, c.m);
  }
  if (g.waiting.has(c.sender) && !/^[12]$/.test(text)) {
    g.waiting.delete(c.sender);
    await send(c.chat, text.length > 60 ? '😂 كل هالكلام؟! أنت محامي ولا شو؟' : (Math.random() < 0.5 ? pick(LAUGH) : pick(WOW)), c.m);
  }
}

// ---------- الكلمات المتقطعة ----------
async function startScramble(c) {
  const chat = c.chat;
  let shown, answer, prize, kind;
  if (Math.random() < 0.3) {
    answer = pick(PROVERBS); kind = 'مثل / عبارة'; prize = 600;
    let s; do { s = shuffle(answer.split(' ')); } while (s.join(' ') === answer);
    shown = s.join('  |  ');
  } else {
    answer = pick(WORDS); kind = 'كلمة'; prize = 400;
    let s; do { s = shuffle([...answer]); } while (s.join('') === answer);
    shown = s.join(' - ');
  }
  const g = G[chat] = { type: 'scr', answer: norm(answer).replace(/ /g, ''), raw: answer, prize, timers: [] };
  await send(chat, `🧩 *الكلمات المتقطعة* (${kind})\n\n${shown}\n\nرتّبوا الأجزاء واكتبوا الإجابة الصحيحة!\n🏆 الجائزة: ${money(prize)} + ميدالية\n⏱️ 90 ثانية`);
  g.timers.push(setTimeout(() => send(chat, `💡 تلميح: تبدأ بـ *${answer[0]}* وعدد حروفها ${answer.replace(/ /g, '').length}`), 45000));
  g.timers.push(setTimeout(async () => { await send(chat, `⌛ انتهى الوقت! الإجابة: *${answer}*`); endGame(chat); }, 90000));
}
async function scrInput(c, text) {
  const g = G[c.chat];
  // يقبل الإجابة حتى لو سبقتها كلمة «الإجابة:» أو أحاطت بها كلمات قليلة
  const n = norm(text).replace(/^(الاجابه|اجابه|الجواب|جواب|اجابتي|الحل)\s+/, '').replace(/ /g, '');
  if (n === g.answer || (n.length <= g.answer.length + 12 && n.includes(g.answer))) { await send(c.chat, `🎉 صحيح ${label(c.chat, c.sender)}! الإجابة: *${g.raw}*\n${award(c.chat, c.sender, g.prize, 'scr')}`); endGame(c.chat); }
}

// ---------- الحساب الذهني ----------
function genMath() {
  const lvl = pick([1, 1, 2, 2, 3]);
  let text, val;
  if (lvl === 3) {
    const t = R(0, 2);
    if (t === 0) { const a = R(2, 30), b = R(2, 12), d = R(2, 12); text = `${a} + ${b} × ${d}`; val = a + b * d; }
    else if (t === 1) { const a = R(2, 15), b = R(2, 15), d = R(2, 9); text = `(${a} + ${b}) × ${d}`; val = (a + b) * d; }
    else { const a = R(82, 160), b = R(2, 9), d = R(2, 9); text = `${a} − ${b} × ${d}`; val = a - b * d; }
  } else {
    const op = pick(['+', '−', '×', '÷']), big = lvl === 2;
    if (op === '+') { const a = R(big ? 50 : 5, big ? 400 : 60), b = R(big ? 50 : 5, big ? 400 : 60); text = `${a} + ${b}`; val = a + b; }
    else if (op === '−') { const a = R(big ? 100 : 20, big ? 500 : 90), b = R(5, a - 1); text = `${a} − ${b}`; val = a - b; }
    else if (op === '×') { const a = big ? R(11, 25) : R(2, 12), b = big ? R(3, 9) : R(2, 12); text = `${a} × ${b}`; val = a * b; }
    else { const b = R(2, big ? 15 : 12), q = R(2, big ? 25 : 12); text = `${b * q} ÷ ${b}`; val = q; }
  }
  const wrong = new Set();
  while (wrong.size < 3) { const d = pick([-10, -5, -3, -2, -1, 1, 2, 3, 5, 10, R(-20, 20)]); const w = val + d; if (w !== val && w >= 0) wrong.add(w); }
  const opts = shuffle([val, ...wrong]);
  return { text, val, opts, idx: opts.indexOf(val) };
}
async function startMath(c) {
  const chat = c.chat, q = genMath();
  const g = G[chat] = { type: 'math', q, tried: new Set(), timers: [] };
  await send(chat, `🧮 *الحساب الذهني*\n\nما ناتج:  *${q.text}* ؟\n\n1️⃣ ${q.opts[0]}\n2️⃣ ${q.opts[1]}\n3️⃣ ${q.opts[2]}\n4️⃣ ${q.opts[3]}\n\n✍️ اكتب رقم الخيار (1-4). لكل شخص محاولة واحدة، وأول إجابة صحيحة تربح!\n🏆 الجائزة: ${money(400)} + ميدالية\n⏱️ 40 ثانية`);
  g.timers.push(setTimeout(async () => { await send(chat, `⌛ انتهى الوقت! الناتج الصحيح: *${q.val}* (الخيار ${q.idx + 1})`); endGame(chat); }, 40000));
}
async function mathInput(c, text) {
  const g = G[c.chat];
  if (!/^[1-4]$/.test(text) || g.tried.has(c.sender)) return;
  g.tried.add(c.sender);
  if (Number(text) - 1 === g.q.idx) { await send(c.chat, `✅ ${label(c.chat, c.sender)} أسرع عقل! ${g.q.text} = *${g.q.val}*\n${award(c.chat, c.sender, 400, 'math')}`, c.m); endGame(c.chat); }
  else react(c.chat, c.m, '❌');
}

// ---------- حدد الأخطاء ----------
const cleanTok = s => s.replace(/[ً-ْـ]/g, '').replace(/[،,.!؟?:;()"'«»\-–—]/g, '');
const typoRecent = [];
function parsePara(p) {
  const errors = [];
  const shown = p.replace(/\{([^|}]+)\|([^}]+)\}/g, (_, w, r) => { errors.push({ wrong: cleanTok(w), right: r, raw: w }); return w; });
  return { shown, errors };
}
async function startTypo(c) {
  const chat = c.chat;
  let i; do { i = R(0, PARAS.length - 1); } while (typoRecent.includes(i) && typoRecent.length < PARAS.length);
  typoRecent.push(i); if (typoRecent.length >= PARAS.length) typoRecent.length = 0;
  const { shown, errors } = parsePara(PARAS[i]);
  const g = G[chat] = { type: 'typo', errors, last: new Map(), timers: [] };
  await send(chat, `📝 *حدد الأخطاء الإملائية*\n\n«${shown}»\n\n🔎 في هذه الفقرة *${errors.length} أخطاء* إملائية.\n✍️ اكتبوا الكلمات الخاطئة كلها في *رسالة واحدة* (الكلمات الخاطئة فقط بدون تصحيح).\n🏆 أول من يكتبها كلها يربح ${money(700)} + ميدالية\n⏱️ دقيقتان`);
  g.timers.push(setTimeout(() => send(chat, `💡 تلميح: أحد الأخطاء هو كلمة تبدأ بـ «${errors[0].raw.slice(0, 2)}»`), 60000));
  g.timers.push(setTimeout(async () => { await send(chat, `⌛ انتهى الوقت! الأخطاء كانت:\n` + errors.map(e => `❌ ${e.raw} ← ✅ ${e.right}`).join('\n')); endGame(chat); }, 120000));
}
async function typoInput(c, text) {
  const g = G[c.chat], toks = text.split(/\s+/).map(cleanTok).filter(Boolean);
  if (!toks.length || toks.length > g.errors.length * 2 + 2) {
    if (toks.length > g.errors.length * 2 + 2 && Date.now() - (g.last.get(c.sender) || 0) > 15000) { g.last.set(c.sender, Date.now()); await send(c.chat, 'اكتبوا الكلمات الخاطئة فقط، لا الفقرة كاملة 🙂', c.m); }
    return;
  }
  const set = new Set(toks), found = g.errors.filter(e => set.has(e.wrong)).length;
  if (found === g.errors.length) {
    await send(c.chat, `🎉 ${label(c.chat, c.sender)} وجد كل الأخطاء!\n` + g.errors.map(e => `❌ ${e.raw} ← ✅ ${e.right}`).join('\n') + `\n${award(c.chat, c.sender, 700, 'typo')}`, c.m);
    endGame(c.chat);
  } else if (found > 0 && Date.now() - (g.last.get(c.sender) || 0) > 6000) {
    g.last.set(c.sender, Date.now());
    await send(c.chat, `🔎 ${label(c.chat, c.sender)} وجدت ${found} من ${g.errors.length} — تابع!`, c.m);
  }
}

// ---------- الإنقاذ (خطف) ----------
const kidCool = new Map(), kidProt = new Map();
const matchAns = (text, ans) => { const n = ' ' + norm(text) + ' '; return ans.some(a => n.includes(' ' + norm(a) + ' ')); };
function kidPuzzles() {
  const out = [];
  shuffle(RIDDLES).slice(0, 2).forEach(([q, a]) => out.push({ q: `🧩 لغز: ${q}`, ans: a, hint: a[0] }));
  const m = genMath(); out.push({ q: `🧮 احسبوا: *${m.text}*`, ans: [String(m.val)], hint: '' });
  for (let i = 0; i < 2; i++) { const q = cultureQuestion(); out.push({ q: `📚 ${q.q}\nالخيارات: ${q.o.join(' | ')}`, ans: [q.o[q.a]], hint: q.o[q.a][0] }); }
  return shuffle(out);
}
// صورة استمارة الخطف: ملف kidnap.jpg (أو png/webp) في مجلد البوت، وإن لم يوجد تُجلب صورة حزينة من الإنترنت
function localKidImage() {
  for (const f of ['kidnap.jpg', 'kidnap.jpeg', 'kidnap.png', 'kidnap.webp']) { try { return fs.readFileSync(path.join(__dirname, f)); } catch {} try { return fs.readFileSync(path.join(DATA_DIR, f)); } catch {} }
  try { return packImage('kidnap'); } catch {}
  return null;
}
async function kidImage(chat, caption) {
  const loc = localKidImage();
  if (loc) { try { await sendImg(chat, loc, caption); return; } catch (e) { console.log('صورة الخطف المحلية:', e.message); } }
  for (const src of [async () => fetchBuf((await (await fetch('https://api.waifu.pics/sfw/cry', { headers: UA, signal: AbortSignal.timeout(12000) })).json()).url),
                     async () => fetchBuf((await (await fetch('https://nekos.best/api/v2/cry', { headers: UA, signal: AbortSignal.timeout(12000) })).json()).results[0].url)]) {
    try { await sendImg(chat, await src(), caption); return; } catch (e) { console.log('صورة الخطف:', e.message); }
  }
  await send(chat, caption);
}
async function startKidnap(c) {
  const chat = c.chat, md = c.md;
  if (!c.isGroup) return send(chat, 'هذه الفعالية للمجموعات فقط.');
  const t = targetOf(c);
  if (!t) return send(chat, '⛓️ الاستخدام: *.خطف @الشخص*\n(منشن للعضو أو رد على رسالته)');
  seen[num(t)] = t;
  if (me().includes(num(t)) || t === c.sender) return send(chat, 'لا يمكنك خطف نفسك ولا البوت 😅');
  if (isFounderJid(md, t) || isAdminJid(md, t)) return send(chat, '🛡️ لا يمكن خطف المشرفين والمؤسسين!');
  if (Date.now() - (kidCool.get(chat + '|' + c.sender) || 0) < 3 * 60 * 1000) return send(chat, '⏳ انتظر قليلاً قبل خطف شخص جديد.');
  if (Date.now() - (kidProt.get(chat + num(t)) || 0) < 20 * 60 * 1000) return send(chat, '🛡️ هذا العضو أُنقذ للتو وتحميه الحراسة لبعض الوقت.');
  kidCool.set(chat + '|' + c.sender, Date.now());
  const capNums = new Set([num(t), phoneOf(md, t)].filter(Boolean));
  md?.participants.filter(p => ids(p).includes(t)).forEach(p => ids(p).forEach(x => capNums.add(num(x))));
  const puzzles = kidPuzzles();
  const g = G[chat] = { type: 'kid', captive: t, capNums, stage: 0, puzzles, timers: [], lastMute: 0 };
  await kidImage(chat,
    `🚨⛓️ *تم خطف @${num(t)} !* ⛓️🚨\n\nاختطفتها عصابة «الظلال السوداء» وحبستها في قلعة مهجورة خلف الجبال المظلمة 🏰🌑\n${puzzles.length} سلاسل سحرية تقيّدها، ولا تنفكّ سلسلة إلا بحلّ لغز أو الإجابة عن سؤال!\n\n🔒 *شروط الأسر:* لا تستطيع الكلام حتى تُنقذ، وأي رسالة منها ستُمسح\n🗝️ من يفك سلسلة يربح ${money(300)}\n🏆 من يفك السلسلة الأخيرة (المنقذ) يربح ${money(1000)} + ميدالية\n⏱️ مهلتكم 10 دقائق قبل أن تنقلها العصابة بعيداً!\n${c.botAdmin ? '' : '\n⚠️ (البوت ليس مشرفاً، فلن أستطيع مسح كلامها)\n'}\n🫵 أنقذوها يا أبطال!`);
  g.timers.push(setTimeout(() => finishKid(chat, false), 10 * 60 * 1000));
  await sleep(1500);
  await kidStage(chat);
}
async function kidStage(chat) {
  const g = G[chat]; if (!g || g.type !== 'kid') return;
  g.timers.filter(x => x.stageTimer).forEach(clearTimeout);
  const p = g.puzzles[g.stage];
  await send(chat, `⛓️ *السلسلة ${g.stage + 1}/${g.puzzles.length}*\n${p.q}\n\n✍️ اكتبوا الإجابة`);
  const h = setTimeout(() => { if (G[chat] === g && g.stage < g.puzzles.length && p.hint) send(chat, `💡 تلميح للسلسلة ${g.stage + 1}: تبدأ بـ «${p.hint}»`); }, 60000);
  h.stageTimer = true; g.timers.push(h);
}
async function finishKid(chat, rescued, by) {
  const g = G[chat]; if (!g || g.type !== 'kid') return;
  const t = g.captive; kidProt.set(chat + num(t), Date.now());
  endGame(chat);
  if (!rescued) await send(chat, `⌛ انتهى الوقت! أطلقت العصابة سراح @${num(t)} بعد أن ملّت منكم 😅\n🔓 عادت قادرة على الكلام بشكل طبيعي.`);
  else await send(chat, `🔓🎉 *تحرّرت @${num(t)} وعادت قادرة على الكلام!* شكراً للأبطال الذين أنقذوها 👏`);
}
async function kidInput(c, text) {
  const g = G[c.chat], p = g.puzzles[g.stage];
  if (!matchAns(text, p.ans)) return;
  const last = g.stage === g.puzzles.length - 1;
  react(c.chat, c.m, '🗝️');
  if (!last) {
    const t = award(c.chat, c.sender, 300, 'kid', false);
    await send(c.chat, `🗝️ ${label(c.chat, c.sender)} فكّ السلسلة ${g.stage + 1}!\n${t.split('\n')[0]}`, c.m);
    g.stage++; await kidStage(c.chat);
  } else {
    const t = award(c.chat, c.sender, 1000, 'kid', true);
    await send(c.chat, `🏆 ${label(c.chat, c.sender)} فكّ السلسلة الأخيرة وأنقذ @${num(g.captive)}!\n${t}`, c.m);
    await finishKid(c.chat, true);
  }
}
async function kidMute(c) {
  const g = G[c.chat];
  if (!g || g.type !== 'kid') return false;
  if (!(g.capNums.has(num(c.sender)) || (c.phone && g.capNums.has(c.phone)))) return false;
  if (c.botAdmin) { try { await sock.sendMessage(c.chat, { delete: c.m.key }); } catch (e) { console.log('delete:', e.message); } }
  if (Date.now() - g.lastMute > 15000) { g.lastMute = Date.now(); seen[num(c.sender)] = c.sender; await send(c.chat, `🤐 @${num(c.sender)} انتي مخطوفه التزمي الصمت وانتظري الانقاذ ⛓️`); }
  return true;
}

const STARTERS = {
  det: startDetective, anime: startAnime, quiz: c => startQuiz(c, 'quiz'), culture: c => startQuiz(c, 'culture'),
  guess: startGuess, math: startMath, scr: startScramble, typo: startTypo, wyr: startWyr, kid: startKidnap,
};
const INPUTS = {
  anime: animeInput, guess: (c, t) => /^\d{1,3}$/.test(t) && guessInput(c, t), wyr: wyrInput, scr: scrInput, math: mathInput, typo: typoInput, kid: kidInput,
  quiz: (c, t) => { const g = G[c.chat]; if (/^[1-4]$/.test(t) && !g.votes.has(c.sender)) { g.votes.set(c.sender, { c: Number(t) - 1, t: Date.now() }); react(c.chat, c.m, '✅'); } },
};

// =====================================================================
// الجزء 3ز: التحديثات الشهرية + أبطال الشهر + حزم المحتوى + قفل المجموعة + أمر .ban
// =====================================================================
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const monthKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const monthName = mk => { const [y, m] = mk.split('-'); return `${MONTHS_AR[Number(m) - 1]} ${y}`; };
const FEATURABLE = ['det', 'anime', 'quiz', 'culture', 'guess', 'math', 'scr', 'typo', 'wyr', 'kid'];
// فعالية الشهر: تتبدل تلقائياً كل شهر وجائزتها ×2
function featuredGame(mk = monthKey()) { let h = 7; for (const ch of mk) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return FEATURABLE[h % FEATURABLE.length]; }
function monthMult(chat, game) { return game && game === featuredGame() ? 2 : 1; }
// سجل الشهر لكل نقابة على حدة (داخل بيانات النقابة نفسها فلا يختلط شيء)
function moOf(chat) {
  const g = gd(chat), mk = monthKey();
  if (!g.mo || g.mo.key !== mk) {
    if (g.mo) { g.moPrev = g.mo; g.moPending = true; }
    g.mo = { key: mk, earn: {}, wins: {}, msgs: {} };
  }
  return g.mo;
}
function moAdd(chat, j, k, n) { const m = moOf(chat); m[k][j] = (m[k][j] || 0) + n; }

const jidOfKey = k => (String(k).includes('@') ? k : k + (String(k).length >= 14 ? '@lid' : '@s.whatsapp.net'));
const topOf = (o, k = 3) => Object.entries(o || {}).filter(([j, v]) => v > 0 && !FOUNDERS.includes(num(j))).sort((a, b) => b[1] - a[1]).slice(0, k);
const MEDALS3 = ['🥇', '🥈', '🥉'];
function champBlock(m) {
  const line = (title, rows, fmt) => rows.length ? `${title}\n` + rows.map(([j, v], i) => { seen[num(j)] = seen[num(j)] || jidOfKey(j); return `${MEDALS3[i]} @${num(j)} — ${fmt(v)}`; }).join('\n') : '';
  return [line('💰 *أغنى الرابحين*', topOf(m.earn), v => money(v)), line('🏆 *الأكثر انتصاراً*', topOf(m.wins), v => v + ' فوز'), line('💬 *الأكثر نشاطاً*', topOf(m.msgs), v => v.toLocaleString('en-US') + ' رسالة')].filter(Boolean).join('\n\n');
}
const GIFTS = [50000, 30000, 20000];
async function monthlyTick() {
  if (!sock?.user) return;
  for (const chat of Object.keys(db.g)) {
    if (!chat.endsWith('@g.us')) continue;
    const g = gd(chat); moOf(chat);
    if (!g.moPending) continue;
    const prev = g.moPrev, has = prev && (topOf(prev.earn).length || topOf(prev.wins).length || topOf(prev.msgs).length);
    if (!has) { g.moPending = false; save(); continue; }
    topOf(prev.earn).forEach(([j], i) => pay(chat, j, GIFTS[i]));
    const fg = featuredGame();
    const t = `🏁 *انتهى شهر ${monthName(prev.key)} — أبطال ${gname(chat)}*\n\n${champBlock(prev)}\n\n🎁 جوائز الأغنياء أُودعت في بنوكهم (${money(GIFTS[0])} / ${money(GIFTS[1])} / ${money(GIFTS[2])})\n\n🆕 *شهر ${monthName(monthKey())} بدأ!*\n⭐ فعالية الشهر: *${GAMES[fg].e} ${GAMES[fg].n}* — جوائزها ×2 طوال الشهر!\nاكتب *.جديد* لمعرفة التحديثات.`;
    const r = await send(chat, t);
    if (r) { g.moPending = false; g.moPrev = null; save(); }
  }
}
setInterval(() => monthlyTick().catch(e => console.log('شهري:', e.message)), 60 * 1000);

// ---------- حزم المحتوى (بيانات فقط — لا تنفيذ أي كود) ----------
const PACK_MAX = 600 * 1024;
const SEED_PACK = {
  ver: '2026-11', title: 'تحديث نوفمبر 2026',
  notes: ['فعالية الشهر تتبدل تلقائياً وجوائزها ×2', 'أبطال الشهر مع جوائز تلقائية في نهاية كل شهر', 'ألغاز وأسئلة وكلمات و«لو خيروك» جديدة', 'حماية أقوى: كشف الاحتيال والتكرار والمنشن الجماعي ومضاد الغزو'],
  protect: { scam: ['ارباح يوميه مضمونه', 'استثمر الان وضاعف', 'رابط التسجيل المجاني'], badExt: [] },
  add: {
    riddles: [
      ['ما الشيء الذي كلما أخذت منه كبر؟', ['الحفرة', 'حفرة']],
      ['ما الشيء الذي يكتب ولا يقرأ؟', ['القلم', 'قلم']],
      ['ما الشيء الذي يسمع بلا أذن ويتكلم بلا لسان؟', ['الصدى', 'صدى']],
      ['ما الشيء الذي يدخل الماء ولا يبتل؟', ['الظل', 'ظل']],
      ['ما الشيء الذي له عين ولا يرى؟', ['الإبرة', 'الابره', 'ابره', 'إبرة']],
      ['ما الشيء الذي له مفاتيح ولا يفتح أبواباً؟', ['البيانو', 'بيانو', 'الكيبورد', 'كيبورد', 'لوحة المفاتيح']],
      ['ما الشيء الذي يجري ولا يمشي؟', ['الماء', 'ماء', 'النهر', 'نهر']],
      ['ما الشيء الذي له رقبة وليس له رأس؟', ['الزجاجة', 'زجاجة', 'القارورة', 'قارورة']],
      ['ما هو البيت الذي ليس فيه أبواب ولا نوافذ؟', ['بيت الشعر', 'بيت شعر']],
      ['ما الشيء الذي يخترق الزجاج ولا يكسره؟', ['الضوء', 'ضوء']],
      ['ما الشيء الذي يوجد في وسط باريس؟', ['حرف الراء', 'الراء', 'راء']],
      ['ما الشيء الذي يكون لك لكن غيرك يستعمله أكثر منك؟', ['اسمك', 'الاسم', 'اسم']],
    ],
    wyr: [
      ['تعرف كل لغات العالم', 'تتحدث مع كل الحيوانات'],
      ['تسافر للماضي ساعة كل يوم', 'تسافر للمستقبل ساعة كل يوم'],
      ['تعيش في الفضاء سنة كاملة', 'تعيش في أعماق البحر سنة كاملة'],
      ['تكون أذكى شخص في العالم', 'تكون أسعد شخص في العالم'],
      ['لا تنام أبداً لكن لا تتعب', 'تنام ساعة فقط يومياً وتشبع نوماً'],
      ['تملك مكتبة فيها كل كتب العالم', 'تملك سينما فيها كل أفلام العالم'],
      ['تعيش بلا إنترنت شهراً', 'تعيش بلا أصدقاء أسبوعاً'],
      ['تجد كنزاً مدفوناً اليوم', 'تحصل على راتب ممتاز مدى الحياة'],
    ],
    words: ['مطبعة', 'مكوك', 'سلحفاة', 'مظلة', 'شلال', 'قنديل', 'بوصلة', 'مجهر', 'منارة', 'سندباد', 'زنبق', 'كوكب', 'مدفأة', 'أرنب', 'خريطة'],
    proverbs: ['الوقت كالسيف إن لم تقطعه قطعك', 'ما خاب من استشار', 'القناعة كنز لا يفنى', 'الجار قبل الدار', 'يد واحدة لا تصفق', 'اطلب العلم من المهد إلى اللحد', 'في التأني السلامة وفي العجلة الندامة', 'رب أخ لك لم تلده أمك', 'لا تؤجل عمل اليوم إلى الغد'],
    facts: [
      ['ما أكبر محيط في العالم؟', 'المحيط الهادي', 'المحيط الأطلسي', 'المحيط الهندي', 'المحيط المتجمد الشمالي'],
      ['كم عدد قارات العالم؟', '7', '5', '6', '8'],
      ['ما أسرع حيوان بري؟', 'الفهد', 'الأسد', 'الحصان', 'النمر'],
      ['ما أكبر كوكب في المجموعة الشمسية؟', 'المشتري', 'زحل', 'نبتون', 'الأرض'],
      ['ما اللغة الرسمية في البرازيل؟', 'البرتغالية', 'الإسبانية', 'الإنجليزية', 'الفرنسية'],
      ['من مخترع المصباح الكهربائي التجاري؟', 'توماس إديسون', 'نيكولا تيسلا', 'غراهام بيل', 'ألبرت أينشتاين'],
      ['ما أطول نهر في أفريقيا؟', 'النيل', 'الكونغو', 'النيجر', 'الزامبيزي'],
      ['كم عدد لاعبي الفريق الواحد داخل ملعب كرة القدم؟', '11', '10', '9', '12'],
      ['ما أصغر دولة في العالم مساحة؟', 'الفاتيكان', 'موناكو', 'سان مارينو', 'ليختنشتاين'],
      ['ما العنصر الكيميائي الذي رمزه Au؟', 'الذهب', 'الفضة', 'الألمنيوم', 'النحاس'],
    ],
  },
};
const str = (v, max, min = 1) => typeof v === 'string' && v.trim().length >= min && v.length <= max ? v.trim() : null;
const lst = (v, max) => Array.isArray(v) ? v.slice(0, max) : [];
// تنظيف الحزمة: يقبل نصوصاً بأطوال محدودة فقط ويرفض كل ما سواها
function sanitizePack(raw) {
  try {
    if (!raw || typeof raw !== 'object' || !/^\d{4}-\d{2}(\.\d+)?$/.test(raw.ver || '')) return null;
    const p = { ver: raw.ver, title: str(raw.title, 60) || 'تحديث جديد', notes: lst(raw.notes, 10).map(x => str(x, 120)).filter(Boolean), protect: { scam: [], badExt: [] }, add: {}, imgUrls: {} };
    p.protect.scam = lst(raw.protect?.scam, 200).map(x => str(x, 40, 4)).filter(Boolean);
    p.protect.badExt = lst(raw.protect?.badExt, 50).filter(x => typeof x === 'string' && /^\.?[a-z0-9]{2,6}$/i.test(x));
    const a = raw.add || {};
    p.add.riddles = lst(a.riddles, 300).map(r => Array.isArray(r) && str(r[0], 200, 5) && Array.isArray(r[1]) ? [str(r[0], 200, 5), r[1].map(x => str(x, 40)).filter(Boolean).slice(0, 8)] : null).filter(r => r && r[1].length);
    p.add.wyr = lst(a.wyr, 300).map(r => Array.isArray(r) && str(r[0], 120, 3) && str(r[1], 120, 3) ? [str(r[0], 120, 3), str(r[1], 120, 3)] : null).filter(Boolean);
    p.add.words = lst(a.words, 500).map(x => str(x, 14, 3)).filter(x => x && !/\s/.test(x));
    p.add.proverbs = lst(a.proverbs, 300).map(x => str(x, 120, 5)).filter(Boolean);
    p.add.facts = lst(a.facts, 500).map(f => Array.isArray(f) && f.length === 5 && f.every(x => str(String(x), 100)) ? f.map(x => String(x).trim()) : null).filter(Boolean);
    for (const [k, v] of Object.entries(raw.images || {})) if (k === 'kidnap') p.imgUrls[k] = lst(v, 3).filter(u => typeof u === 'string' && /^https:\/\//.test(u) && u.length < 400);
    return p;
  } catch { return null; }
}
function addUniq(arr, items, key) { const have = new Set(arr.map(key)); const fresh = []; for (const it of items) { const k = key(it); if (!have.has(k)) { have.add(k); arr.push(it); fresh.push(it); } } return fresh; }
function applyPack(p) {
  const a = p.add || {};
  addUniq(RIDDLES, a.riddles || [], x => norm(x[0]));
  addUniq(WYR_PAIRS, a.wyr || [], x => norm(x[0]) + '|' + norm(x[1]));
  addUniq(WORDS, a.words || [], x => norm(x));
  addUniq(PROVERBS, a.proverbs || [], x => norm(x));
  addUniq(FACTS, a.facts || [], x => norm(x[0])).forEach(([q, c, ...w]) => CULT.push(() => { const o = shuffle([c, ...w]); return { q, o, a: o.indexOf(c) }; }));
  db.pack ||= { ver: '', protect: { scam: [], badExt: [] } };
  const u = (x, y) => [...new Set([...(x || []), ...(y || [])])];
  db.pack.protect = { scam: u(db.pack.protect.scam, p.protect?.scam), badExt: u(db.pack.protect.badExt, p.protect?.badExt) };
  if (p.ver > db.pack.ver) { db.pack.ver = p.ver; db.pack.title = p.title; db.pack.notes = p.notes; }
}
function packImage(kind) { const l = (db.packImgs || {})[kind]; return l && l.length ? Buffer.from(pick(l), 'base64') : null; }
async function fetchPackImages(p) {
  for (const [kind, urls] of Object.entries(p.imgUrls || {})) for (const u of urls) {
    try {
      const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) });
      const ct = r.headers.get('content-type') || ''; if (!r.ok || !/^image\/(jpeg|png|webp)/.test(ct)) continue;
      const b = Buffer.from(await r.arrayBuffer()); if (b.length < 1000 || b.length > 900 * 1024) continue;
      db.packImgs ||= {}; const l = (db.packImgs[kind] ||= []); l.push(b.toString('base64')); if (l.length > 6) l.shift();
    } catch (e) { console.log('صورة الحزمة:', e.message); }
  }
}
// الإقلاع: طبّق الحزمة المدمجة ثم كل الحزم المحفوظة (القوائم تُبنى من الكود كل مرة)
applyPack(SEED_PACK);
for (const v of Object.keys(db.packs || {}).sort()) applyPack(db.packs[v]);

async function packSources() {
  const out = [];
  try { out.push(JSON.parse(fs.readFileSync('content.json', 'utf8'))); } catch {}
  const url = process.env.UPDATE_URL;
  if (url) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
      if (r.ok) { const t = await r.text(); if (t.length <= PACK_MAX) out.push(JSON.parse(t)); }
    } catch (e) { console.log('جلب التحديث:', e.message); }
  }
  return out;
}
async function checkUpdates(announce) {
  const got = [];
  for (const raw of await packSources()) {
    const p = sanitizePack(raw);
    if (!p || p.ver === SEED_PACK.ver || (db.packs || {})[p.ver]) continue;
    await fetchPackImages(p);
    const keep = { ...p }; delete keep.imgUrls;
    (db.packs ||= {})[p.ver] = keep; applyPack(keep); got.push(keep);
  }
  if (got.length) save();
  if (announce) for (const p of got) for (const chat of Object.keys(db.g)) {
    if (!chat.endsWith('@g.us')) continue;
    await send(chat, packText(p)); await sleep(2500);
  }
  return got;
}
const packText = p => `🆕 *${p.title}*\n${(p.notes || []).map(x => '• ' + x).join('\n') || '• محتوى جديد وتحسينات'}\n\nاكتب *.جديد* لمعرفة المزيد.`;
setTimeout(() => checkUpdates(true).catch(() => {}), 25 * 1000);
setInterval(() => checkUpdates(true).catch(() => {}), 12 * 3600 * 1000);

// ---------- توافق الرتب القديمة وإكمال واجهات التسجيل ----------
// لا يحتوي الملف الأصلي على جدول الرتب الذي قال المستخدم إنه زوّدنا به؛ لذلك لا نخترع أسماء رتب.
// يمكن إنشاء قائمة مستقلة لكل نقابة بالأوامر .اضافة_رتبة و .تعيين_رتبة.
const LOCKED = {};
async function askReferral(chat, jid) { return; }

// ---------- أسماء محجوزة (الألقاب والرتب المسماة) ----------
const RESERVED_WORDS = new Set(['نينا', 'كرينا', 'ايساجي', 'فيلدورا', 'كاتي', 'rakan', 'rudo', 'راكان', 'رودو']);
function reservedBlock(c, j, t) {
  if (c.isOwner) return null;
  const n = normTitle(t), words = n.split(' ');
  const g = gd(c.chat), mine = Object.entries(g.slots).find(([, k]) => k === num(j));
  const names = new Set([...Object.values(LOCKED).map(x => normTitle(x[0])), 'المؤسس', 'مؤسس', 'نجم الانضباط']);
  const hitWord = words.find(w => RESERVED_WORDS.has(w));
  if (hitWord && !(mine && LOCKED[mine[0]] && normTitle(LOCKED[mine[0]][2]) === hitWord)) return 'هذا الاسم محجوز لصاحب رتبة مسماة — اختر لقباً آخر';
  if ([...names].some(x => n === x) && !(mine && LOCKED[mine[0]] && normTitle(LOCKED[mine[0]][0]) === n)) return 'هذا اللقب هو اسم رتبة محجوزة — اختر لقباً آخر';
  return null;
}

// ---------- أوامر هذا الجزء ----------
const banPend = new Map();
async function closeGroup(c, g, code, leave) {
  const chat = c.chat;
  mdCache.delete(chat); const md = await meta(chat);
  const targets = md.participants.filter(p => !ids(p).some(x => isFounderJid(md, x) || me().includes(num(x))));
  g.closing = true; save();
  const out = { ok: 0, fail: 0 };
  try { await sock.groupSettingUpdate(chat, 'announcement'); } catch {}
  await send(chat, `🧹 *بدأ إغلاق المجموعة…* سأطرد ${targets.length} عضواً على دفعات (قد يستغرق دقائق). لا تغلقوا البوت.`);
  const admins = targets.filter(p => p.admin);
  for (let i = 0; i < admins.length; i += 5) {
    try { await sock.groupParticipantsUpdate(chat, admins.slice(i, i + 5).map(p => p.id), 'demote'); } catch (e) { console.log('demote:', e.message); }
    await sleep(1200);
  }
  for (let i = 0; i < targets.length; i += 5) {
    const batch = targets.slice(i, i + 5).map(p => p.id);
    try { await sock.groupParticipantsUpdate(chat, batch, 'remove'); out.ok += batch.length; }
    catch {
      for (const j of batch) { try { await sock.groupParticipantsUpdate(chat, [j], 'remove'); out.ok++; } catch { out.fail++; } await sleep(700); }
    }
    await sleep(1500);
  }
  mdCache.delete(chat);
  await send(chat, `✅ *انتهى الإغلاق*\n👢 طُرد: ${out.ok}${out.fail ? `\n⚠️ تعذّر طرد: ${out.fail} (غالباً مشرفون لا يستطيع البوت إزالتهم — أزلهم يدوياً)` : ''}\n🔒 المجموعة مغلقة الآن، ولم يبقَ إلا المؤسسون والبوت.${leave ? '\n👋 سأغادر وأمسح بيانات هذه النقابة.' : '\nلإخراج البوت ومسح بياناتها: .ban خروج'}`);
  if (leave) { await sleep(1500); try { await sock.groupLeave(chat); } catch (e) { console.log('leave:', e.message); } delete db.g[chat]; save(); }
  else setTimeout(() => { const gg = db.g[chat]; if (gg) { gg.closing = false; save(); } }, 30000);
}
async function monthCmd(c, cmd, args) {
  const chat = c.chat;
  const grp = async () => { if (!c.isGroup) { await send(chat, 'هذا الأمر للمجموعات فقط.'); return false; } return true; };
  switch (cmd) {
    case 'جديد': case 'تحديثات': case 'الجديد': {
      if (!(await grp())) return true;
      const m = moOf(chat), fg = featuredGame(), p = db.pack || {};
      const mine = (m.earn[c.sender] || 0), mw = (m.wins[c.sender] || 0);
      await send(chat, `🆕 *جديد البوت — ${monthName(monthKey())}*\n\n⭐ *فعالية الشهر:* ${GAMES[fg].e} ${GAMES[fg].n} (جوائزها ×2)\n📦 إصدار المحتوى: ${p.ver || SEED_PACK.ver} — ${p.title || SEED_PACK.title}\n${(p.notes || SEED_PACK.notes).map(x => '• ' + x).join('\n')}\n\n📅 *نشاطك هذا الشهر في ${gname(chat)}:* ${money(mine)} أرباح | ${mw} فوز\n\n🏁 أبطال الشهر حتى الآن:\n${champBlock(m) || 'لا يوجد نشاط بعد — كونوا أول المتصدرين!'}`, c.m);
      return true;
    }
    case 'تحديث': case 'تحديث_البوت': {
      if (!(await grp())) return true;
      if (!c.isOwner) { await send(chat, '⛔ هذا الأمر للمؤسسين فقط.'); return true; }
      const got = await checkUpdates(false);
      await send(chat, got.length ? got.map(packText).join('\n\n') : `✅ لا يوجد تحديث جديد. الإصدار الحالي: ${(db.pack || {}).ver || SEED_PACK.ver}\n(التحديثات تُقرأ من ملف content.json بجانب البوت أو من الرابط UPDATE_URL)`);
      return true;
    }
    case 'قفل': case 'فتح': {
      if (!(await grp())) return true;
      if (!c.senderAdmin) { await send(chat, '⛔ هذا الأمر للمشرفين فقط.'); return true; }
      if (!c.botAdmin) { await send(chat, '⚠️ يجب أن يكون البوت مشرفاً.'); return true; }
      try { await sock.groupSettingUpdate(chat, cmd === 'قفل' ? 'announcement' : 'not_announcement'); await send(chat, cmd === 'قفل' ? '🔒 أُغلقت المجموعة: المشرفون فقط يكتبون.' : '🔓 فُتحت المجموعة للجميع.'); }
      catch (e) { await send(chat, '❌ تعذّر: ' + e.message); }
      return true;
    }
    case 'تحرير_رتبه': {
      if (!(await grp())) return true;
      if (!c.isOwner) { await send(chat, '⛔ هذا الأمر للمؤسسين فقط.'); return true; }
      const n = Number((args.match(/\d+/) || [])[0]), g = gd(chat);
      if (!LOCKED[n]) { await send(chat, 'الاستخدام: .تحرير_رتبة رقم (من 2 إلى 6)\nيُفرغ الرتبة المحجوزة لتعيّن غيرها.'); return true; }
      delete g.slots[n]; save(); await send(chat, `🔓 أصبحت رتبة *${LOCKED[n][0]}* شاغرة.`); return true;
    }
    case 'ban': case 'اغلاق_الجروب': case 'اغلاق_المجموعه': {
      if (!(await grp())) return true;
      if (!c.isOwner) { await send(chat, '⛔ هذا الأمر للمؤسسين فقط.'); return true; }
      if (!c.botAdmin) { await send(chat, '⚠️ يجب أن يكون البوت مشرفاً في هذه المجموعة حتى يستطيع الطرد.'); return true; }
      const g = gd(chat), a = args.replace(/@\d+/g, '').trim();
      const code = (a.match(/\d{4}/) || [])[0], leave = /خروج|مغادره|leave/.test(norm(a));
      const p = banPend.get(chat);
      if (code && p && p.code === code && p.exp > Date.now()) {
        banPend.delete(chat);
        if (g.closing) { await send(chat, '⏳ الإغلاق يعمل بالفعل.'); return true; }
        closeGroup(c, g, code, leave || p.leave).catch(e => { console.log('ban:', e.message); g.closing = false; });
        return true;
      }
      if (leave && !code && g.closed) { await send(chat, 'اكتب أولاً .ban للحصول على رمز التأكيد.'); }
      mdCache.delete(chat); const md = await meta(chat);
      const n = md.participants.filter(x => !ids(x).some(y => isFounderJid(md, y) || me().includes(num(y)))).length;
      const nc = String(R(1000, 9999));
      banPend.set(chat, { code: nc, exp: Date.now() + 2 * 60 * 1000, leave });
      await send(chat, `⚠️ *تأكيد إغلاق المجموعة*\n\nسيحدث التالي في «${md.subject}»:\n🔒 تُقفل المجموعة\n👢 يُطرد *${n}* عضواً (حتى المشرفين)\n🛡️ يبقى المؤسسون والبوت فقط${leave ? '\n👋 ثم يغادر البوت ويمسح بيانات النقابة' : ''}\n\n✅ للتنفيذ خلال دقيقتين اكتب:\n*.ban ${nc}*${leave ? ' خروج' : ''}`);
      return true;
    }
  }
  return false;
}


// =====================================================================
// الجزء الأخير: أوامر البوت، استقبال الرسائل، وربط Baileys
// =====================================================================
const MENU_MAP = new Map();
const commandCooldown = new Map();
const OWNER_PREFIX = process.env.OWNER_PREFIX || '.';
const getText = msg => {
  const m = normalizeMessageContent(msg) || msg || {};
  return m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption ||
    m.videoMessage?.caption || m.documentMessage?.caption || m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId || m.templateButtonReplyMessage?.selectedId || '';
};
const getContent = msg => normalizeMessageContent(msg) || msg || {};
const mentioned = m => m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
const quotedParticipant = m => m.message?.extendedTextMessage?.contextInfo?.participant || null;
function targetFor(c) { return c.ctx?.mentionedJid?.[0] || c.ctx?.participant || null; }
function memberExists(md, jid) { return !!md?.participants?.some(p => ids(p).includes(jid) || ids(p).some(x => num(x) === num(jid))); }
function isOwnerNumber(jid, md) { return FOUNDERS.includes(num(jid)) || FOUNDERS.includes(phoneOf(md, jid)); }
function adminOnly(c) { return c.senderAdmin || c.isOwner; }
async function requireGroup(c) { if (!c.isGroup) { await send(c.chat, 'هذا الأمر يعمل داخل المجموعات فقط.'); return false; } return true; }
async function requireBotAdmin(c) { if (!c.botAdmin) { await send(c.chat, '⚠️ يجب ترقية البوت إلى مشرف لتنفيذ هذا الأمر.'); return false; } return true; }
function ensureMember(g, jid) { g.rank ||= {}; g.titles ||= {}; g.rankCatalog ||= []; if (!g.first[jid]) g.first[jid] = Date.now(); }
function rankText(chat, jid) { const g = gd(chat); return g.rank?.[jid] || (g.slots ? Object.entries(g.slots).find(([, v]) => v === num(jid))?.[0] : null) || 'عضو'; }
function titleText(chat, jid) { return gd(chat).titles?.[jid] || 'بدون لقب'; }
function listTitles(chat) {
  const g = gd(chat), rows = Object.entries(g.titles || {}).filter(([, v]) => v).sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'ar'));
  return rows.length ? rows.map(([j,t]) => { seen[num(j)] = jidOfKey(j); return `• 「${t}」 — @${num(j)}`; }).join('\n') : 'لا توجد ألقاب مسجلة في هذه النقابة بعد.';
}
function listRanks(chat) {
  const g = gd(chat), cat = g.rankCatalog || [], assigned = Object.entries(g.rank || {}).filter(([,v]) => v && v !== 'عضو');
  const a = cat.length ? cat.map((x,i)=>`${i+1}. ${x}`).join('\n') : 'لم تُنشأ قائمة رتب لهذه النقابة بعد.';
  const b = assigned.length ? assigned.map(([j,v])=>{ seen[num(j)] = jidOfKey(j); return `• ${v}: @${num(j)}`; }).join('\n') : 'لا توجد رتب مخصصة مسجلة.';
  return `📜 *رتب ${gname(chat)}*\n\n*قائمة الرتب:*\n${a}\n\n*المسجلون:*\n${b}`;
}
function helpText() {
 return `🤖 *شرح أوامر البوت*\n\n🎮 الفعاليات: .محقق | .انمي | .مسابقه | .ثقافه | .تخمين | .حساب | .كلمات | .اخطاء | .خيروك | .خطف @عضو\n💰 الاقتصاد: .رصيدي | .البنك | .المتجر | .شراء رقم | .بطاقتي | .ميدالياتي | .المتصدرون\n👑 الرتب والألقاب: .الرتب | .الألقاب | .رتبتي | .ترقية @عضو | .اضافة_رتبة الاسم | .تعيين_رتبة @عضو الاسم\n🛡️ الإدارة: .طرد @عضو | .حظر @عضو | .الغاء_حظر رقم | .انذار @عضو | .دفع_مخالفة | .حماية تشغيل/ايقاف | .قفل | .فتح\n🏛️ النقابة: .اسم_النقابة الاسم | .القوانين | .استقبال تشغيل/ايقاف\n⚙️ النظام: .فعاليات | .ايقاف | .جديد | .تحديثات | .ban\n\nكل البيانات المالية والرتب والألقاب منفصلة حسب المجموعة.`;
}
async function handleCommand(c, raw) {
  const match = raw.match(/^[.!/](\S+)(?:\s+([\s\S]*))?$/);
  if (!match) return false;
  const cmdRaw = match[1], cmd = norm(cmdRaw).replace(/\s/g,'_'), args = (match[2] || '').trim();
  const chat = c.chat, g = gd(chat), target = targetFor(c);
  if (await monthCmd(c, cmd, args)) return true;
  const gameKey = Object.keys(GAMES).find(k => GAMES[k].a.some(a => norm(a).replace(/ /g,'_') === cmd));
  if (gameKey) { if (!c.isGroup) return send(chat, 'الفعاليات تعمل داخل المجموعات فقط.'); if (!(await gate(c, gameKey))) return true; await STARTERS[gameKey](c); return true; }
  switch (cmd) {
    case 'مساعدة': case 'شرح': case 'الاوامر': case 'menu': case 'قائمة': {
      const r = await send(chat, cmd === 'menu' || cmd === 'قائمة' ? MENU : helpText(), c.m);
      if (r?.key?.id) MENU_MAP.set(r.key.id, chat);
      return true;
    }
    case 'اسم_النقابة': case 'تسمية_النقابة': {
      if (!(await requireGroup(c))) return true; if (!c.isOwner) return send(chat,'هذا الأمر للمؤسس فقط.');
      if (args.length < 2 || args.length > 50) return send(chat,'اكتب: .اسم_النقابة الاسم (2 إلى 50 حرفاً)');
      g.name = args; save(); return send(chat,`🏛️ تم تغيير اسم النقابة إلى *${args}*`);
    }
    case 'الألقاب': case 'القاب': case 'الالقاب': return send(chat, `👑 *ألقاب ${gname(chat)}*\n${listTitles(chat)}`);
    case 'الرتب': case 'رتب': return send(chat, listRanks(chat));
    case 'رتبتي': return send(chat, `👑 رتبتك: *${rankText(chat,c.sender)}*\n🏷️ لقبك: *${titleText(chat,c.sender)}*`);
    case 'ترقية': case 'استمارة_ترقية': {
      const j = target || c.sender; const recorded = rankText(chat,j); seen[num(j)] = j;
      const wins=Object.values(g.wins[j]||{}).reduce((a,b)=>a+b,0), medals=medalStats(chat,j);
      const earned=g.earn[j]?.total||0, messages=g.msgs[j]||0;
      return send(chat, `📋 *استمارة الترقية*\n👤 العضو: @${num(j)}\n🏛️ النقابة: ${gname(chat)}\n🎖️ الرتبة المسجلة حالياً: *${recorded}*\n🏷️ اللقب الحالي: *${titleText(chat,j)}*\n\n📊 *ملف الاجتهاد والإنجاز*\n🏆 الانتصارات: ${wins}\n🏅 الميداليات: ${medals.total}\n💰 إجمالي الأرباح: ${money(earned)}\n💬 الرسائل المسجلة: ${messages}\n\nقائمة الرتب المتاحة:\n${(g.rankCatalog||[]).map((x,i)=>`${i+1}. ${x}`).join('\n') || 'لم يضف المؤسس رتباً بعد.'}\n\nيُعتمد قرار الترقية من إدارة النقابة.`);
    }
    case 'اضافة_رتبة': case 'اضافه_رتبه': {
      if (!(await requireGroup(c))) return true; if (!c.isOwner) return send(chat,'إضافة الرتب للمؤسس فقط.');
      const name = args.trim(); if (name.length < 2 || name.length > 40) return send(chat,'اكتب: .اضافة_رتبة اسم الرتبة');
      g.rankCatalog ||= []; if (g.rankCatalog.some(x=>normTitle(x)===normTitle(name))) return send(chat,'هذه الرتبة موجودة بالفعل.');
      g.rankCatalog.push(name); save(); return send(chat,`✅ أُضيفت رتبة *${name}* إلى قائمة ${gname(chat)} فقط.`);
    }
    case 'تعيين_رتبة': case 'تعيين_رتبه': {
      if (!(await requireGroup(c))) return true; if (!adminOnly(c)) return send(chat,'هذا الأمر للمشرفين أو المؤسس فقط.');
      if (!target || !args) return send(chat,'استخدم: .تعيين_رتبة @العضو اسم_الرتبة');
      const name = args.trim(), found = (g.rankCatalog||[]).find(x=>normTitle(x)===normTitle(name));
      if (!found) return send(chat,'الرتبة غير موجودة في قائمة هذه النقابة. أضفها أولاً بأمر .اضافة_رتبة');
      if (isFounderJid(c.md,target) && !c.isOwner) return send(chat,'لا يمكن تغيير رتبة مؤسس بواسطة مشرف آخر.');
      g.rank[target] = found; g.titles[target] = found; save(); seen[num(target)] = target;
      return send(chat,`🎖️ تم تسجيل رتبة *${found}* للعضو @${num(target)} في ${gname(chat)}.`);
    }
    case 'حذف_رتبة': case 'حذف_رتبه': {
      if (!c.isOwner) return send(chat,'هذا الأمر للمؤسس فقط.'); const name=args.trim();
      g.rankCatalog=(g.rankCatalog||[]).filter(x=>normTitle(x)!==normTitle(name));
      for (const [j,v] of Object.entries(g.rank||{})) if(normTitle(v)===normTitle(name)){ delete g.rank[j]; if(g.titles[j]===v) delete g.titles[j]; }
      save(); return send(chat,`تم حذف الرتبة *${name}* من هذه النقابة.`);
    }
    case 'اختيار_لقب_ادمن': case 'اختيار_لقب_الأدمن': {
      if (!c.senderAdmin && !c.isOwner) return send(chat,'هذا الأمر للأدمنز فقط.');
      const name=args.trim(), found=(g.rankCatalog||[]).find(x=>normTitle(x)===normTitle(name));
      if(!found) return send(chat,'اختر رتبة مسجلة في .الرتب.'); g.rank[c.sender]=found; g.titles[c.sender]=found; save();
      return send(chat,`👑 تم تثبيت لقبك الإداري: *${found}* في هذه النقابة فقط.`);
    }
    case 'لقب': case 'تغيير_لقب': {
      if (!args) return send(chat,'اكتب لقبك بعد الأمر، أو استخدم .المتجر لشراء لقب.');
      const blocked=reservedBlock(c,c.sender,args); if(blocked) return send(chat,blocked);
      if(SHOP_NAMES.includes(normTitle(args))) return send(chat,'هذا اللقب حصري للمتجر.');
      const holder=Object.entries(g.titles||{}).find(([j,v])=>j!==c.sender && normTitle(v)===normTitle(args));
      if(holder) return send(chat,'هذا اللقب مستخدم بالفعل داخل هذه النقابة.');
      if(!c.isOwner && !c.senderAdmin) return send(chat,'الألقاب العادية تُكتسب عبر الفعاليات أو المتجر أو استمارة الاستقبال؛ لا يمكن تعيينها مباشرة.');
      g.titles[c.sender]=args.slice(0,60); save(); return send(chat,`تم تحديث لقبك إلى 「${args.slice(0,60)}」`);
    }
    case 'رصيدي': case 'فلوسي': return send(chat,`💰 رصيدك في بنك ${gname(chat)}: *${money(g.bank[c.sender]||0)}*\n🏦 السعة: ${money(capOf(chat,c.sender))}`);
    case 'البنك': case 'الاغنياء': case 'الأغنياء': {
      const rows=Object.entries(g.bank||{}).sort((a,b)=>b[1]-a[1]).slice(0,10);
      return send(chat,`🏦 *أغنياء ${gname(chat)}*\n`+(rows.length?rows.map(([j,v],i)=>{seen[num(j)]=jidOfKey(j);return `${i+1}. @${num(j)} — ${money(v)}`;}).join('\n'):'لا توجد أرصدة بعد.'));
    }
    case 'المتجر': case 'shop': return send(chat,shopText());
    case 'شراء': {
      const n=Number(args), item=SHOP[n-1]; if(!item) return send(chat,'رقم المنتج غير صحيح. اكتب .المتجر');
      const bal=g.bank[c.sender]||0; if(bal<item.p) return send(chat,`رصيدك غير كافٍ. تحتاج ${money(item.p)} ولديك ${money(bal)}.`);
      g.bank[c.sender]-=item.p;
      if(item.t==='cap') g.extra[c.sender]=(g.extra[c.sender]||0)+item.v;
      else { if(Object.entries(g.titles||{}).some(([j,v])=>j!==c.sender&&normTitle(v)===normTitle(item.n))){g.bank[c.sender]+=item.p;return send(chat,'هذا اللقب أصبح مستخدماً في نقابتك؛ أُعيد المبلغ.');} g.titles[c.sender]=item.n; }
      save(); return send(chat,`🛍️ تم الشراء بنجاح: *${item.n}*\n💵 المتبقي: ${money(g.bank[c.sender])}`);
    }
    case 'بطاقتي': case 'بطاقه': {
      const ms=medalStats(chat,c.sender); return send(chat,`🪪 *بطاقة ${gname(chat)}*\n👤 @${num(c.sender)}\n🏷️ اللقب: ${titleText(chat,c.sender)}\n🎖️ الرتبة: ${rankText(chat,c.sender)}\n💰 البنك: ${money(g.bank[c.sender]||0)}\n🏅 الميداليات: ${ms.total}\n🏆 الانتصارات: ${Object.values(g.wins[c.sender]||{}).reduce((a,b)=>a+b,0)}`);
    }
    case 'ميدالياتي': case 'ميدالياتي': {
      const ms=medalStats(chat,c.sender); return send(chat,`🏅 *ميدالياتك — ${ms.total}*\n${ms.list.slice(0,25).map(x=>`${x.emoji}${x.tEmoji} ${x.name} ×${x.n}`).join('\n')||'لم تحصل على ميداليات بعد.'}`);
    }
    case 'المتصدرون': case 'توب': {
      const rows=Object.entries(g.earn||{}).sort((a,b)=>(b[1].total||0)-(a[1].total||0)).slice(0,10);
      return send(chat,`🏆 *متصدرون ${gname(chat)}*\n${rows.map(([j,v],i)=>{seen[num(j)]=jidOfKey(j);return `${i+1}. @${num(j)} — ${money(v.total||0)}`;}).join('\n')||'لا يوجد متصدرون بعد.'}`);
    }
    case 'فعاليات': case 'حالة_الفعاليات': {
      return send(chat,`🎮 *حالة فعاليات ${gname(chat)}*\n${Object.entries(GAMES).map(([k,v])=>`${g.off.includes(k)?'🔴':'🟢'} ${v.e} ${v.n}`).join('\n')}\n\n⭐ فعالية الشهر: ${GAMES[featuredGame()].n} ×2`);
    }
    case 'تعطيل_فعالية': case 'ايقاف_فعالية': case 'تفعيل_فعالية': {
      if(!adminOnly(c)) return send(chat,'هذا الأمر للمشرفين فقط.'); const k=Object.keys(GAMES).find(k=>norm(GAMES[k].n)===norm(args)||GAMES[k].a.some(a=>norm(a)===norm(args)));
      if(!k) return send(chat,'اكتب اسم الفعالية كما يظهر في .فعاليات'); g.off ||= [];
      if(cmd==='تفعيل_فعالية') g.off=g.off.filter(x=>x!==k); else if(!g.off.includes(k))g.off.push(k); save();
      return send(chat,`${cmd==='تفعيل_فعالية'?'🟢 فُعّلت':'🔴 عُطّلت'} فعالية ${GAMES[k].n} في هذه النقابة.`);
    }
    case 'ايقاف': case 'إيقاف': if(!adminOnly(c)) return send(chat,'إيقاف الفعالية للمشرفين فقط.'); endGame(chat); return send(chat,'⛔ تم إيقاف الفعالية الحالية.');
    case 'القوانين': return send(chat,g.rules||RULES);
    case 'تعيين_القوانين': if(!c.isOwner)return send(chat,'للمؤسس فقط.'); g.rules=args.slice(0,3000); save(); return send(chat,'تم تحديث قوانين هذه النقابة.');
    case 'استقبال': if(!adminOnly(c))return send(chat,'للمشرفين فقط.'); g.reception=/تشغيل|on|تفعيل/.test(norm(args)); save(); return send(chat,g.reception?'تم تشغيل استقبال الأعضاء وطلب الألقاب.':'تم إيقاف استقبال الأعضاء.');
    case 'حماية': if(!adminOnly(c))return send(chat,'للمشرفين فقط.'); g.prot=!/ايقاف|تعطيل|off/.test(norm(args)); save(); return send(chat,g.prot?'🛡️ الحماية مفعّلة.':'⚠️ تم إيقاف الحماية.');
    case 'انذار': case 'إنذار': {
      if(!adminOnly(c))return send(chat,'للمشرفين فقط.'); if(!target)return send(chat,'منشن العضو: .انذار @عضو سبب');
      if(isFounderJid(c.md,target))return send(chat,'لا يمكن إنذار المؤسس.'); const w=addWarn(chat,target,1); seen[num(target)]=target;
      return send(chat,violForm(chat,target,args.replace(/@\d+/g,'').trim()||'مخالفة إدارية',w,false));
    }
    case 'دفع_مخالفة': {
      const w=g.warns[num(c.sender)]||0, due=w*FINE, bal=g.bank[c.sender]||0; if(!w)return send(chat,'ليس لديك مخالفات مسجلة.'); if(bal<due)return send(chat,`تحتاج ${money(due)} ولديك ${money(bal)}.`);
      g.bank[c.sender]-=due; delete g.warns[num(c.sender)]; save(); return send(chat,'✅ تم دفع المخالفة ومسح التحذيرات.');
    }
    case 'طرد': case 'حظر': {
      if(!adminOnly(c))return send(chat,'للمشرفين فقط.'); if(!(await requireBotAdmin(c)))return true; if(!target)return send(chat,`استخدم .${cmd} @العضو`);
      if(isFounderJid(c.md,target))return send(chat,'🛡️ لا يمكن طرد أو حظر المؤسسين.');
      if(cmd==='حظر'){g.bans ||= []; const pn=phoneOf(c.md,target)||num(target); if(!g.bans.includes(pn))g.bans.push(pn); save();}
      const ok=await kick(chat,[target]); return send(chat,ok?`تم ${cmd==='حظر'?'حظر وطرد':'طرد'} العضو.`:'تعذّر تنفيذ الطرد. تحقق من صلاحيات البوت.');
    }
    case 'الغاء_حظر': case 'إلغاء_حظر': {
      if(!adminOnly(c))return send(chat,'للمشرفين فقط.'); const n=args.replace(/\D/g,''); g.bans=(g.bans||[]).filter(x=>x!==n); save(); return send(chat,'تم حذف الرقم من قائمة الحظر إن كان موجوداً.');
    }
    case 'احصائيات': return send(chat,await statsText(chat,false)||'لا توجد إحصائيات بعد.');
    case 'تفعيل_المنشن': if(!adminOnly(c))return send(chat,'للمشرفين فقط.'); g.mention=true;save();return send(chat,'تم تفعيل ردود المنشن.');
    default: return false;
  }
}

async function processMessage(m) {
  if (!m?.message || m.key?.fromMe) return;
  const chat=m.key.remoteJid; if(!chat || chat==='status@broadcast') return;
  const isGroup=chat.endsWith('@g.us');
  const md=isGroup?await meta(chat).catch(()=>null):null;
  const sender=m.key.participant || m.participant || chat;
  const content=getContent(m.message), text=String(getText(m.message)||'').trim();
  const phone=phoneOf(md,sender);
  const senderAdmin=isGroup && isAdminJid(md,sender);
  const isOwner=isOwnerNumber(sender,md);
  const botAdmin=isGroup && isBotAdmin(md);
  const c={chat,sender,phone,m,md,ctx:{mentionedJid:mentioned(m),participant:quotedParticipant(m)},isGroup,senderAdmin,isOwner,botAdmin};
  seen[num(sender)]=sender;
  if(isGroup){
    const g=gd(chat); ensureMember(g,sender); g.msgs[sender]=(g.msgs[sender]||0)+1;
    g.stats.counts[sender]=(g.stats.counts[sender]||0)+1;
    try{moAdd(chat,sender,'msgs',1);}catch{} save();
  }
  if(isGroup && await kidMute(c)) return;
  if(isGroup && await protect(c,text,content)) return;
  if(isGroup && await titleFlow(c,text)) return;
  const active=G[chat];
  if(active && text && INPUTS[active.type] && !text.startsWith('.')) {
    try { await INPUTS[active.type](c,text); } catch(e){console.log('game input:',e.stack||e);}
    return;
  }
  if(active?.type==='det' && /^\.\s*(الحل|الجاني|اتهم|هو|هل|ماذا|ما|من|اين|متى)/.test(text)) {
    try { await detInput(c,text.replace(/^\.\s*/,'')); } catch(e){console.log('detective input:',e.stack||e);}
    return;
  }
  if(text){
    try { if(await handleCommand(c,text)) return; } catch(e){console.log('command:',e.stack||e); await send(chat,'حدث خطأ أثناء تنفيذ الأمر. أعد المحاولة أو راجع سجل التشغيل.'); }
  }
  if(isGroup && c.ctx.mentionedJid?.length && gd(chat).mention!==false) await handleMentions(c);
}

let reconnecting=false, shuttingDown=false;
async function startBot() {
  const authDir=path.join(DATA_DIR,'auth'); fs.mkdirSync(authDir,{recursive:true});
  const {state,saveCreds}=await useMultiFileAuthState(authDir);
  let version; try{({version}=await fetchLatestBaileysVersion());}catch(e){console.log('تعذر جلب إصدار واتساب، سيستخدم Baileys الافتراضي:',e.message);}
  sock=makeWASocket({auth:state,version,logger:silent,browser:Browsers.macOS('Desktop'),markOnlineOnConnect:false,syncFullHistory:false,retryRequestDelayMs:1500,connectTimeoutMs:60000,defaultQueryTimeoutMs:60000});
  sock.ev.on('creds.update',saveCreds);
  sock.ev.on('connection.update',async update=>{
    const {connection,lastDisconnect,qr}=update;
    if(qr){
      console.log('\n📱 امسح رمز QR من واتساب > الأجهزة المرتبطة > ربط جهاز:');
      try{const qrt=(await import('qrcode-terminal')).default; qrt.generate(qr,{small:true});}catch{console.log('QR:',qr);}
    }
    if(connection==='open'){reconnecting=false;console.log('✅ اتصال واتساب جاهز:',sock.user?.id||'');}
    if(connection==='close'&&!shuttingDown){
      const code=lastDisconnect?.error?.output?.statusCode;
      console.log('اتصال واتساب انقطع، الرمز:',code);
      if(code===DisconnectReason.loggedOut){console.log('⚠️ تم تسجيل الخروج. احذف مجلد auth بعد إيقاف الخدمة ثم أعد الربط.');return;}
      if(!reconnecting){reconnecting=true;setTimeout(()=>{reconnecting=false;startBot().catch(e=>console.log('reconnect:',e));},5000);}
    }
  });
  sock.ev.on('messages.upsert',async ev=>{
    if(ev.type!=='notify')return;
    for(const m of ev.messages||[]) try{await processMessage(m);}catch(e){console.log('message:',e.stack||e);}
  });
  sock.ev.on('group-participants.update',async ev=>{
    try{
      mdCache.delete(ev.id);
      if(ev.action==='add') await onJoin(ev.id,ev.participants||[]);
      if(ev.action==='remove'||ev.action==='demote') await guardFounders(ev.id,ev.participants||[],ev.action,ev.author);
    }catch(e){console.log('participants:',e.stack||e);}
  });
}

// Health endpoint for Render; WhatsApp is an outbound WebSocket connection.
const http=(await import('node:http')).default;
const PORT=Number(process.env.PORT||3000);
const server=http.createServer((req,res)=>{if(req.url==='/health'){res.writeHead(sock?.user?200:503,{'content-type':'application/json'});res.end(JSON.stringify({ok:!!sock?.user,service:'whatsapp-bot'}));return;}res.writeHead(200,{'content-type':'text/plain; charset=utf-8'});res.end('WhatsApp bot service');});
server.listen(PORT,'0.0.0.0',()=>console.log(`HTTP health server listening on ${PORT}`));
setInterval(()=>reportAll().catch(e=>console.log('report:',e.message)),60*1000);
setInterval(()=>flush(),30*1000);
startBot().catch(e=>{console.error('فشل تشغيل البوت:',e);process.exitCode=1;});
process.on('SIGTERM',()=>{shuttingDown=true;flush();try{sock?.end?.(new Error('SIGTERM'));}catch{}server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),8000).unref();});
process.on('SIGINT',()=>{shuttingDown=true;flush();try{sock?.end?.(new Error('SIGINT'));}catch{}server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),8000).unref();});
})();
