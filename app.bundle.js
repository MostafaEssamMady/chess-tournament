// ملف مولَّد تلقائيًا من public/js بواسطة scripts/build.mjs — لا تعدّله يدويًا.
(function () {
'use strict';
const __defs = Object.create(null);
const __done = Object.create(null);
const __busy = Object.create(null);
function __r(k) {
  if (k in __done) return __done[k];
  if (__busy[k]) throw new Error('استيراد دائري: ' + k);
  __busy[k] = true;
  const v = __defs[k]();
  __done[k] = v; delete __busy[k];
  return v;
}
__defs["app.js"] = function () {
// ---- app.js ----
// ============================================================
// app.js — الهيكل العام، التوجيه، وحماية جلسة المنظّم
// ============================================================

const { store, config } = __r("store.js");
const { h, replace, toast, confirmDialog } = __r("dom.js");
const { renderHome } = __r("views/home.js");
const { renderTournament } = __r("views/tournament.js");
const { renderAdmin } = __r("views/admin.js");
const { renderAccount, renderMe } = __r("views/account.js");
const { emptyState } = __r("components.js");
const { applyDeepLink } = __r("lib/deeplink.js");

const IDLE_LIMIT_MS = 20 * 60 * 1000; // خروج تلقائي بعد 20 دقيقة بلا نشاط

// الدور الحالي كما تقرّره قاعدة البيانات (لا اختيار من المستخدم): organizer | competitor | none | null
let account = { role: null, profile: null };
let accountSeq = 0;

const ctx = {
  store,
  config,
  rerender: () => route(true),
  account: () => account,
  // يعيد قراءة الدور من الخادم ويحدّث القائمة العلوية (يُستدعى بعد الدخول وحفظ الملف الشخصي)
  async refreshAccount() {
    const seq = ++accountSeq;
    let next = { role: null, profile: null };
    if (store.auth.current()) {
      try { next = await store.getAccount(); } catch { next = { role: 'none', profile: null }; }
    }
    if (seq !== accountSeq) return account; // وصل طلب أحدث
    account = next;
    syncNav(store.auth.current());
    return account;
  },
};

// ---------- الهيكل ----------

const main = h('main', { id: 'main', class: 'main', tabindex: '-1' });
// رابط المنظّم لا يظهر في رأس الموقع للزوار؛ يظهر «لوحة المنظّم» بعد تسجيل الدخول فقط.
// الدخول متاح عبر رابط صغير في أسفل الصفحة (أو بحفظ العنوان #/admin).
// رابط الرأس يتغير بحسب الدور: زائر ← «دخول اللاعبين»، لاعب ← «حسابي»، منظّم ← «لوحة المنظّم».
// حسابات اللاعبين تعمل مع Firebase فقط؛ في التجربة المحلية يبقى رابط المنظّم كما كان.
// على الموقع الحقيقي (Firebase): لا يوجد أي رابط أو كلمة عن المنظّم لغير المنظّم.
//   • الزائر يرى «دخول» فقط (صفحة دخول واحدة للجميع؛ الموقع يوجّه كل حساب إلى مكانه بحسب دوره الحقيقي من القواعد).
//   • اللاعب يرى «حسابي» فقط.
//   • المنظّم وحده يرى شارة «المنظّم · Organizer» و«لوحة المنظّم».
// في التجربة المحلية (بلا Firebase) يبقى رابط دخول المنظّم في أسفل الصفحة لأنه الطريق الوحيد للتجربة.
const adminLink = h('a', { class: 'nav-link', href: '#/admin', hidden: true }, 'لوحة المنظّم');
const accountLink = h('a', { class: 'nav-link', href: '#/account', hidden: true }, 'دخول');
const roleBadge = h('span', { class: 'role-badge', id: 'role-badge', role: 'status', hidden: true },
  h('span', { class: 'rb-ar' }, 'المنظّم'), h('span', { class: 'rb-dot', 'aria-hidden': 'true' }, '·'), h('span', { class: 'rb-en', lang: 'en', dir: 'ltr' }, 'Organizer'));
const footAdmin = h('a', { class: 'foot-link', href: '#/admin' }, 'دخول المنظّم');
const topNav = h('nav', { class: 'top-nav', 'aria-label': 'التنقل الرئيسي' });
function syncNav(me) {
  const remote = store.mode === 'remote';
  const role = account.role;
  const organizer = !!me && (remote ? role === 'organizer' : true);
  const showAccount = remote && !organizer;
  if (remote) {
    accountLink.href = me ? '#/me' : '#/account';
    accountLink.textContent = me ? 'حسابي' : 'دخول';
  }
  // العناصر الخاصة بالمنظّم لا توجد في الصفحة أصلًا لغيره (لا مخفية فقط): فلا تظهر في «عرض المصدر» ولا لقارئ الشاشة
  accountLink.hidden = false; adminLink.hidden = false; roleBadge.hidden = false;
  topNav.replaceChildren(...[organizer && roleBadge, showAccount && accountLink, organizer && adminLink].filter(Boolean));
  // التجربة المحلية فقط: رابط دخول المنظّم. على الموقع الحقيقي لا يوجد أصلًا.
  footAdmin.hidden = remote || !!me;
}

function shell() {
  const bar = store.mode === 'demo'
    ? h('div', { class: 'demo-bar', role: 'note' },
      h('p', null, 'نسخة تجريبية لك وحدك: بياناتها في هذا الجهاز فقط، ولن يراها أصدقاؤك حتى لو أرسلتَ لهم الملف. لعرض بطولتك عليهم انشر الموقع (README، القسم 2).'),
      h('button', {
        class: 'btn btn-small', type: 'button',
        onclick: async () => {
          if (!await confirmDialog({ title: 'مسح بيانات التجربة؟', body: 'تُحذف كل البطولات التجريبية وحساب المنظّم التجريبي من هذا المتصفح، ويُسجَّل خروجك.', confirmLabel: 'مسح', danger: true })) return;
          store.reset(); toast('مُسحت بيانات التجربة', 'ok'); route(true);
        },
      }, 'مسح بيانات التجربة'))
    : null;

  const skip = h('a', {
    class: 'skip', href: '#/',
    onclick: (e) => { e.preventDefault(); main.focus(); },
  }, 'تخطَّ إلى المحتوى');

  return [
    skip,
    bar,
    h('header', { class: 'top' },
      h('a', { class: 'brand', href: '#/' },
        h('span', { class: 'mark', 'aria-hidden': 'true' }),
        h('span', { class: 'brand-name' }, config.siteName)),
      topNav),
    main,
    h('footer', { class: 'foot' },
      h('p', null, 'تُلعب المباريات على Chess.com، وتُسجَّل النتائج هنا.'),
      store.mode === 'demo' ? footAdmin : null),
    h('div', { id: 'toasts', class: 'toasts', 'aria-live': 'polite' }),
  ];
}

// ---------- التوجيه ----------

const TABS = new Set(['overview', 'players', 'rounds', 'standings', 'p']);

function parseRoute() {
  try {
    const raw = location.hash.slice(1) || '/';
    const path = raw.split('?')[0];
    const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
    if (!seg.length) return { name: 'home', key: 'home' };
    if (seg[0] === 't' && seg[1]) {
      const tab = TABS.has(seg[2]) ? seg[2] : 'overview';
      return { name: 'tournament', key: `t:${seg[1]}`, tid: seg[1], tab, arg: seg[3] ?? null };
    }
    if (seg[0] === 'account') {
      const mode = seg[1] === 'new' ? 'signup' : 'signin';
      return { name: 'account', key: `account:${mode}`, mode };
    }
    if (seg[0] === 'me') return { name: 'me', key: 'me' };
    if (seg[0] === 'admin') {
      const tid = seg[1] === 't' && seg[2] ? seg[2] : null;
      return { name: 'admin', key: `admin:${tid || ''}`, tid };
    }
  } catch { /* رابط مشوّه */ }
  return { name: 'notfound', key: 'notfound' };
}

let current = null; // { key, view }

async function route(force = false) {
  const r = parseRoute();
  if (!force && current && current.key === r.key && current.view.update) {
    // نفس البطولة، تبويب آخر: نحدّث دون إعادة تحميل
    const active = document.activeElement;
    const cls = active?.classList?.contains('tab') ? 'tab' : active?.classList?.contains('pill') ? 'pill' : null;
    current.view.update(r);
    if (cls) main.querySelector(`.${cls}[aria-current]`)?.focus();
    return;
  }
  current?.view.dispose?.();
  current = null;

  let view;
  try {
    if (r.name === 'home') view = renderHome(r, ctx);
    else if (r.name === 'tournament') view = renderTournament(r, ctx);
    else if (r.name === 'admin') view = renderAdmin(r, ctx);
    else if (r.name === 'account') view = renderAccount(r, ctx);
    else if (r.name === 'me') view = renderMe(r, ctx);
    else {
      document.title = config.siteName;
      view = { root: emptyState('الصفحة غير موجودة', 'تأكد من الرابط.', h('a', { class: 'btn', href: '#/' }, 'العودة للرئيسية')) };
    }
  } catch (e) {
    console.error(e);
    view = { root: emptyState('حدث خطأ غير متوقع', 'أعد تحميل الصفحة. إن تكرر ذلك فتواصل مع إدارة البطولة.') };
  }
  current = { key: r.key, view };
  replace(main, view.root);
  window.scrollTo({ top: 0 });
  if (force !== true) main.focus({ preventScroll: true });
}

// ---------- خروج المنظّم عند الخمول ----------

let idleTimer = null;
function armIdle() {
  clearTimeout(idleTimer);
  if (!store.auth.current()) return;
  idleTimer = setTimeout(() => {
    store.auth.signOut();
    toast('خرجتَ تلقائيًا لحماية حسابك بعد فترة بلا نشاط.', 'info');
  }, IDLE_LIMIT_MS);
}
for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, armIdle, { passive: true });

// ---------- التشغيل ----------

async function start() {
  // داخل إطار في صفحة أخرى (guard.js أخفى الصفحة): لا نبدأ ولا نرسل أي طلب
  if (globalThis.CT_FRAMED) return;
  const app = document.getElementById('app');
  const landing = applyDeepLink(); // قبل أول توجيه: يحوّل ?tournament=ID إلى #/t/ID
  if (landing) ctx.landing = landing; // صفحة البطولة تركّز على نموذج التسجيل مرة واحدة
  replace(app, shell());
  if (store.mode === 'unconfigured') {
    // موقع منشور بلا ربط بقاعدة بيانات: لا نعرض بيانات وهمية ولا نفتح أي صفحة دخول
    document.title = config.siteName;
    syncNav(null);
    footAdmin.hidden = true;
    replace(main, emptyState('الموقع قيد الإعداد',
      'لم يُربط الموقع بقاعدة البيانات بعد، فلا توجد بطولات للعرض الآن. عُد لاحقًا.'));
    return;
  }
  await store.auth.ready;
  await ctx.refreshAccount(); // الدور أولًا كي لا يومض رابط خاطئ في القائمة
  store.auth.onChange(async (me) => {
    syncNav(me);
    armIdle();
    const name = parseRoute().name;
    // صفحة الدخول/إنشاء الحساب تدير انتقالها بنفسها بعد اكتمال العملية (لا نقاطعها في المنتصف)
    if (name === 'account') { await ctx.refreshAccount(); return; }
    await ctx.refreshAccount();
    if (name === 'admin' || name === 'me') route(true);
  });
  syncNav(store.auth.current());
  armIdle();
  window.addEventListener('hashchange', () => route());
  route(true);
}

start();
return {  };
};
__defs["auth-rest.js"] = function () {
// ---- auth-rest.js ----
// ============================================================
// auth-rest.js — الدخول وإنشاء الحسابات (بريد + كلمة مرور) عبر Firebase Auth REST
// الجلسة تُحفظ في sessionStorage فقط: تنتهي بإغلاق التبويب.
// الصلاحية الحقيقية لا تُقرَّر هنا؛ قواعد Firestore تتحقق من معرّفك (uid):
// أي حساب جديد يُنشأ من الموقع «لاعب» فقط، والمنظّم يُعرَّف يدويًا في قاعدة البيانات.
// ============================================================

const IDENTITY = 'https://identitytoolkit.googleapis.com/v1';
const SECURE_TOKEN = 'https://securetoken.googleapis.com/v1/token';
const SESSION_KEY = 'ct_admin_session_v1';

const BAD_LOGIN = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
const AUTH_MESSAGES = {
  INVALID_LOGIN_CREDENTIALS: BAD_LOGIN,
  EMAIL_NOT_FOUND: BAD_LOGIN,
  INVALID_PASSWORD: BAD_LOGIN,
  INVALID_EMAIL: 'صيغة البريد الإلكتروني غير صحيحة.',
  MISSING_PASSWORD: 'اكتب كلمة المرور.',
  USER_DISABLED: 'هذا الحساب موقوف من لوحة Firebase.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'محاولات دخول كثيرة. انتظر بضع دقائق ثم أعد المحاولة.',
  OPERATION_NOT_ALLOWED: 'تسجيل الدخول بالبريد غير مفعّل في Firebase. فعّله من Authentication ← Sign-in method.',
  EMAIL_EXISTS: 'هذا البريد مسجَّل من قبل. جرّب تسجيل الدخول.',
  WEAK_PASSWORD: 'كلمة المرور ضعيفة. استخدم 10 أحرف على الأقل.',
  MISSING_EMAIL: 'اكتب البريد الإلكتروني.',
};

class AuthError extends Error {
  constructor(message, code = '') { super(message); this.code = code; }
}

const store = {
  read() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } },
  write(v) { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(v)); } catch { /* ignore */ } },
  clear() { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } },
};

function createAuth({ apiKey }) {
  let state = null; // { uid, email, idToken, refreshToken, expiresAt }
  const listeners = new Set();
  const emit = () => listeners.forEach((cb) => cb(current()));

  const current = () => (state ? { uid: state.uid, email: state.email } : null);

  async function post(url, body, asForm = false) {
    let res;
    try {
      res = await fetch(`${url}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': asForm ? 'application/x-www-form-urlencoded' : 'application/json' },
        body: asForm ? new URLSearchParams(body) : JSON.stringify(body),
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'origin', // الأصل فقط (بلا مسار ولا رمز دعوة): يلزم لمفاتيح API المقيَّدة بالنطاق
      });
    } catch {
      throw new AuthError('تعذّر الاتصال بالخادم. تحقق من الإنترنت.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = String(data?.error?.message || '').split(' ')[0];
      throw new AuthError(AUTH_MESSAGES[code] || 'تعذّر إتمام العملية. حاول مرة أخرى.', code);
    }
    return data;
  }

  function adopt({ uid, email, idToken, refreshToken, expiresIn }) {
    state = { uid, email, idToken, refreshToken, expiresAt: Date.now() + Number(expiresIn) * 1000 };
    store.write({ uid, email, refreshToken });
    emit();
  }

  async function refresh() {
    if (!state?.refreshToken) return null;
    try {
      const d = await post(SECURE_TOKEN, { grant_type: 'refresh_token', refresh_token: state.refreshToken }, true);
      adopt({ uid: d.user_id, email: state.email, idToken: d.id_token, refreshToken: d.refresh_token, expiresIn: d.expires_in });
      return state.idToken;
    } catch (e) {
      if (e instanceof AuthError) signOut();
      return null;
    }
  }

  async function getToken() {
    if (!state) return null;
    if (Date.now() < state.expiresAt - 60_000) return state.idToken;
    return refresh();
  }

  async function signIn(email, password) {
    const d = await post(`${IDENTITY}/accounts:signInWithPassword`, { email, password, returnSecureToken: true });
    adopt({ uid: d.localId, email: d.email || email, idToken: d.idToken, refreshToken: d.refreshToken, expiresIn: d.expiresIn });
  }

  // حساب جديد (للاعبين). الدور لا يُرسَل من هنا أصلًا: القواعد وحدها تحدّد من هو المنظّم.
  async function signUp(email, password) {
    const d = await post(`${IDENTITY}/accounts:signUp`, { email, password, returnSecureToken: true });
    adopt({ uid: d.localId, email: d.email || email, idToken: d.idToken, refreshToken: d.refreshToken, expiresIn: d.expiresIn });
  }

  // رابط إعادة تعيين كلمة المرور بالبريد. نخفي هل البريد موجود أم لا (لا نكشف من لديه حساب).
  async function sendPasswordReset(email) {
    try {
      await post(`${IDENTITY}/accounts:sendOobCode`, { requestType: 'PASSWORD_RESET', email });
    } catch (e) {
      if (e?.code === 'EMAIL_NOT_FOUND') return;
      throw e;
    }
  }

  function signOut() {
    state = null;
    store.clear();
    emit();
  }

  // استعادة جلسة التبويب الحالي (إن وُجدت)
  const ready = (async () => {
    const saved = store.read();
    if (saved?.refreshToken) {
      state = { uid: saved.uid, email: saved.email, idToken: '', refreshToken: saved.refreshToken, expiresAt: 0 };
      await refresh();
    }
  })();

  return {
    ready,
    current,
    getToken,
    signIn,
    signUp,
    sendPasswordReset,
    signOut,
    onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  };
}
return { AuthError, createAuth };
};
__defs["components.js"] = function () {
// ---- components.js ----
// ============================================================
// components.js — مكوّنات عرض مشتركة بين صفحات اللاعبين والمنظّم
// ============================================================

const { h } = __r("dom.js");
const { scoreParts, roundName } = __r("fmt.js");
const { RESULT } = __r("lib/engine.js");
const { safeGameUrl } = __r("lib/validate.js");

const chip = (text, kind = 'neutral') => h('span', { class: `chip chip-${kind}` }, text);

function emptyState(title, hint, ...actions) {
  return h('div', { class: 'empty' },
    h('p', { class: 'empty-title' }, title),
    hint ? h('p', { class: 'empty-hint' }, hint) : null,
    actions.length ? h('div', { class: 'empty-actions' }, actions) : null);
}

// 1 ← «1» ، 0.5 ← «½» ، 3.5 ← «3½»
function pts(n) {
  const whole = Math.floor(n);
  const half = n - whole >= 0.5;
  if (!half) return String(whole);
  return whole === 0 ? '½' : `${whole}½`;
}

const pieceMark = (color) =>
  h('span', { class: `piece piece-${color}`, role: 'img', 'aria-label': color === 'white' ? 'أبيض' : 'أسود' });

// صف مباراة: اللوحة، الأبيض، النتيجة، الأسود
// plain: صف للمعاينة فقط (بلا روابط) كي لا يُضغط عليه بالخطأ داخل نافذة المراجعة
function gameRow(g, { tid, meKey = null, admin = null, plain = false } = {}) {
  const winner =
    g.result === RESULT.WHITE || g.result === RESULT.BYE ? 'white'
      : g.result === RESULT.BLACK ? 'black' : null;

  const side = (color, key, name) => {
    const mine = meKey && key === meKey;
    const body = key && !plain
      ? h('a', { class: 'player-link', href: `#/t/${tid}/p/${encodeURIComponent(key)}` }, name || key)
      : h('span', null, key ? (name || key) : '—');
    return h('div', { class: `side side-${color}${winner === color ? ' is-winner' : ''}${mine ? ' is-me' : ''}` },
      pieceMark(color), body, mine ? h('span', { class: 'me-tag' }, 'أنت') : null);
  };

  const parts = scoreParts(g);
  let score;
  if (g.result === RESULT.BYE) {
    score = h('div', { class: 'score score-text' }, 'راحة');
  } else if (parts) {
    score = h('div', {
      class: 'score',
      role: 'img',
      'aria-label': `النتيجة: الأبيض ${parts[0]}، الأسود ${parts[1]}`,
    }, h('span', { class: 'n' }, parts[0]), h('span', { class: 'dash' }, '–'), h('span', { class: 'n' }, parts[1]));
  } else {
    score = h('div', { class: 'score score-text pending' }, 'لم تُلعب');
  }

  const meta = [];
  if (g.result === RESULT.BYE) meta.push(h('span', { class: 'meta-note' }, 'نقطة كاملة'));
  if (g.forfeit) meta.push(h('span', { class: 'meta-note' }, 'بالانسحاب أو الغياب'));
  if (g.note) meta.push(h('span', { class: 'meta-note' }, g.note));
  const gameUrl = plain ? '' : safeGameUrl(g.url);
  if (gameUrl) meta.push(h('a', { class: 'meta-link', href: gameUrl }, 'شاهد المباراة'));

  const row = h('li', { class: `game${g.result ? ' is-done' : ''}${meKey && (g.white === meKey || g.black === meKey) ? ' is-mine' : ''}` },
    h('span', { class: 'board' }, `لوحة ${g.board}`),
    side('white', g.white, g.whiteName),
    score,
    g.black ? side('black', g.black, g.blackName) : h('div', { class: 'side side-empty' }),
    meta.length ? h('div', { class: 'game-meta' }, meta) : null,
    admin);
  return row;
}

function gameList(games, opts) {
  return h('ol', { class: 'games' }, games.map((g) => gameRow(g, opts)));
}

// جدول الترتيب (سويسري / دوري)
function standingsTable({ rows, tid, meKey = null }) {
  const head = h('tr', null,
    h('th', { scope: 'col', class: 'c-rank' }, '#'),
    h('th', { scope: 'col', class: 'c-name' }, 'اللاعب'),
    h('th', { scope: 'col', class: 'c-pts' }, 'النقاط'),
    h('th', { scope: 'col', class: 'c-opt' }, 'لعب'),
    h('th', { scope: 'col', class: 'c-opt' }, 'فاز'),
    h('th', { scope: 'col', class: 'c-opt' }, 'تعادل'),
    h('th', { scope: 'col', class: 'c-opt' }, 'خسر'),
    h('th', { scope: 'col', class: 'c-opt', title: 'مجموع نقاط من لاعبهم' }, 'بوخهولتز'));
  const body = rows.map((r) =>
    h('tr', { class: `${r.id === meKey ? 'is-me' : ''}${r.active ? '' : ' is-out'}` },
      h('td', { class: 'c-rank' }, r.rank),
      h('td', { class: 'c-name' },
        h('a', { class: 'player-link', href: `#/t/${tid}/p/${encodeURIComponent(r.id)}` }, r.name),
        r.active ? null : h('span', { class: 'meta-note' }, 'منسحب')),
      h('td', { class: 'c-pts' }, pts(r.points)),
      h('td', { class: 'c-opt' }, r.played),
      h('td', { class: 'c-opt' }, r.wins),
      h('td', { class: 'c-opt' }, r.draws),
      h('td', { class: 'c-opt' }, r.losses),
      h('td', { class: 'c-opt' }, pts(r.buchholz))));
  return h('div', { class: 'table-wrap' },
    h('table', { class: 'table' }, h('thead', null, head), h('tbody', null, body)));
}

// ترتيب خروج المغلوب
function knockoutList({ rows, t, tid, meKey = null }) {
  const label = (r) => {
    if (r.status === 'champion') return chip('البطل', 'gold');
    if (r.status === 'runnerUp') return chip('الوصيف', 'silver');
    if (r.status === 'out') return chip(`خرج في ${roundName(t, r.exitRound)}`, 'neutral');
    return chip('لا يزال في المنافسة', 'ok');
  };
  return h('ol', { class: 'ko-list' }, rows.map((r) =>
    h('li', { class: `ko-row${r.id === meKey ? ' is-me' : ''}` },
      h('a', { class: 'player-link', href: `#/t/${tid}/p/${encodeURIComponent(r.id)}` }, r.name),
      label(r))));
}
return { chip, emptyState, pts, gameRow, gameList, standingsTable, knockoutList };
};
__defs["dom.js"] = function () {
// ---- dom.js ----
// ============================================================
// dom.js — بناء الواجهة بأمان
// لا نستخدم innerHTML ولا أي طريقة تفسّر نصًا كـ HTML في أي مكان من الموقع.
// كل نص (أسماء اللاعبين وغيرها) يدخل كنص خام، فلا يمكن حقن سكربت.
// ============================================================

// الروابط المسموحة: مسارات داخلية (#...) أو https فقط
function safeHref(value) {
  const v = String(value ?? '').trim();
  if (v.startsWith('#/') || v === '#') return v;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'readOnly', 'required', 'hidden']);

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  const props = [];
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on')) {
      if (typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'href') {
      const safe = safeHref(v);
      if (safe) {
        el.setAttribute('href', safe);
        if (safe.startsWith('https://')) {
          el.setAttribute('target', '_blank');
          el.setAttribute('rel', 'noopener noreferrer');
        }
      }
    } else if (PROPS.has(k)) props.push([k, v]);
    else if (k === 'style' || k === 'src' || k === 'srcdoc') continue; // ممنوعة عمدًا
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, kids);
  for (const [k, v] of props) el[k] = v; // بعد إضافة الأبناء (مهم لـ select)
  return el;
}

function append(parent, kids) {
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    parent.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return parent;
}

function replace(parent, ...kids) {
  parent.replaceChildren();
  append(parent, kids);
  return parent;
}

const $ = (sel, root = document) => root.querySelector(sel);

// ---------- تنبيهات ----------

function toast(message, kind = 'info') {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = h('div', { class: `toast toast-${kind}`, role: kind === 'error' ? 'alert' : 'status' }, message);
  host.append(el);
  setTimeout(() => el.remove(), kind === 'error' ? 7000 : 3500);
}

async function copyText(text, okMessage = 'تم النسخ') {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMessage, 'ok');
  } catch {
    // بديل: نافذة فيها النص ليحدّده المستخدم بنفسه
    await dialog({
      title: 'انسخ النص يدويًا',
      body: h('input', { class: 'input ltr', readOnly: true, value: text, onfocus: (e) => e.target.select() }),
      actions: [{ label: 'تم', primary: true }],
    });
  }
}

// ---------- النوافذ ----------

// يرجع label الزر المضغوط (أو null عند الإغلاق بـ Esc)
function dialog({ title, body, actions, danger = false }) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: `dialog${danger ? ' danger' : ''}`, 'aria-labelledby': 'dlg-title' });
    const form = h('form', { class: 'dialog-form', onsubmit: (e) => e.preventDefault() },
      h('h2', { id: 'dlg-title', class: 'dialog-title' }, title),
      h('div', { class: 'dialog-body' }, body),
      h('div', { class: 'dialog-actions' },
        actions.map((a) => h('button', {
          type: 'button',
          class: `btn${a.primary ? ' btn-primary' : ''}${a.danger ? ' btn-danger' : ''}`,
          onclick: () => { dlg.dataset.answer = a.label; dlg.close(); },
        }, a.label))),
    );
    dlg.append(form);
    dlg.addEventListener('close', () => { const answer = dlg.dataset.answer ?? null; dlg.remove(); resolve(answer); });
    document.body.append(dlg);
    dlg.showModal();
  });
}

async function confirmDialog({ title, body, confirmLabel = 'تأكيد', danger = false }) {
  const answer = await dialog({
    title,
    body: typeof body === 'string' ? h('p', null, body) : body,
    danger,
    actions: [
      { label: 'إلغاء' },
      { label: confirmLabel, primary: !danger, danger },
    ],
  });
  return answer === confirmLabel;
}

// نافذة نموذج: لا تُغلق إلا إذا رجعت onSubmit بـ true (وإلا تبقى مفتوحة وتعرض الخطأ)
function formDialog({ title, body, submitLabel, onSubmit, danger = false }) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: `dialog${danger ? ' danger' : ''}`, 'aria-labelledby': 'dlg-title' });
    const status = h('p', { class: 'field-error', role: 'alert' });
    const submitBtn = h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, type: 'submit' }, submitLabel);
    const form = h('form', {
      class: 'dialog-form',
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        status.textContent = '';
        try {
          if (await onSubmit()) { dlg.dataset.answer = 'ok'; dlg.close(); return; }
        } catch (err) {
          status.textContent = err?.message || 'تعذّر إتمام العملية.';
        }
        submitBtn.disabled = false;
      },
    },
    h('h2', { id: 'dlg-title', class: 'dialog-title' }, title),
    h('div', { class: 'dialog-body' }, body),
    status,
    h('div', { class: 'dialog-actions' },
      h('button', { class: 'btn', type: 'button', onclick: () => dlg.close() }, 'إلغاء'),
      submitBtn));
    dlg.append(form);
    dlg.addEventListener('close', () => { const ok = dlg.dataset.answer === 'ok'; dlg.remove(); resolve(ok); });
    document.body.append(dlg);
    dlg.showModal();
  });
}
return { safeHref, h, append, replace, $, toast, copyText, dialog, confirmDialog, formDialog };
};
__defs["firestore-rest.js"] = function () {
// ---- firestore-rest.js ----
// ============================================================
// firestore-rest.js — اتصال مباشر بواجهة Firestore الرسمية (REST)
// بلا مكتبات خارجية: لا سكربتات من طرف ثالث تعمل في صفحتك.
// قواعد الحماية (firestore.rules) هي التي تحدّد من يقرأ ومن يكتب.
// ============================================================

class FsError extends Error {
  constructor(status, code, message) {
    super(message || code || 'خطأ');
    this.status = status; // رمز HTTP، أو 0 عند انقطاع الاتصال
    this.code = code;     // مثل PERMISSION_DENIED
  }
  get denied() { return this.status === 403 || this.code === 'PERMISSION_DENIED'; }
  get offline() { return this.status === 0; }
}

// ---------- ترميز القيم ----------

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function encodeValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  switch (typeof v) {
    case 'boolean': return { booleanValue: v };
    case 'number':
      if (!Number.isFinite(v)) throw new TypeError('رقم غير صالح');
      return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    case 'string': return { stringValue: v };
    case 'object':
      if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
      return { mapValue: { fields: encodeFields(v) } };
    default: throw new TypeError(`نوع غير مدعوم: ${typeof v}`);
  }
}

function encodeFields(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = encodeValue(v);
  return out;
}

function decodeValue(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return null;
}

function decodeFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) if (!FORBIDDEN_KEYS.has(k)) out[k] = decodeValue(v);
  return out;
}

function decodeDoc(doc) {
  const id = String(doc.name).split('/').pop();
  return { ...decodeFields(doc.fields), id };
}

// ---------- العميل ----------

const encPath = (path) => path.split('/').map(encodeURIComponent).join('/');

function createFirestore({ projectId, apiKey, getToken }) {
  const prefix = `projects/${projectId}/databases/(default)/documents`;
  const base = `https://firestore.googleapis.com/v1/${prefix}`;

  async function request(url, { method = 'GET', body } = {}) {
    const token = getToken ? await getToken() : null;
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    let res;
    try {
      res = await fetch(`${url}?key=${encodeURIComponent(apiKey)}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
        credentials: 'omit',
        referrerPolicy: 'origin', // الأصل فقط (بلا مسار ولا رمز دعوة): يلزم لمفاتيح API المقيَّدة بالنطاق
        signal: AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined,
      });
    } catch {
      throw new FsError(0, 'NETWORK', 'تعذّر الاتصال بالخادم. تحقق من الإنترنت.');
    }
    if (res.ok) return res.json();
    let detail = null;
    try { detail = await res.json(); } catch { /* ignore */ }
    throw new FsError(res.status, detail?.error?.status || '', detail?.error?.message);
  }

  return {
    prefix,

    // يرجع المستند أو null إن لم يوجد
    async getDoc(path) {
      try {
        return decodeDoc(await request(`${base}/${encPath(path)}`));
      } catch (e) {
        if (e.status === 404) return null;
        throw e;
      }
    },

    // كل مستندات مجموعة (تحت مستند أب اختياري)
    // where: [{ field, value, op? }] شروط تساوٍ (EQUAL) أو احتواء مصفوفة (ARRAY_CONTAINS) فقط:
    //   تكفي لقواعدنا ولا تحتاج فهارس مركّبة.
    // select: أسماء الحقول المطلوبة فقط (لتجنّب تحميل محتوى الملفات الكبيرة في القوائم)
    async list(parentPath, collectionId, { orderBy, where = [], select } = {}) {
      const url = parentPath ? `${base}/${encPath(parentPath)}:runQuery` : `${base}:runQuery`;
      const structuredQuery = { from: [{ collectionId }] };
      if (where.length) {
        const filters = where.map((w) => {
        const op = w.op === 'ARRAY_CONTAINS' ? 'ARRAY_CONTAINS' : 'EQUAL';
        return { fieldFilter: { field: { fieldPath: w.field }, op, value: encodeValue(w.value) } };
      });
        structuredQuery.where = filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } };
      }
      if (select?.length) structuredQuery.select = { fields: select.map((fieldPath) => ({ fieldPath })) };
      if (orderBy) {
        structuredQuery.orderBy = [{
          field: { fieldPath: orderBy.field },
          direction: orderBy.desc ? 'DESCENDING' : 'ASCENDING',
        }];
      }
      const rows = await request(url, { method: 'POST', body: { structuredQuery } });
      return rows.filter((r) => r.document).map((r) => decodeDoc(r.document));
    },

    // دفعة كتابة واحدة (ذرّية). الحد الأقصى 500 عملية.
    async commit(writes) {
      if (!writes.length) return;
      if (writes.length > 500) throw new RangeError('أكثر من 500 عملية في دفعة واحدة');
      await request(`${base}:commit`, { method: 'POST', body: { writes } });
    },

    // تقسيم دفعات كبيرة (غير ذرّي بين الدفعات)
    async commitChunked(writes, size = 450) {
      for (let i = 0; i < writes.length; i += size) await this.commit(writes.slice(i, i + size));
    },

    write: {
      set(path, data, { mustNotExist = false, serverTime = [], increments = [] } = {}) {
        const op = { update: { name: `${prefix}/${path}`, fields: encodeFields(data) } };
        if (mustNotExist) op.currentDocument = { exists: false };
        const tf = transforms(serverTime, increments);
        if (tf.length) op.updateTransforms = tf;
        return op;
      },
      // تعديل حقول محددة في مستند موجود فقط
      patch(path, data, { serverTime = [], increments = [] } = {}) {
        const op = {
          update: { name: `${prefix}/${path}`, fields: encodeFields(data) },
          updateMask: { fieldPaths: Object.keys(data).filter((k) => data[k] !== undefined) },
          currentDocument: { exists: true },
        };
        const tf = transforms(serverTime, increments);
        if (tf.length) op.updateTransforms = tf;
        return op;
      },
      remove(path) {
        return { delete: `${prefix}/${path}` };
      },
    },
  };
}

function transforms(serverTime, increments) {
  return [
    ...serverTime.map((fieldPath) => ({ fieldPath, setToServerValue: 'REQUEST_TIME' })),
    ...increments.map((fieldPath) => ({ fieldPath, increment: { integerValue: '1' } })),
  ];
}
return { FsError, encodeValue, encodeFields, decodeValue, decodeFields, decodeDoc, createFirestore };
};
__defs["fmt.js"] = function () {
// ---- fmt.js ----
// ============================================================
// fmt.js — نصوص وتنسيقات مشتركة
// ============================================================

const { FORMAT_LABEL, roundsOf, isRoundComplete, roundLabel, RESULT } = __r("lib/engine.js");



const FORMAT_HELP = Object.freeze({
  swiss: 'الأنسب لعدد كبير: كل لاعب يلعب كل الجولات، ويلاقي خصمًا بنقاط قريبة من نقاطه. لا أحد يخرج.',
  roundrobin: 'كل لاعب يلاقي كل لاعب مرة. الأعدل، لكنه يطول مع كثرة اللاعبين (حتى 8 لاعبين مثالي).',
  knockout: 'من يخسر يخرج. الأسرع والأكثر حماسًا، لكن نصف اللاعبين يتوقفون بعد الدور الأول.',
});

const STATUS_LABEL = Object.freeze({
  registration: 'التسجيل مفتوح',
  running: 'جارية',
  finished: 'انتهت',
});

// حالة البطولة كما تُعرض للناس: تجمع النشر وفتح التسجيل ومرحلة البطولة في تسمية واحدة
function phaseOf(t) {
  if (!t.published) return { key: 'draft', label: 'مسودة', kind: 'neutral' };
  if (t.status === 'running') return { key: 'running', label: STATUS_LABEL.running, kind: 'amber' };
  if (t.status === 'finished') return { key: 'finished', label: STATUS_LABEL.finished, kind: 'neutral' };
  return t.registrationOpen
    ? { key: 'open', label: STATUS_LABEL.registration, kind: 'ok' }
    : { key: 'closed', label: 'التسجيل مغلق', kind: 'neutral' };
}

// هل يُسمح للجمهور بإرسال طلب تسجيل الآن؟ (نفس شرط قواعد Firestore)
const canRegister = (t) => t.published && t.registrationOpen && t.status === 'registration';

function playersText(n) {
  if (n === 0) return 'لا لاعبين بعد';
  if (n === 1) return 'لاعب واحد';
  if (n === 2) return 'لاعبان';
  if (n <= 10) return `${n} لاعبين`;
  return `${n} لاعبًا`;
}

// أول جولة فيها مباراة بلا نتيجة، وإلا آخر جولة
function focusRound(games) {
  const rounds = roundsOf(games);
  if (!rounds.length) return 0;
  return rounds.find((r) => !isRoundComplete(games, r)) ?? rounds[rounds.length - 1];
}

const roundName = (t, r) => roundLabel(t.format, r, t.totalRounds);

// نتيجة كل جانب كنص: [أبيض, أسود]
function scoreParts(g) {
  switch (g.result) {
    case RESULT.WHITE: return ['1', '0'];
    case RESULT.BLACK: return ['0', '1'];
    case RESULT.DRAW: return ['½', '½'];
    default: return null;
  }
}

function statusLine(t, games) {
  if (t.status === 'registration' || t.status === 'finished') return phaseOf(t).label;
  const r = focusRound(games) || t.currentRound || 1;
  return `${STATUS_LABEL.running}: ${roundName(t, r)}`;
}

// رابط مطلق لصفحة داخل الموقع
function absoluteLink(hash) {
  const base = `${location.origin}${location.pathname}`;
  return `${base}${hash}`;
}

// الرابط الأساسي للموقع بلا # (يعمل على GitHub Pages وعلى file:// أيضًا)
function baseUrl() {
  const origin = location.origin && location.origin !== 'null' ? location.origin : 'file://';
  return `${origin}${location.pathname}`;
}
const siteLink = () => baseUrl();
// الرابط المباشر للبطولة: يفتح صفحتها ويملأ رمز الدعوة (إن وُجد)
function directLink(tid, code = '') {
  const q = new URLSearchParams({ tournament: tid });
  if (code) q.set('code', code);
  return `${baseUrl()}?${q.toString()}`;
}

// تاريخ البطولة المخزَّن YYYY-MM-DD → نص عربي (UTC حتى لا ينزاح يوم بحسب المنطقة الزمنية)
function dayText(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

function dateText(ms) {
  if (!ms) return '';
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'medium' }).format(new Date(ms));
}
return { FORMAT_HELP, STATUS_LABEL, phaseOf, canRegister, playersText, focusRound, roundName, scoreParts, statusLine, absoluteLink, siteLink, directLink, dayText, dateText, FORMAT_LABEL };
};
__defs["lib/deeplink.js"] = function () {
// ---- lib/deeplink.js ----
// ============================================================
// lib/deeplink.js — الرابط المباشر للبطولة
// https://USER.github.io/REPO/?tournament=ID&code=CHESS-XXXXXX
//   → يفتح صفحة هذه البطولة مباشرة (حيث نموذج التسجيل) ورمز الدعوة معبّأ، ثم ننظّف العنوان من المعاملات.
// المدخلات تُفحص بنمط صارم قبل أي استعمال، ولا يُكتب شيء في الصفحة من هذه المعاملات إلا كنص عبر h().
// ============================================================

const TID_RE = /^[A-Za-z0-9_-]{4,40}$/;
const CODE_RE = /^[A-Z0-9-]{4,20}$/;

// يرجع { tid } إن كان في العنوان ?tournament= (وغيّر العنوان إلى #/t/ID[?code=…])، وإلا null
function applyDeepLink(loc = globalThis.location, hist = globalThis.history) {
  let q;
  try { q = new URLSearchParams(loc.search); } catch { return null; }
  const tid = q.get('tournament');
  if (!tid) return null;
  if (!TID_RE.test(tid)) { // رابط مشوّه: نتجاهله وننظّف العنوان
    hist.replaceState(null, '', `${loc.pathname}${loc.hash || ''}`);
    return null;
  }
  const code = String(q.get('code') || '').toUpperCase();
  const hash = `#/t/${encodeURIComponent(tid)}${CODE_RE.test(code) ? `?code=${encodeURIComponent(code)}` : ''}`;
  hist.replaceState(null, '', `${loc.pathname}${hash}`);
  return { tid };
}
return { TID_RE, CODE_RE, applyDeepLink };
};
__defs["lib/engine.js"] = function () {
// ---- lib/engine.js ----
// ============================================================
// engine.js — محرك البطولة: القرعة والنقاط والترتيب
// دوال نقية بلا واجهة ولا شبكة، لذلك يمكن اختبارها والتحقق من نتائجها.
// ثلاثة أنظمة: سويسري، دوري، خروج المغلوب.
// ============================================================

const RESULT = Object.freeze({
  WHITE: '1-0',
  BLACK: '0-1',
  DRAW: '1/2-1/2',
  BYE: 'bye',
});

const FORMAT = Object.freeze({
  SWISS: 'swiss',
  ROUND_ROBIN: 'roundrobin',
  KNOCKOUT: 'knockout',
});

const FORMAT_LABEL = Object.freeze({
  swiss: 'النظام السويسري',
  roundrobin: 'الدوري',
  knockout: 'خروج المغلوب',
});

const gameId = (round, board) => `r${round}-b${board}`;

// ---------- العشوائية ----------

// عشوائية آمنة مشفّرة للقرعة الحقيقية (لا يمكن توقعها)
function secureRng() {
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    return () => {
      c.getRandomValues(buf);
      return buf[0] / 4294967296;
    };
  }
  return Math.random;
}

// عشوائية قابلة للتكرار (للاختبارات فقط)
function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// خلط فيشر–ييتس (توزيع منتظم)
function shuffle(items, rng = secureRng()) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- النتائج والنقاط ----------

function gamePoints(result) {
  switch (result) {
    case RESULT.WHITE: return [1, 0];
    case RESULT.BLACK: return [0, 1];
    case RESULT.DRAW: return [0.5, 0.5];
    case RESULT.BYE: return [1, 0];
    default: return null;
  }
}

// 'white' | 'black' | 'draw' | null
function winnerSide(game) {
  if (game.result === RESULT.WHITE || game.result === RESULT.BYE) return 'white';
  if (game.result === RESULT.BLACK) return 'black';
  if (game.result === RESULT.DRAW) return 'draw';
  return null;
}

function makeGame(round, board, white, black) {
  return {
    id: gameId(round, board),
    round,
    board,
    white: white.id,
    black: black.id,
    whiteName: white.name,
    blackName: black.name,
    result: null,
    forfeit: false,
    url: '',
    note: '',
  };
}

function makeBye(round, board, player) {
  return {
    id: gameId(round, board),
    round,
    board,
    white: player.id,
    black: null,
    whiteName: player.name,
    blackName: '',
    result: RESULT.BYE,
    forfeit: false,
    url: '',
    note: '',
  };
}

const roundsOf = (games) => [...new Set(games.map((g) => g.round))].sort((a, b) => a - b);

const gamesOfRound = (games, round) =>
  games.filter((g) => g.round === round).sort((a, b) => a.board - b.board);

function isRoundComplete(games, round) {
  const list = gamesOfRound(games, round);
  return list.length > 0 && list.every((g) => !!g.result);
}

function roundLabel(format, round, totalRounds) {
  if (format === FORMAT.KNOCKOUT) {
    const left = totalRounds - round + 1; // عدد الأدوار المتبقية شاملًا هذا الدور
    if (left <= 1) return 'النهائي';
    if (left === 2) return 'نصف النهائي';
    if (left === 3) return 'ربع النهائي';
    return `دور الـ${2 ** left}`;
  }
  return `الجولة ${round}`;
}

// ---------- الترتيب (سويسري / دوري) ----------
// النقاط ثم بوخهولتز ثم سونبورن–بيرجر ثم عدد الانتصارات ثم الاسم

function computeStandings(players, games) {
  const rows = new Map();
  for (const p of players) {
    rows.set(p.id, {
      id: p.id,
      name: p.name,
      handle: p.handle,
      active: p.active !== false,
      points: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      byes: 0,
      buchholz: 0,
      sonneborn: 0,
      opponents: [],
    });
  }

  for (const g of games) {
    if (!g.result) continue;
    const w = rows.get(g.white);
    if (g.result === RESULT.BYE) {
      if (w) {
        w.points += 1;
        w.byes += 1;
      }
      continue;
    }
    const b = rows.get(g.black);
    const pts = gamePoints(g.result);
    if (!pts || !w || !b) continue;
    w.points += pts[0];
    b.points += pts[1];
    w.played++;
    b.played++;
    if (pts[0] === 1) { w.wins++; b.losses++; }
    else if (pts[1] === 1) { b.wins++; w.losses++; }
    else { w.draws++; b.draws++; }
    w.opponents.push({ id: b.id, pts: pts[0] });
    b.opponents.push({ id: w.id, pts: pts[1] });
  }

  for (const r of rows.values()) {
    for (const o of r.opponents) {
      const opp = rows.get(o.id);
      r.buchholz += opp.points;
      r.sonneborn += o.pts * opp.points;
    }
  }

  const list = [...rows.values()];
  list.sort(
    (a, b) =>
      b.points - a.points ||
      b.buchholz - a.buchholz ||
      b.sonneborn - a.sonneborn ||
      b.wins - a.wins ||
      String(a.name).localeCompare(String(b.name), 'ar'),
  );

  const same = (a, b) =>
    a.points === b.points && a.buchholz === b.buchholz && a.sonneborn === b.sonneborn && a.wins === b.wins;
  list.forEach((r, i) => {
    r.rank = i > 0 && same(r, list[i - 1]) ? list[i - 1].rank : i + 1;
    r.tied = (i > 0 && same(r, list[i - 1])) || (i < list.length - 1 && same(r, list[i + 1]));
  });
  return list;
}

// ---------- أدوات الخطط الافتراضية ----------

function defaultRounds(format, n, { double = false } = {}) {
  const count = Math.max(2, n);
  if (format === FORMAT.KNOCKOUT) return Math.ceil(Math.log2(count));
  if (format === FORMAT.ROUND_ROBIN) {
    const single = n % 2 === 0 ? n - 1 : n;
    return Math.max(1, single) * (double ? 2 : 1);
  }
  return Math.max(1, Math.min(Math.ceil(Math.log2(count)), n - 1));
}

function planSummary(format, n, { double = false } = {}) {
  if (format === FORMAT.KNOCKOUT) {
    const size = 2 ** Math.ceil(Math.log2(Math.max(2, n)));
    const byes = size - n;
    return {
      rounds: Math.log2(size),
      games: Math.max(0, n - 1),
      note: byes > 0 ? `${byes} من اللاعبين سيعبرون الدور الأول مباشرة (راحة) لأن العدد ليس من قوى الرقم 2.` : '',
    };
  }
  if (format === FORMAT.ROUND_ROBIN) {
    const rounds = defaultRounds(format, n, { double });
    return {
      rounds,
      games: (n * (n - 1) / 2) * (double ? 2 : 1),
      note: n > 12 ? 'الدوري الكامل يطول مع هذا العدد من اللاعبين؛ النظام السويسري أنسب.' : '',
    };
  }
  const rounds = defaultRounds(format, n);
  return { rounds, games: Math.floor(n / 2) * rounds, note: '' };
}

function validateStart(format, activeCount) {
  if (activeCount < 2) return 'يلزم لاعبان معتمدان على الأقل لبدء البطولة.';
  if (format === FORMAT.ROUND_ROBIN && activeCount < 3) return 'نظام الدوري يحتاج 3 لاعبين على الأقل.';
  return '';
}

// ---------- النظام السويسري ----------

function buildHistory(players, games) {
  const hist = new Map();
  for (const p of players) hist.set(p.id, { points: 0, opp: new Set(), colors: [], byes: 0 });
  const ordered = [...games].sort((a, b) => a.round - b.round || a.board - b.board);
  for (const g of ordered) {
    const w = hist.get(g.white);
    if (g.result === RESULT.BYE) {
      if (w) { w.byes++; w.points += 1; }
      continue;
    }
    const b = hist.get(g.black);
    const pts = g.result ? gamePoints(g.result) : null;
    if (w) {
      w.colors.push('w');
      if (pts) w.points += pts[0];
      if (b) w.opp.add(g.black);
    }
    if (b) {
      b.colors.push('b');
      if (pts) b.points += pts[1];
      if (w) b.opp.add(g.white);
    }
  }
  return hist;
}

const colorBalance = (h) => h.colors.reduce((s, c) => s + (c === 'w' ? 1 : -1), 0);

// هل يستطيع اللاعب أخذ هذا اللون دون كسر القاعدة؟
// القاعدة: فارق (أبيض − أسود) لا يتجاوز 2، ولا يلعب اللون نفسه ثلاث مرات متتالية.
function canTake(h, color) {
  const after = colorBalance(h) + (color === 'w' ? 1 : -1);
  if (Math.abs(after) > 2) return false;
  const c = h.colors;
  const n = c.length;
  return !(n >= 2 && c[n - 1] === color && c[n - 2] === color);
}

const colorFeasible = (ha, hb) =>
  (canTake(ha, 'w') && canTake(hb, 'b')) || (canTake(ha, 'b') && canTake(hb, 'w'));

// يبحث عن تقسيم كامل للقائمة إلى أزواج، الأقرب ترتيبًا أولًا.
// strict: يرفض أي زوج لا يمكنه اللعب دون كسر قاعدة الألوان.
// rematch: يسمح بتكرار مواجهة سابقة (آخر الحلول).
function findPairs(list, hist, { strict, rematch }, budget = 30000) {
  const n = list.length;
  const used = new Array(n).fill(false);
  const out = [];
  let nodes = budget;

  function dfs() {
    if (nodes-- <= 0) return false;
    const i = used.indexOf(false);
    if (i === -1) return true;
    used[i] = true;
    const hi = hist.get(list[i].id);
    for (let j = i + 1; j < n; j++) {
      if (used[j]) continue;
      const hj = hist.get(list[j].id);
      if (!rematch && hi.opp.has(list[j].id)) continue;
      if (strict && !colorFeasible(hi, hj)) continue;
      used[j] = true;
      out.push([list[i], list[j]]);
      if (dfs()) return true;
      out.pop();
      used[j] = false;
    }
    used[i] = false;
    return false;
  }

  return dfs() ? out.slice() : null;
}

// توزيع الألوان على زوج: أولًا ما تسمح به القاعدة، ثم من لعب أبيض أقل،
// ثم من لعب أسود في الجولة السابقة، ثم تفضيل اللاعب، ثم القرعة.
function assignColors(a, b, hist, rng) {
  const ha = hist.get(a.id);
  const hb = hist.get(b.id);
  const aWhiteOk = canTake(ha, 'w') && canTake(hb, 'b');
  const bWhiteOk = canTake(ha, 'b') && canTake(hb, 'w');

  let aWhite = null;
  if (aWhiteOk && !bWhiteOk) aWhite = true;
  else if (bWhiteOk && !aWhiteOk) aWhite = false;

  if (aWhite === null) {
    const da = colorBalance(ha);
    const db = colorBalance(hb);
    if (da !== db) aWhite = da < db;
  }
  if (aWhite === null) {
    const la = ha.colors[ha.colors.length - 1] ?? null;
    const lb = hb.colors[hb.colors.length - 1] ?? null;
    if (la && lb && la !== lb) aWhite = la === 'b';
  }
  if (aWhite === null) {
    const pa = a.prefColor;
    const pb = b.prefColor;
    if (pa === 'white' && pb !== 'white') aWhite = true;
    else if (pb === 'white' && pa !== 'white') aWhite = false;
    else if (pa === 'black' && pb !== 'black') aWhite = false;
    else if (pb === 'black' && pa !== 'black') aWhite = true;
  }
  if (aWhite === null) aWhite = rng() < 0.5;
  return aWhite ? [a, b] : [b, a];
}

function pairSwiss(players, games, round, rng = secureRng()) {
  const active = players.filter((p) => p.active !== false);
  const warnings = [];
  if (active.length < 2) return { games: [], warnings: ['يلزم لاعبان نشطان على الأقل.'] };

  const hist = buildHistory(active, games);
  // الترتيب المبدئي: النقاط تنازليًا، وعشوائيًا بين المتساوين (الجولة الأولى = قرعة كاملة)
  const order = shuffle(active, rng).sort((a, b) => hist.get(b.id).points - hist.get(a.id).points);

  // عند العدد الفردي: الراحة للأدنى ترتيبًا ممن لم يستَرِح من قبل
  let byeGroups = [[-1]];
  if (order.length % 2 === 1) {
    const fresh = [];
    const taken = [];
    for (let i = order.length - 1; i >= 0; i--) {
      (hist.get(order[i].id).byes === 0 ? fresh : taken).push(i);
    }
    byeGroups = [fresh, taken];
  }

  // محاولات متدرجة: الأفضل أولًا، ثم نخفّف الشروط شرطًا بعد شرط.
  // (راحة جديدة + ألوان متوازنة) ← (راحة جديدة) ← (راحة مكررة) ← (السماح بإعادة مواجهة)
  const attempts = [];
  for (const group of byeGroups) {
    for (const strict of [true, false]) {
      for (const idx of group) attempts.push({ idx, strict, rematch: false });
    }
  }
  for (const idx of byeGroups.flat()) attempts.push({ idx, strict: false, rematch: true });

  const without = (idx) => (idx === -1 ? order : order.filter((_, k) => k !== idx));
  let chosen = null;
  for (const at of attempts) {
    const pairs = findPairs(without(at.idx), hist, at);
    if (pairs) {
      chosen = { pairs, bye: at.idx === -1 ? null : order[at.idx], rematch: at.rematch };
      break;
    }
  }
  if (!chosen) return { games: [], warnings: ['تعذّرت القرعة. جرّب إعادتها.'] };

  const scored = chosen.pairs.map(([a, b]) => {
    const pa = hist.get(a.id).points;
    const pb = hist.get(b.id).points;
    return { a, b, top: Math.max(pa, pb), low: Math.min(pa, pb) };
  });
  scored.sort((x, y) => y.top - x.top || y.low - x.low);

  let colorBreaks = 0;
  const out = scored.map((s, i) => {
    const [w, b] = assignColors(s.a, s.b, hist, rng);
    if (!canTake(hist.get(w.id), 'w') || !canTake(hist.get(b.id), 'b')) colorBreaks++;
    return makeGame(round, i + 1, w, b);
  });
  if (chosen.bye) out.push(makeBye(round, out.length + 1, chosen.bye));

  if (chosen.rematch) {
    warnings.push('تعذّرت قرعة بلا تكرار لمواجهات سابقة، فسُمح بإعادة مواجهة واحدة أو أكثر.');
  }
  if (chosen.bye && hist.get(chosen.bye.id).byes > 0) {
    warnings.push('اضطُرّ أحد اللاعبين للراحة للمرة الثانية لعدم وجود بديل.');
  }
  if (colorBreaks > 0) {
    warnings.push('تعذّر توازن الألوان تمامًا في هذه الجولة؛ سيلعب بعض اللاعبين لونهم نفسه أكثر من المعتاد.');
  }
  return { games: out, warnings };
}

// ---------- الدوري ----------
// طريقة الدائرة: لاعب ثابت والباقون يدورون، مع توزيع الألوان بالتناوب.

function generateRoundRobin(players, { double = false, rng = secureRng() } = {}) {
  const active = shuffle(players.filter((p) => p.active !== false), rng);
  if (active.length < 2) {
    return { games: [], totalRounds: 0, warnings: ['يلزم لاعبان نشطان على الأقل.'] };
  }
  const byId = new Map(active.map((p) => [p.id, p]));
  let ring = active.slice();
  if (ring.length % 2 === 1) ring.push(null); // null = راحة
  const n = ring.length;
  const half = n / 2;
  const single = n - 1;
  const games = [];

  for (let r = 0; r < single; r++) {
    const real = [];
    let bye = null;
    for (let i = 0; i < half; i++) {
      const p = ring[i];
      const q = ring[n - 1 - i];
      if (!p || !q) { bye = p || q; continue; }
      let pair;
      if (i === 0) pair = r % 2 === 0 ? [q, p] : [p, q]; // اللاعب الثابت يتناوب لونه
      else pair = i % 2 === 1 ? [p, q] : [q, p];
      real.push(pair);
    }
    real.forEach(([w, b], k) => games.push(makeGame(r + 1, k + 1, w, b)));
    if (bye) games.push(makeBye(r + 1, real.length + 1, bye));
    ring = [ring[0], ring[n - 1], ...ring.slice(1, n - 1)];
  }

  if (double) {
    const firstHalf = games.slice();
    for (const g of firstHalf) {
      const round = g.round + single;
      if (g.result === RESULT.BYE) games.push(makeBye(round, g.board, byId.get(g.white)));
      else games.push(makeGame(round, g.board, byId.get(g.black), byId.get(g.white)));
    }
  }
  return { games, totalRounds: double ? single * 2 : single, warnings: [] };
}

// ---------- خروج المغلوب ----------

// ترتيب البذور داخل الشجرة: 1 يقابل الأخير، والأقوى يبتعدون عن بعضهم
function seedOrder(size) {
  let order = [1, 2];
  while (order.length < size) {
    const total = order.length * 2 + 1;
    const next = [];
    for (const s of order) next.push(s, total - s);
    order = next;
  }
  return order.slice(0, size);
}

function generateKnockoutFirstRound(players, rng = secureRng()) {
  const active = shuffle(players.filter((p) => p.active !== false), rng); // ترتيب القرعة = البذور
  const n = active.length;
  if (n < 2) return { games: [], totalRounds: 0, bracketSize: 0, warnings: ['يلزم لاعبان نشطان على الأقل.'] };
  const size = 2 ** Math.ceil(Math.log2(n));
  const order = seedOrder(size);
  const games = [];
  for (let i = 0; i < size; i += 2) {
    const pa = active[order[i] - 1] ?? null;
    const pb = active[order[i + 1] - 1] ?? null;
    const board = i / 2 + 1;
    if (pa && pb) {
      const [w, b] = rng() < 0.5 ? [pa, pb] : [pb, pa];
      games.push(makeGame(1, board, w, b));
    } else {
      games.push(makeBye(1, board, pa || pb));
    }
  }
  return { games, totalRounds: Math.log2(size), bracketSize: size, warnings: [] };
}

function knockoutWinner(g) {
  if (g.result === RESULT.WHITE || g.result === RESULT.BYE) return { id: g.white, name: g.whiteName };
  if (g.result === RESULT.BLACK) return { id: g.black, name: g.blackName };
  return null; // التعادل غير مقبول في خروج المغلوب
}

function nextKnockoutRound(games, round, rng = secureRng()) {
  const prev = gamesOfRound(games, round - 1);
  const winners = prev.map(knockoutWinner);
  if (winners.length === 0 || winners.some((w) => !w)) {
    throw new Error('سجّل نتيجة حاسمة لكل مباريات الدور السابق أولًا.');
  }
  if (winners.length === 1) throw new Error('انتهت البطولة: لا أدوار بعد النهائي.');
  const out = [];
  for (let i = 0; i < winners.length; i += 2) {
    const [w, b] = rng() < 0.5 ? [winners[i], winners[i + 1]] : [winners[i + 1], winners[i]];
    out.push(makeGame(round, i / 2 + 1, w, b));
  }
  return { games: out, warnings: [] };
}

// ترتيب خروج المغلوب: البطل، الوصيف، ثم حسب الدور الذي خرج فيه اللاعب
function knockoutStandings(players, games, totalRounds) {
  const info = new Map(
    players.map((p) => [p.id, { id: p.id, name: p.name, handle: p.handle, exitRound: Infinity, wins: 0, status: 'alive' }]),
  );
  for (const g of games) {
    if (!g.result || g.result === RESULT.DRAW) continue;
    const winnerId = g.result === RESULT.BLACK ? g.black : g.white;
    const loserId = g.result === RESULT.BLACK ? g.white : g.black;
    const w = info.get(winnerId);
    if (w && g.result !== RESULT.BYE) w.wins++;
    const l = loserId ? info.get(loserId) : null;
    if (l) { l.exitRound = g.round; l.status = 'out'; }
    if (g.round === totalRounds && w) w.status = 'champion';
  }
  for (const r of info.values()) {
    if (r.status === 'out' && r.exitRound === totalRounds) r.status = 'runnerUp';
  }
  const weight = (r) => (r.status === 'champion' ? 3 : r.status === 'runnerUp' ? 2 : r.status === 'alive' ? 1 : 0);
  const list = [...info.values()];
  list.sort(
    (a, b) =>
      weight(b) - weight(a) ||
      (b.exitRound === Infinity ? 0 : b.exitRound) - (a.exitRound === Infinity ? 0 : a.exitRound) ||
      b.wins - a.wins ||
      String(a.name).localeCompare(String(b.name), 'ar'),
  );
  return list;
}

// ---------- مدخل موحّد لتوليد جولة جديدة ----------
// السويسري وخروج المغلوب يولّدان الجولة التالية؛ الدوري يولّد كل الجولات دفعة واحدة عند البدء.

function planRound({ format, players, games, round, double = false, rng = secureRng() }) {
  if (format === FORMAT.ROUND_ROBIN) {
    if (round !== 1) throw new Error('جولات الدوري تُولَّد كلها عند البدء.');
    return generateRoundRobin(players, { double, rng });
  }
  if (format === FORMAT.KNOCKOUT) {
    return round === 1
      ? generateKnockoutFirstRound(players, rng)
      : nextKnockoutRound(games, round, rng);
  }
  return pairSwiss(players, games, round, rng);
}
return { RESULT, FORMAT, FORMAT_LABEL, gameId, secureRng, seededRng, shuffle, gamePoints, winnerSide, roundsOf, gamesOfRound, isRoundComplete, roundLabel, computeStandings, defaultRounds, planSummary, validateStart, pairSwiss, generateRoundRobin, generateKnockoutFirstRound, nextKnockoutRound, knockoutStandings, planRound };
};
__defs["lib/files.js"] = function () {
// ---- lib/files.js ----
// ============================================================
// lib/files.js — تجهيز الملفات الخاصة (إرسال وتنزيل) بأمان
// • أنواع محدودة بلا أي نوع قابل للتنفيذ (لا HTML ولا SVG ولا سكربتات).
// • نتحقق من «توقيع» الملف الفعلي لا من الامتداد فقط (PDF/PNG/JPG)، والنصوص تُفحص أنها نص حقيقي.
// • لا يُعرض أي ملف داخل الصفحة: يُنزَّل فقط، فلا يُنفَّذ شيء منه في موقعك.
// • القواعد في firestore.rules تفرض نفس الحدود على الخادم، فهذا ليس خط الدفاع الوحيد.
// ============================================================

const MAX_FILE_BYTES = 600_000; // base64 بعدها ≈ 800 ألف حرف، تحت حدّ المستند (1 ميغابايت)
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.txt,.pgn';

const BY_EXT = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  txt: 'text/plain',
  pgn: 'application/x-chess-pgn',
};
const EXT_BY_MIME = {
  'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'text/plain': 'txt', 'application/x-chess-pgn': 'pgn',
};
const TYPE_LABEL = {
  'application/pdf': 'PDF', 'image/png': 'صورة PNG', 'image/jpeg': 'صورة JPG', 'text/plain': 'نص', 'application/x-chess-pgn': 'مباراة PGN',
};

const extOf = (name) => (String(name).toLowerCase().match(/\.([a-z0-9]{1,5})$/) || [])[1] || '';

// اسم ملف آمن: بلا مسارات ولا رموز خاصة ولا أحرف تحكّم، ويحتفظ بالامتداد الصحيح
function safeFileName(name, mime = '') {
  let base = String(name ?? '')
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*‪-‮⁦-⁩]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '');
  const ext = EXT_BY_MIME[mime] || extOf(base);
  if (ext && extOf(base) !== ext && !(ext === 'jpg' && extOf(base) === 'jpeg')) base = `${base.replace(/\.[a-z0-9]{1,5}$/i, '')}.${ext}`;
  if (base.length > 100) {
    const e = extOf(base);
    base = base.slice(0, 100 - (e ? e.length + 1 : 0)).trimEnd() + (e ? `.${e}` : '');
  }
  return base || `file.${ext || 'txt'}`;
}

const startsWith = (bytes, sig) => sig.every((b, i) => bytes[i] === b);

// هل محتوى الملف يطابق نوعه المعلن؟
function sniffMatches(bytes, mime) {
  if (mime === 'application/pdf') return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (mime === 'image/png') return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mime === 'image/jpeg') return startsWith(bytes, [0xff, 0xd8, 0xff]);
  // نص: UTF-8 صالح وبلا بايتات صفرية (يمنع تمرير ملفات ثنائية باسم txt)
  try {
    if (bytes.includes(0)) return false;
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return true;
  } catch { return false; }
}

function toBase64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

function fromBase64(text) {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// يقرأ ملفًا اختاره المنظّم ويجهّزه للإرسال، أو يرمي خطأ بالعربية
async function prepareFile(file) {
  if (!file) throw new Error('اختر ملفًا أولًا.');
  const mime = BY_EXT[extOf(file.name)];
  if (!mime) throw new Error('نوع الملف غير مسموح. المسموح: PDF، PNG، JPG، TXT، PGN.');
  if (file.size === 0) throw new Error('الملف فارغ.');
  if (file.size > MAX_FILE_BYTES) throw new Error(`الملف كبير: الحد الأقصى ${Math.floor(MAX_FILE_BYTES / 1000)} كيلوبايت (جرّب ضغط الصورة أو إرسال رابط).`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffMatches(bytes, mime)) throw new Error('محتوى الملف لا يطابق نوعه، فلن يُرسَل.');
  return { name: safeFileName(file.name, mime), mime, size: bytes.length, data: toBase64(bytes) };
}

function sizeText(n) {
  if (n < 1000) return `${n} بايت`;
  if (n < 1_000_000) return `${Math.round(n / 1000)} كيلوبايت`;
  return `${(n / 1_000_000).toFixed(1)} ميغابايت`;
}

// تنزيل ملف مستلَم. لا نعرضه في الصفحة أبدًا، ونعيد فحصه قبل التنزيل (دفاع إضافي).
function downloadShare(share) {
  const bytes = fromBase64(share.data);
  if (!sniffMatches(bytes, share.mime)) throw new Error('الملف تالف أو غير آمن، لن يُنزَّل.');
  const url = URL.createObjectURL(new Blob([bytes], { type: share.mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFileName(share.name, share.mime);
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
return { MAX_FILE_BYTES, ACCEPT, TYPE_LABEL, extOf, safeFileName, sniffMatches, toBase64, fromBase64, prepareFile, sizeText, downloadShare };
};
__defs["lib/validate.js"] = function () {
// ---- lib/validate.js ----
// ============================================================
// validate.js — تنظيف وفحص مدخلات اللاعبين
// يُستخدم في الواجهة، وتطابقه قواعد Firestore (firestore.rules)
// حتى لو تجاوز أحدهم الواجهة وأرسل طلبًا مباشرًا.
// ============================================================

// اسم المستخدم في Chess.com أو Lichess: حروف إنجليزية وأرقام و _ و -
const HANDLE_RE = /^[A-Za-z0-9_-]{2,25}$/;
const NAME_MIN = 2;
const NAME_MAX = 40;
const COLOR_PREFS = Object.freeze(['any', 'white', 'black']);

// يحذف محارف التحكم والاتجاه الخفية (تُستعمل لانتحال الأسماء) وعلامتي < >
// ثم يوحّد المسافات.
function cleanName(input) {
  return String(input ?? '')
    .normalize('NFKC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F؜​-‏‪-‮⁦-⁩<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanHandle(input) {
  return String(input ?? '').trim().replace(/^@/, '').replace(/\s+/g, '');
}

// معرّف ثابت للاعب داخل البطولة (يمنع تسجيل نفس الحساب مرتين)
const handleKey = (handle) => String(handle).toLowerCase();

// يرجع نص الخطأ بالعربية، أو '' إن كانت القيمة سليمة
function checkName(name) {
  if (name.length < NAME_MIN) return 'اكتب اسمك (حرفان على الأقل).';
  if (name.length > NAME_MAX) return `الاسم طويل؛ الحد الأقصى ${NAME_MAX} حرفًا.`;
  return '';
}

function checkHandle(handle) {
  if (!handle) return 'اكتب اسم المستخدم في Chess.com.';
  if (!HANDLE_RE.test(handle)) {
    return 'اسم المستخدم حروف إنجليزية وأرقام و _ و - فقط (من 2 إلى 25 حرفًا).';
  }
  return '';
}

// ---------- رقم الهاتف ----------
// نقبل الأرقام العربية الهندية، والمسافات والشرطات والأقواس، وبادئة 00 أو +.
// المخزَّن: أرقام فقط (7 إلى 15) وقد يبدأ بـ + — ويطابقه شرط القواعد.
const PHONE_RE = /^\+?[0-9]{7,15}$/;

function cleanPhone(input) {
  let v = String(input ?? '').normalize('NFKC')
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06F0))
    .replace(/[\s().\-\u00A0]/g, '');
  if (v.startsWith('00')) v = '+' + v.slice(2);
  return v;
}

function checkPhone(phone) {
  if (!phone) return 'اكتب رقم هاتفك.';
  if (!PHONE_RE.test(phone)) return 'رقم الهاتف غير صحيح: أرقام فقط (من 7 إلى 15 رقمًا) ويمكن أن يبدأ بـ +.';
  return '';
}

// رابط واتساب (للمنظّم): أرقام فقط بعد wa.me
function whatsappUrl(phone) {
  return PHONE_RE.test(String(phone)) ? `https://wa.me/${String(phone).replace(/^\+/, '')}` : null;
}

// ---------- تاريخ البطولة (YYYY-MM-DD) ----------
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(v) {
  if (!DATE_RE.test(String(v))) return false;
  const [y, m, d] = String(v).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 2000 && y <= 2100;
}

function normalizeColorPref(value) {
  return COLOR_PREFS.includes(value) ? value : 'any';
}

// رابط الملف الشخصي — فقط إذا كان الاسم سليمًا
function profileUrl(handle) {
  return HANDLE_RE.test(String(handle)) ? `https://www.chess.com/member/${encodeURIComponent(handle)}` : null;
}

// رابط المباراة: https فقط ومن مواقع الشطرنج المعروفة (يمنع javascript: وغيره)
const GAME_HOSTS = new Set(['chess.com', 'www.chess.com', 'lichess.org', 'www.lichess.org']);
function safeGameUrl(value) {
  if (!value) return null;
  try {
    const u = new URL(String(value).trim());
    if (u.protocol !== 'https:') return null;
    if (!GAME_HOSTS.has(u.hostname.toLowerCase())) return null;
    if (u.href.length > 200) return null;
    return u.href;
  } catch {
    return null;
  }
}
return { HANDLE_RE, NAME_MIN, NAME_MAX, COLOR_PREFS, cleanName, cleanHandle, handleKey, checkName, checkHandle, PHONE_RE, cleanPhone, checkPhone, whatsappUrl, DATE_RE, isValidDate, normalizeColorPref, profileUrl, safeGameUrl };
};
__defs["model.js"] = function () {
// ---- model.js ----
// ============================================================
// model.js — تطبيع المستندات القادمة من قاعدة البيانات
// قيم افتراضية آمنة، وتحويل الأنواع، حتى لو كان مستند ناقصًا.
// ============================================================

const str = (v, d = '') => (typeof v === 'string' ? v : d);
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

function toTournament(d) {
  return {
    id: d.id,
    name: str(d.name),
    format: ['swiss', 'roundrobin', 'knockout'].includes(d.format) ? d.format : 'swiss',
    double: d.double === true,
    totalRounds: num(d.totalRounds),
    currentRound: num(d.currentRound),
    timeControl: str(d.timeControl),
    description: str(d.description),
    date: /^\d{4}-\d{2}-\d{2}$/.test(str(d.date)) ? d.date : '', // موعد البطولة YYYY-MM-DD (قد يكون فارغًا في بطولات قديمة)
    status: ['registration', 'running', 'finished'].includes(d.status) ? d.status : 'registration',
    maxPlayers: num(d.maxPlayers, 32),
    playerCount: num(d.playerCount),
    inviteRequired: d.inviteRequired === true,
    published: d.published === true,               // مرئية للجمهور؟ (مسودة افتراضيًا)
    registrationOpen: d.registrationOpen === true, // هل يقبل التسجيل الآن؟
    rev: num(d.rev),
    createdAt: num(d.createdAt),
  };
}

function toPlayer(d) {
  return {
    id: d.id,
    name: str(d.name),
    handle: str(d.handle),
    prefColor: ['any', 'white', 'black'].includes(d.prefColor) ? d.prefColor : 'any',
    active: d.active !== false,
    createdAt: num(d.createdAt),
  };
}

function toRegistration(d) {
  return {
    id: d.id,
    name: str(d.name),
    handle: str(d.handle),
    phone: str(d.phone), // خاص: يراه المنظّم وصاحب الطلب فقط، ولا يُنسخ إلى قائمة اللاعبين العامة
    prefColor: ['any', 'white', 'black'].includes(d.prefColor) ? d.prefColor : 'any',
    code: str(d.code),
    uid: str(d.uid), // فارغ إن سجّل الزائر بلا حساب
    createdAt: num(d.createdAt),
  };
}

// ملف لاعب (مستند users/{uid}) كما يراه المنظّم عند اختيار المستلمين
function toProfile(d) {
  return {
    uid: d.id,
    name: str(d.name),
    handle: str(d.handle),
    createdAt: num(d.createdAt),
  };
}

// ملف خاص (shares/{id}). data (محتوى الملف) غير موجود في القوائم، ويُجلب عند التنزيل فقط.
const SHARE_MIMES = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain', 'application/x-chess-pgn'];
function toShare(d) {
  return {
    id: d.id,
    owner: str(d.owner),
    recipients: Array.isArray(d.recipients) ? d.recipients.filter((x) => typeof x === 'string') : [],
    name: str(d.name),
    mime: SHARE_MIMES.includes(d.mime) ? d.mime : 'text/plain',
    size: num(d.size),
    message: str(d.message),
    data: typeof d.data === 'string' ? d.data : '',
    createdAt: num(d.createdAt),
  };
}

function toGame(d) {
  return {
    id: d.id,
    round: num(d.round),
    board: num(d.board),
    white: str(d.white),
    black: d.black ? str(d.black) : null,
    whiteName: str(d.whiteName),
    blackName: str(d.blackName),
    result: ['1-0', '0-1', '1/2-1/2', 'bye'].includes(d.result) ? d.result : null,
    forfeit: d.forfeit === true,
    url: str(d.url),
    note: str(d.note),
  };
}

// الحقول التي تُحفظ في مستند المباراة (بلا أي حقول إضافية)
function gameFields(g) {
  return {
    id: g.id,
    round: g.round,
    board: g.board,
    white: g.white,
    black: g.black ?? null,
    whiteName: g.whiteName,
    blackName: g.blackName || '',
    result: g.result ?? null,
    forfeit: !!g.forfeit,
    url: g.url || '',
    note: g.note || '',
  };
}

function newId(length = 10) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

// رمز دعوة بالشكل CHESS-XXXXXX: ست خانات عشوائية بلا حروف ملتبسة (0 O 1 I L).
// 31^6 ≈ 887 مليون احتمال، وتخمينه عبر القواعد غير ممكن عمليًا لأن الرمز لا يظهر لغير المنظّم.
const INVITE_PREFIX = 'CHESS-';
const INVITE_RE = /^CHESS-[A-Z0-9]{6}$/;
function newInviteCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return INVITE_PREFIX + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

// أثناء الكتابة فقط: أحرف كبيرة وأرقام وشرطة، بلا أي إعادة تشكيل (حتى لا يتشوّش المؤشر)
const looseCode = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);

// تنظيف ما يكتبه اللاعب عند الإرسال: يقبل chess-ab12cd أو CHESSAB12CD أو AB12CD ويرجّعه بالشكل CHESS-AB12CD.
// الرموز القديمة (8 خانات بلا بادئة) تبقى كما هي حتى لا تنكسر بطولات سابقة.
function cleanCode(v) {
  const raw = String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.startsWith('CHESS') && raw.length === 11) return INVITE_PREFIX + raw.slice(5);
  if (raw.length === 6) return INVITE_PREFIX + raw;
  return raw.slice(0, 20);
}
return { toTournament, toPlayer, toRegistration, toProfile, SHARE_MIMES, toShare, toGame, gameFields, newId, INVITE_PREFIX, INVITE_RE, newInviteCode, looseCode, cleanCode };
};
__defs["store-demo.js"] = function () {
// ---- store-demo.js ----
// ============================================================
// store-demo.js — وضع تجريبي يعمل بلا إنترنت ولا Firebase
// البيانات تُحفظ في متصفحك أنت فقط (localStorage) ولا يراها أحد غيرك.
// يُستخدم لمعاينة الموقع وتجربة القرعة والنتائج قبل ربطه بـ Firebase.
// يحاكي نفس قيود قواعد الحماية (التسجيل المغلق، رمز الدعوة، التكرار).
// دخول المنظّم بإيميل وكلمة مرور تنشئهما أنت أول مرة (تُحفظ بصمتها محليًا فقط)، لا دخول بلا كلمة مرور.
// ============================================================

const { FsError } = __r("firestore-rest.js");
const { toTournament, toPlayer, toGame, toRegistration, gameFields, newId, newInviteCode } = __r("model.js");
const { checkName, checkHandle, PHONE_RE } = __r("lib/validate.js");

// مفتاح جديد عمدًا: النسخة القديمة (v1) كانت تحتوي بيانات وهمية، فلا نقرؤها أبدًا.
const KEY = 'ct_demo_db_v2';
const OLD_KEYS = ['ct_demo_db_v1'];
const SESSION = 'ct_demo_admin_v1';
// حساب المنظّم التجريبي: يُنشئه صاحب المتصفح أول مرة (بريد + كلمة مرور من اختياره).
// لا تُحفظ كلمة المرور نفسها أبدًا، بل بصمتها فقط (PBKDF2 مع ملح عشوائي)، ولا شيء منها في الكود.
const ACCOUNT = 'ct_demo_account_v1';
const PBKDF2_ITERATIONS = 150_000;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const BAD_LOGIN = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const clone = (v) => JSON.parse(JSON.stringify(v));
const denied = () => new FsError(403, 'PERMISSION_DENIED', 'مرفوض');
const fail = (message) => new Error(message);

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const sameBytes = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]; // مقارنة كاملة بلا خروج مبكر
  return diff === 0;
};

async function fingerprint(password, salt, iterations) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw fail('هذا المتصفح لا يدعم التشفير اللازم للحساب التجريبي. جرّب متصفحًا حديثًا.');
  const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

function readAccount() {
  try {
    const a = JSON.parse(localStorage.getItem(ACCOUNT) || 'null');
    return a && typeof a.email === 'string' && typeof a.salt === 'string' && typeof a.hash === 'string' ? a : null;
  } catch { return null; }
}

// لا بيانات وهمية: التجربة تبدأ فارغة، وكل ما تراه أنشأتَه أنت.
function emptyDb() { return { tournaments: {} }; }

function createDemoStore() {
  let db;
  try { for (const k of OLD_KEYS) localStorage.removeItem(k); } catch { /* ignore */ }
  try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { db = null; }
  if (!db || !db.tournaments) db = emptyDb();

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } };
  save();

  const listeners = new Set();
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem(SESSION) || 'null'); } catch { session = null; }
  // جلسة بلا حساب مطابق (أو بريد مختلف) لا قيمة لها: نتجاهلها ونمسحها
  if (session && readAccount()?.email !== session.email) {
    session = null;
    try { sessionStorage.removeItem(SESSION); } catch { /* ignore */ }
  }
  const emit = () => listeners.forEach((cb) => cb(current()));
  const current = () => (session ? { uid: 'demo-admin', email: session.email } : null);
  const start = (email) => {
    session = { email };
    try { sessionStorage.setItem(SESSION, JSON.stringify(session)); } catch { /* ignore */ }
    emit();
  };
  const needAdmin = () => { if (!session) throw denied(); };
  const visible = (row) => !!session || row.t.published === true;
  const need = (tid) => { const row = db.tournaments[tid]; if (!row) throw new FsError(404, 'NOT_FOUND'); return row; };
  const bump = (row, patch = {}) => { Object.assign(row.t, patch); row.t.rev = (row.t.rev || 0) + 1; };

  // كل تبويب يقرأ أحدث نسخة من localStorage قبل أي عملية، فيتصرف الوضع التجريبي
  // كقاعدة بيانات مشتركة بين التبويبات (مثل Firebase الحقيقي).
  const refresh = () => {
    try { const fresh = JSON.parse(localStorage.getItem(KEY) || 'null'); if (fresh?.tournaments) db = fresh; } catch { /* ignore */ }
  };

  const api = {
    mode: 'demo',
    auth: {
      ready: Promise.resolve(),
      current,
      getToken: async () => null,
      hasAccount: () => !!readAccount(),
      // أول مرة فقط: ينشئ صاحب المتصفح حساب المنظّم التجريبي ويدخل به. لا يمكن إنشاء حساب ثانٍ فوق الأول.
      async createAccount(email, password) {
        const mail = String(email ?? '').trim().toLowerCase();
        const pass = String(password ?? '');
        if (readAccount()) throw fail('حساب المنظّم التجريبي موجود بالفعل. سجّل الدخول به.');
        if (!EMAIL_RE.test(mail)) throw fail('صيغة البريد الإلكتروني غير صحيحة.');
        if (pass.length < PASSWORD_MIN) throw fail(`كلمة المرور قصيرة: ${PASSWORD_MIN} أحرف على الأقل.`);
        if (pass.length > PASSWORD_MAX) throw fail('كلمة المرور طويلة جدًا.');
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const hash = await fingerprint(pass, salt, PBKDF2_ITERATIONS);
        if (readAccount()) throw fail('حساب المنظّم التجريبي موجود بالفعل. سجّل الدخول به.'); // سباق بين تبويبين
        try {
          localStorage.setItem(ACCOUNT, JSON.stringify({ email: mail, salt: toB64(salt), hash: toB64(hash), iterations: PBKDF2_ITERATIONS }));
        } catch { throw fail('تعذّر حفظ الحساب في هذا المتصفح (قد يكون التخزين معطّلًا).'); }
        start(mail);
      },
      // الدخول دائمًا ببريد وكلمة مرور. لا يوجد زر دخول بلا كلمة مرور.
      async signIn(email, password) {
        const account = readAccount();
        if (!account) throw fail('لا يوجد حساب منظّم تجريبي بعد. أنشئه أولًا.');
        const mail = String(email ?? '').trim().toLowerCase();
        const pass = String(password ?? '');
        let ok = false;
        if (pass.length > 0 && pass.length <= PASSWORD_MAX) {
          const got = await fingerprint(pass, fromB64(account.salt), Number(account.iterations) || PBKDF2_ITERATIONS);
          ok = sameBytes(got, fromB64(account.hash)) && mail === account.email;
        }
        if (!ok) throw fail(BAD_LOGIN); // نفس الرسالة للبريد الخاطئ وكلمة المرور الخاطئة
        start(account.email);
      },
      signOut() {
        session = null;
        try { sessionStorage.removeItem(SESSION); } catch { /* ignore */ }
        emit();
      },
      onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    },
    // «مسح بيانات التجربة»: يحذف البطولات وحساب المنظّم التجريبي ويُخرج الجلسة (وبه تُستعاد النسخة إن نسيتَ كلمة المرور)
    reset() {
      db = emptyDb(); save();
      try { localStorage.removeItem(ACCOUNT); } catch { /* ignore */ }
      session = null;
      try { sessionStorage.removeItem(SESSION); } catch { /* ignore */ }
      emit();
    },
    async isAdmin() { return !!session; },
    // الوضع التجريبي: حساب واحد هو المنظّم. حسابات اللاعبين والملفات الخاصة تحتاج الموقع الحقيقي (Firebase).
    async getAccount() { return session ? { role: 'organizer', profile: null } : { role: null, profile: null }; },
    async getMyRegistration() { return null; },

    // يحاكي القواعد: الجمهور يرى المنشورة فقط، والمنظّم يطلب الكل بـ { all: true }
    async listTournaments({ all = false } = {}) {
      if (all) needAdmin();
      return Object.values(db.tournaments)
        .filter((r) => all || r.t.published === true)
        .map((r) => toTournament(r.t)).sort((a, b) => b.createdAt - a.createdAt);
    },
    async getTournament(tid) {
      const r = db.tournaments[tid];
      if (!r || !visible(r)) return null;
      return toTournament(clone(r.t));
    },
    async getPlayers(tid) {
      const row = need(tid);
      if (!visible(row)) throw denied();
      return Object.values(row.players).map((p) => toPlayer(clone(p)))
        .sort((a, b) => a.createdAt - b.createdAt);
    },
    async getGames(tid) {
      const row = need(tid);
      if (!visible(row)) throw denied();
      return Object.values(row.games).map((g) => toGame(clone(g)))
        .sort((a, b) => a.round - b.round || a.board - b.board);
    },

    // نفس شروط قواعد الحماية: منشورة + التسجيل مفتوح + لم يكتمل العدد + لا تكرار + رمز الدعوة
    async register(tid, { name, handle, phone, prefColor, code }) {
      const row = need(tid);
      const key = handle.toLowerCase();
      const t = row.t;
      if (!(t.published === true && t.registrationOpen === true && t.status === 'registration')) throw denied();
      if ((t.playerCount || 0) >= (t.maxPlayers || 32)) throw denied();
      if (checkName(name) || checkHandle(handle) || !['any', 'white', 'black'].includes(prefColor)) throw denied();
      if (typeof phone !== 'string' || !PHONE_RE.test(phone)) throw denied();
      if (row.players[key] || row.registrations[key]) throw denied();
      if (!row.invite || row.invite !== code) throw denied(); // لا تسجيل بلا رمز دعوة مطابق (كالقواعد)
      row.registrations[key] = { id: key, name, handle, phone, prefColor, code, createdAt: Date.now() };
      save();
    },
    async getRegistrations(tid) {
      needAdmin();
      return Object.values(need(tid).registrations).map((r) => toRegistration(clone(r))).sort((a, b) => a.createdAt - b.createdAt);
    },
    async getContacts(tid) { needAdmin(); return { ...(need(tid).contacts || {}) }; },
    async getInviteCode(tid) { needAdmin(); return need(tid).invite || ''; },

    async createTournament(data, inviteCode, { publish = false } = {}) {
      needAdmin();
      const id = newId(10);
      inviteCode = inviteCode || newInviteCode();
      db.tournaments[id] = {
        t: { ...data, id, status: 'registration', currentRound: 0, totalRounds: 0, playerCount: 0, rev: 0, inviteRequired: true, published: !!publish, registrationOpen: !!publish, createdAt: Date.now() },
        players: {}, games: {}, registrations: {}, contacts: {}, invite: inviteCode,
      };
      save();
      return id;
    },
    async updateTournament(tid, patch) { needAdmin(); bump(need(tid), patch); save(); },
    async setInviteCode(tid, code) {
      needAdmin();
      if (!code) throw new Error('رمز الدعوة إلزامي ولا يمكن إلغاؤه. أنشئ رمزًا جديدًا بدلًا منه.');
      const r = need(tid); r.invite = code; bump(r, { inviteRequired: true }); save();
    },
    async deleteTournament(tid) { needAdmin(); delete db.tournaments[tid]; save(); },

    async approveRegistrations(tid, regs, tpatch = {}) {
      needAdmin();
      const row = need(tid);
      for (const r of regs) {
        row.players[r.id] = { id: r.id, name: r.name, handle: r.handle, prefColor: r.prefColor, active: true, createdAt: Date.now() };
        if (r.phone) (row.contacts ||= {})[r.id] = r.phone; // خاص بالمنظّم: لا يدخل مستند اللاعب العام
        delete row.registrations[r.id];
      }
      bump(row, tpatch); save();
    },
    async rejectRegistration(tid, key) { needAdmin(); delete need(tid).registrations[key]; save(); },
    async rejectRegistrations(tid, keys) { needAdmin(); const row = need(tid); for (const k of keys) delete row.registrations[k]; save(); },
    async addPlayer(tid, { key, name, handle, prefColor = 'any' }, tpatch = {}) {
      needAdmin();
      const row = need(tid);
      if (row.players[key]) throw new FsError(409, 'ALREADY_EXISTS');
      row.players[key] = { id: key, name, handle, prefColor, active: true, createdAt: Date.now() };
      bump(row, tpatch); save();
    },
    async patchPlayer(tid, key, patch, tpatch = {}) {
      needAdmin();
      const row = need(tid);
      Object.assign(row.players[key], patch);
      bump(row, tpatch); save();
    },
    async removePlayer(tid, key, tpatch = {}) {
      needAdmin();
      const row = need(tid);
      delete row.players[key];
      if (row.contacts) delete row.contacts[key];
      bump(row, tpatch); save();
    },

    async publishGames(tid, games, tpatch = {}) {
      needAdmin();
      const row = need(tid);
      for (const g of games) row.games[g.id] = gameFields(g);
      bump(row, tpatch); save();
    },
    async deleteGames(tid, ids, tpatch = {}) {
      needAdmin();
      const row = need(tid);
      for (const id of ids) delete row.games[id];
      bump(row, tpatch); save();
    },
    async patchGame(tid, gid, patch) {
      needAdmin();
      const row = need(tid);
      Object.assign(row.games[gid], patch);
      bump(row); save();
    },
  };

  for (const [name, fn] of Object.entries(api)) {
    if (typeof fn === 'function' && name !== 'reset') api[name] = (...args) => { refresh(); return fn(...args); };
  }
  return api;
}
return { createDemoStore };
};
__defs["store-remote.js"] = function () {
// ---- store-remote.js ----
// ============================================================
// store-remote.js — طبقة البيانات الحقيقية (Firebase)
//
// تصميم القراءة: صفحة اللاعب تستعلم عن مستند البطولة وحده (قراءة واحدة)
// وتجلب اللاعبين والمباريات فقط عندما يتغير الحقل rev الذي يرفعه المنظّم
// عند كل تعديل. هذا يبقي الموقع داخل الحصة المجانية حتى مع جمهور كبير.
//
// بنية البيانات:
//   tournaments/{tid}                      القراءة للجمهور بعد النشر (published) فقط، كتابة المنظّم فقط
//   tournaments/{tid}/players/{key}        اللاعبون المعتمدون (للجمهور بعد النشر)
//   tournaments/{tid}/games/{gid}          المباريات والنتائج (للجمهور بعد النشر)
//   tournaments/{tid}/registrations/{key}  طلبات التسجيل: الجميع يكتب، المنظّم وحده يقرأ
//   tournaments/{tid}/private/settings     رمز الدعوة (المنظّم فقط)
//   admins/{uid}                           من يملك صلاحية المنظّم (يُنشأ يدويًا فقط)
//   users/{uid}                            ملف اللاعب (دوره competitor دائمًا). المنظّم ليس له مستند هنا
//   shares/{id}                            ملف خاص من المنظّم إلى لاعبين محدّدين (المستلمون وصاحبه فقط)
// ============================================================

const { createAuth } = __r("auth-rest.js");
const { createFirestore } = __r("firestore-rest.js");
const { toTournament, toPlayer, toGame, toRegistration, toProfile, toShare, gameFields, newId, newInviteCode } = __r("model.js");

const SHARE_META = ['owner', 'recipients', 'name', 'mime', 'size', 'message', 'createdAt']; // بلا محتوى الملف

function createRemoteStore({ projectId, apiKey }) {
  const auth = createAuth({ apiKey });
  const fs = createFirestore({ projectId, apiKey, getToken: auth.getToken });
  const { write } = fs;

  const T = (tid) => `tournaments/${tid}`;
  const bump = (tid, patch = {}) => write.patch(T(tid), patch, { increments: ['rev'] });

  const needMe = () => {
    const me = auth.current();
    if (!me) throw new Error('سجّل الدخول أولًا.');
    return me;
  };

  return {
    mode: 'remote',
    auth,

    async isAdmin() {
      const me = auth.current();
      if (!me) return false;
      try {
        return !!(await fs.getDoc(`admins/${me.uid}`));
      } catch (e) {
        if (e.denied) return false;
        throw e;
      }
    },

    // ----- الحسابات -----
    // الدور لا يُخزَّن عند العميل ولا يُختار: المنظّم = مستند في admins، واللاعب = مستند في users.
    // النتيجة: { role: 'organizer' | 'competitor' | 'none' | null (لا جلسة), profile }
    async getAccount() {
      const me = auth.current();
      if (!me) return { role: null, profile: null };
      if (await this.isAdmin()) return { role: 'organizer', profile: null };
      try {
        const d = await fs.getDoc(`users/${me.uid}`);
        return d ? { role: 'competitor', profile: toProfile(d) } : { role: 'none', profile: null };
      } catch (e) {
        if (e.denied) return { role: 'none', profile: null };
        throw e;
      }
    },
    // حساب لاعب جديد: بريد وكلمة مرور ثم ملفه. لا نرسل أي «دور» من هنا؛ القواعد تفرضه.
    async signUpCompetitor({ email, password, name, handle }) {
      await auth.signUp(email, password);
      await this.saveProfile({ name, handle });
    },
    // ينشئ الملف إن لم يوجد، أو يعدّل الاسم/الحساب فقط
    async saveProfile({ name, handle }) {
      const me = needMe();
      const existing = await fs.getDoc(`users/${me.uid}`);
      if (existing) {
        await fs.commit([write.patch(`users/${me.uid}`, { name, handle })]);
      } else {
        await fs.commit([write.set(`users/${me.uid}`, { role: 'competitor', name, handle }, {
          mustNotExist: true, serverTime: ['createdAt'],
        })]);
      }
    },
    // المنظّم: قائمة اللاعبين لاختيار المستلمين (المنظّمون لا يظهرون فيها أبدًا)
    async listCompetitors() {
      const me = needMe();
      const docs = await fs.list('', 'users');
      return docs.map(toProfile).filter((p) => p.uid !== me.uid).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    },

    // ----- الملفات الخاصة -----
    async sendShare({ recipients, name, mime, size, data, message = '' }) {
      const me = needMe();
      const id = newId(14);
      await fs.commit([
        write.set(`shares/${id}`, { owner: me.uid, recipients, name, mime, size, data, message }, {
          mustNotExist: true, serverTime: ['createdAt'],
        }),
      ]);
      return id;
    },
    // ما أرسله المنظّم (بلا محتوى الملف)
    async listSentShares() {
      const me = needMe();
      const docs = await fs.list('', 'shares', { where: [{ field: 'owner', value: me.uid }], select: SHARE_META });
      return docs.map(toShare).sort((a, b) => b.createdAt - a.createdAt);
    },
    // ما وصل اللاعب (بلا محتوى الملف). الاستعلام نفسه مقيّد بمعرّفه، والقواعد ترفض غيره.
    async listMyShares() {
      const me = needMe();
      const docs = await fs.list('', 'shares', {
        where: [{ field: 'recipients', op: 'ARRAY_CONTAINS', value: me.uid }], select: SHARE_META,
      });
      return docs.map(toShare).sort((a, b) => b.createdAt - a.createdAt);
    },
    async getShare(id) {
      needMe();
      const d = await fs.getDoc(`shares/${id}`);
      return d ? toShare(d) : null;
    },
    async deleteShare(id) {
      needMe();
      await fs.commit([write.remove(`shares/${id}`)]);
    },

    // ----- قراءة -----
    // الجمهور يرى المنشورة فقط (القواعد تفرض ذلك). المنظّم يطلب الكل بـ { all: true }.
    async listTournaments({ all = false } = {}) {
      const docs = await fs.list('', 'tournaments', { where: all ? [] : [{ field: 'published', value: true }] });
      return docs.map(toTournament).sort((a, b) => b.createdAt - a.createdAt);
    },
    // البطولة غير المنشورة ترفضها القواعد (403) فتبدو للزائر «غير موجودة»؛ لا نكشف أنها موجودة.
    async getTournament(tid) {
      try {
        const d = await fs.getDoc(T(tid));
        return d ? toTournament(d) : null;
      } catch (e) {
        if (e.denied) return null;
        throw e;
      }
    },
    async getPlayers(tid) {
      const docs = await fs.list(T(tid), 'players');
      return docs.map(toPlayer).sort((a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name, 'ar'));
    },
    async getGames(tid) {
      const docs = await fs.list(T(tid), 'games');
      return docs.map(toGame).sort((a, b) => a.round - b.round || a.board - b.board);
    },

    // ----- تسجيل اللاعبين (عام) -----
    // القواعد ترفض الطلب إن كان التسجيل مغلقًا أو الرمز خاطئًا أو الحساب مكررًا.
    // uid (اختياري): من يسجّل بحسابه يربط الطلب بنفسه، فيرى حالة طلبه لاحقًا.
    async register(tid, { name, handle, phone, prefColor, code, uid }) {
      const key = handle.toLowerCase();
      const fields = { name, handle, phone, prefColor, code };
      if (uid) {
        if (auth.current()?.uid !== uid) throw new Error('انتهت جلستك. سجّل الدخول من جديد.');
        fields.uid = uid;
      }
      await fs.commit([
        write.set(`${T(tid)}/registrations/${key}`, fields, {
          mustNotExist: true,
          serverTime: ['createdAt'],
        }),
      ]);
    },
    // حالة طلبي: الطلب نفسه إن بقي، وإلا null (القواعد تسمح لصاحب الطلب فقط؛ الرفض يعني «لا طلب لك»)
    async getMyRegistration(tid, handle) {
      try {
        const d = await fs.getDoc(`${T(tid)}/registrations/${String(handle).toLowerCase()}`);
        return d ? toRegistration(d) : null;
      } catch (e) {
        if (e.denied) return null;
        throw e;
      }
    },

    // ----- المنظّم: قراءة خاصة -----
    async getRegistrations(tid) {
      const docs = await fs.list(T(tid), 'registrations');
      return docs.map(toRegistration).sort((a, b) => a.createdAt - b.createdAt);
    },
    // أرقام هواتف المقبولين (مستندات private/c-<key>): للمنظّم وحده، ولا تُنسخ إلى قائمة اللاعبين العامة
    async getContacts(tid) {
      const docs = await fs.list(T(tid), 'private');
      const out = {};
      for (const d of docs) if (/^c-/.test(d.id) && typeof d.phone === 'string') out[d.id.slice(2)] = d.phone;
      return out;
    },
    async getInviteCode(tid) {
      const d = await fs.getDoc(`${T(tid)}/private/settings`);
      return d && typeof d.inviteCode === 'string' ? d.inviteCode : '';
    },

    // ----- المنظّم: البطولات -----
    // publish: true ← تظهر فورًا للاعبين ويفتح التسجيل؛ false ← مسودة لا يراها أحد غيرك
    // رمز الدعوة إلزامي: يُنشأ تلقائيًا إن لم يُمرَّر، فلا توجد بطولة بلا رمز.
    async createTournament(data, inviteCode, { publish = false } = {}) {
      const tid = newId(10);
      inviteCode = inviteCode || newInviteCode();
      await fs.commit([
        write.set(T(tid), { ...data, status: 'registration', currentRound: 0, totalRounds: 0, playerCount: 0, rev: 0, inviteRequired: true, published: !!publish, registrationOpen: !!publish }, {
          mustNotExist: true,
          serverTime: ['createdAt'],
        }),
        write.set(`${T(tid)}/private/settings`, { inviteCode }),
      ]);
      return tid;
    },
    async updateTournament(tid, patch) {
      await fs.commit([bump(tid, patch)]);
    },
    async setInviteCode(tid, code) {
      if (!code) throw new Error('رمز الدعوة إلزامي ولا يمكن إلغاؤه. أنشئ رمزًا جديدًا بدلًا منه.');
      await fs.commit([
        write.set(`${T(tid)}/private/settings`, { inviteCode: code }),
        bump(tid, { inviteRequired: true }),
      ]);
    },
    async deleteTournament(tid) {
      const [players, games, regs, priv] = await Promise.all([
        fs.list(T(tid), 'players'), fs.list(T(tid), 'games'), fs.list(T(tid), 'registrations'), fs.list(T(tid), 'private'),
      ]);
      const ops = [
        ...players.map((p) => write.remove(`${T(tid)}/players/${p.id}`)),
        ...games.map((g) => write.remove(`${T(tid)}/games/${g.id}`)),
        ...regs.map((r) => write.remove(`${T(tid)}/registrations/${r.id}`)),
        ...priv.map((d) => write.remove(`${T(tid)}/private/${d.id}`)), // الرمز السري وأرقام الهواتف
        write.remove(`${T(tid)}/private/settings`),
      ];
      await fs.commitChunked(ops);
      await fs.commit([write.remove(T(tid))]);
    },

    // ----- المنظّم: اللاعبون -----
    async approveRegistrations(tid, regs, tpatch = {}) {
      for (let i = 0; i < regs.length; i += 150) {
        const part = regs.slice(i, i + 150);
        const last = i + 150 >= regs.length;
        const ops = part.flatMap((r) => [
          write.set(`${T(tid)}/players/${r.id}`, {
            name: r.name, handle: r.handle, prefColor: r.prefColor, active: true,
          }, { serverTime: ['createdAt'] }),
          // الهاتف يُحفظ في مستند خاص بالمنظّم، وليس في مستند اللاعب العام
          ...(r.phone ? [write.set(`${T(tid)}/private/c-${r.id}`, { phone: r.phone })] : []),
          write.remove(`${T(tid)}/registrations/${r.id}`),
        ]);
        if (last) ops.push(bump(tid, tpatch));
        await fs.commit(ops);
      }
    },
    async rejectRegistration(tid, key) {
      await fs.commit([write.remove(`${T(tid)}/registrations/${key}`)]);
    },
    async rejectRegistrations(tid, keys) {
      await fs.commitChunked(keys.map((key) => write.remove(`${T(tid)}/registrations/${key}`)));
    },
    async addPlayer(tid, { key, name, handle, prefColor = 'any' }, tpatch = {}) {
      await fs.commit([
        write.set(`${T(tid)}/players/${key}`, { name, handle, prefColor, active: true }, {
          mustNotExist: true, serverTime: ['createdAt'],
        }),
        bump(tid, tpatch),
      ]);
    },
    async patchPlayer(tid, key, patch, tpatch = {}) {
      await fs.commit([write.patch(`${T(tid)}/players/${key}`, patch), bump(tid, tpatch)]);
    },
    async removePlayer(tid, key, tpatch = {}) {
      await fs.commit([write.remove(`${T(tid)}/players/${key}`), write.remove(`${T(tid)}/private/c-${key}`), bump(tid, tpatch)]);
    },

    // ----- المنظّم: القرعة والنتائج -----
    // تُكتب المباريات أولًا، ثم يُحدَّث مستند البطولة (فيظهر للجمهور مكتملًا)
    async publishGames(tid, games, tpatch = {}) {
      await fs.commitChunked(games.map((g) => write.set(`${T(tid)}/games/${g.id}`, gameFields(g))));
      await fs.commit([bump(tid, tpatch)]);
    },
    async deleteGames(tid, ids, tpatch = {}) {
      await fs.commit([bump(tid, tpatch)]); // أخفِ الجولة من العرض أولًا (يرفع rev)
      await fs.commitChunked(ids.map((id) => write.remove(`${T(tid)}/games/${id}`)));
      await fs.commit([bump(tid)]);
    },
    async patchGame(tid, gid, patch) {
      await fs.commit([write.patch(`${T(tid)}/games/${gid}`, patch), bump(tid)]);
    },
  };
}
return { createRemoteStore };
};
__defs["store.js"] = function () {
// ---- store.js ----
// يختار طبقة البيانات حسب config.js وعنوان الموقع:
//  • إعدادات Firebase مكتوبة            → الوضع الحقيقي (remote)
//  • غير مكتوبة + تشغيل محلي أو demo:true → وضع تجريبي محلي (demo)
//  • غير مكتوبة على موقع منشور          → «غير مُعدّ» (unconfigured): لا بيانات وهمية أبدًا على الإنترنت
const { createRemoteStore } = __r("store-remote.js");
const { createDemoStore } = __r("store-demo.js");

const cfg = globalThis.CT_CONFIG || {};
const fb = cfg.firebase || {};
const configured =
  typeof fb.projectId === 'string' && /^[a-z0-9-]{4,}$/.test(fb.projectId) && !fb.projectId.startsWith('your-') &&
  typeof fb.apiKey === 'string' && /^AIza[\w-]{20,}$/.test(fb.apiKey);

const host = globalThis.location?.hostname ?? '';
const isLocal = globalThis.location?.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]', '::1', ''].includes(host);

// متجر لا يفعل شيئًا: كل قراءة أو كتابة ترفض بخطأ واضح. تعرض الواجهة شاشة «الموقع غير مفعّل بعد».
function createUnconfiguredStore() {
  const fail = async () => { throw Object.assign(new Error('الموقع غير مربوط بقاعدة بيانات بعد.'), { unconfigured: true }); };
  const auth = {
    ready: Promise.resolve(),
    current: () => null,
    getToken: async () => null,
    signIn: fail,
    signOut() {},
    onChange() { return () => {}; },
  };
  return new Proxy({ mode: 'unconfigured', auth, isAdmin: async () => false }, {
    get: (target, name) => (name in target ? target[name] : fail),
  });
}

const config = { siteName: String(cfg.siteName || 'بطولات الشطرنج') };
const store = configured
  ? createRemoteStore({ projectId: fb.projectId, apiKey: fb.apiKey })
  : (isLocal || cfg.demo === true) ? createDemoStore() : createUnconfiguredStore();
return { config, store };
};
__defs["sync.js"] = function () {
// ---- sync.js ----
// ============================================================
// sync.js — متابعة بطولة: قراءة كاملة مرة، ثم استعلام خفيف عن rev
// يتوقف عندما تكون الصفحة مخفية، ويبطئ تدريجيًا إن لم يتغير شيء.
// ============================================================

const MIN_DELAY = 30_000;
const MAX_DELAY = 120_000;

function watchTournament(store, tid, { onData, onError }) {
  let stopped = false;
  let timer = null;
  let rev = null;
  let delay = MIN_DELAY;

  async function full() {
    const [t, players, games] = await Promise.all([
      store.getTournament(tid), store.getPlayers(tid), store.getGames(tid),
    ]);
    return { t, players, games };
  }

  async function load() {
    try {
      const t = await store.getTournament(tid);
      if (stopped) return;
      if (!t) { onData(null); return; }
      const data = await full();
      if (stopped) return;
      rev = t.rev;
      onData({ ...data, t: data.t || t });
    } catch (e) {
      if (!stopped) onError?.(e);
    }
  }

  async function tick() {
    timer = null;
    if (stopped) return;
    if (document.visibilityState === 'hidden') { schedule(); return; }
    try {
      const t = await store.getTournament(tid);
      if (stopped) return;
      if (!t) onData(null);
      else if (t.rev !== rev) {
        const data = await full();
        if (stopped) return;
        rev = t.rev;
        delay = MIN_DELAY;
        onData({ ...data, t: data.t || t });
      } else {
        delay = Math.min(delay * 1.25, MAX_DELAY);
      }
    } catch { /* انقطاع مؤقت: نعيد المحاولة في الدورة التالية */ }
    schedule();
  }

  function schedule() {
    if (!stopped && timer === null) timer = setTimeout(tick, delay);
  }

  function onVisible() {
    if (document.visibilityState === 'visible' && !stopped) {
      delay = MIN_DELAY;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      tick();
    }
  }
  document.addEventListener('visibilitychange', onVisible);

  load().then(schedule);

  return {
    // فحص خفيف فوري (قراءة واحدة) — يُستدعى عند التنقل بين التبويبات
    check() {
      if (stopped || timer === null) return; // قيد التنفيذ بالفعل أو لم يبدأ بعد
      clearTimeout(timer);
      timer = null;
      tick();
    },
    // قراءة فورية بعد إجراء من المنظّم
    async refresh() {
      if (timer !== null) { clearTimeout(timer); timer = null; }
      await load();
      delay = MIN_DELAY;
      schedule();
    },
    stop() {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    },
  };
}
return { watchTournament };
};
__defs["views/account.js"] = function () {
// ---- views/account.js ----
// ============================================================
// views/account.js — حسابات اللاعبين: الدخول/إنشاء حساب (#/account) وصفحة «حسابي» (#/me)
// • أي حساب يُنشأ هنا هو «لاعب» دائمًا. لا يوجد اختيار للدور، ولا يمكن لهذه الصفحة منح صلاحية منظّم.
//   (المنظّم يُعرَّف يدويًا في قاعدة البيانات، وقواعد Firestore تفرض ذلك على الخادم.)
// • الملفات الخاصة تظهر هنا لمستلميها فقط، وتُنزَّل ولا تُعرض داخل الصفحة.
// ============================================================

const { h, replace, toast, formDialog, dialog } = __r("dom.js");
const { chip, emptyState } = __r("components.js");
const { FORMAT_LABEL, phaseOf, playersText, dateText } = __r("fmt.js");
const { cleanName, cleanHandle, checkName, checkHandle } = __r("lib/validate.js");
const { downloadShare, sizeText, TYPE_LABEL } = __r("lib/files.js");

const PASSWORD_MIN = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const messageFor = (e) => {
  if (e?.offline) return 'لا يوجد اتصال بالإنترنت.';
  if (e?.denied) return 'رُفض الطلب. سجّل الدخول من جديد ثم أعد المحاولة.';
  return e?.message || 'حدث خطأ غير متوقع.';
};

const retryButton = (fn) => h('button', { class: 'btn', type: 'button', onclick: fn }, 'إعادة المحاولة');

function field(id, label, input, hint) {
  return h('div', { class: 'field' }, h('label', { class: 'label', for: id }, label), input,
    hint ? h('p', { class: 'hint' }, hint) : null);
}

// ============================================================
// الدخول وإنشاء الحساب
// ============================================================

function renderAccount(params, ctx) {
  const { store, config } = ctx;
  document.title = `الدخول — ${config.siteName}`;
  const root = h('div', { class: 'page' });

  if (store.mode !== 'remote') {
    replace(root, emptyState('حسابات اللاعبين غير متاحة في النسخة التجريبية',
      'تعمل الحسابات بعد نشر الموقع وربطه بقاعدة البيانات (Firebase). في التجربة المحلية يمكنك استخدام لوحة المنظّم فقط.',
      h('a', { class: 'btn', href: '#/' }, 'الصفحة الرئيسية')));
    return { root };
  }

  replace(root, h('p', { class: 'loading', role: 'status' }, 'جارٍ التحقق…'));
  let stopped = false;

  (async () => {
    if (store.auth.current()) {
      // مسجَّل الدخول بالفعل: نوجّهه إلى مكانه الصحيح بحسب دوره الحقيقي (من القواعد، لا من اختياره)
      try {
        const acc = await store.getAccount();
        if (!stopped) location.hash = acc.role === 'organizer' ? '#/admin' : '#/me';
      } catch (e) {
        if (!stopped) replace(root, emptyState('تعذّر التحقق من حسابك', messageFor(e), retryButton(() => ctx.rerender())));
      }
      return;
    }
    if (!stopped) replace(root, view());
  })();

  function view() {
    const signup = params.mode === 'signup';
    return h('section', { class: 'section login' },
      h('h1', { class: 'title' }, signup ? 'إنشاء حساب' : 'تسجيل الدخول'),
      h('p', { class: 'lede' }, signup
        ? 'الحساب يتيح لك رؤية البطولات والملفات الخاصة التي ترسلها لك إدارة البطولة وحدك.'
        : 'ادخل بالبريد وكلمة المرور.'),
      h('nav', { class: 'tabs', 'aria-label': 'نوع العملية' },
        h('a', { class: 'tab', href: '#/account', 'aria-current': signup ? null : 'page' }, 'دخول'),
        h('a', { class: 'tab', href: '#/account/new', 'aria-current': signup ? 'page' : null }, 'حساب جديد')),
      signup ? signUpForm() : signInForm(),
      h('p', { class: 'hint' }, 'التسجيل في البطولات لا يحتاج حسابًا. الحساب مفيد لاستلام الملفات الخاصة ومتابعة طلبك.'));
  }

  // ---------- دخول ----------
  function signInForm() {
    const email = h('input', { class: 'input ltr', id: 'acc-email', type: 'email', autocomplete: 'username', required: true, autocapitalize: 'none', spellcheck: 'false' });
    const password = h('input', { class: 'input ltr', id: 'acc-pass', type: 'password', autocomplete: 'current-password', required: true });
    const show = h('input', { type: 'checkbox', id: 'acc-show', onchange: (e) => { password.type = e.target.checked ? 'text' : 'password'; } });
    const status = h('p', { class: 'field-error', role: 'alert' });
    const submit = h('button', { class: 'btn btn-primary btn-wide', type: 'submit' }, 'دخول');
    let failures = 0;

    return h('form', {
      class: 'form narrow', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        status.textContent = '';
        if (!email.value.trim() || !password.value) { status.textContent = 'اكتب البريد وكلمة المرور.'; return; }
        submit.disabled = true;
        try {
          await store.auth.signIn(email.value.trim(), password.value);
          password.value = '';
          const acc = await store.getAccount();
          await ctx.refreshAccount();
          location.hash = acc.role === 'organizer' ? '#/admin' : '#/me';
        } catch (err) {
          failures += 1;
          status.textContent = err.message;
          password.value = '';
          if (failures >= 5) {
            let left = 30; // تأخير شكلي؛ الحماية الفعلية من Firebase نفسها
            const tick = setInterval(() => {
              left -= 1;
              submit.textContent = left > 0 ? `انتظر ${left} ثانية` : 'دخول';
              if (left <= 0) { clearInterval(tick); submit.disabled = false; failures = 0; }
            }, 1000);
            return;
          }
          submit.disabled = false;
        }
      },
    },
    field('acc-email', 'البريد الإلكتروني', email),
    h('div', { class: 'field' }, h('label', { class: 'label', for: 'acc-pass' }, 'كلمة المرور'), password,
      h('label', { class: 'check small' }, show, h('span', null, 'إظهار كلمة المرور'))),
    status, submit,
    h('button', { class: 'btn btn-small', type: 'button', onclick: forgot }, 'نسيتُ كلمة المرور'));
  }

  async function forgot() {
    const email = h('input', { class: 'input ltr', id: 'rst-email', type: 'email', autocomplete: 'username', autocapitalize: 'none' });
    await formDialog({
      title: 'إعادة تعيين كلمة المرور',
      body: field('rst-email', 'بريدك الإلكتروني', email, 'سنرسل رابطًا لتعيين كلمة جديدة إن كان البريد مسجّلًا.'),
      submitLabel: 'إرسال الرابط',
      onSubmit: async () => {
        const v = email.value.trim();
        if (!EMAIL_RE.test(v)) throw new Error('اكتب بريدًا صحيحًا.');
        await store.auth.sendPasswordReset(v);
        toast('إن كان البريد مسجّلًا فقد أرسلنا إليه رابط إعادة التعيين.', 'ok');
        return true;
      },
    });
  }

  // ---------- حساب جديد (لاعب فقط) ----------
  function signUpForm() {
    const name = h('input', { class: 'input', id: 'su-name', type: 'text', maxlength: 40, autocomplete: 'name', required: true });
    const handle = h('input', { class: 'input ltr', id: 'su-handle', type: 'text', maxlength: 26, autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', required: true });
    const email = h('input', { class: 'input ltr', id: 'su-email', type: 'email', autocomplete: 'username', required: true, autocapitalize: 'none', spellcheck: 'false' });
    const password = h('input', { class: 'input ltr', id: 'su-pass', type: 'password', autocomplete: 'new-password', required: true });
    const confirm = h('input', { class: 'input ltr', id: 'su-pass2', type: 'password', autocomplete: 'new-password', required: true });
    const show = h('input', { type: 'checkbox', id: 'su-show', onchange: (e) => { const t = e.target.checked ? 'text' : 'password'; password.type = t; confirm.type = t; } });
    const status = h('p', { class: 'field-error', role: 'alert' });
    const submit = h('button', { class: 'btn btn-primary btn-wide', type: 'submit' }, 'إنشاء الحساب');

    return h('form', {
      class: 'form narrow', novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        status.textContent = '';
        const n = cleanName(name.value);
        const hd = cleanHandle(handle.value);
        const em = email.value.trim();
        const problem = checkName(n) || checkHandle(hd)
          || (!EMAIL_RE.test(em) ? 'اكتب بريدًا إلكترونيًا صحيحًا.' : '')
          || (password.value.length < PASSWORD_MIN ? `كلمة المرور ${PASSWORD_MIN} أحرف على الأقل.` : '')
          || (password.value.toLowerCase() === em.toLowerCase() ? 'لا تستخدم بريدك ككلمة مرور.' : '')
          || (password.value !== confirm.value ? 'كلمتا المرور غير متطابقتين.' : '');
        if (problem) { status.textContent = problem; return; }
        submit.disabled = true;
        try {
          await store.signUpCompetitor({ email: em, password: password.value, name: n, handle: hd });
          password.value = ''; confirm.value = '';
          await ctx.refreshAccount();
          toast('تم إنشاء حسابك', 'ok');
          location.hash = '#/me';
        } catch (err) {
          password.value = ''; confirm.value = '';
          if (store.auth.current()) {
            // الحساب أُنشئ لكن حفظ الملف فشل: يكمله من صفحته
            toast('أُنشئ حسابك، أكمل بياناتك في الصفحة التالية.', 'info');
            await ctx.refreshAccount();
            location.hash = '#/me';
            return;
          }
          status.textContent = err.message || 'تعذّر إنشاء الحساب.';
          submit.disabled = false;
        }
      },
    },
    field('su-name', 'اسمك', name, 'يظهر لإدارة البطولة عند اختيار المستلمين.'),
    field('su-handle', 'اسم حسابك في Chess.com', handle, 'بدون @.'),
    field('su-email', 'البريد الإلكتروني', email),
    h('div', { class: 'field' },
      h('label', { class: 'label', for: 'su-pass' }, `كلمة المرور (${PASSWORD_MIN} أحرف على الأقل)`), password),
    h('div', { class: 'field' },
      h('label', { class: 'label', for: 'su-pass2' }, 'أعد كتابة كلمة المرور'), confirm,
      h('label', { class: 'check small' }, show, h('span', null, 'إظهار كلمة المرور'))),
    status, submit);
  }

  return { root, dispose() { stopped = true; } };
}

// ============================================================
// صفحة «حسابي»
// ============================================================

function renderMe(params, ctx) {
  const { store, config } = ctx;
  document.title = `حسابي — ${config.siteName}`;
  const root = h('div', { class: 'page' }, h('p', { class: 'loading', role: 'status' }, 'جارٍ التحقق…'));
  let stopped = false;

  (async () => {
    if (store.mode !== 'remote' || !store.auth.current()) { location.hash = '#/account'; return; }
    let acc;
    try {
      acc = await store.getAccount();
    } catch (e) {
      if (!stopped) replace(root, emptyState('تعذّر التحقق من حسابك', messageFor(e), retryButton(() => ctx.rerender())));
      return;
    }
    if (stopped) return;
    if (acc.role === 'organizer') { location.hash = '#/admin'; return; } // المنظّم ليس لاعبًا ولا يُعامل كذلك
    if (acc.role === null) { location.hash = '#/account'; return; }
    replace(root, meView(acc));
  })();

  function meView(acc) {
    const me = store.auth.current();
    const profileBox = h('section', { class: 'section' });
    const tournaments = h('div', null, h('p', { class: 'loading', role: 'status' }, 'جارٍ التحميل…'));
    const files = h('div', null, h('p', { class: 'loading', role: 'status' }, 'جارٍ التحميل…'));
    let profile = acc.profile;

    function paintProfile() {
      if (!profile) {
        replace(profileBox, completeForm());
        return;
      }
      replace(profileBox,
        h('div', { class: 'section-head' }, h('h2', null, 'بياناتي'),
          h('button', { class: 'btn btn-small', type: 'button', onclick: editProfile }, 'تعديل')),
        h('dl', { class: 'facts' },
          h('div', { class: 'fact' }, h('dt', null, 'الاسم'), h('dd', null, profile.name)),
          h('div', { class: 'fact' }, h('dt', null, 'حساب Chess.com'), h('dd', { class: 'ltr-inline' }, profile.handle))));
    }

    function profileFields(initial) {
      const name = h('input', { class: 'input', id: 'me-name', type: 'text', maxlength: 40, autocomplete: 'name', value: initial?.name ?? '', required: true });
      const handle = h('input', { class: 'input ltr', id: 'me-handle', type: 'text', maxlength: 26, autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', value: initial?.handle ?? '', required: true });
      const read = () => {
        const n = cleanName(name.value);
        const hd = cleanHandle(handle.value);
        const problem = checkName(n) || checkHandle(hd);
        if (problem) throw new Error(problem);
        return { name: n, handle: hd };
      };
      return { node: h('div', { class: 'form' }, field('me-name', 'اسمك', name), field('me-handle', 'اسم حسابك في Chess.com', handle, 'بدون @.')), read };
    }

    function completeForm() {
      const f = profileFields(null);
      const status = h('p', { class: 'field-error', role: 'alert' });
      const submit = h('button', { class: 'btn btn-primary', type: 'submit' }, 'حفظ بياناتي');
      return h('form', {
        class: 'form narrow', novalidate: true,
        onsubmit: async (e) => {
          e.preventDefault();
          status.textContent = '';
          submit.disabled = true;
          try {
            const v = f.read();
            await store.saveProfile(v);
            const next = await store.getAccount();
            profile = next.profile;
            await ctx.refreshAccount();
            paintProfile();
          } catch (err) {
            status.textContent = err.denied ? 'تعذّر الحفظ: هذا الحساب لا يمكنه إنشاء ملف لاعب.' : messageFor(err);
            submit.disabled = false;
          }
        },
      },
      h('h2', { class: 'title small' }, 'أكمل بياناتك'),
      f.node, status, submit);
    }

    async function editProfile() {
      const f = profileFields(profile);
      await formDialog({
        title: 'تعديل بياناتي',
        body: f.node,
        submitLabel: 'حفظ',
        onSubmit: async () => {
          await store.saveProfile(f.read());
          const next = await store.getAccount();
          profile = next.profile;
          await ctx.refreshAccount();
          paintProfile();
          toast('حُفظت بياناتك', 'ok');
          return true;
        },
      });
    }

    // ---------- البطولات المتاحة ----------
    async function loadTournaments() {
      try {
        const items = await store.listTournaments();
        if (stopped) return;
        replace(tournaments, items.length
          ? h('ul', { class: 't-list' }, items.map((t) => h('li', null,
            h('a', { class: 't-row', href: `#/t/${t.id}` },
              h('div', { class: 't-main' },
                h('h3', { class: 't-name' }, t.name),
                h('p', { class: 't-meta' }, h('span', null, FORMAT_LABEL[t.format]), h('span', null, playersText(t.playerCount)))),
              chip(phaseOf(t).label, phaseOf(t).kind)))))
          : emptyState('لا توجد بطولات الآن', 'تظهر هنا تلقائيًا بمجرد نشر بطولة جديدة.'));
      } catch (e) {
        if (!stopped) replace(tournaments, emptyState('تعذّر تحميل البطولات', messageFor(e), retryButton(loadTournaments)));
      }
    }

    // ---------- ملفاتي الخاصة ----------
    async function download(item, btn) {
      btn.disabled = true;
      try {
        const full = await store.getShare(item.id);
        if (!full) throw new Error('لم يعد هذا الملف متاحًا.');
        downloadShare(full);
      } catch (e) {
        toast(messageFor(e), 'error');
      }
      btn.disabled = false;
    }

    async function loadFiles() {
      try {
        const items = await store.listMyShares();
        if (stopped) return;
        replace(files, items.length
          ? h('ul', { class: 'file-list' }, items.map((it) => {
            const btn = h('button', { class: 'btn btn-small', type: 'button', onclick: () => download(it, btn) }, 'تنزيل');
            return h('li', { class: 'file-row' },
              h('div', { class: 'file-main' },
                h('p', { class: 'file-name', dir: 'auto' }, it.name),
                h('p', { class: 't-meta' },
                  h('span', null, TYPE_LABEL[it.mime] || 'ملف'), h('span', null, sizeText(it.size)), h('span', null, dateText(it.createdAt))),
                it.message ? h('p', { class: 'file-msg' }, it.message) : null),
              btn);
          }))
          : emptyState('لا توجد ملفات لك بعد', 'الملفات التي تُرسل لك تظهر هنا، ولا يراها أحد غيرك.'));
      } catch (e) {
        if (!stopped) replace(files, emptyState('تعذّر تحميل ملفاتك', messageFor(e), retryButton(loadFiles)));
      }
    }

    paintProfile();
    loadTournaments();
    if (profile) loadFiles();
    else replace(files, h('p', { class: 'hint' }, 'أكمل بياناتك أولًا لتصلك الملفات.'));

    return h('div', null,
      h('header', { class: 'admin-head' },
        h('div', null, h('h1', { class: 'title' }, 'حسابي'), h('p', { class: 'hint ltr-inline' }, me.email)),
        h('div', { class: 'row-actions' },
          h('a', { class: 'btn', href: '#/' }, 'عرض الموقع'),
          h('button', { class: 'btn', type: 'button', onclick: () => store.auth.signOut() }, 'تسجيل الخروج'))),
      profileBox,
      h('section', { class: 'section' }, h('div', { class: 'section-head' }, h('h2', null, 'البطولات المتاحة')), tournaments),
      h('section', { class: 'section' },
        h('div', { class: 'section-head' }, h('h2', null, 'ملفاتي الخاصة'),
          h('button', { class: 'btn btn-small', type: 'button', onclick: loadFiles }, 'تحديث')),
        files));
  }

  return { root, dispose() { stopped = true; } };
}

// لوحة صغيرة تُستخدم عند الحاجة لإظهار رسالة بسيطة
const infoDialog = (title, text) => dialog({ title, body: h('p', null, text), actions: [{ label: 'حسنًا', primary: true }] });
return { PASSWORD_MIN, renderAccount, renderMe, infoDialog };
};
__defs["views/admin.js"] = function () {
// ---- views/admin.js ----
// ============================================================
// views/admin.js — لوحة المنظّم
// الصلاحية الحقيقية تفرضها قواعد Firestore، وهذه الصفحة مجرد واجهة:
// لو فتحها غير المنظّم فكل طلب كتابة يُرفض من الخادم.
// ============================================================

const { h, replace, toast, copyText, confirmDialog, dialog, formDialog } = __r("dom.js");
const { chip, emptyState, gameList, gameRow, standingsTable } = __r("components.js");
const { FORMAT_LABEL, FORMAT_HELP, phaseOf, absoluteLink, directLink, siteLink, focusRound, roundName, playersText, dateText, dayText } = __r("fmt.js");
const { FORMAT, RESULT, planRound, planSummary, defaultRounds, validateStart, computeStandings, gamesOfRound, roundsOf, isRoundComplete } = __r("lib/engine.js");
const { cleanName, cleanHandle, checkName, checkHandle, handleKey, safeGameUrl, profileUrl, isValidDate, whatsappUrl } = __r("lib/validate.js");
const { newInviteCode } = __r("model.js");
const { sharesSection } = __r("views/shares.js");

const activeCount = (players) => players.filter((p) => p.active).length;
const enginePlayers = (players) =>
  players.map((p) => ({ id: p.id, name: p.name, handle: p.handle, active: p.active, prefColor: p.prefColor }));

function messageFor(e) {
  if (e?.offline) return 'لا يوجد اتصال بالإنترنت.';
  if (e?.denied) return 'رُفض الطلب: قد تكون جلستك انتهت أو حسابك ليس منظّمًا. سجّل الدخول من جديد.';
  return e?.message || 'حدث خطأ غير متوقع.';
}

// ============================================================
// نقطة الدخول
// ============================================================

function renderAdmin(params, ctx) {
  const { store, config } = ctx;
  document.title = `لوحة المنظّم — ${config.siteName}`;
  const root = h('div', { class: 'page' }, h('p', { class: 'loading', role: 'status' }, 'جارٍ التحقق…'));
  let child = null;
  let stopped = false;

  // على الموقع الحقيقي: صفحة المنظّم لا تُعرض لأحد غير المنظّم، ولا حتى كصفحة دخول ولا برسالة «ممنوع».
  // الزائر يعود إلى واجهة اللاعبين، واللاعب إلى حسابه. (القواعد في الخادم هي الحماية الفعلية؛ هذا فقط كي لا يرى شيئًا.)
  const leave = (hash) => { location.replace(`${location.pathname}${location.search}${hash}`); };

  (async () => {
    const me = store.auth.current();
    if (!me) {
      if (store.mode === 'remote') { leave('#/'); return; }
      replace(root, loginView(ctx));
      return;
    }
    let admin = false;
    try {
      admin = await store.isAdmin();
    } catch (e) {
      if (!stopped) replace(root, emptyState('تعذّر التحقق من صلاحيتك', messageFor(e),
        h('button', { class: 'btn', type: 'button', onclick: () => ctx.rerender() }, 'إعادة المحاولة')));
      return;
    }
    if (stopped) return;
    if (!admin) { leave('#/me'); return; }
    if (params.tid) {
      child = manageView(ctx, params.tid);
      replace(root, child.root);
    } else {
      replace(root, dashboardView(ctx, me));
    }
  })();

  return { root, dispose() { stopped = true; child?.dispose?.(); } };
}

// ============================================================
// الدخول
// ============================================================

function loginView(ctx) {
  const { store } = ctx;
  const demo = store.mode === 'demo';
  // في الوضع التجريبي: أول مرة ينشئ صاحب المتصفح حساب المنظّم (بريد + كلمة مرور من اختياره)، وبعدها يدخل به.
  // لا يوجد في أي وضع دخول بلا كلمة مرور.
  const setup = demo && !store.auth.hasAccount();
  const email = h('input', {
    class: 'input ltr', id: 'adm-email', type: 'email', autocomplete: 'username', required: true, autocapitalize: 'none', spellcheck: 'false',
  });
  const password = h('input', {
    class: 'input ltr', id: 'adm-pass', type: 'password', autocomplete: setup ? 'new-password' : 'current-password', required: true,
  });
  const confirm = setup ? h('input', {
    class: 'input ltr', id: 'adm-pass2', type: 'password', autocomplete: 'new-password', required: true,
  }) : null;
  const showPass = h('input', {
    type: 'checkbox', id: 'adm-show',
    onchange: (e) => { const t = e.target.checked ? 'text' : 'password'; password.type = t; if (confirm) confirm.type = t; },
  });
  const status = h('p', { class: 'field-error', role: 'alert' });
  const idleLabel = setup ? 'إنشاء الحساب والدخول' : 'دخول';
  const submit = h('button', { class: 'btn btn-primary btn-wide', type: 'submit' }, idleLabel);
  let failures = 0;

  const form = h('form', {
    class: 'form narrow',
    novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      status.textContent = '';
      if (!email.value.trim() || !password.value) { status.textContent = 'اكتب البريد وكلمة المرور.'; return; }
      if (setup && password.value !== confirm.value) { status.textContent = 'كلمتا المرور غير متطابقتين.'; return; }
      submit.disabled = true;
      try {
        if (setup) await store.auth.createAccount(email.value.trim(), password.value);
        else await store.auth.signIn(email.value.trim(), password.value);
        password.value = '';
        if (confirm) confirm.value = '';
      } catch (err) {
        failures += 1;
        status.textContent = err.message;
        password.value = '';
        if (confirm) confirm.value = '';
        if (failures >= 5) {
          // تأخير شكلي؛ الحماية الفعلية من Firebase نفسها
          let left = 30;
          const tick = setInterval(() => {
            left -= 1;
            submit.textContent = left > 0 ? `انتظر ${left} ثانية` : idleLabel;
            if (left <= 0) { clearInterval(tick); submit.disabled = false; failures = 0; }
          }, 1000);
          return;
        }
        submit.disabled = false;
      }
    },
  },
  h('div', { class: 'field' }, h('label', { class: 'label', for: 'adm-email' }, 'البريد الإلكتروني'), email),
  h('div', { class: 'field' }, h('label', { class: 'label', for: 'adm-pass' }, setup ? 'كلمة مرور جديدة (8 أحرف على الأقل)' : 'كلمة المرور'), password,
    setup ? null : h('label', { class: 'check small' }, showPass, h('span', null, 'إظهار كلمة المرور'))),
  setup ? h('div', { class: 'field' }, h('label', { class: 'label', for: 'adm-pass2' }, 'أعد كتابة كلمة المرور'), confirm,
    h('label', { class: 'check small' }, showPass, h('span', null, 'إظهار كلمة المرور'))) : null,
  status,
  submit);

  return h('section', { class: 'section login' },
    h('h1', { class: 'title' }, setup ? 'إنشاء حساب المنظّم (مرة واحدة)' : 'دخول المنظّم'),
    h('p', { class: 'lede' }, 'هذه الصفحة لمنظّم البطولة فقط.'),
    store.mode === 'remote'
      ? h('p', { class: 'hint' }, 'أنت لاعب؟ ', h('a', { href: '#/account' }, 'ادخل من صفحة اللاعبين'), '. التسجيل في البطولات لا يحتاج حسابًا.')
      : h('p', { class: 'hint' }, 'اللاعبون لا يحتاجون حسابًا للتسجيل في البطولات.'),
    demo ? h('p', { class: 'hint' }, setup
      ? 'وضع تجريبي: اختر بريدك وكلمة مرور تحفظهما أنت. يُحفظ الحساب في متصفحك فقط، ولا أحد غيرك يدخل به.'
      : 'وضع تجريبي: الحساب والبيانات في متصفحك فقط. نسيتَ كلمة المرور؟ استخدم «مسح بيانات التجربة» أعلى الصفحة.') : null,
    form);
}

// ============================================================
// نموذج البطولة (إنشاء وتعديل)
// ============================================================

function tournamentForm(t = null) {
  const locked = !!t && t.status !== 'registration'; // النظام لا يتغير بعد القرعة
  const input = (attrs) => h('input', { class: 'input', ...attrs });

  const name = input({ id: 'tf-name', type: 'text', maxlength: 60, value: t?.name ?? '', required: true });
  const format = h('select', { class: 'input', id: 'tf-format', disabled: locked, onchange: syncFormat },
    Object.entries(FORMAT_LABEL).map(([v, label]) => h('option', { value: v, selected: (t?.format ?? FORMAT.SWISS) === v }, label)));
  const formatHelp = h('p', { class: 'hint' });
  const double = h('input', { type: 'checkbox', id: 'tf-double', checked: !!t?.double, disabled: locked });
  const doubleWrap = h('label', { class: 'check' }, double, h('span', null, 'ذهاب وإياب (كل لاعب يلاقي كل لاعب مرتين)'));
  const timeControl = input({ id: 'tf-time', class: 'input ltr', type: 'text', maxlength: 40, value: t?.timeControl ?? '10+0', placeholder: '10+0' });
  const maxPlayers = input({ id: 'tf-max', type: 'number', min: 2, max: 200, value: t?.maxPlayers ?? 32 });
  const description = h('textarea', { class: 'input', id: 'tf-desc', rows: 3, maxlength: 400 }, t?.description ?? '');
  // موعد البطولة: إلزامي عند الإنشاء (الافتراضي بعد أسبوع)، وقد يكون فارغًا في بطولات قديمة عند التعديل
  const defaultDate = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const date = input({ id: 'tf-date', class: 'input ltr', type: 'date', value: t ? (t.date || '') : defaultDate, required: true });
  // البطولة الجديدة تُنشر فورًا افتراضيًا: تظهر لكل اللاعبين دون رابط، ويفتح التسجيل. ألغِ الخيار لتبقى مسودة.
  const publish = h('input', { type: 'checkbox', id: 'tf-publish', checked: true });
  const errors = h('p', { class: 'field-error', role: 'alert' });

  function syncFormat() {
    formatHelp.textContent = FORMAT_HELP[format.value];
    doubleWrap.hidden = format.value !== FORMAT.ROUND_ROBIN;
  }
  syncFormat();

  const field = (id, label, control, hint) =>
    h('div', { class: 'field' }, h('label', { class: 'label', for: id }, label), control, hint ? h('p', { class: 'hint' }, hint) : null);

  const node = h('div', { class: 'form' },
    field('tf-name', 'اسم البطولة', name),
    field('tf-date', 'تاريخ البطولة', date),
    field('tf-format', 'نظام البطولة', format),
    formatHelp,
    doubleWrap,
    locked ? h('p', { class: 'hint' }, 'لا يمكن تغيير النظام بعد إجراء القرعة.') : null,
    field('tf-time', 'وقت اللعب', timeControl, 'مثل 10+0 (عشر دقائق) أو 15+10 (خمس عشرة دقيقة وعشر ثوانٍ لكل نقلة).'),
    field('tf-max', 'أقصى عدد للاعبين', maxPlayers),
    field('tf-desc', 'الوصف', description),
    t ? null : h('label', { class: 'check' }, publish, h('span', null, 'انشرها فورًا وافتح التسجيل (تظهر للاعبين تلقائيًا)')),
    t ? null : h('p', { class: 'hint' }, 'يُنشأ لكل بطولة رمز دعوة فريد (مثل CHESS-4F7K2P) ورابط مباشر تلقائيًا، وتجدهما في صفحة البطولة بعد الإنشاء. اللاعب يحتاج الرمز ليرسل طلبه. إن أزلت علامة النشر تبقى مسودة لا يراها غيرك.'),
    errors);

  function read() {
    const data = {
      name: cleanName(name.value),
      format: format.value,
      double: format.value === FORMAT.ROUND_ROBIN && double.checked,
      timeControl: cleanName(timeControl.value).slice(0, 40),
      maxPlayers: Math.trunc(Number(maxPlayers.value)),
      description: cleanName(description.value).slice(0, 400),
      date: String(date.value || '').trim(),
    };
    if (data.name.length < 3 || data.name.length > 60) throw new Error('اسم البطولة من 3 إلى 60 حرفًا.');
    if (!isValidDate(data.date)) {
      if (t && !t.date && !data.date) delete data.date; // بطولة قديمة بلا تاريخ: نتركها كما هي
      else throw new Error('اختر تاريخ البطولة.');
    }
    if (!(data.maxPlayers >= 2 && data.maxPlayers <= 200)) throw new Error('أقصى عدد للاعبين بين 2 و200.');
    return { data, publish: publish.checked };
  }
  return { node, read, errors };
}

// ============================================================
// لوحة التحكم الرئيسية
// ============================================================

function dashboardView(ctx, me) {
  const { store } = ctx;
  const list = h('div', null, h('p', { class: 'loading', role: 'status' }, 'جارٍ التحميل…'));

  async function load() {
    try {
      const items = await store.listTournaments({ all: true });
      replace(list, items.length
        ? h('ul', { class: 't-list' }, items.map((t) => h('li', null,
          h('a', { class: 't-row', href: `#/admin/t/${t.id}` },
            h('div', { class: 't-main' },
              h('h3', { class: 't-name' }, t.name),
              h('p', { class: 't-meta' }, h('span', null, FORMAT_LABEL[t.format]), h('span', null, playersText(t.playerCount)))),
            chip(phaseOf(t).label, phaseOf(t).kind)))))
        : emptyState('لم تنشئ أي بطولة بعد', 'ابدأ بإنشاء بطولة. تظهر للاعبين فور إنشائها، ويمكنك إبقاؤها مسودة إن شئت.',
          h('button', { class: 'btn btn-primary', type: 'button', onclick: create }, 'بطولة جديدة')));
    } catch (e) {
      replace(list, emptyState('تعذّر تحميل البطولات', messageFor(e),
        h('button', { class: 'btn', type: 'button', onclick: load }, 'إعادة المحاولة')));
    }
  }

  async function create() {
    const form = tournamentForm();
    await formDialog({
      title: 'بطولة جديدة',
      body: form.node,
      submitLabel: 'إنشاء البطولة',
      onSubmit: async () => {
        const { data, publish } = form.read();
        const id = await store.createTournament(data, newInviteCode(), { publish });
        toast(publish ? 'أُنشئت البطولة ونُشرت للاعبين' : 'أُنشئت البطولة كمسودة', 'ok');
        location.hash = `#/admin/t/${id}`;
        return true;
      },
    });
  }

  load();
  // الملفات الخاصة تحتاج حسابات لاعبين حقيقية (Firebase)، فلا تظهر في النسخة التجريبية
  const shares = store.mode === 'remote' ? sharesSection(ctx) : null;
  return h('div', null,
    h('header', { class: 'admin-head' },
      h('div', null,
        h('h1', { class: 'title' }, 'لوحة المنظّم'),
        h('p', { class: 'hint ltr-inline' }, me.email)),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn btn-primary', type: 'button', onclick: create }, 'بطولة جديدة'),
        h('a', { class: 'btn', href: '#/' }, 'عرض الموقع'),
        h('button', { class: 'btn', type: 'button', onclick: () => ctx.store.auth.signOut() }, 'تسجيل الخروج'))),
    list,
    shares?.node);
}

// ============================================================
// إدارة بطولة
// ============================================================

function manageView(ctx, tid) {
  const { store } = ctx;
  let state = { t: null, players: [], games: [], regs: [], code: '', contacts: {} };
  let busy = false;
  let stopped = false;
  let viewRound = 0;
  let tab = null; // overview | players | rounds | settings
  let refreshActions = () => {};

  const secHead = h('div');
  const secTabs = h('nav', { class: 'tabs admin-tabs', 'aria-label': 'أقسام الإدارة' });
  const secBody = h('div', { class: 'tab-body' });
  const secNext = h('div');
  const secStatus = h('section', { class: 'section' });
  const secShare = h('section', { class: 'section' });
  const secRegs = h('section', { class: 'section' });
  const secPlayers = h('section', { class: 'section' });
  const secDraw = h('section', { class: 'section' });
  const secSettings = h('section', { class: 'section' });
  const secDanger = h('section', { class: 'section danger-zone' });
  const root = h('div', null, h('p', { class: 'loading', role: 'status' }, 'جارٍ التحميل…'));

  async function reload() {
    const [t, players, games, regs, code, contacts] = await Promise.all([
      store.getTournament(tid), store.getPlayers(tid), store.getGames(tid),
      store.getRegistrations(tid), store.getInviteCode(tid),
      store.getContacts(tid).catch(() => ({})), // أرقام المقبولين: ميزة إضافية لا تُعطّل اللوحة إن تعذّرت
    ]);
    if (stopped) return;
    if (!t) {
      replace(root, emptyState('هذه البطولة غير موجودة', null, h('a', { class: 'btn', href: '#/admin' }, 'لوحة المنظّم')));
      return;
    }
    state = { t, players, games, regs, code, contacts };
    if (!roundsOf(games).includes(viewRound)) viewRound = focusRound(games);
    document.title = `إدارة ${t.name}`;
    paintAll();
  }

  // حفظ النتائج يمر عبر طابور واحد فلا يضيع تعديل سريع بعد آخر
  let saveChain = Promise.resolve();

  async function act(fn, okMessage) {
    if (busy) return;
    busy = true;
    try {
      await saveChain;
      await fn();
      if (okMessage) toast(okMessage, 'ok');
      await reload();
    } catch (e) {
      toast(messageFor(e), 'error');
    } finally {
      busy = false;
    }
  }

  // ----- التنقل بين الأقسام -----
  const TAB_DEFS = [['overview', 'الملخّص'], ['players', 'اللاعبون'], ['rounds', 'الجولات'], ['settings', 'الإعدادات']];

  function go(id, fromStep = false) {
    const hadFocus = document.activeElement?.classList?.contains('tab');
    tab = id;
    paintTabs();
    paintBody();
    if (hadFocus) secTabs.querySelector('.tab[aria-current]')?.focus();
    if (fromStep) window.scrollTo({ top: 0 });
  }

  function paintTabs() {
    const pending = state.regs.length;
    replace(secTabs, TAB_DEFS.map(([id, label]) => h('button', {
      class: 'tab', type: 'button', 'aria-current': tab === id ? 'page' : null, onclick: () => go(id),
    }, label,
    id === 'players' && pending
      ? h('span', { class: 'badge', role: 'img', 'aria-label': `${pending} طلب بانتظارك` }, pending)
      : null)));
  }

  function paintBody() {
    const panels = {
      overview: () => { paintNext(); paintStatus(); paintShare(); return [secNext, secStatus, secShare]; },
      players: () => { paintRegs(); paintPlayers(); return [secRegs, secPlayers]; },
      rounds: () => { paintDraw(); return [secDraw]; },
      settings: () => { paintSettings(); paintDanger(); return [secSettings, secDanger]; },
    };
    replace(secBody, ...(panels[tab] || panels.overview)());
  }

  // ----- الرأس -----
  function paintHead() {
    const { t } = state;
    const phase = phaseOf(t);
    replace(secHead,
      h('p', { class: 'crumb' }, h('a', { class: 'link crumb-link', href: '#/admin' }, '← لوحة المنظّم')),
      h('header', { class: 'masthead' },
        h('div', { class: 'masthead-top' },
          h('h1', { class: 'title' }, t.name),
          chip(phase.label, phase.kind)),
        h('p', { class: 'hint' }, `${FORMAT_LABEL[t.format]}${t.double ? ' (ذهاب وإياب)' : ''}${t.timeControl ? ` · ${t.timeControl}` : ''} · أُنشئت ${dateText(t.createdAt)}`),
        h('div', { class: 'row-actions' },
          h('a', { class: 'btn btn-small', href: `#/t/${t.id}` }, 'عرض كما يراها اللاعبون'),
          h('button', { class: 'btn btn-small', type: 'button', onclick: () => act(async () => {}, 'حُدّثت البيانات') }, 'تحديث'))));
  }

  // ----- النشر وفتح التسجيل -----
  const setPublished = async (value) => {
    if (!value) {
      const ok = await confirmDialog({
        title: 'إلغاء نشر البطولة؟',
        body: 'ستختفي من الصفحة الرئيسية ولن يستطيع أحد فتح رابطها أو التسجيل فيها، وتعود مسودة لا يراها غيرك.',
        confirmLabel: 'إلغاء النشر',
        danger: true,
      });
      if (!ok) return;
    }
    act(() => store.updateTournament(tid, value ? { published: true } : { published: false, registrationOpen: false }),
      value ? 'نُشرت البطولة. رابطها يعمل الآن.' : 'أُلغي النشر. عادت مسودة.');
  };
  const setRegistration = (value) =>
    act(() => store.updateTournament(tid, { registrationOpen: value }), value ? 'فُتح التسجيل' : 'أُغلق التسجيل');

  const registerLink = () => absoluteLink(`#/t/${state.t.id}${state.code ? `?code=${state.code}` : ''}`);

  // الخطوة التالية: بطاقة واحدة تقول ماذا تفعل الآن، بدل أن يبحث المنظّم بين الأقسام
  function nextStep() {
    const { t, players, regs, games } = state;
    const n = activeCount(players);
    const toTab = (id) => () => go(id, true);
    if (!t.published) {
      return { title: 'انشر البطولة', text: 'هي الآن مسودة لا يراها أحد غيرك. بعد النشر يعمل رابطها وتظهر في الصفحة الرئيسية.', label: 'نشر البطولة', run: () => setPublished(true) };
    }
    if (t.status === 'finished') {
      return { title: 'انتهت البطولة', text: 'يمكنك إعادة فتحها من قسم «الجولات» إن احتجت تعديلًا.' };
    }
    if (t.status === 'running') {
      const rounds = roundsOf(games);
      const incomplete = rounds.find((r) => !isRoundComplete(games, r));
      if (incomplete) {
        return { title: `سجّل نتائج ${roundName(t, incomplete)}`, text: 'اختر نتيجة كل مباراة وتُحفظ تلقائيًا وتظهر للاعبين فورًا.', label: 'فتح الجولات', run: toTab('rounds') };
      }
      if (t.format !== FORMAT.ROUND_ROBIN && t.currentRound < t.totalRounds) {
        return { title: `أجرِ قرعة ${roundName(t, t.currentRound + 1)}`, text: 'اكتملت كل نتائج الجولة الحالية.', label: 'فتح الجولات', run: toTab('rounds') };
      }
      return { title: 'أنهِ البطولة', text: 'اكتملت كل المباريات.', label: 'فتح الجولات', run: toTab('rounds') };
    }
    // مرحلة التسجيل
    if (regs.length) {
      return {
        title: regs.length === 1 ? 'طلب تسجيل واحد بانتظارك' : `${regs.length} طلبات تسجيل بانتظارك`,
        text: 'افتح حساب اللاعب في Chess.com للتأكد أنه يخصّه، ثم اعتمده.',
        label: 'مراجعة الطلبات', run: toTab('players'),
      };
    }
    if (!t.registrationOpen) {
      return n >= 2
        ? { title: 'جاهز للقرعة', text: `${playersText(n)} معتمدون والتسجيل مغلق. أجرِ القرعة لتبدأ البطولة، أو افتح التسجيل لاستقبال المزيد.`, label: 'إجراء القرعة', run: toTab('rounds') }
        : { title: 'افتح التسجيل', text: 'البطولة منشورة لكن التسجيل مغلق، فلا يستطيع اللاعبون إرسال طلباتهم.', label: 'فتح التسجيل', run: () => setRegistration(true) };
    }
    const problem = validateStart(t.format, n);
    return problem
      ? { title: 'شارك رابط التسجيل', text: `التسجيل مفتوح. ${problem}`, label: 'نسخ رابط التسجيل', run: () => copyText(registerLink(), 'نُسخ رابط التسجيل') }
      : { title: 'جاهز للقرعة', text: `${playersText(n)} معتمدون. عند إجراء القرعة يُغلق التسجيل تلقائيًا.`, label: 'إجراء القرعة', run: toTab('rounds') };
  }

  function paintNext() {
    const step = nextStep();
    replace(secNext, h('section', { class: 'next-step' },
      h('p', { class: 'next-kicker' }, 'الخطوة التالية'),
      h('h2', { class: 'next-title' }, step.title),
      step.text ? h('p', { class: 'next-text' }, step.text) : null,
      step.run ? h('button', { class: 'btn btn-primary', type: 'button', onclick: step.run }, step.label) : null));
  }

  function paintStatus() {
    const { t, players, regs } = state;
    const stat = (n, label) => h('div', { class: 'stat-card' }, h('span', { class: 'stat-n' }, n), h('span', { class: 'stat-l' }, label));
    const ctrl = (title, text, action) => h('div', { class: 'ctrl' },
      h('div', { class: 'ctrl-main' }, h('strong', null, title), h('p', { class: 'hint' }, text)),
      action);

    let regCtrl;
    if (t.status !== 'registration') {
      regCtrl = ctrl('التسجيل', 'أُغلق عند إجراء القرعة.', null);
    } else if (!t.published) {
      regCtrl = ctrl('التسجيل', 'يلزم نشر البطولة أولًا.', h('button', { class: 'btn btn-small', type: 'button', disabled: true }, 'فتح التسجيل'));
    } else if (t.registrationOpen) {
      regCtrl = ctrl('التسجيل: مفتوح', 'يستطيع من معه الرابط إرسال طلب (ما زال يحتاج اعتمادك).',
        h('button', { class: 'btn btn-small', type: 'button', onclick: () => setRegistration(false) }, 'إغلاق التسجيل'));
    } else {
      regCtrl = ctrl('التسجيل: مغلق', 'لا يستقبل البطولة طلبات جديدة الآن.',
        h('button', { class: 'btn btn-small btn-primary', type: 'button', onclick: () => setRegistration(true) }, 'فتح التسجيل'));
    }

    replace(secStatus,
      h('div', { class: 'stat-row' },
        stat(`${players.length}/${t.maxPlayers}`, 'لاعبون معتمدون'),
        stat(regs.length, 'طلبات بانتظارك'),
        stat(t.totalRounds ? `${t.currentRound}/${t.totalRounds}` : '—', 'الجولة')),
      h('h2', null, 'الحالة'),
      h('div', { class: 'ctrls' },
        ctrl(t.published ? 'النشر: منشورة' : 'النشر: مسودة',
          t.published ? 'تظهر في الصفحة الرئيسية ويعمل رابطها.' : 'لا يراها أحد غيرك.',
          h('button', { class: `btn btn-small${t.published ? '' : ' btn-primary'}`, type: 'button', onclick: () => setPublished(!t.published) },
            t.published ? 'إلغاء النشر' : 'نشر البطولة')),
        regCtrl));
  }

  async function editSettings() {
    const { t } = state;
    const form = tournamentForm(t);
    await formDialog({
      title: 'إعدادات البطولة',
      body: form.node,
      submitLabel: 'حفظ',
      onSubmit: async () => {
        const { data } = form.read();
        const patch = { name: data.name, timeControl: data.timeControl, maxPlayers: data.maxPlayers, description: data.description };
        if (data.date) patch.date = data.date;
        if (t.status === 'registration') { patch.format = data.format; patch.double = data.double; }
        await store.updateTournament(tid, patch);
        toast('حُفظت الإعدادات', 'ok');
        await reload();
        return true;
      },
    });
  }

  function paintSettings() {
    const { t } = state;
    const fact = (k, v, ltr) => h('div', { class: 'fact' }, h('dt', null, k), h('dd', { class: ltr ? 'ltr-inline' : null }, v));
    replace(secSettings,
      h('div', { class: 'section-head' },
        h('h2', null, 'إعدادات البطولة'),
        h('button', { class: 'btn btn-small', type: 'button', onclick: editSettings }, 'تعديل الإعدادات')),
      h('dl', { class: 'facts' },
        t.date ? fact('تاريخ البطولة', dayText(t.date)) : null,
        fact('النظام', `${FORMAT_LABEL[t.format]}${t.double ? ' (ذهاب وإياب)' : ''}`),
        fact('وقت اللعب', t.timeControl || '—', !!t.timeControl),
        fact('أقصى عدد للاعبين', t.maxPlayers)),
      t.description ? h('p', { class: 'hint settings-desc' }, t.description) : null);
  }

  // ----- الروابط ورمز الدعوة -----
  function paintShare() {
    const { t, code } = state;
    const link = (label, value) => h('div', { class: 'field' },
      h('span', { class: 'label' }, label),
      h('div', { class: 'copy-row' },
        h('input', { class: 'input ltr', readOnly: true, value, 'aria-label': label, onfocus: (e) => e.target.select() }),
        h('button', { class: 'btn', type: 'button', onclick: () => copyText(value, 'نُسخ الرابط') }, 'نسخ')));

    replace(secShare,
      h('h2', null, 'الروابط ورمز الدعوة'),
      t.published ? null : h('p', { class: 'hint' }, 'الروابط لن تعمل للاعبين قبل نشر البطولة.'),
      // الرابط المباشر: يفتح صفحة هذه البطولة ويملأ رمز الدعوة تلقائيًا. هذا ما ترسله لأصدقائك.
      code ? link('الرابط المباشر للتسجيل (يملأ الرمز تلقائيًا)', directLink(t.id, code)) : null,
      link('رابط الموقع الرئيسي (قائمة البطولات المفتوحة)', siteLink()),
      h('div', { class: 'invite' },
        code
          ? [h('p', null, 'رمز الدعوة: ', h('strong', { class: 'ltr code-chip', id: 'invite-code' }, code),
            h('button', { class: 'btn btn-small', type: 'button', onclick: () => copyText(code, 'نُسخ الرمز') }, 'نسخ الرمز')),
            h('p', { class: 'hint' }, 'اللاعب الذي يدخل من الموقع الرئيسي يكتب هذا الرمز بنفسه. الرمز لا يظهر لغيرك.'),
            h('div', { class: 'row-actions' },
              h('button', { class: 'btn btn-small', type: 'button', onclick: async () => {
                if (await confirmDialog({ title: 'إنشاء رمز جديد؟', body: 'الرمز القديم وروابطه تتوقف عن العمل فورًا. الطلبات المرسلة سابقًا تبقى كما هي.', confirmLabel: 'رمز جديد' })) act(() => store.setInviteCode(tid, newInviteCode()), 'أُنشئ رمز جديد. الرمز القديم لم يعد يعمل.');
              } }, 'رمز جديد'))]
          : [h('p', { class: 'hint' }, 'هذه البطولة بلا رمز دعوة (أُنشئت قبل التحديث)، فلا يستطيع أحد التسجيل. أنشئ رمزًا لتفعيل التسجيل.'),
            h('button', { class: 'btn btn-small btn-primary', type: 'button', onclick: () => act(() => store.setInviteCode(tid, newInviteCode()), 'أُنشئ رمز الدعوة') }, 'إنشاء رمز دعوة')]));
  }

  // ----- طلبات التسجيل -----
  function paintRegs() {
    const { t, regs, players } = state;
    if (t.status !== 'registration' && !regs.length) { replace(secRegs); secRegs.hidden = true; return; }
    secRegs.hidden = false;
    const room = Math.max(0, t.maxPlayers - players.length);

    const approve = (list) => act(async () => {
      const fresh = list.filter((r) => !players.some((p) => p.id === r.id));
      const dup = list.filter((r) => players.some((p) => p.id === r.id));
      for (const r of dup) await store.rejectRegistration(tid, r.id);
      if (fresh.length) await store.approveRegistrations(tid, fresh, { playerCount: activeCount(players) + fresh.length });
    }, list.length === 1 ? 'قُبل اللاعب' : 'قُبل المحدَّدون');

    replace(secRegs,
      h('div', { class: 'section-head' },
        h('h2', null, `طلبات التسجيل المعلّقة (${regs.length})`),
        h('div', { class: 'row-actions' },
          regs.length > 1 && room >= 1
            ? h('button', { class: 'btn btn-small', type: 'button', onclick: () => approve(regs.slice(0, room)) }, `قبول الكل${regs.length > room ? ` (أول ${room})` : ''}`)
            : null,
          regs.length > 1
            ? h('button', { class: 'btn btn-small', type: 'button', onclick: async () => {
              if (await confirmDialog({ title: `رفض كل الطلبات (${regs.length})؟`, body: 'تُحذف الطلبات المعلّقة نهائيًا. مفيد إن وصلتك طلبات مزعجة.', confirmLabel: 'رفض الكل', danger: true })) {
                act(() => store.rejectRegistrations(tid, regs.map((r) => r.id)), 'رُفضت الطلبات');
              }
            } }, 'رفض الكل')
            : null)),
      regs.length
        ? h('ul', { class: 'rows' }, regs.map((r) => {
          const url = profileUrl(r.handle);
          const wa = whatsappUrl(r.phone);
          const item = (k, ...v) => h('span', { class: 'req-item' }, h('span', { class: 'k' }, k), ...v);
          return h('li', { class: 'row req-row' },
            h('div', { class: 'row-main req-main' },
              h('div', { class: 'req-top' },
                h('strong', { class: 'req-name' }, r.name),
                url ? h('a', { class: 'handle ltr', href: url }, r.handle) : h('span', { class: 'handle ltr' }, r.handle),
                r.prefColor !== 'any' ? h('span', { class: 'meta-note' }, `يفضّل ${r.prefColor === 'white' ? 'الأبيض' : 'الأسود'}`) : null),
              h('div', { class: 'req-meta' },
                item('الهاتف', h('bdi', { class: 'ltr req-phone' }, r.phone || '—'),
                  r.phone ? h('button', { class: 'btn btn-small', type: 'button', onclick: () => copyText(r.phone, 'نُسخ الرقم') }, 'نسخ') : null,
                  wa ? h('a', { class: 'btn btn-small', href: wa }, 'واتساب') : null),
                item('البطولة', h('span', { class: 'req-tname' }, t.name)),
                item('رمز الدعوة', h('bdi', { class: 'ltr code-chip req-code' }, r.code || '—')))),
            h('div', { class: 'row-actions' },
              h('button', { class: 'btn btn-small btn-primary', type: 'button', disabled: room < 1, onclick: () => approve([r]) }, 'قبول'),
              h('button', { class: 'btn btn-small', type: 'button', onclick: () => act(() => store.rejectRegistration(tid, r.id), 'رُفض الطلب') }, 'رفض')));
        }))
        : emptyState('لا طلبات بانتظارك',
          t.published && t.registrationOpen
            ? 'عندما يسجّل لاعب يظهر طلبه هنا (يتحدّث تلقائيًا كل نصف دقيقة).'
            : 'افتح التسجيل من قسم «الملخّص» ليبدأ اللاعبون بإرسال طلباتهم.'),
      regs.length ? h('p', { class: 'hint' }, 'اضغط اسم الحساب لفتح صفحته في Chess.com والتأكد أنه يخصّ صاحب الطلب قبل القبول. رقم الهاتف خاص بك ولا يظهر للاعبين.') : null,
      room < 1 ? h('p', { class: 'hint' }, 'اكتمل العدد الأقصى. ارفعه من «تعديل الإعدادات» لقبول المزيد.') : null);
  }

  // ----- اللاعبون -----
  function paintPlayers() {
    const { t, players, contacts } = state;
    const name = h('input', { class: 'input', id: 'ap-name', type: 'text', maxlength: 40, required: true, autocomplete: 'off' });
    const handle = h('input', { class: 'input ltr', id: 'ap-handle', type: 'text', maxlength: 26, required: true, autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' });
    const err = h('p', { class: 'field-error', role: 'alert' });
    const addForm = h('form', {
      class: 'inline-form',
      novalidate: true,
      onsubmit: (e) => {
        e.preventDefault();
        const n = cleanName(name.value);
        const hd = cleanHandle(handle.value);
        const problem = checkName(n) || checkHandle(hd) || (players.some((p) => p.id === handleKey(hd)) ? 'هذا الحساب مضاف بالفعل.' : '')
          || (players.length >= t.maxPlayers ? 'اكتمل العدد الأقصى.' : '');
        err.textContent = problem;
        if (problem) return;
        act(() => store.addPlayer(tid, { key: handleKey(hd), name: n, handle: hd }, { playerCount: activeCount(players) + 1 }), 'أُضيف اللاعب');
      },
    },
    h('div', { class: 'field' }, h('label', { class: 'label', for: 'ap-name' }, 'الاسم'), name),
    h('div', { class: 'field' }, h('label', { class: 'label', for: 'ap-handle' }, 'حساب Chess.com'), handle),
    h('button', { class: 'btn', type: 'submit' }, 'إضافة لاعب'));

    replace(secPlayers,
      h('h2', null, `قائمة اللاعبين المقبولين (${players.length} من ${t.maxPlayers})`),
      players.length
        ? h('ul', { class: 'rows' }, players.map((p) => {
          const url = profileUrl(p.handle);
          return h('li', { class: `row${p.active ? '' : ' is-out'}` },
            h('div', { class: 'row-main' },
              h('strong', null, p.name),
              url ? h('a', { class: 'handle ltr', href: url }, p.handle) : h('span', { class: 'handle ltr' }, p.handle),
              p.prefColor !== 'any' ? h('span', { class: 'meta-note' }, `يفضّل ${p.prefColor === 'white' ? 'الأبيض' : 'الأسود'}`) : null,
              contacts[p.id] ? h('bdi', { class: 'ltr meta-note player-phone' }, contacts[p.id]) : null,
              p.active ? null : chip('منسحب')),
            h('div', { class: 'row-actions' },
              contacts[p.id] && whatsappUrl(contacts[p.id]) ? h('a', { class: 'btn btn-small', href: whatsappUrl(contacts[p.id]) }, 'واتساب') : null,
              h('button', { class: 'btn btn-small', type: 'button', onclick: () => copyText(absoluteLink(`#/t/${tid}/p/${encodeURIComponent(p.id)}`), 'نُسخ رابط اللاعب') }, 'نسخ رابطه'),
              t.status === 'registration'
                ? h('button', { class: 'btn btn-small', type: 'button', onclick: async () => {
                  if (await confirmDialog({ title: `حذف ${p.name}؟`, body: 'سيُحذف من قائمة اللاعبين.', confirmLabel: 'حذف', danger: true })) {
                    act(() => store.removePlayer(tid, p.id, { playerCount: activeCount(players) - (p.active ? 1 : 0) }), 'حُذف اللاعب');
                  }
                } }, 'حذف')
                : h('button', { class: 'btn btn-small', type: 'button', onclick: async () => {
                  const msg = p.active
                    ? 'لن يدخل في القرعات القادمة. مبارياته الحالية غير المنتهية سجّل نتيجتها يدويًا (فوز خصمه بالانسحاب).'
                    : 'سيعود إلى القرعات القادمة.';
                  if (await confirmDialog({ title: p.active ? `سحب ${p.name} من البطولة؟` : `إعادة ${p.name}؟`, body: msg, confirmLabel: p.active ? 'سحب' : 'إعادة', danger: p.active })) {
                    act(() => store.patchPlayer(tid, p.id, { active: !p.active }, { playerCount: activeCount(players) + (p.active ? -1 : 1) }), p.active ? 'سُحب اللاعب' : 'أُعيد اللاعب');
                  }
                } }, p.active ? 'سحب' : 'إعادة')));
        }))
        : emptyState('لا لاعبين بعد', 'اعتمد طلبات التسجيل أو أضف لاعبًا يدويًا.'),
      t.status === 'registration' || t.status === 'running'
        ? h('details', { class: 'add-player' }, h('summary', null, 'إضافة لاعب يدويًا'), addForm, err)
        : null);
  }

  // ----- القرعة والجولات -----
  function paintDraw() {
    const { t, players, games } = state;
    if (t.status === 'registration') { replace(secDraw, drawPanel()); return; }
    replace(secDraw, roundsPanel());
  }

  function drawPanel() {
    const { t, players } = state;
    const n = activeCount(players);
    const plan = planSummary(t.format, n, { double: t.double });
    const rounds = h('input', {
      class: 'input narrow-input', id: 'dr-rounds', type: 'number', min: 1, max: Math.max(1, n - 1), value: defaultRounds(t.format, n),
    });
    const problem = validateStart(t.format, n);

    const start = async () => {
      if (problem) { toast(problem, 'error'); return; }
      let total = plan.rounds;
      if (t.format === FORMAT.SWISS) {
        total = Math.trunc(Number(rounds.value));
        if (!(total >= 1 && total <= Math.max(1, n - 1))) { toast(`عدد الجولات بين 1 و${Math.max(1, n - 1)}.`, 'error'); return; }
      }
      const draw = () => planRound({ format: t.format, players: enginePlayers(players), games: [], round: 1, double: t.double });
      let draft = draw();
      for (;;) {
        const choice = await previewDialog(t, 'قرعة الجولة الأولى', draft);
        if (choice === 'إعادة القرعة') { draft = draw(); continue; }
        if (choice !== 'اعتماد ونشر القرعة') return;
        break;
      }
      const totalRounds = t.format === FORMAT.SWISS ? total : draft.totalRounds;
      act(() => store.publishGames(tid, draft.games, {
        status: 'running', registrationOpen: false, totalRounds, currentRound: t.format === FORMAT.ROUND_ROBIN ? totalRounds : 1, playerCount: n,
      }), 'بدأت البطولة ونُشرت القرعة. أُغلق التسجيل.');
    };

    if (problem) {
      return [
        h('h2', null, 'القرعة'),
        h('p', null, `${playersText(n)} معتمدون حتى الآن.`),
        h('p', { class: 'hint' }, `${problem} اعتمد الطلبات أو أضف لاعبين يدويًا، ثم تظهر هنا أدوات القرعة.`),
      ];
    }

    return [
      h('h2', null, 'القرعة'),
      h('p', null, `${playersText(n)} معتمدون. ${plan.rounds ? `عدد الجولات المتوقع: ${plan.rounds}، وعدد المباريات: ${plan.games}.` : ''}`),
      plan.note ? h('p', { class: 'hint' }, plan.note) : null,
      t.format === FORMAT.SWISS
        ? h('div', { class: 'field' }, h('label', { class: 'label', for: 'dr-rounds' }, 'عدد الجولات'), rounds,
          h('p', { class: 'hint' }, 'القاعدة: log₂ لعدد اللاعبين مقرَّبًا للأعلى، وهي كافية لتحديد المتصدر.'))
        : null,
      h('p', { class: 'hint' }, 'القرعة عشوائية آمنة. ستراجعها قبل النشر، ويمكنك إعادتها. بعد النشر يُغلق التسجيل.'),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: start }, 'إجراء القرعة وبدء البطولة'),
    ];
  }

  async function previewDialog(t, title, draft) {
    // الدوري يُنشر كل جولاته معًا؛ نعرض الجولة الأولى للمراجعة ونذكر الباقي
    const firstRound = Math.min(...draft.games.map((g) => g.round));
    const rows = draft.games.filter((g) => g.round === firstRound).sort((a, b) => a.board - b.board);
    const extra = draft.games.length - rows.length;
    const body = h('div', null,
      draft.warnings?.length ? h('ul', { class: 'warnings' }, draft.warnings.map((w) => h('li', null, w))) : null,
      h('ol', { class: 'games compact' }, rows.map((g) => gameRow(g, { tid: t.id, plain: true }))),
      extra > 0 ? h('p', { class: 'hint' }, `هذه الجولة الأولى. سيُنشر معها جدول باقي الجولات (${extra} مباراة أخرى).`) : null,
      h('p', { class: 'hint' }, 'لن يرى اللاعبون شيئًا حتى تعتمد.'));
    return dialog({
      title,
      body,
      actions: [{ label: 'إلغاء' }, { label: 'إعادة القرعة' }, { label: 'اعتماد ونشر القرعة', primary: true }],
    });
  }

  function roundsPanel() {
    const { t, players, games } = state;
    const rounds = roundsOf(games);
    const cur = rounds.includes(viewRound) ? viewRound : focusRound(games);

    const nextRound = async () => {
      const round = t.currentRound + 1;
      const draw = () => planRound({ format: t.format, players: enginePlayers(players), games, round });
      let draft;
      try { draft = draw(); } catch (e) { toast(e.message, 'error'); return; }
      if (!draft.games.length) { toast(draft.warnings?.[0] || 'تعذّرت القرعة.', 'error'); return; }
      for (;;) {
        const choice = await previewDialog(t, `قرعة ${roundName(t, round)}`, draft);
        if (choice === 'إعادة القرعة') { try { draft = draw(); } catch (e) { toast(e.message, 'error'); return; } continue; }
        if (choice !== 'اعتماد ونشر القرعة') return;
        break;
      }
      viewRound = round;
      act(() => store.publishGames(tid, draft.games, { currentRound: round }), `نُشرت ${roundName(t, round)}`);
    };

    const undo = async () => {
      const lastRound = rounds[rounds.length - 1];
      const round = t.format === FORMAT.ROUND_ROBIN ? 1 : lastRound;
      const ids = t.format === FORMAT.ROUND_ROBIN ? games.map((g) => g.id) : gamesOfRound(games, round).map((g) => g.id);
      const toStart = round === 1;
      const ok = await confirmDialog({
        title: toStart ? 'التراجع عن القرعة والعودة للتسجيل؟' : `حذف قرعة ${roundName(t, round)}؟`,
        body: 'ستُحذف المباريات ويمكنك إعادة القرعة. لا يُسمح بذلك إلا إن لم تُسجَّل نتائج.',
        confirmLabel: 'تراجع',
        danger: true,
      });
      if (!ok) return;
      viewRound = 0;
      act(() => store.deleteGames(tid, ids, toStart
        ? { status: 'registration', currentRound: 0, totalRounds: 0 }
        : { currentRound: round - 1 }), 'حُذفت القرعة');
    };

    const finish = async () => {
      if (await confirmDialog({ title: 'إنهاء البطولة؟', body: 'سيظهر للجميع أنها انتهت. يمكنك إعادة فتحها لاحقًا إن لزم.', confirmLabel: 'إنهاء البطولة' })) {
        act(() => store.updateTournament(tid, { status: 'finished' }), 'انتهت البطولة');
      }
    };

    // شريط الإجراءات يُعاد حسابه بعد كل حفظ نتيجة دون إعادة رسم حقول الإدخال
    const actionsHost = h('div', { class: 'row-actions' });
    const hintHost = h('div');
    refreshActions = () => {
      const lastRound = rounds[rounds.length - 1] || 0;
      const lastComplete = !!lastRound && isRoundComplete(games, lastRound);
      const noRealResults = (list) => !list.some((g) => g.result && g.result !== RESULT.BYE);
      const canNext = t.format !== FORMAT.ROUND_ROBIN && t.status === 'running' && lastComplete && t.currentRound < t.totalRounds;
      const allDone = games.length > 0 && rounds.every((r) => isRoundComplete(games, r))
        && (t.format === FORMAT.ROUND_ROBIN || t.currentRound >= t.totalRounds);
      const canUndo = t.status === 'running'
        && noRealResults(t.format === FORMAT.ROUND_ROBIN ? games : gamesOfRound(games, lastRound));
      replace(actionsHost,
        canNext ? h('button', { class: 'btn btn-primary', type: 'button', onclick: nextRound }, `إجراء قرعة ${roundName(t, t.currentRound + 1)}`) : null,
        t.status === 'running' && allDone ? h('button', { class: 'btn btn-primary', type: 'button', onclick: finish }, 'إنهاء البطولة') : null,
        canUndo ? h('button', { class: 'btn btn-small', type: 'button', onclick: undo },
          t.format === FORMAT.ROUND_ROBIN || lastRound === 1 ? 'التراجع عن القرعة' : `حذف قرعة ${roundName(t, lastRound)}`) : null);
      replace(hintHost,
        t.status === 'running' && !canNext && !allDone && lastRound
          ? h('p', { class: 'hint' }, t.format === FORMAT.ROUND_ROBIN
            ? 'سجّل النتائج كلما انتهت المباريات.'
            : 'سجّل كل نتائج الجولة الحالية لتظهر القرعة التالية.')
          : null);
    };
    refreshActions();

    const finishedNote = t.status === 'finished'
      ? h('div', { class: 'notice' }, h('p', null, 'انتهت البطولة.'),
        h('button', { class: 'btn btn-small', type: 'button', onclick: () => act(() => store.updateTournament(tid, { status: 'running' }), 'أُعيد فتح البطولة') }, 'إعادة الفتح'))
      : null;

    return [
      h('div', { class: 'section-head' }, h('h2', null, 'الجولات والنتائج'), actionsHost),
      finishedNote,
      hintHost,
      h('nav', { class: 'pills', 'aria-label': 'الجولات' }, rounds.map((r) => h('button', {
        class: 'pill', type: 'button', 'aria-current': r === cur ? 'page' : null,
        onclick: () => { viewRound = r; paintDraw(); },
      }, t.format === FORMAT.KNOCKOUT ? roundName(t, r) : String(r)))),
      h('ol', { class: 'games admin' }, gamesOfRound(games, cur).map((g) =>
        gameRow(g, { tid: t.id, admin: g.result === RESULT.BYE ? null : gameControls(g) }))),
      games.some((g) => g.result) && t.format !== FORMAT.KNOCKOUT
        ? h('details', { class: 'add-player' }, h('summary', null, 'الترتيب الحالي'), standingsTable({ rows: computeStandings(players, games), tid: t.id }))
        : null,
    ];
  }

  // أدوات تعديل نتيجة مباراة: تُحفظ تلقائيًا عند التغيير
  function gameControls(g) {
    const { t } = state;
    const k = (name) => ({ k: `${g.id}:${name}` });
    const result = h('select', { class: 'input', 'aria-label': `نتيجة لوحة ${g.board}`, value: g.result || '', dataset: k('result') },
      h('option', { value: '' }, 'لم تُلعب'),
      h('option', { value: RESULT.WHITE }, 'فاز الأبيض 1–0'),
      h('option', { value: RESULT.BLACK }, 'فاز الأسود 0–1'),
      t.format === FORMAT.KNOCKOUT ? null : h('option', { value: RESULT.DRAW }, 'تعادل ½–½'));
    const forfeit = h('input', { type: 'checkbox', checked: g.forfeit, dataset: k('forfeit') });
    const url = h('input', { class: 'input ltr', type: 'url', placeholder: 'رابط المباراة (اختياري)', 'aria-label': `رابط مباراة لوحة ${g.board}`, value: g.url, maxlength: 200, dataset: k('url') });
    const note = h('input', { class: 'input', type: 'text', placeholder: 'ملاحظة (اختياري)', 'aria-label': `ملاحظة لوحة ${g.board}`, value: g.note, maxlength: 100, dataset: k('note') });

    const save = (changed) => {
      const r = result.value || null;
      const rawUrl = url.value.trim();
      const safe = rawUrl ? safeGameUrl(rawUrl) : '';
      if (rawUrl && !safe) { toast('رابط المباراة يجب أن يكون https من Chess.com أو Lichess.', 'error'); url.focus(); return; }
      const patch = {
        result: r,
        forfeit: !!r && r !== RESULT.DRAW && forfeit.checked,
        url: safe || '',
        note: cleanName(note.value).slice(0, 100),
      };
      saveChain = saveChain.then(async () => {
        try {
          await store.patchGame(tid, g.id, patch);
          Object.assign(g, patch);
          toast('حُفظت النتيجة', 'ok');
          if (changed === 'result' || changed === 'forfeit') {
            const keep = document.activeElement?.dataset?.k;
            paintDraw();
            if (keep) secDraw.querySelector(`[data-k="${keep}"]`)?.focus();
          } else {
            refreshActions();
          }
        } catch (e) {
          toast(messageFor(e), 'error');
          paintDraw();
        }
      });
    };
    result.addEventListener('change', () => save('result'));
    forfeit.addEventListener('change', () => save('forfeit'));
    url.addEventListener('change', () => save('url'));
    note.addEventListener('change', () => save('note'));

    // الرابط والملاحظة اختياريان: يُطويان لتبقى كل مباراة سطرين على الجوال (وتُفتح تلقائيًا إن كان فيهما شيء)
    return h('div', { class: 'game-admin' },
      result,
      h('label', { class: 'check small' }, forfeit, h('span', null, 'بالانسحاب أو الغياب')),
      h('details', { class: 'game-more', open: !!(g.url || g.note) },
        h('summary', null, 'رابط المباراة وملاحظة (اختياري)'),
        h('div', { class: 'game-more-body' }, url, note)));
  }

  // ----- المنطقة الخطرة -----
  function paintDanger() {
    const { t } = state;
    replace(secDanger,
      h('h2', null, 'حذف البطولة'),
      h('p', { class: 'hint' }, 'يحذف البطولة ولاعبيها ومبارياتها نهائيًا. لا يمكن التراجع.'),
      h('button', {
        class: 'btn btn-danger', type: 'button',
        onclick: async () => {
          const typed = h('input', { class: 'input', type: 'text', 'aria-label': 'اسم البطولة للتأكيد', autocomplete: 'off' });
          const ok = await formDialog({
            title: 'حذف البطولة نهائيًا؟',
            danger: true,
            submitLabel: 'حذف نهائيًا',
            body: h('div', { class: 'form' }, h('p', null, 'للتأكيد اكتب اسم البطولة بالضبط:'), h('p', null, h('strong', null, t.name)), typed),
            onSubmit: async () => {
              if (typed.value.trim() !== t.name) throw new Error('الاسم غير مطابق.');
              await store.deleteTournament(tid);
              return true;
            },
          });
          if (ok) { toast('حُذفت البطولة', 'ok'); location.hash = '#/admin'; }
        },
      }, 'حذف البطولة'));
  }

  function paintAll() {
    const { t } = state;
    if (!tab) tab = t.status === 'registration' ? 'overview' : 'rounds';
    paintHead(); paintTabs(); paintBody();
    if (root.firstChild !== secHead) replace(root, secHead, secTabs, secBody);
  }

  // متابعة طلبات التسجيل الجديدة أثناء فتح الصفحة
  const timer = setInterval(async () => {
    if (busy || stopped || document.visibilityState !== 'visible' || state.t?.status !== 'registration') return;
    try {
      const regs = await store.getRegistrations(tid);
      if (regs.length !== state.regs.length && !busy) {
        state.regs = regs;
        paintTabs();
        if (tab === 'players') paintRegs();
        if (tab === 'overview') { paintNext(); paintStatus(); }
      }
    } catch { /* نتجاهل الانقطاع المؤقت */ }
  }, 30_000);

  reload().catch((e) => {
    replace(root, emptyState('تعذّر تحميل البطولة', messageFor(e),
      h('button', { class: 'btn', type: 'button', onclick: () => ctx.rerender() }, 'إعادة المحاولة')));
  });

  return { root, dispose() { stopped = true; clearInterval(timer); } };
}
return { renderAdmin };
};
__defs["views/home.js"] = function () {
// ---- views/home.js ----
// ============================================================
// views/home.js — الصفحة الرئيسية: قائمة البطولات
// ============================================================

const { h, replace } = __r("dom.js");
const { chip, emptyState } = __r("components.js");
const { FORMAT_LABEL, phaseOf, playersText, dayText, canRegister } = __r("fmt.js");

function renderHome(_, ctx) {
  const { store, config } = ctx;
  document.title = config.siteName;

  const list = h('div', { class: 'home-list' }, h('p', { class: 'loading', role: 'status' }, 'جارٍ تحميل البطولات…'));
  const root = h('div', { class: 'page' },
    h('header', { class: 'hero' },
      h('h1', { class: 'hero-title' }, config.siteName),
      h('p', { class: 'lede' }, 'سجّل اسمك، تابع الجولات، وشاهد النتائج. المباريات تُلعب على حسابك في Chess.com.')),
    list);

  let stopped = false;
  async function load() {
    try {
      const items = await store.listTournaments();
      if (stopped) return;
      paint(items);
    } catch (e) {
      if (stopped) return;
      replace(list, emptyState(
        e.offline ? 'لا يوجد اتصال بالإنترنت' : 'تعذّر تحميل البطولات',
        'تحقق من الاتصال ثم أعد المحاولة.',
        h('button', { class: 'btn', type: 'button', onclick: load }, 'إعادة المحاولة')));
    }
  }

  function paint(items) {
    if (!items.length) {
      replace(list, emptyState('لا توجد بطولات بعد', 'ستعلن إدارة البطولة عن البطولة القادمة هنا.'));
      return;
    }
    // البطولات المفتوحة للتسجيل أولًا (هذا ما يبحث عنه من دخل من الرابط الرئيسي)، ثم بقية البطولات
    const row = (t) => h('li', null,
      h('a', { class: 't-row', href: `#/t/${t.id}` },
        h('div', { class: 't-main' },
          h('h2', { class: 't-name' }, t.name),
          h('p', { class: 't-meta' },
            t.date ? h('span', { class: 't-date' }, dayText(t.date)) : null,
            h('span', null, FORMAT_LABEL[t.format]),
            t.timeControl ? h('span', { class: 'ltr' }, t.timeControl) : null,
            h('span', null, playersText(t.playerCount)))),
        chip(phaseOf(t).label, phaseOf(t).kind)));
    const open = items.filter((t) => canRegister(t));
    const rest = items.filter((t) => !canRegister(t));
    replace(list,
      open.length
        ? h('section', { class: 'home-group', 'aria-labelledby': 'g-open' },
          h('h2', { class: 'group-title', id: 'g-open' }, 'بطولات التسجيل مفتوح فيها'),
          h('p', { class: 'hint' }, 'اختر بطولة، واكتب رمز الدعوة الذي وصلك لتسجّل.'),
          h('ul', { class: 't-list', id: 'open-list' }, open.map(row)))
        : null,
      rest.length
        ? h('section', { class: 'home-group', 'aria-labelledby': 'g-rest' },
          open.length ? h('h2', { class: 'group-title', id: 'g-rest' }, 'بطولات أخرى') : null,
          h('ul', { class: 't-list' }, rest.map(row)))
        : null);
  }

  load();
  const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 90_000);

  return { root, dispose() { stopped = true; clearInterval(timer); } };
}
return { renderHome };
};
__defs["views/shares.js"] = function () {
// ---- views/shares.js ----
// ============================================================
// views/shares.js — «الملفات الخاصة» في لوحة المنظّم
// يختار المنظّم ملفًا ولاعبين محدّدين؛ يصل الملف إليهم وحدهم.
// الخصوصية يفرضها الخادم (قواعد Firestore): لا يقرأ الملف إلا المستلمون وصاحبه،
// ولا يراه منظّم آخر ولا أي لاعب غير مستلم. المنظّمون لا يظهرون في قائمة اللاعبين أصلًا.
// ============================================================

const { h, replace, toast, confirmDialog, dialog, formDialog } = __r("dom.js");
const { emptyState } = __r("components.js");
const { dateText } = __r("fmt.js");
const { ACCEPT, MAX_FILE_BYTES, TYPE_LABEL, prepareFile, sizeText } = __r("lib/files.js");

const MAX_RECIPIENTS = 30; // نفس حدّ القواعد

const messageFor = (e) => {
  if (e?.offline) return 'لا يوجد اتصال بالإنترنت.';
  if (e?.denied) return 'رُفض الطلب: قد تكون جلستك انتهت أو حسابك ليس منظّمًا.';
  return e?.message || 'حدث خطأ غير متوقع.';
};

function sharesSection(ctx) {
  const { store } = ctx;
  const body = h('div', null, h('p', { class: 'loading', role: 'status' }, 'جارٍ التحميل…'));
  let people = [];
  let stopped = false;

  const nameOf = (uid) => people.find((p) => p.uid === uid)?.name;

  async function load() {
    try {
      const [items, list] = await Promise.all([store.listSentShares(), store.listCompetitors().catch(() => people)]);
      if (stopped) return;
      people = list;
      paint(items);
    } catch (e) {
      if (!stopped) replace(body, emptyState('تعذّر تحميل الملفات', messageFor(e),
        h('button', { class: 'btn', type: 'button', onclick: load }, 'إعادة المحاولة')));
    }
  }

  function paint(items) {
    if (!items.length) {
      replace(body, emptyState('لم ترسل ملفات خاصة بعد', 'اختر لاعبين محدّدين فيصل الملف إليهم وحدهم، ولا يراه غيرهم.'));
      return;
    }
    replace(body, h('ul', { class: 'file-list' }, items.map((it) => {
      const names = it.recipients.map((u) => nameOf(u)).filter(Boolean);
      const to = names.length === it.recipients.length && names.length <= 3
        ? names.join('، ')
        : `${it.recipients.length} لاعبين`;
      return h('li', { class: 'file-row', dataset: { share: it.id } },
        h('div', { class: 'file-main' },
          h('p', { class: 'file-name', dir: 'auto' }, it.name),
          h('p', { class: 't-meta' },
            h('span', null, TYPE_LABEL[it.mime] || 'ملف'), h('span', null, sizeText(it.size)),
            h('span', null, `إلى: ${to}`), h('span', null, dateText(it.createdAt))),
          it.message ? h('p', { class: 'file-msg' }, it.message) : null),
        h('button', { class: 'btn btn-small btn-danger', type: 'button', onclick: () => remove(it) }, 'حذف'));
    })));
  }

  async function remove(it) {
    if (!await confirmDialog({
      title: 'حذف الملف؟', body: `سيختفي «${it.name}» عند المستلمين أيضًا ولا يمكن التراجع.`, confirmLabel: 'حذف', danger: true,
    })) return;
    try { await store.deleteShare(it.id); toast('حُذف الملف', 'ok'); load(); } catch (e) { toast(messageFor(e), 'error'); }
  }

  async function send() {
    try { people = await store.listCompetitors(); } catch (e) { toast(messageFor(e), 'error'); return; }
    if (!people.length) {
      await dialog({
        title: 'لا يوجد لاعبون بحسابات بعد',
        body: h('p', null, 'الملفات الخاصة تصل إلى لاعبين لديهم حساب. اطلب منهم إنشاء حساب من «دخول اللاعبين» في الموقع، ثم عُد لإرسال الملف.'),
        actions: [{ label: 'حسنًا', primary: true }],
      });
      return;
    }

    const file = h('input', { class: 'input', id: 'sh-file', type: 'file', accept: ACCEPT });
    const message = h('textarea', { class: 'input', id: 'sh-msg', rows: 3, maxlength: 500 });
    const search = h('input', { class: 'input', id: 'sh-search', type: 'search', autocomplete: 'off', placeholder: 'ابحث بالاسم أو حساب Chess.com' });
    const count = h('p', { class: 'hint', role: 'status' });
    const boxes = people.map((p) => ({
      p,
      input: h('input', { type: 'checkbox', value: p.uid, 'aria-label': p.name, onchange: updateCount }),
    }));
    const rows = boxes.map(({ p, input }) => ({
      p,
      li: h('li', null, h('label', { class: 'check' }, input,
        h('span', null, p.name, ' ', h('span', { class: 'hint ltr-inline' }, p.handle)))),
    }));

    function updateCount() {
      const n = boxes.filter((b) => b.input.checked).length;
      count.textContent = n ? `تم اختيار ${n} من ${people.length}` : 'لم تختر أحدًا بعد.';
    }
    function visibleRows() { return rows.filter((r) => !r.li.hidden); }
    function applyFilter() {
      const q = search.value.trim().toLowerCase();
      for (const r of rows) r.li.hidden = !!q && !(`${r.p.name} ${r.p.handle}`.toLowerCase().includes(q));
    }
    search.addEventListener('input', applyFilter);
    updateCount();

    const setVisible = (value) => {
      for (const r of visibleRows()) boxes.find((b) => b.p.uid === r.p.uid).input.checked = value;
      updateCount();
    };

    const form = h('div', { class: 'form' },
      h('div', { class: 'field' }, h('label', { class: 'label', for: 'sh-file' }, 'الملف'), file,
        h('p', { class: 'hint' }, `PDF أو PNG أو JPG أو TXT أو PGN، حتى ${Math.floor(MAX_FILE_BYTES / 1000)} كيلوبايت.`)),
      h('div', { class: 'field' }, h('label', { class: 'label', for: 'sh-msg' }, 'رسالة مع الملف (اختياري)'), message),
      h('div', { class: 'field' },
        h('label', { class: 'label', for: 'sh-search' }, 'المستلمون'),
        search,
        h('div', { class: 'row-actions' },
          h('button', { class: 'btn btn-small', type: 'button', onclick: () => setVisible(true) }, 'تحديد الظاهرين'),
          h('button', { class: 'btn btn-small', type: 'button', onclick: () => setVisible(false) }, 'إلغاء التحديد')),
        h('ul', { class: 'pick-list', 'aria-label': 'قائمة اللاعبين' }, rows.map((r) => r.li)),
        count,
        h('p', { class: 'hint' }, 'يصل الملف إلى المحدَّدين فقط. لا يراه لاعب آخر ولا منظّم آخر.')));

    await formDialog({
      title: 'إرسال ملف خاص',
      body: form,
      submitLabel: 'إرسال',
      onSubmit: async () => {
        const chosen = boxes.filter((b) => b.input.checked).map((b) => b.p.uid);
        if (!chosen.length) throw new Error('اختر لاعبًا واحدًا على الأقل.');
        if (chosen.length > MAX_RECIPIENTS) throw new Error(`الحد الأقصى ${MAX_RECIPIENTS} مستلمًا في المرة الواحدة، أرسل على دفعات.`);
        const prepared = await prepareFile(file.files?.[0]);
        await store.sendShare({
          recipients: chosen, name: prepared.name, mime: prepared.mime, size: prepared.size, data: prepared.data,
          message: message.value.trim().slice(0, 500),
        });
        toast(`أُرسل الملف إلى ${chosen.length} ${chosen.length === 1 ? 'لاعب' : 'لاعبين'}`, 'ok');
        load();
        return true;
      },
    });
  }

  load();
  const node = h('section', { class: 'section', id: 'shares' },
    h('div', { class: 'section-head' },
      h('h2', null, 'الملفات الخاصة'),
      h('button', { class: 'btn btn-small', type: 'button', id: 'send-share', onclick: send }, 'إرسال ملف خاص')),
    h('p', { class: 'hint' }, 'ملفات تصل إلى لاعبين تحدّدهم أنت فقط. لا تُنشر في الموقع.'),
    body);

  return { node, dispose() { stopped = true; } };
}
return { MAX_RECIPIENTS, sharesSection };
};
__defs["views/tournament.js"] = function () {
// ---- views/tournament.js ----
// ============================================================
// views/tournament.js — صفحات اللاعبين: نظرة عامة، اللاعبون، الجولات، الترتيب، صفحة لاعب
// ============================================================

const { h, replace } = __r("dom.js");
const { watchTournament } = __r("sync.js");
const { chip, emptyState, gameList, standingsTable, knockoutList, pts } = __r("components.js");
const { FORMAT_LABEL, phaseOf, canRegister, playersText, focusRound, roundName, dayText } = __r("fmt.js");
const { computeStandings, knockoutStandings, FORMAT, gamesOfRound, roundsOf } = __r("lib/engine.js");
const { cleanName, cleanHandle, checkName, checkHandle, normalizeColorPref, profileUrl, cleanPhone, checkPhone } = __r("lib/validate.js");
const { cleanCode, looseCode } = __r("model.js");

const TABS = [
  ['overview', 'نظرة عامة'],
  ['players', 'اللاعبون'],
  ['rounds', 'الجولات'],
  ['standings', 'الترتيب'],
];

function renderTournament(initial, ctx) {
  const { store } = ctx;
  const tid = initial.tid;
  let params = initial;
  let state = null;
  let loaded = false;
  let failure = null;

  const root = h('div', { class: 'page' }, h('p', { class: 'loading', role: 'status' }, 'جارٍ تحميل البطولة…'));
  const regForm = createRegistrationForm(ctx, tid, () => state, () => paint());

  const watcher = watchTournament(store, tid, {
    onData(d) { state = d; loaded = true; failure = null; paint(); },
    onError(e) { failure = e; paint(); },
  });

  function paint() {
    if (failure && !loaded) {
      replace(root, emptyState(
        failure.offline ? 'لا يوجد اتصال بالإنترنت' : 'تعذّر تحميل البطولة',
        'تحقق من الاتصال ثم أعد المحاولة.',
        h('button', { class: 'btn', type: 'button', onclick: () => watcher.refresh() }, 'إعادة المحاولة')));
      return;
    }
    if (!loaded) return;
    if (!state || !state.t) {
      replace(root, emptyState('هذه البطولة غير موجودة', 'ربما حُذفت أو أن الرابط ناقص.',
        h('a', { class: 'btn', href: '#/' }, 'كل البطولات')));
      return;
    }
    const { t, players } = state;
    document.title = `${t.name} — ${ctx.config.siteName}`;
    regForm.sync(t);

    const header = masthead(t, players);
    const body = params.tab === 'p'
      ? playerPage(state, params.arg)
      : [tabs(t, players, params.tab), tabBody(ctx, state, params, regForm)];
    replace(root, header, body);
    // دخل اللاعب من الرابط المباشر ?tournament=ID: ننزل إلى نموذج التسجيل (مرة واحدة) ونضع المؤشر في أول حقل فارغ
    if (ctx.landing?.tid === tid && regForm.node.isConnected) {
      ctx.landing = null;
      requestAnimationFrame(() => { regForm.node.scrollIntoView({ block: 'start' }); regForm.focusFirst(); });
    }
  }

  return {
    root,
    dispose() { watcher.stop(); },
    update(next) { params = next; paint(); window.scrollTo({ top: 0 }); watcher.check(); },
  };
}

// ---------- الرأس ----------

function masthead(t, players) {
  const count = players.filter((p) => p.active).length;
  const facts = [
    t.date ? ['التاريخ', dayText(t.date)] : null,
    ['النظام', FORMAT_LABEL[t.format] + (t.format === FORMAT.ROUND_ROBIN && t.double ? ' (ذهاب وإياب)' : '')],
    t.timeControl ? ['وقت اللعب', t.timeControl] : null,
    t.totalRounds ? ['عدد الجولات', t.totalRounds] : null,
    ['اللاعبون', t.status === 'registration' ? `${count} من ${t.maxPlayers}` : count],
  ].filter(Boolean);

  return h('header', { class: 'masthead' },
    h('div', { class: 'masthead-top' },
      h('h1', { class: 'title' }, t.name),
      chip(phaseOf(t).label, phaseOf(t).kind)),
    t.published ? null : h('p', { class: 'draft-note', role: 'note' }, 'مسودة: لا يراها أحد غيرك. انشرها من لوحة المنظّم لتظهر للاعبين.'),
    h('dl', { class: 'facts' }, facts.map(([k, v]) => h('div', { class: 'fact' }, h('dt', null, k), h('dd', { class: v === t.timeControl ? 'ltr-inline' : null }, v)))));
}

function tabs(t, players, active) {
  return h('nav', { class: 'tabs', 'aria-label': 'أقسام البطولة' },
    TABS.map(([id, label]) => h('a', {
      class: 'tab',
      href: id === 'overview' ? `#/t/${t.id}` : `#/t/${t.id}/${id}`,
      'aria-current': (active || 'overview') === id ? 'page' : null,
    }, id === 'players' ? `${label} (${players.length})` : label)));
}

function tabBody(ctx, state, params, regForm) {
  switch (params.tab) {
    case 'players': return playersTab(state);
    case 'rounds': return roundsTab(state, params.arg);
    case 'standings': return standingsTab(state);
    default: return overviewTab(ctx, state, regForm);
  }
}

// ---------- نظرة عامة ----------

function overviewTab(ctx, state, regForm) {
  const { t, players, games } = state;
  const out = [];

  if (t.description) out.push(h('p', { class: 'lede' }, t.description));

  if (t.status === 'registration') {
    const full = t.playerCount >= t.maxPlayers; // نفس شرط القواعد
    let body;
    if (!canRegister(t)) {
      body = emptyState(
        t.published ? 'التسجيل مغلق الآن' : 'التسجيل غير متاح بعد',
        t.published ? 'ستعلن إدارة البطولة عند فتح التسجيل أو إجراء القرعة. تابع هذه الصفحة.' : 'هذه البطولة مسودة ولم يفتح المنظّم التسجيل.');
    } else if (full) {
      body = emptyState('اكتمل عدد اللاعبين', 'تواصل مع إدارة البطولة إن أردت الانضمام لقائمة الانتظار.');
    } else if (ctx.store.mode === 'remote' && ctx.account?.().role === 'organizer') {
      // المنظّم لا يُعامَل لاعبًا: لا يسجّل من حسابه. (في التجربة المحلية يبقى النموذج متاحًا لتجرّب بنفسك.)
      body = emptyState('أنت داخل بحساب المنظّم',
        'المنظّم لا يسجَّل لاعبًا من حسابه. لتلعب أنت أضِف نفسك من «إضافة لاعب» في لوحتك، أو افتح الموقع بلا تسجيل دخول لتجرّب نموذج اللاعبين.',
        h('a', { class: 'btn', href: `#/admin/t/${t.id}` }, 'لوحة هذه البطولة'));
    } else {
      body = regForm.node;
    }
    out.push(h('section', { class: 'section' }, h('h2', null, 'سجّل اسمك'), body));
  } else {
    const r = focusRound(games);
    if (r) {
      const list = gamesOfRound(games, r);
      out.push(h('section', { class: 'section' },
        h('div', { class: 'section-head' },
          h('h2', null, t.status === 'finished' ? `آخر جولة: ${roundName(t, r)}` : `الآن: ${roundName(t, r)}`),
          h('a', { class: 'link', href: `#/t/${t.id}/rounds/${r}` }, 'كل الجولات')),
        gameList(list, { tid: t.id })));
    } else {
      out.push(h('section', { class: 'section' },
        emptyState('لم تُجرَ القرعة بعد', 'ستظهر مباريات الجولة الأولى هنا فور إعلانها.')));
    }
  }

  if (players.length) {
    out.push(h('section', { class: 'section' },
      h('h2', null, 'صفحتي'),
      h('p', { class: 'hint' }, 'اختر اسمك لتعرف خصمك ولونك ومبارياتك.'),
      findMe(t, players)));
  }

  out.push(h('section', { class: 'section' },
    h('h2', null, 'كيف تلعب؟'),
    h('ol', { class: 'steps' },
      h('li', null, 'سجّل اسمك واسم حسابك في Chess.com، وانتظر قبول طلبك من إدارة البطولة.'),
      h('li', null, 'بعد القرعة افتح صفحتك هنا لتعرف خصمك ولونك.'),
      h('li', null, t.timeControl
        ? `ابحث عن خصمك في Chess.com وأرسل له تحدّيًا بوقت ${t.timeControl}.`
        : 'ابحث عن خصمك في Chess.com وأرسل له تحدّيًا بالوقت المتفق عليه.'),
      h('li', null, 'بعد المباراة تسجّل إدارة البطولة النتيجة هنا وتتحدّث الجولات والترتيب.'))));

  return out;
}

function findMe(t, players) {
  const select = h('select', {
    class: 'input',
    id: 'find-me',
    'aria-label': 'اختر اسمك',
    onchange: (e) => { if (e.target.value) location.hash = `#/t/${t.id}/p/${encodeURIComponent(e.target.value)}`; },
  }, h('option', { value: '' }, 'اختر اسمك…'),
  players.map((p) => h('option', { value: p.id }, p.name)));
  return select;
}

// ---------- اللاعبون ----------

function playersTab({ t, players }) {
  if (!players.length) {
    return emptyState('لا يوجد لاعبون معتمدون بعد', 'تظهر الأسماء هنا بعد أن تقبلها إدارة البطولة.');
  }
  return h('section', { class: 'section' },
    h('p', { class: 'hint' }, playersText(players.length)),
    h('ul', { class: 'players' }, players.map((p, i) => {
      const url = profileUrl(p.handle);
      return h('li', { class: `player${p.active ? '' : ' is-out'}` },
        h('span', { class: 'idx' }, i + 1),
        h('a', { class: 'player-link name', href: `#/t/${t.id}/p/${encodeURIComponent(p.id)}` }, p.name),
        p.active ? null : chip('منسحب'),
        url ? h('a', { class: 'handle ltr', href: url }, p.handle) : h('span', { class: 'handle ltr' }, p.handle));
    })));
}

// ---------- الجولات ----------

function roundsTab({ t, games }, arg) {
  const rounds = roundsOf(games);
  if (!rounds.length) {
    return emptyState('لم تُجرَ القرعة بعد', 'ستظهر مباريات الجولة الأولى هنا فور إعلانها.');
  }
  const wanted = Number(arg);
  const current = rounds.includes(wanted) ? wanted : focusRound(games);
  return h('section', { class: 'section' },
    h('nav', { class: 'pills', 'aria-label': 'الجولات' },
      rounds.map((r) => h('a', {
        class: 'pill',
        href: `#/t/${t.id}/rounds/${r}`,
        'aria-current': r === current ? 'page' : null,
      }, t.format === FORMAT.KNOCKOUT ? roundName(t, r) : String(r)))),
    h('h2', null, roundName(t, current)),
    gameList(gamesOfRound(games, current), { tid: t.id }));
}

// ---------- الترتيب ----------

function standingsTab({ t, players, games }) {
  if (!games.some((g) => g.result)) {
    return emptyState('لا نتائج بعد', 'يظهر الترتيب بعد تسجيل أول نتيجة.');
  }
  if (t.format === FORMAT.KNOCKOUT) {
    return h('section', { class: 'section' },
      knockoutList({ rows: knockoutStandings(players, games, t.totalRounds), t, tid: t.id }));
  }
  return h('section', { class: 'section' },
    standingsTable({ rows: computeStandings(players, games), tid: t.id }),
    h('p', { class: 'hint' }, 'عند تساوي النقاط: بوخهولتز (مجموع نقاط من لاعبهم) ثم سونبورن–بيرجر ثم عدد الانتصارات.'));
}

// ---------- صفحة اللاعب ----------

function playerPage({ t, players, games }, key) {
  const me = players.find((p) => p.id === key);
  if (!me) {
    return emptyState('لم نجد هذا اللاعب', 'قد يكون الرابط ناقصًا أو أن اسمك لم يُعتمد بعد.',
      h('a', { class: 'btn', href: `#/t/${t.id}/players` }, 'قائمة اللاعبين'));
  }
  const mine = games.filter((g) => g.white === key || g.black === key);
  const byId = new Map(players.map((p) => [p.id, p]));
  const url = profileUrl(me.handle);

  let standing = null;
  let koRow = null;
  if (games.some((g) => g.result)) {
    if (t.format === FORMAT.KNOCKOUT) koRow = knockoutStandings(players, games, t.totalRounds).find((r) => r.id === key);
    else standing = computeStandings(players, games).find((r) => r.id === key);
  }

  const summary = h('div', { class: 'me-summary' },
    standing ? h('div', { class: 'stat' }, h('span', { class: 'stat-n' }, pts(standing.points)), h('span', { class: 'stat-l' }, 'نقطة')) : null,
    standing ? h('div', { class: 'stat' }, h('span', { class: 'stat-n' }, `${standing.rank}`), h('span', { class: 'stat-l' }, 'الترتيب')) : null,
    koRow ? chip(koRow.status === 'champion' ? 'البطل' : koRow.status === 'runnerUp' ? 'الوصيف' : koRow.status === 'out' ? `خرج في ${roundName(t, koRow.exitRound)}` : 'لا يزال في المنافسة',
      koRow.status === 'out' ? 'neutral' : 'ok') : null);

  const head = h('header', { class: 'me-head' },
    h('p', { class: 'crumb' }, h('a', { class: 'link', href: `#/t/${t.id}` }, t.name)),
    h('h2', { class: 'me-name' }, me.name),
    h('p', { class: 'me-handle' }, 'حساب Chess.com: ',
      url ? h('a', { class: 'ltr', href: url }, me.handle) : h('span', { class: 'ltr' }, me.handle),
      me.active ? null : chip('منسحب')),
    summary);

  const nextGame = mine
    .filter((g) => !g.result && g.black)
    .sort((a, b) => a.round - b.round)[0];

  let nextBlock;
  if (nextGame) {
    const iAmWhite = nextGame.white === key;
    const oppId = iAmWhite ? nextGame.black : nextGame.white;
    const opp = byId.get(oppId);
    const oppName = iAmWhite ? nextGame.blackName : nextGame.whiteName;
    const oppUrl = opp ? profileUrl(opp.handle) : null;
    nextBlock = h('section', { class: 'next' },
      h('h3', null, 'مباراتك القادمة'),
      h('p', { class: 'next-line' },
        `${roundName(t, nextGame.round)}، لوحة ${nextGame.board}: تلعب `,
        h('strong', null, iAmWhite ? 'بالأبيض' : 'بالأسود'),
        ' ضد ', h('strong', null, oppName), '.'),
      h('p', { class: 'hint' },
        t.timeControl
          ? `افتح ملف خصمك في Chess.com، وأرسل له تحدّيًا بوقت ${t.timeControl}${iAmWhite ? ' مع اختيار الأبيض لنفسك' : ' (هو من يختار الأبيض)'}.`
          : 'افتح ملف خصمك في Chess.com وأرسل له تحدّيًا بالوقت المتفق عليه.'),
      oppUrl ? h('a', { class: 'btn btn-primary', href: oppUrl }, `ملف ${opp.handle} على Chess.com`) : null);
  } else if (t.status === 'registration') {
    nextBlock = h('section', { class: 'next quiet' }, h('p', null, 'تم اعتماد اسمك. ستعرف خصمك ولونك هنا بعد القرعة.'));
  } else if (t.status === 'finished') {
    nextBlock = null;
  } else {
    nextBlock = h('section', { class: 'next quiet' }, h('p', null, 'لا مباراة مطلوبة منك الآن. ستظهر مباراتك التالية هنا فور إعلان الجولة.'));
  }

  const rounds = [...new Set(mine.map((g) => g.round))].sort((a, b) => a - b);
  const history = rounds.length
    ? h('section', { class: 'section' },
      h('h3', null, 'كل مبارياتك'),
      rounds.map((r) => h('div', { class: 'round-block' },
        h('h4', { class: 'round-title' }, roundName(t, r)),
        gameList(mine.filter((g) => g.round === r), { tid: t.id, meKey: key }))))
    : null;

  return h('div', { class: 'player-page' }, head, nextBlock, history);
}

// ---------- نموذج التسجيل (يبقى حيًّا بين التحديثات فلا يضيع ما كتبه اللاعب) ----------

function createRegistrationForm(ctx, tid, getState, repaint) {
  const { store } = ctx;
  // الرمز يُقرأ من الرابط عند كل تحديث، فلا يضيع لو فتح اللاعب رابط التسجيل داخل نفس التبويب
  const readLinkCode = () => cleanCode(new URLSearchParams(location.hash.split('?')[1] || '').get('code') || '');
  let codeFromLink = readLinkCode();

  const field = (id, label, input, hint) => {
    const err = h('p', { class: 'field-error', id: `${id}-err`, role: 'alert' });
    input.setAttribute('aria-describedby', hint ? `${id}-hint ${id}-err` : `${id}-err`);
    return {
      wrap: h('div', { class: 'field' }, h('label', { class: 'label', for: id }, label), input,
        hint ? h('p', { class: 'hint', id: `${id}-hint` }, hint) : null, err),
      err,
      input,
    };
  };

  const nameIn = h('input', { class: 'input', id: 'reg-name', type: 'text', maxlength: 40, autocomplete: 'name', required: true });
  const handleIn = h('input', {
    class: 'input ltr', id: 'reg-handle', type: 'text', maxlength: 26, autocomplete: 'off',
    autocapitalize: 'none', spellcheck: 'false', required: true,
  });
  const codeIn = h('input', {
    class: 'input ltr code', id: 'reg-code', type: 'text', maxlength: 20, autocomplete: 'off',
    autocapitalize: 'characters', spellcheck: 'false', value: codeFromLink,
    oninput: (e) => { e.target.value = looseCode(e.target.value); },
    placeholder: 'CHESS-XXXXXX', required: true,
  });
  // رقم الهاتف: تراه إدارة البطولة وحدها (للتواصل معك بخصوص البطولة)
  const phoneIn = h('input', {
    class: 'input ltr', id: 'reg-phone', type: 'tel', inputmode: 'tel', maxlength: 24, autocomplete: 'tel',
    spellcheck: 'false', required: true, placeholder: '+9665XXXXXXXX',
  });
  // فخ للروبوتات: حقل مخفي عن البشر. إن امتلأ نتجاهل الطلب.
  const trap = h('input', { class: 'hp', type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });

  const fName = field('reg-name', 'اسمك الكامل', nameIn, 'كما يعرفك أصدقاؤك، ويظهر للجميع.');
  const fHandle = field('reg-handle', 'اسم حسابك في Chess.com', handleIn,
    'بدون @، ويجب أن يطابق حسابك تمامًا لأن خصمك سيبحث عنه.');
  const fPhone = field('reg-phone', 'رقم الهاتف', phoneIn, 'تراه إدارة البطولة وحدها ولا يظهر لأي لاعب. اكتبه مع رمز الدولة إن أمكن.');
  const fCode = field('reg-code', 'رمز الدعوة', codeIn, 'وصلك من إدارة البطولة (مثل CHESS-4F7K2P)، ويُملأ تلقائيًا إن دخلت من الرابط المباشر.');

  const colorGroup = h('fieldset', { class: 'field choice' },
    h('legend', { class: 'label' }, 'اللون المفضّل'),
    h('div', { class: 'segmented' },
      [['any', 'لا فرق'], ['white', 'الأبيض'], ['black', 'الأسود']].map(([v, label]) =>
        h('label', { class: 'seg' },
          h('input', { type: 'radio', name: 'reg-color', value: v, checked: v === 'any' }), h('span', null, label)))),
    h('p', { class: 'hint' }, 'القرعة توزّع الألوان بعدالة بين الجميع. اختيارك يُراعى كلما أمكن.'));

  const status = h('div', { class: 'form-status', role: 'status' });
  const submit = h('button', { class: 'btn btn-primary btn-wide', type: 'submit' }, 'إرسال طلب التسجيل');

  const codeField = fCode.wrap;
  let checkedFor = ''; // آخر حساب فحصنا حالة طلبه (كي لا نكرّر القراءة)
  const form = h('form', { class: 'form', novalidate: true, onsubmit: onSubmit },
    fName.wrap, fHandle.wrap, fPhone.wrap, codeField, colorGroup, trap, status, submit);
  const done = h('div', { class: 'done', hidden: true });
  const node = h('div', null, form, done);

  function setError(f, msg) {
    f.err.textContent = msg;
    f.input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  nameIn.addEventListener('blur', () => setError(fName, nameIn.value ? checkName(cleanName(nameIn.value)) : ''));
  handleIn.addEventListener('blur', () => setError(fHandle, handleIn.value ? checkHandle(cleanHandle(handleIn.value)) : ''));
  phoneIn.addEventListener('blur', () => setError(fPhone, phoneIn.value ? checkPhone(cleanPhone(phoneIn.value)) : ''));
  nameIn.addEventListener('input', () => setError(fName, ''));
  handleIn.addEventListener('input', () => setError(fHandle, ''));
  phoneIn.addEventListener('input', () => setError(fPhone, ''));
  codeIn.addEventListener('input', () => setError(fCode, ''));

  async function onSubmit(e) {
    e.preventDefault();
    const state = getState();
    if (!state?.t || !canRegister(state.t)) { status.textContent = 'التسجيل مغلق الآن في هذه البطولة.'; return; }
    const name = cleanName(nameIn.value);
    const handle = cleanHandle(handleIn.value);
    const phone = cleanPhone(phoneIn.value);
    const code = cleanCode(codeIn.value);
    const nameErr = checkName(name);
    const handleErr = checkHandle(handle);
    const phoneErr = checkPhone(phone);
    const codeErr = code ? '' : 'اكتب رمز الدعوة الذي وصلك من إدارة البطولة.';
    setError(fName, nameErr);
    setError(fHandle, handleErr);
    setError(fPhone, phoneErr);
    setError(fCode, codeErr);
    // كل الحقول إلزامية: نركّز على أول حقل ناقص أو خاطئ
    const bad = [[nameErr, nameIn], [handleErr, handleIn], [phoneErr, phoneIn], [codeErr, codeIn]].find(([m]) => m);
    if (bad) { bad[1].focus(); return; }
    if (state.players.some((p) => p.id === handle.toLowerCase())) {
      status.textContent = 'هذا الحساب مسجّل ومعتمد بالفعل في البطولة.';
      return;
    }
    const color = normalizeColorPref(form.querySelector('input[name="reg-color"]:checked')?.value);
    if (trap.value) { showDone(name); return; } // روبوت: نتظاهر بالنجاح دون إرسال

    submit.disabled = true;
    status.textContent = 'جارٍ إرسال طلبك…';
    try {
      await store.register(tid, { name, handle, phone, prefColor: color, code, uid: accountUid() });
      showDone(name);
    } catch (err) {
      status.textContent = err.offline
        ? 'لا يوجد اتصال بالإنترنت. أعد المحاولة بعد عودته.'
        : err.denied
          ? 'تعذّر إرسال الطلب. غالبًا هذا الحساب سبق تسجيله، أو رمز الدعوة غير صحيح، أو أُغلق التسجيل.'
          : 'حدث خطأ غير متوقع. أعد المحاولة بعد قليل.';
      submit.disabled = false;
    }
  }

  function showDone(name) {
    form.hidden = true;
    done.hidden = false;
    replace(done,
      h('p', { class: 'done-title' }, `وصل طلبك يا ${name}.`),
      h('p', null, 'طلبك الآن «قيد المراجعة». ستراجعه إدارة البطولة وتقبله، وبعدها يظهر اسمك في قائمة اللاعبين. لا حاجة لإعادة التسجيل.'),
      h('button', {
        class: 'btn', type: 'button',
        onclick: () => {
          form.reset(); done.hidden = true; form.hidden = false; submit.disabled = false; status.textContent = '';
          codeIn.value = codeFromLink; repaint();
        },
      }, 'تسجيل لاعب آخر'));
    done.querySelector('.done-title')?.setAttribute('tabindex', '-1');
    done.querySelector('.done-title')?.focus();
  }

  // لاعب مسجَّل الدخول بحساب (دوره من القواعد لا من اختياره): نملأ بياناته ونربط الطلب بحسابه.
  // المنظّم لا يُعدّ لاعبًا: طلبه يُرسَل كزائر بلا ربط بحساب، والقواعد ترفض ربطه أصلًا.
  const competitor = () => {
    const acc = ctx.account?.();
    return acc?.role === 'competitor' && acc.profile ? acc.profile : null;
  };
  const accountUid = () => (competitor() ? store.auth.current()?.uid : undefined);

  function showMessage(title, text) {
    form.hidden = true;
    done.hidden = false;
    replace(done,
      h('p', { class: 'done-title' }, title),
      h('p', null, text),
      h('button', {
        class: 'btn', type: 'button',
        onclick: () => { done.hidden = true; form.hidden = false; submit.disabled = false; status.textContent = ''; },
      }, 'تسجيل لاعب آخر'));
  }

  function applyAccount() {
    const p = competitor();
    if (!p) return;
    if (!nameIn.value) nameIn.value = p.name;
    if (!handleIn.value) handleIn.value = p.handle;
    const key = p.handle.toLowerCase();
    if (checkedFor === key) return;
    checkedFor = key;
    if (getState()?.players?.some((pl) => pl.id === key)) {
      showMessage(`أنت مسجّل يا ${p.name}.`, 'قُبل طلبك وظهر اسمك في قائمة اللاعبين.');
      return;
    }
    store.getMyRegistration(tid, p.handle).then((reg) => {
      if (reg) showMessage(`وصل طلبك يا ${p.name}.`, 'بانتظار قبول إدارة البطولة، وبعدها يظهر اسمك في قائمة اللاعبين.');
    }).catch(() => { /* لا نزعج اللاعب: النموذج يبقى متاحًا */ });
  }
  applyAccount();

  // رمز الدعوة إلزامي لكل بطولة: الحقل ظاهر دائمًا
  return {
    node,
    focusFirst() { [nameIn, handleIn, phoneIn, codeIn].find((i) => !i.value)?.focus({ preventScroll: true }); },
    sync() {
      const fresh = readLinkCode();
      if (fresh && fresh !== codeFromLink && (!codeIn.value || codeIn.value === codeFromLink)) codeIn.value = fresh;
      if (fresh) codeFromLink = fresh;
      applyAccount();
    },
  };
}
return { renderTournament };
};
__r("app.js");
})();
