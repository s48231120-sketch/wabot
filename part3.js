
// =====================================================================
// الجزء 3ز: التحديثات الشهرية + أبطال الشهر + حزم المحتوى + قفل المجموعة + أمر .ban
// =====================================================================
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const monthKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const monthName = mk => { const [y, m] = mk.split('-'); return `${MONTHS_AR[Number(m) - 1]} ${y}`; };
const FEATURABLE = ['det', 'anime', 'quiz', 'culture', 'guess', 'math', 'scr', 'typo', 'wyr', 'cups', 'kid'];
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

// ---------- أسماء محجوزة (الألقاب والرتب المسماة) ----------
const RESERVED_WORDS = new Set(['نينا', 'كرينا', 'ايساجي', 'فيلدورا', 'كاتي', 'rakan', 'rudo', 'راكان', 'رودو']);
function reservedBlock(c, j, t) {
  if (c.isOwner) return null;
  const n = normTitle(t), words = n.split(' ');
  const g = gd(c.chat), mine = Object.entries(g.slots).find(([, k]) => k === num(j));
  const names = new Set([...Object.values(LOCKED).map(x => normTitle(x[0])), 'المؤسس', 'مؤسس', 'نجم الانضباط']);
  const hitWord = words.find(w => RESERVED_WORDS.has(w));
  if (hitWord && !(mine && normTitle(LOCKED[mine[0]][2]) === hitWord)) return 'هذا الاسم محجوز لصاحب رتبة مسماة — اختر لقباً آخر';
  if ([...names].some(x => n === x) && !(mine && normTitle(LOCKED[mine[0]][0]) === n)) return 'هذا اللقب هو اسم رتبة محجوزة — اختر لقباً آخر';
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
