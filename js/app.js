/* ============================================================
   WizardPRO — Application JavaScript
   Extracted from morty-app-source-code.html
============================================================ */

/* ===== PAGE ROUTING ===== */
function showPage(id) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  var t = document.getElementById(id);
  if (t) { t.classList.add('active'); window.scrollTo(0,0); }
}

function buildWizardProHandle(name, email) {
  var base = ((email || '').split('@')[0] || name || 'guest').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return '@' + (base || 'guest');
}

function pickWizardProAvatarTheme(seed) {
  var themes = [
    {emoji:'🐂',color:'#2563EB',label:'Bull Run'},
    {emoji:'🐻',color:'#DC2626',label:'Bear Watch'},
    {emoji:'📈',color:'#0F9D58',label:'Breakout'},
    {emoji:'🕯️',color:'#7C3AED',label:'Candle Mage'},
    {emoji:'🎯',color:'#EA580C',label:'Target Hunter'},
    {emoji:'💹',color:'#0891B2',label:'Swing Wizard'}
  ];
  var value = String(seed || 'wizardpro');
  var hash = 0;
  for (var i = 0; i < value.length; i++) hash = (hash + value.charCodeAt(i) * (i + 1)) % 9973;
  return themes[hash % themes.length];
}

function openEmailAuth() {
  var form = document.getElementById('emailAuthForm');
  var email = document.getElementById('emailAuthEmail');
  var err = document.getElementById('emailAuthError');
  if (form) form.classList.add('active');
  if (err) err.classList.remove('active');
  if (email) email.focus();
}

function completeEmailAuth(event) {
  if (event) event.preventDefault();
  var emailInput = document.getElementById('emailAuthEmail');
  var passwordInput = document.getElementById('emailAuthPassword');
  var err = document.getElementById('emailAuthError');
  var email = (emailInput && emailInput.value || '').trim();
  var password = passwordInput && passwordInput.value || '';
  if (!email || email.indexOf('@') < 1 || !password) {
    if (err) {
      err.textContent = 'Please enter a valid email and password.';
      err.classList.add('active');
    }
    return false;
  }
  var username = email.split('@')[0];
  var handle = buildWizardProHandle(username, email);
  localStorage.setItem('wp_user', JSON.stringify({
    name: username,
    email: email,
    handle: handle,
    avatarTheme: pickWizardProAvatarTheme(handle + username)
  }));
  activateWizardApp();
  return false;
}

/* ===== SPARKLINES ===== */
function drawSparkline(canvasId, isUp) {
  var c = document.getElementById(canvasId);
  if (!c) return;
  var dpr = window.devicePixelRatio || 1;
  var w = c.offsetWidth, h = c.offsetHeight || 36;
  c.width = w * dpr; c.height = h * dpr;
  var ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  var pts = [0.5];
  for (var i = 1; i < 28; i++) {
    var delta = (Math.random() - (isUp ? 0.45 : 0.55)) * 0.12;
    pts.push(Math.max(0.05, Math.min(0.95, pts[i-1] + delta)));
  }
  var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts);
  var range = max - min || 0.1;
  var color = isUp ? '#00c87a' : '#ff4757';
  var grad = ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0, isUp ? 'rgba(0,200,122,0.25)' : 'rgba(255,71,87,0.2)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  pts.forEach(function(v,i) {
    var x = (i/(pts.length-1))*w;
    var y = h - ((v-min)/range)*(h*0.85) - h*0.05;
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  });
  ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath();
  pts.forEach(function(v,i) {
    var x = (i/(pts.length-1))*w;
    var y = h - ((v-min)/range)*(h*0.85) - h*0.05;
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  });
  ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.stroke();
}

window.addEventListener('load', function() {
  drawSparkline('sp-nifty',  false);
  drawSparkline('sp-bnifty', true);
  drawSparkline('sp-sgx',    true);
  drawSparkline('sp-nikkei', false);
  drawSparkline('sp-sp500',  true);
  drawSparkline('sp-nasdaq', true);
});

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let currentTab = 'community';
let currentFundView = 'overview';
let currentTradeLabView = 'pnl'; // FIX 5: first tab is now P&L
let currentUser = null;
let posts = [];
let watchlist = [];
let newsItems = [];
let calcMode = 'indian_futures';
let orderSide = 'buy';
let currentOrderVariant = 'Regular';
let activePostTag = '';
let postCount = 0;
let currentNewsFilter = 'all';
let swipeConfirmed = false;
let orderStoplossEnabled = false;
let orderProtectionEnabled = false;
let orderAdvancedOpen = false;
let swipeAutoSubmitting = false;
let dmThreads = JSON.parse(localStorage.getItem('wp_dm_threads') || '[]');
let activeDmThreadId = localStorage.getItem('wp_dm_active') || '';
let dmSearchQuery = '';
let tradeJournal = JSON.parse(localStorage.getItem('wp_trade_journal') || '[]');
let watchlistMenuVisible = false;
const AVATAR_THEMES = [
  {emoji:'🐂',color:'#2563EB',label:'Bull Run'},
  {emoji:'🐻',color:'#DC2626',label:'Bear Watch'},
  {emoji:'📈',color:'#0F9D58',label:'Breakout'},
  {emoji:'🕯️',color:'#7C3AED',label:'Candle Mage'},
  {emoji:'🎯',color:'#EA580C',label:'Target Hunter'},
  {emoji:'💹',color:'#0891B2',label:'Swing Wizard'}
];
const FINNHUB_KEY = 'd7tip7pr01qugn0aovh0d7tip7pr01qugn0aovhg';

function hashSeed(value){
  return [...String(value || 'wizardpro')].reduce((acc, ch, idx) => (acc + ch.charCodeAt(0) * (idx + 1)) % 9973, 0);
}
function buildHandle(name='', email=''){
  const base = (email.split('@')[0] || name || 'guest').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return '@' + (base || 'guest');
}
function pickAvatarTheme(seed){
  return AVATAR_THEMES[hashSeed(seed) % AVATAR_THEMES.length];
}
function normalizeUser(user){
  const cleanEmail = (user?.email || '').trim();
  const emailUsername = cleanEmail.split('@')[0];
  const cleanName = (emailUsername || user?.name || 'Guest Trader').trim();
  const handle = user?.handle || buildHandle(cleanName, cleanEmail);
  return {
    ...user,
    name: cleanName,
    email: cleanEmail,
    handle,
    avatarTheme: user?.avatarTheme || pickAvatarTheme(handle + cleanName),
  };
}
function persistCurrentUser(){
  if(currentUser) localStorage.setItem('wp_user', JSON.stringify(currentUser));
}
function getMarketSessionState(date = new Date()){
  const ist = new Date(date.toLocaleString('en-US',{timeZone:'Asia/Kolkata'}));
  const h = ist.getHours();
  const m = ist.getMinutes();
  if(h>=9 && (h<15 || (h===15 && m<=30))) return 'open';
  if((h===8 && m>=45) || (h===9 && m<15)) return 'premarket';
  return 'closed';
}
function roundPrice(value, digits = 2){
  const num = Number(value);
  return Number.isFinite(num) ? parseFloat(num.toFixed(digits)) : 0;
}
function formatINR(value, digits = 2){
  const num = Number(value);
  if(!Number.isFinite(num)) return '₹—';
  return '₹' + num.toLocaleString('en-IN',{maximumFractionDigits:digits,minimumFractionDigits:digits});
}
function escapeHtml(value=''){
  return String(value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function pseudoQuoteFromSymbol(sym, name='', exchange='NSE'){
  const seed = hashSeed(sym + name + exchange);
  const price = roundPrice(80 + (seed % 2500) + ((seed % 97) / 100));
  const pctRaw = ((seed % 700) - 350) / 100;
  const up = pctRaw >= 0;
  const tags = ['nifty50','fno','etf'];
  return {
    sym,
    name: name || sym + ' Ltd',
    price,
    chg: `${up ? '+' : ''}${pctRaw.toFixed(2)}%`,
    up,
    tag: tags[seed % tags.length],
    exchange,
  };
}
function getSearchUniverse(){
  const merged = new Map();
  [
    ...DEFAULT_WATCHLIST,
    ...SEARCH_DB,
    ...(watchlist || []),
    ...STOCKS_DB.map(stock=>pseudoQuoteFromSymbol(stock.ticker, stock.name, stock.exchange))
  ].forEach(item=>{
    if(!item?.sym) return;
    merged.set(item.sym, {
      ...item,
      price: Number(item.price) || pseudoQuoteFromSymbol(item.sym, item.name || item.sym).price,
      up: typeof item.up === 'boolean' ? item.up : String(item.chg || '').trim().startsWith('+'),
      tag: item.tag || 'fno',
    });
  });
  return [...merged.values()];
}
function getSymbolSnapshot(sym){
  return getSearchUniverse().find(item=>item.sym===sym) || pseudoQuoteFromSymbol(sym, sym + ' Ltd');
}
function getLivePrice(sym){
  const watch = watchlist.find(item=>item.sym===sym);
  if(watch && Number.isFinite(Number(watch.price))) return Number(watch.price);
  const pos = openPositions.find(item=>item.sym===sym);
  if(pos && Number.isFinite(Number(pos.ltp))) return Number(pos.ltp);
  return Number(getSymbolSnapshot(sym)?.price) || 0;
}
function scrollChipIntoView(el){
  if(!el?.scrollIntoView) return;
  el.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
}

/* ══════════════════════════════════════════
   AUTH
══════════════════════════════════════════ */
function switchAuthTab(tab){
  document.getElementById('authTabLogin').classList.toggle('active', tab==='login');
  document.getElementById('authTabSignup').classList.toggle('active', tab==='signup');
  document.getElementById('loginForm').style.display = tab==='login'?'block':'none';
  document.getElementById('signupForm').style.display = tab==='signup'?'block':'none';
}

function doLogin(){
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  if(!email || !pw){ showToast('Please enter email & password'); return; }
  const name = email.split('@')[0];
  setUser({name, email});
}

function doSignup(){
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  if(!name||!email){ showToast('Please fill all fields'); return; }
  setUser({name, email});
}

function doGoogleAuth(){
  const typedName = document.getElementById('guestName')?.value.trim();
  setUser({name:typedName || 'Rahul Sharma', email:'rahul@example.com'});
}

function skipAuth(){
  const guestName = document.getElementById('guestName')?.value.trim();
  if(!guestName){ showToast('Enter a guest name first'); return; }
  setUser({name:guestName, email:''});
}

function setUser(user){
  currentUser = normalizeUser(user);
  persistCurrentUser();
  document.getElementById('authOverlay')?.classList.add('hidden');
  updateProfileUI();
  seedSocialData();
  showToast('Welcome, ' + currentUser.name.split(' ')[0] + '! 👋');
}

function updateProfileUI(){
  if(!currentUser) return;
  // Avatar is globally themed via CSS (no blank state for guests).
  const avatarLg = document.getElementById('profileAvatarLg');
  const composeAvatar = document.getElementById('composeAvatar');
  if(avatarLg){
    avatarLg.textContent = '';
    avatarLg.style.background = '';
  }
  if(composeAvatar){
    composeAvatar.textContent = '';
    composeAvatar.style.background = '';
  }
  document.getElementById('composeUserName').textContent = currentUser.name;
  document.getElementById('profileNameBig').textContent = currentUser.name;
  document.getElementById('profileHandleBig').textContent = currentUser.handle;
}

function doLogout(){
  currentUser = null;
  localStorage.removeItem('wp_user');
  closeModalById('messagesModal');
  closeModalById('notificationsModal');
  closeModalById('profileModal');
  showLandingExperience();
}

function openProfile(){ document.getElementById('profileModal').classList.add('show'); }

function editProfile(){
  const n = prompt('Display name:', currentUser?.name || '');
  if(n && n.trim()){
    currentUser = normalizeUser({...currentUser, name:n.trim(), handle:buildHandle(n.trim(), currentUser?.email || '')});
    persistCurrentUser();
    updateProfileUI();
    showToast('Profile updated');
  }
  closeModalById('profileModal');
}

/* ══════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════ */
function persistTradeJournal(){
  localStorage.setItem('wp_trade_journal', JSON.stringify(tradeJournal));
}
function getJournalDateValue(){
  return document.getElementById('journalDate')?.value || new Date().toISOString().slice(0,10);
}
function getJournalEntriesByDate(date){
  return tradeJournal.filter(entry=>entry.date===date);
}
function calculateJournalPnL(entry){
  const entryPrice = Number(entry.entryPrice || 0);
  const exitPrice = Number(entry.exitPrice || 0);
  const qty = Number(entry.quantity || 0);
  if(!qty || !entryPrice || !exitPrice) return 0;
  const delta = entry.direction === 'Short' ? entryPrice - exitPrice : exitPrice - entryPrice;
  return +(delta * qty).toFixed(2);
}
function renderJournalStats(){
  const container = document.getElementById('journalStats');
  if(!container) return;
  const date = getJournalDateValue();
  const entries = getJournalEntriesByDate(date);
  const totalPnL = entries.reduce((sum, entry)=>sum + calculateJournalPnL(entry), 0);
  const wins = entries.filter(entry=>calculateJournalPnL(entry) > 0).length;
  const avgConfidence = entries.length
    ? entries.map(entry=>entry.confidence || 'C').reduce((sum, grade)=>sum + ({'A+':4,A:3,B:2,C:1}[grade] || 1), 0) / entries.length
    : 0;
  const confidenceText = entries.length ? (avgConfidence >= 3.5 ? 'A+' : avgConfidence >= 2.5 ? 'A' : avgConfidence >= 1.5 ? 'B' : 'C') : '-';
  container.innerHTML = `
    <div class="journal-stat">
      <div class="journal-stat-label">Trades Logged</div>
      <div class="journal-stat-value">${entries.length}</div>
    </div>
    <div class="journal-stat">
      <div class="journal-stat-label">Net P&amp;L</div>
      <div class="journal-stat-value" style="color:${totalPnL >= 0 ? 'var(--green)' : 'var(--red)'}">${formatINR(totalPnL)}</div>
    </div>
    <div class="journal-stat">
      <div class="journal-stat-label">Win Rate / Grade</div>
      <div class="journal-stat-value">${entries.length ? Math.round((wins / entries.length) * 100) : 0}% / ${confidenceText}</div>
    </div>
  `;
}
function renderJournalEntries(){
  const container = document.getElementById('journalEntries');
  if(!container) return;
  const date = getJournalDateValue();
  const entries = getJournalEntriesByDate(date).sort((a,b)=>b.createdAt - a.createdAt);
  renderJournalStats();
  if(!entries.length){
    container.innerHTML = '<div class="journal-empty">No trades logged for this day yet. Add your first setup above.</div>';
    return;
  }
  container.innerHTML = entries.map(entry=>{
    const pnl = calculateJournalPnL(entry);
    return `
      <div class="journal-card">
        <div class="journal-card-head">
          <div>
            <div class="journal-card-title">${escapeHtml(entry.symbol)} / ${escapeHtml(entry.setup || 'Trade setup')}</div>
            <div class="journal-card-meta">
              <span>${escapeHtml(entry.direction)}</span>
              <span>${entry.quantity || 0} qty</span>
              <span>Entry ${escapeHtml(String(entry.entryPrice || '-'))}</span>
              <span>Exit ${escapeHtml(String(entry.exitPrice || '-'))}</span>
              <span>${escapeHtml(entry.confidence || 'C')}</span>
            </div>
          </div>
          <div class="journal-card-pnl ${pnl >= 0 ? 'pos' : 'neg'}">${formatINR(pnl)}</div>
        </div>
        <div class="journal-card-notes">
          <strong>Notes:</strong> ${escapeHtml(entry.notes || 'No notes added.')}<br/>
          <strong>Lesson:</strong> ${escapeHtml(entry.lesson || 'No lesson captured.')}
        </div>
      </div>
    `;
  }).join('');
}
function clearJournalForm(){
  const dateInput = document.getElementById('journalDate');
  const dateVal = dateInput?.value || new Date().toISOString().slice(0,10);
  ['journalSymbol','journalSetup','journalEntry','journalExit','journalQty','journalNotes','journalLesson'].forEach(id=>{
    const field = document.getElementById(id);
    if(field) field.value = '';
  });
  const direction = document.getElementById('journalDirection');
  const confidence = document.getElementById('journalConfidence');
  if(direction) direction.value = 'Long';
  if(confidence) confidence.value = 'A+';
  if(dateInput) dateInput.value = dateVal;
}
function openJournal(){
  if(!currentUser){ showToast('Sign in first to use the journal'); return; }
  closeModalById('profileModal');
  const dateInput = document.getElementById('journalDate');
  if(dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0,10);
  renderJournalEntries();
  document.getElementById('journalModal').classList.add('show');
}
function saveJournalEntry(){
  const date = getJournalDateValue();
  const symbol = document.getElementById('journalSymbol')?.value.trim().toUpperCase();
  const setup = document.getElementById('journalSetup')?.value.trim();
  if(!symbol || !setup){
    showToast('Add both symbol and setup to save this trade');
    return;
  }
  const entry = {
    id: Date.now(),
    date,
    symbol,
    direction: document.getElementById('journalDirection')?.value || 'Long',
    setup,
    entryPrice: Number(document.getElementById('journalEntry')?.value || 0),
    exitPrice: Number(document.getElementById('journalExit')?.value || 0),
    quantity: Number(document.getElementById('journalQty')?.value || 0),
    confidence: document.getElementById('journalConfidence')?.value || 'A+',
    notes: document.getElementById('journalNotes')?.value.trim() || '',
    lesson: document.getElementById('journalLesson')?.value.trim() || '',
    createdAt: Date.now()
  };
  tradeJournal.unshift(entry);
  persistTradeJournal();
  clearJournalForm();
  const dateInput = document.getElementById('journalDate');
  if(dateInput) dateInput.value = date;
  renderJournalEntries();
  showToast('Trade saved to journal');
}

function switchTab(tab){
  currentTab = tab;
  document.querySelectorAll('.tab-screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.bnav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('screen-'+tab).classList.add('active');
  document.getElementById('bnav-'+tab).classList.add('active');
  if(tab==='news'){ document.getElementById('newsBadge').style.display='none'; }
  // FAB only visible in community tab
  const fabWrapper = document.getElementById('fabWrapper');
  if(fabWrapper){ fabWrapper.style.display = (tab==='community') ? '' : 'none'; }
  updateTopbarContext(tab);
}

function updateTopbarContext(tab){
  const marketPill = document.getElementById('marketPill');
  const social = document.getElementById('topbarSocial');
  if(marketPill) marketPill.style.display = tab === 'tradelab' ? 'inline-flex' : 'none';
  if(social) social.style.display = tab === 'tradelab' ? 'none' : 'inline-flex';
}

/* ══════════════════════════════════════════
   TOPBAR CLOCK + MARKET STATUS
══════════════════════════════════════════ */
function updateClock(){
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US',{timeZone:'Asia/Kolkata'}));
  const h = ist.getHours(), m = ist.getMinutes();
  const hh = String(h).padStart(2,'0'), mm = String(m).padStart(2,'0');
  document.getElementById('topbarTime').textContent = hh+':'+mm+' IST';

  const pill = document.getElementById('marketPill');
  const txt = document.getElementById('marketStatus');
  const session = getMarketSessionState(now);
  const dot = pill?.querySelector('.dot');
  if(session === 'open'){
    pill.style.color='var(--green)';
    txt.textContent='Market Open';
    if(dot) dot.style.background='var(--green)';
  } else if(session === 'premarket'){
    pill.style.color='var(--amber)';
    txt.textContent='Pre-Market';
    if(dot) dot.style.background='var(--amber)';
  } else {
    pill.style.color='var(--red)';
    txt.textContent='Market Closed';
    if(dot) dot.style.background='var(--red)';
  }
  updateTopbarContext(currentTab);
}
setInterval(updateClock, 1000);
updateClock();

/* ══════════════════════════════════════════
   THEME
══════════════════════════════════════════ */
function applyTheme(theme){
  const html = document.documentElement;
  html.setAttribute('data-theme', theme);
  const sun = document.getElementById('iconSun');
  const moon = document.getElementById('iconMoon');
  if(sun) sun.style.display = theme==='light'?'block':'none';
  if(moon) moon.style.display = theme==='dark'?'block':'none';
  localStorage.setItem('wp_theme', theme);
}
function getEffectiveTheme(pref){
  if(pref==='system'){
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref==='dark'?'dark':'light';
}
function saveDefaultTheme(pref){
  localStorage.setItem('wp_default_theme', pref);
  applyTheme(getEffectiveTheme(pref));
  showToast('Default theme updated');
}
function openSettings(){
  const pref = localStorage.getItem('wp_default_theme') || 'light';
  const sel = document.getElementById('defaultThemeSelect');
  if(sel) sel.value = pref;
  document.getElementById('settingsModal').classList.add('show');
}
function toggleTheme(){
  const html = document.documentElement;
  const dark = html.getAttribute('data-theme')==='dark';
  applyTheme(dark?'light':'dark');
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function showToast(msg, dur=2500){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), dur);
}

/* ══════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════ */
function closeModal(e, id){ if(e.target===document.getElementById(id)) closeModalById(id); }
function closeModalById(id){ document.getElementById(id).classList.remove('show'); }
function openNewPost(){ document.getElementById('newPostModal').classList.add('show'); }

/* ════════════════════════════════════════════
   SOCIAL + SWIPE NAV
════════════════════════════════════════════ */
function persistSocialData(){
  localStorage.setItem('wp_dm_threads', JSON.stringify(dmThreads));
  localStorage.setItem('wp_dm_active', activeDmThreadId || '');
}
function buildSocialParticipants(){
  const seen = new Map();
  DEMO_POSTS.forEach(post=>{
    if(seen.has(post.handle)) return;
    seen.set(post.handle, {
      id: post.handle.replace('@',''),
      name: post.user,
      handle: post.handle,
      avatar: post.avatar,
      avatarColor: post.avatarColor,
      specialty: post.tag || 'markets',
    });
  });
  return [...seen.values()];
}
function seedSocialData(force = false){
  if(!currentUser) return;
  if(force || !Array.isArray(dmThreads) || !dmThreads.length){
    const starters = buildSocialParticipants().slice(0,4);
    dmThreads = starters.map((user, idx)=>({
      id: user.id,
      name: user.name,
      handle: user.handle,
      avatar: user.avatar,
      avatarColor: user.avatarColor,
      unread: idx === 0 ? 1 : 0,
      messages: [
        {
          from: 'them',
          text: [
            'Watching the opening range today. If NIFTY holds above pivot, I like longs on strength.',
            'Bank Nifty option writers are defending the higher range. Keep position size disciplined.',
            'Crude softness is helping OMC names. BPCL and IOC are on my radar.',
            'Defense names may stay volatile. Better to wait for confirmation instead of chasing the first candle.'
          ][idx],
          time: ['08:12','08:18','08:24','08:31'][idx]
        }
      ]
    }));
  }
  if(!activeDmThreadId || !dmThreads.some(thread=>thread.id===activeDmThreadId)){
    activeDmThreadId = dmThreads[0]?.id || '';
  }
  persistSocialData();
}
function getFilteredDmThreads(){
  const query = dmSearchQuery.trim().toLowerCase();
  if(!query) return dmThreads;
  return dmThreads.filter(thread=>
    thread.name.toLowerCase().includes(query) ||
    thread.handle.toLowerCase().includes(query) ||
    (thread.messages?.[thread.messages.length - 1]?.text || '').toLowerCase().includes(query)
  );
}
function renderDmAvatar(el, thread, compact = false){
  if(!el) return;
  const label = thread?.avatar || thread?.name?.charAt(0) || '?';
  const color = thread?.avatarColor || '#E8571A';
  el.textContent = label;
  el.style.background = `linear-gradient(135deg, ${color}, rgba(232,87,26,0.82))`;
  if(compact) el.style.boxShadow = '0 8px 18px rgba(0,0,0,0.10)';
}
function renderDmQuickContacts(){
  const row = document.getElementById('dmQuickContacts');
  if(!row) return;
  const threads = getFilteredDmThreads().slice(0,6);
  row.innerHTML = threads.map(thread=>`
    <button class="dm-quick-contact" type="button" onclick="selectDmThread('${thread.id}')">
      <div class="dm-avatar" id="dmQuick-${thread.id}"></div>
      <span>${escapeHtml(thread.name.split(' ')[0])}</span>
    </button>
  `).join('');
  threads.forEach(thread=>renderDmAvatar(document.getElementById(`dmQuick-${thread.id}`), thread, true));
}
function renderDmThreadList(){
  const list = document.getElementById('dmThreadList');
  if(!list) return;

  const threads = getFilteredDmThreads();
  list.innerHTML = threads.map(thread=>{
    const last = thread.messages?.[thread.messages.length - 1];
    const preview = (last?.text || '').slice(0,44);
    const time = last?.time || '';
    const unread = thread.unread || 0;
    const isActive = thread.id === activeDmThreadId;

    return `
      <button
        class="dm-thread-item ${isActive?'active':''}"
        type="button"
        data-thread-id="${thread.id}"
        onclick="selectDmThread(this.dataset.threadId)"
        aria-label="Open chat with ${escapeHtml(thread.name)}"
      >
        <div class="dm-avatar" id="dmThreadAvatar-${thread.id}" aria-hidden="true"></div>
        <div class="dm-thread-item-meta">
          <div class="dm-thread-item-top">
            <div class="dm-thread-item-name">${escapeHtml(thread.name)}</div>
            <div class="dm-thread-item-time">${escapeHtml(time)}</div>
          </div>
          <div class="dm-thread-item-preview">${escapeHtml(preview)}</div>
        </div>
        ${unread ? `<div class="dm-thread-unread">${unread > 99 ? '99+' : unread}</div>` : ''}
      </button>
    `;
  }).join('');
  threads.forEach(thread=>renderDmAvatar(document.getElementById(`dmThreadAvatar-${thread.id}`), thread, true));
}
function getActiveDmThread(){
  return dmThreads.find(thread=>thread.id===activeDmThreadId) || dmThreads[0] || null;
}
function renderDmMessages(){
  const thread = getActiveDmThread();
  const list = document.getElementById('dmMessages');
  const avatar = document.getElementById('dmAvatar');
  const name = document.getElementById('dmThreadName');
  const handle = document.getElementById('dmThreadHandle');
  const status = document.getElementById('dmThreadStatus');
  if(!list || !avatar || !name || !handle || !status) return;
  if(!thread){
    avatar.textContent = '';
    avatar.style.background = '';
    name.textContent = 'No chats yet';
    handle.textContent = 'Start by opening the community and meeting traders';
    status.textContent = 'No active conversations';
    list.innerHTML = '<div class="empty-state" style="padding:24px"><p>No messages yet</p></div>';
    return;
  }
  renderDmAvatar(avatar, thread);
  name.textContent = thread.name;
  handle.textContent = `${thread.handle} / ${thread.specialty || 'markets'}`;
  status.textContent = thread.unread ? `${thread.unread} unread update${thread.unread > 1 ? 's' : ''}` : 'Active now';
  handle.textContent = `${thread.handle} · ${thread.specialty || 'markets'}`;
  handle.textContent = `${thread.handle} · ${thread.specialty || 'markets'}`;
  status.textContent = thread.unread ? `${thread.unread} unread update${thread.unread > 1 ? 's' : ''}` : 'Active now';
  list.innerHTML = thread.messages.map(msg=>`
    <div class="dm-msg ${msg.from==='me'?'me':'them'}">
      <div class="dm-bubble">${escapeHtml(msg.text)}</div>
      <div class="dm-time">${msg.time}</div>
    </div>
  `).join('');
  list.scrollTop = list.scrollHeight;
}
function selectDmThread(id){
  activeDmThreadId = id;
  const thread = getActiveDmThread();
  if(thread) thread.unread = 0;
  persistSocialData();
  renderDmQuickContacts();
  renderDmThreadList();
  renderDmMessages();
}
function filterDmThreads(val){
  dmSearchQuery = val || '';
  renderDmQuickContacts();
  renderDmThreadList();
}
function openMessages(){
  if(!currentUser){ showToast('Sign in first to use messages'); return; }
  seedSocialData();
  openConversationsScreen();
}
// ─── NEW CONVERSATIONS SCREEN ─────────────────────────────────────────────────
function openConversationsScreen(){
  const s = document.getElementById('convScreen');
  if(!s) return;
  s.classList.remove('closing');
  s.classList.add('active');
  renderConvList();
}
function closeConversations(){
  const s = document.getElementById('convScreen');
  if(!s) return;
  s.classList.add('closing');
  setTimeout(()=>{ s.classList.remove('active','closing'); }, 260);
}
function renderConvList(filter){
  const list = document.getElementById('convList');
  if(!list) return;
  seedSocialData();
  const threads = (typeof dmThreads !== 'undefined' ? dmThreads : []);
  const q = (filter || '').toLowerCase();
  const filtered = q ? threads.filter(t => t.name.toLowerCase().includes(q)) : threads;
  list.innerHTML = filtered.map(t => {
    const lastMsg = t.messages && t.messages.length ? t.messages[t.messages.length-1] : null;
    const preview = lastMsg ? (lastMsg.from==='me' ? 'You: ' : '') + lastMsg.text : 'Start a conversation';
    const time = lastMsg ? lastMsg.time : '';
    const isUnread = (t.unread || 0) > 0;
    const isOnline = t.online !== false;
    return `<div class="conv-item" onclick="openChatWith('${t.id}')">
      <div class="conv-item-avatar">
        <div class="dm-avatar" style="width:50px;height:50px;font-size:18px;background:${t.color||'var(--accent)'}"></div>
        ${isOnline ? '<div class="conv-online-dot"></div>' : ''}
      </div>
      <div class="conv-item-meta">
        <div class="conv-item-top">
          <div class="conv-item-name">${t.name}</div>
          <div class="conv-item-time">${time}</div>
        </div>
        <div class="conv-item-preview${isUnread?' unread':''}">${preview}</div>
      </div>
      ${isUnread ? `<div class="conv-unread-badge">${t.unread}</div>` : ''}
    </div>`;
  }).join('') || '<div class="dm-empty">No conversations yet</div>';
}
function filterConversations(q){
  renderConvList(q);
}
function openFirstChat(){
  seedSocialData();
  const threads = (typeof dmThreads !== 'undefined' ? dmThreads : []);
  if(threads.length) openChatWith(threads[0].id);
}
// ─── CHAT SCREEN ──────────────────────────────────────────────────────────────
let activeChatId = null;
function openChatWith(threadId){
  seedSocialData();
  const threads = (typeof dmThreads !== 'undefined' ? dmThreads : []);
  const t = threads.find(x => x.id === threadId);
  if(!t) return;
  activeChatId = threadId;
  activeDmThreadId = threadId;
  if(t.unread) t.unread = 0;
  persistSocialData();
  // populate topbar
  document.getElementById('chatTopName').textContent = t.name;
  const isOnline = t.online !== false;
  const statusEl = document.getElementById('chatTopStatus');
  statusEl.textContent = isOnline ? '● Online' : 'Offline';
  statusEl.className = 'chat-topbar-status ' + (isOnline ? 'online' : 'offline');
  const onlineDot = document.getElementById('chatOnlineDot');
  if(onlineDot) onlineDot.style.display = isOnline ? 'block' : 'none';
  renderChatMessages(t);
  const cs = document.getElementById('chatScreen');
  cs.classList.remove('closing');
  cs.classList.add('active');
  // scroll to bottom
  setTimeout(()=>{
    const area = document.getElementById('chatMessagesArea');
    if(area) area.scrollTop = area.scrollHeight;
  }, 50);
}
function renderChatMessages(t){
  const area = document.getElementById('chatMessagesArea');
  if(!area) return;
  const msgs = t.messages || [];
  area.innerHTML = msgs.map((m,i) => {
    const isMe = m.from === 'me';
    const showTime = i===msgs.length-1 || msgs[i+1]?.from !== m.from;
    return `<div class="chat-bubble-group ${isMe?'me':'them'}">
      <div class="chat-bubble ${isMe?'me':'them'}">${m.text}</div>
      ${showTime ? `<div class="chat-time">${m.time || ''}${isMe ? '<span class="chat-read-tick">✓✓</span>' : ''}</div>` : ''}
    </div>`;
  }).join('');
}
function closeChatScreen(){
  const cs = document.getElementById('chatScreen');
  cs.classList.add('closing');
  setTimeout(()=>{ cs.classList.remove('active','closing'); activeChatId = null; }, 260);
  // refresh conv list
  renderConvList();
}
function chatKeydown(e){
  if(e.key === 'Enter') sendChatMessage();
}
function sendChatMessage(){
  const input = document.getElementById('chatInputField');
  const text = input?.value.trim();
  if(!text || !activeChatId) return;
  seedSocialData();
  const threads = (typeof dmThreads !== 'undefined' ? dmThreads : []);
  const t = threads.find(x => x.id === activeChatId);
  if(!t) return;
  const now = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  t.messages.push({from:'me', text, time:now});
  input.value = '';
  persistSocialData();
  renderChatMessages(t);
  const area = document.getElementById('chatMessagesArea');
  if(area) area.scrollTop = area.scrollHeight;
  // auto-reply
  const replyBook = {
    bull:'Makes sense. I will only add if volume confirms the breakout candle.',
    bear:'Fair take. I am keeping my stop tight in case the bounce fails quickly.',
    options:'Nice. I am checking IV crush risk before taking that structure.',
    macro:'Good macro context. I will wait for price to align before sizing up.',
    news:'That headline can move fast. Better to avoid chasing the first reaction.'
  };
  setTimeout(()=>{
    const liveThread = threads.find(x => x.id === activeChatId);
    if(!liveThread) return;
    liveThread.messages.push({
      from:'them',
      text: replyBook[liveThread.specialty] || 'Seen. I will map the levels and revert.',
      time: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
    });
    persistSocialData();
    if(activeChatId === liveThread.id) renderChatMessages(liveThread);
    const a2 = document.getElementById('chatMessagesArea');
    if(a2) a2.scrollTop = a2.scrollHeight;
  }, 700);
}
function sendDm(){
  const input = document.getElementById('dmInput');
  const text = input?.value.trim();
  const thread = getActiveDmThread();
  if(!thread || !text) return;
  const now = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  thread.messages.push({from:'me', text, time:now});
  input.value = '';
  persistSocialData();
  renderDmMessages();
  renderDmQuickContacts();
  if(document.getElementById('dmThreadList')) renderDmThreadList();

  const replyBook = {
    bull: 'Makes sense. I will only add if volume confirms the breakout candle.',
    bear: 'Fair take. I am keeping my stop tight in case the bounce fails quickly.',
    options: 'Nice. I am checking IV crush risk before taking that structure.',
    macro: 'Good macro context. I will wait for price to align before sizing up.',
    news: 'That headline can move fast. Better to avoid chasing the first reaction.'
  };
  setTimeout(()=>{
    const liveThread = dmThreads.find(item=>item.id===thread.id);
    if(!liveThread) return;
    liveThread.messages.push({
      from:'them',
      text: replyBook[liveThread.specialty] || 'Seen. I will map the levels and revert after the first 15-minute candle.',
      time: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
    });
    if(activeDmThreadId !== liveThread.id) liveThread.unread = (liveThread.unread || 0) + 1;
    persistSocialData();
    // Keep sidebar in sync, even if the active chat didn't change
    renderDmQuickContacts();
    if(document.getElementById('dmThreadList')) renderDmThreadList();
    if(document.getElementById('messagesModal')?.classList.contains('show') && activeDmThreadId===liveThread.id){
      renderDmMessages();
    }
  }, 700);
}
function renderDmMessages(){
  const thread = getActiveDmThread();
  const list = document.getElementById('dmMessages');
  const avatar = document.getElementById('dmAvatar');
  const name = document.getElementById('dmThreadName');
  const handle = document.getElementById('dmThreadHandle');
  const status = document.getElementById('dmThreadStatus');
  if(!list || !avatar || !name || !handle || !status) return;
  if(!thread){
    avatar.textContent = '';
    avatar.style.background = '';
    name.textContent = 'No chats yet';
    handle.textContent = 'Start by opening the community and meeting traders';
    status.textContent = 'No active conversations';
    list.innerHTML = '<div class="empty-state" style="padding:24px"><p>No messages yet</p></div>';
    return;
  }
  renderDmAvatar(avatar, thread);
  name.textContent = thread.name;
  handle.textContent = `${thread.handle} · ${thread.specialty || 'markets'}`;
  status.textContent = thread.unread ? `${thread.unread} unread update${thread.unread > 1 ? 's' : ''}` : 'Active now';
  list.innerHTML = thread.messages.map(msg=>`
    <div class="dm-msg ${msg.from==='me'?'me':'them'}">
      <div class="dm-bubble">${escapeHtml(msg.text)}</div>
      <div class="dm-time">${msg.time}</div>
    </div>
  `).join('');
  list.scrollTop = list.scrollHeight;
}
function buildNotifications(){
  const items = [];
  const unreadMessages = dmThreads.reduce((sum, thread)=>sum + (thread.unread || 0), 0);
  if(unreadMessages){
    items.push({
      tone:'accent',
      title:'New messages',
      body:`${unreadMessages} unread market chats waiting in your inbox.`,
      time:'Just now'
    });
  }
  const pendingOrders = allOrders.filter(order=>order.status==='pending');
  if(pendingOrders.length){
    items.push({
      tone:'amber',
      title:'Pending orders',
      body:`${pendingOrders.length} order${pendingOrders.length>1?'s are':' is'} waiting for trigger or market session.`,
      time:'Live'
    });
  }
  const strongestPos = [...openPositions].sort((a,b)=>Math.abs(calcPosPnL(b)) - Math.abs(calcPosPnL(a)))[0];
  if(strongestPos){
    const pnl = calcPosPnL(strongestPos);
    items.push({
      tone:pnl>=0?'green':'red',
      title:`${strongestPos.sym} is moving`,
      body:`Open ${strongestPos.side.toUpperCase()} position is ${pnl>=0?'up':'down'} ${formatINR(Math.abs(pnl))}.`,
      time:'Live'
    });
  }
  items.push({
    tone:'accent',
    title:'Trade plan reminder',
    body:'Respect the first 15-minute range and avoid chasing the opening impulse.',
    time:'08:45 IST'
  });
  items.push({
    tone:'muted',
    title:'Daily report ready',
    body:'The print view now includes a full trading brief with scenarios, levels, sectors, and risk notes.',
    time:'Today'
  });
  return items;
}
function renderNotifications(){
  const list = document.getElementById('notificationsList');
  if(!list) return;
  const items = buildNotifications();
  list.innerHTML = items.map(item=>`
    <div class="notif-card">
      <div class="notif-dot ${item.tone || 'accent'}"></div>
      <div class="notif-copy">
        <div class="notif-title">${escapeHtml(item.title)}</div>
        <div class="notif-body">${escapeHtml(item.body)}</div>
        <div class="notif-time">${escapeHtml(item.time)}</div>
      </div>
    </div>
  `).join('');
}
function openNotifications(){
  if(!currentUser){ showToast('Sign in first to view notifications'); return; }
  seedSocialData();
  renderNotifications();
  document.getElementById('notificationsModal').classList.add('show');
}
function getSwipeButtons(container){
  return [...container.querySelectorAll('.filter-pill,.fund-tool-tab,.tl-tab,.mt-tab,.order-tab,.rpt-tab')];
}
function bindSwipeNavigation(container){
  if(!container || container.dataset.swipeBound === '1') return;
  container.dataset.swipeBound = '1';
  let startX = 0;
  let startY = 0;
  let active = false;
  container.addEventListener('touchstart', event=>{
    if(event.touches.length !== 1) return;
    active = true;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, {passive:true});
  container.addEventListener('touchend', event=>{
    if(!active || !event.changedTouches.length) return;
    active = false;
    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;
    if(Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
    const buttons = getSwipeButtons(container);
    if(!buttons.length) return;
    const currentIndex = Math.max(0, buttons.findIndex(btn=>btn.classList.contains('active')));
    const nextIndex = Math.min(buttons.length - 1, Math.max(0, currentIndex + (dx < 0 ? 1 : -1)));
    if(nextIndex === currentIndex) return;
    buttons[nextIndex].click();
    scrollChipIntoView(buttons[nextIndex]);
  }, {passive:true});
}
function initSwipeNavigation(){
  [
    '.community-filter-bar',
    '.fund-tool-tabs',
    '.tradelab-tabs',
    '.market-tabs',
    '#newsFilterBar',
    '#orderVariantTabs',
    '.report-pane-tabs'
  ].forEach(selector=>{
    document.querySelectorAll(selector).forEach(bindSwipeNavigation);
  });
}

/* ══════════════════════════════════════════
   COMMUNITY
══════════════════════════════════════════ */
const DEMO_POSTS = [
  { id:1, user:'Ananya Krishnan', handle:'@ananya_k', avatar:'A', avatarColor:'#7C3AED', tag:'bull',
    content:'NIFTY forming a beautiful cup & handle on the 4H. If 24,200 breaks with volume, the next target is 24,500+. SGX Nifty up 0.3% — gap up open expected. <span class="ticker-ref">$NIFTY</span> bullish bias for today.',
    likes:84, comments:12, time:'2m ago' },
  { id:2, user:'Deepak Menon', handle:'@deepak_trades', avatar:'D', avatarColor:'#059669', tag:'options',
    content:'<span class="ticker-ref">$BANKNIFTY</span> 49500 CE seeing massive OI buildup — 28L contracts added today. PCR at 0.82 suggesting put writing dominance. Short straddle at 49500 looks interesting for weekly expiry. Risk: India-Pak tensions.',
    likes:127, comments:31, time:'8m ago' },
  { id:3, user:'Priya Nair', handle:'@priya_markets', avatar:'P', avatarColor:'#DC2626', tag:'bear',
    content:'CAUTION: <span class="ticker-ref">$NIFTYBANK</span> struggling at 200 DMA for 3rd consecutive day. RSI divergence on daily. FIIs sold ₹2100cr yesterday. If 48,800 breaks, could see 48,200. Avoid fresh longs on Bank.',
    chart: '📉', likes:52, comments:8, time:'14m ago' },
  { id:4, user:'Rohit Sharma', handle:'@rohit_fin', avatar:'R', avatarColor:'#D97706', tag:'macro',
    content:'India-US tariff pause extended for 90 days. This is massively positive for <span class="ticker-ref">$NIFTYIT</span>. Infosys, TCS, Wipro — all should gap up today. IT sector is my top pick for May. <span class="ticker-ref">$INFY</span> looks best technically.',
    likes:203, comments:47, time:'22m ago' },
  { id:5, user:'Kavitha Reddy', handle:'@kavitha_r', avatar:'K', avatarColor:'#0891B2', tag:'news',
    content:'JUST IN: Crude oil dips below $62 for first time since Jan. This is a 4-month low. Direct beneficiaries: <span class="ticker-ref">$BPCL</span> <span class="ticker-ref">$IOC</span> <span class="ticker-ref">$HPCL</span>. OMC stocks should rally sharply. Also supports RBI\'s inflation outlook → possible rate cut in August.',
    likes:318, comments:69, time:'35m ago' },
  { id:6, user:'Sanjay Patel', handle:'@sanjay_options', avatar:'S', avatarColor:'#7C3AED', tag:'options',
    content:'<span class="ticker-ref">$RELIANCE</span> option chain analysis: Massive 2900 PE writing — 42L contracts. Call side at 2950 has 18L OI. Short-term range: 2880-2950. Best play: Iron Condor 2850-2900-2950-3000 for ₹35 premium.',
    likes:91, comments:15, time:'1h ago' },
];
const SAMPLE_ANALYSTS = [
  ['Vikram Jain','@vikramcharts','#0EA5E9'],
  ['Sneha Iyer','@snehaflows','#F59E0B'],
  ['Arjun Rao','@arjunmacro','#22C55E'],
  ['Nikita Singh','@nikitaquant','#A855F7'],
];
for(let i=7;i<=36;i++){
  const a = SAMPLE_ANALYSTS[i % SAMPLE_ANALYSTS.length];
  const tag = ['bull','bear','options','macro','news'][i % 5];
  DEMO_POSTS.push({
    id:i,
    user:a[0],
    handle:a[1],
    avatar:a[0].charAt(0),
    avatarColor:a[2],
    tag,
    chart:i%2===0?'chart':'',
    content:`Session note ${i}: ${tag==='options'?'OI and IV skew':'price action and volume'} setup mapped on 15m and 1H for <span class="ticker-ref">$NIFTY</span>, <span class="ticker-ref">$BANKNIFTY</span>, and leaders. Entry only above confirmation candle; risk capped at 0.${i%3+5}R.`,
    likes:70 + i*3,
    comments:8 + (i%11),
    time:`${(i-5)*3}m ago`
  });
}

function renderPosts(filter='all'){
  const feed = document.getElementById('communityFeed');
  const filtered = filter==='all' ? DEMO_POSTS : DEMO_POSTS.filter(p=>p.tag===filter);
  if(!filtered.length){
    feed.innerHTML='<div class="empty-state"><p>No posts in this category yet.</p></div>';
    return;
  }
  feed.innerHTML = filtered.map(p => postCard(p)).join('');
  // Add user's own posts
  const userPosts = posts.filter(p => filter==='all'||p.tag===filter);
  if(userPosts.length){
    feed.innerHTML = userPosts.map(p=>postCard(p,'user')).join('') + feed.innerHTML;
  }
  updatePostCount();
}

function postCard(p, source){
  const tagClasses = {bull:'tag-bull',bear:'tag-bear',options:'tag-options',macro:'tag-macro',news:'tag-news'};
  const tagLabels = {bull:'↗ Bullish',bear:'↘ Bearish',options:'⎔ Options',macro:'◎ Macro',news:'◉ News'};
  return `
  <div class="post-card" data-tag="${p.tag||''}">
    <div class="post-header">
      <div class="avatar" style="background:${p.avatarColor||'var(--accent)'}">${p.avatar}</div>
      <div class="post-meta">
        <div class="post-name">${p.user}</div>
        <div class="post-handle">${p.handle}</div>
      </div>
      ${p.tag?`<span class="post-tag ${tagClasses[p.tag]||''}">${tagLabels[p.tag]||p.tag}</span>`:''}
    </div>
    ${p.chart?`<div class="chart-preview"><svg class="chart-svg" viewBox="0 0 300 60" preserveAspectRatio="none"><polyline points="0,50 30,45 60,40 90,42 120,35 150,28 180,32 210,22 240,18 270,24 300,15" fill="none" stroke="var(--red)" stroke-width="1.5"/><polygon points="0,60 0,50 30,45 60,40 90,42 120,35 150,28 180,32 210,22 240,18 270,24 300,15 300,60" fill="var(--red-lt)" opacity="0.5"/></svg></div>`:''}
    <div class="post-body">${p.content}</div>
    <div class="post-actions">
      <span class="post-action" onclick="likePost(this,${p.id})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        ${p.likes}
      </span>
      <span class="post-action" onclick="showToast('Comments coming soon!')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        ${p.comments}
      </span>
      <span class="post-action" onclick="sharePost(this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Share
      </span>
      <span class="post-time">${p.time||'Just now'}</span>
    </div>
  </div>`;
}

function likePost(el, id){
  el.classList.toggle('liked');
  const nums = el.querySelectorAll ? el : el.parentElement.querySelectorAll('.post-action')[0];
  showToast(el.classList.contains('liked')?'Liked! ❤️':'Unliked');
}
function sharePost(el){ showToast('Link copied! 🔗'); }

function filterFeed(el, filter){
  document.querySelectorAll('.community-filter-bar .filter-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  renderPosts(filter);
  scrollChipIntoView(el);
}

function togglePostTag(el, tag){
  document.querySelectorAll('.compose-tag-btn').forEach(b=>b.classList.remove('selected'));
  if(activePostTag===tag){ activePostTag=''; } else { activePostTag=tag; el.classList.add('selected'); }
}

function publishPost(){
  if(!currentUser){ showToast('Please sign in to post'); return; }
  const txt = document.getElementById('postTextarea').value.trim();
  if(!txt && !composeImageData){ showToast('Write something or add a photo'); return; }
  const p = {
    id: Date.now(), user: currentUser.name, handle: currentUser.handle,
    avatar: currentUser.avatarTheme?.emoji || currentUser.name.charAt(0).toUpperCase(),
    avatarColor: currentUser.avatarTheme?.color || 'var(--accent)',
    tag: activePostTag, content: txt, likes:0, comments:0, time:'Just now',
    image: composeImageData || null
  };
  posts.unshift(p);
  postCount++;
  document.getElementById('profilePostCount').textContent = postCount;
  document.getElementById('postTextarea').value='';
  // Reset image state
  composeImageData = null;
  const preview = document.getElementById('composeImgPreview');
  const area = document.getElementById('composeImageArea');
  if(preview) preview.src='';
  if(area) area.style.display='none';
  activePostTag=''; document.querySelectorAll('.compose-tag-btn').forEach(b=>b.classList.remove('selected'));
  closeModalById('newPostModal');
  renderPosts();
  showToast('Posted! 🚀');
}

function updatePostCount(){
  document.getElementById('profilePostCount').textContent = posts.length;
}

/* ══════════════════════════════════════════
   MARKET DATA (Finnhub)
══════════════════════════════════════════ */
async function fetchFinnhub(symbol){
  try {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
    return await r.json();
  } catch(e){ return null; }
}

async function loadMarketData(){
  // Indian indices via Yahoo Finance
  loadIndianIndices();
  // US indices via Finnhub
  const usPairs = [
    {id:'sp500Val', chgId:'sp500Chg', sym:'SPY'},
    {id:'nasdaqVal', chgId:'nasdaqChg', sym:'QQQ'},
    {id:'dowVal', chgId:'dowChg', sym:'DIA'},
  ];
  for(const p of usPairs){
    const d = await fetchFinnhub(p.sym);
    if(d && d.c){
      const chgPct = ((d.c-d.pc)/d.pc*100).toFixed(2);
      const el = document.getElementById(p.id);
      const chgEl = document.getElementById(p.chgId);
      if(el) el.textContent = d.c.toLocaleString('en-US',{maximumFractionDigits:0});
      if(chgEl){
        chgEl.textContent = (chgPct>=0?'+':'')+chgPct+'%';
        chgEl.className = 'idx-chg '+(chgPct>=0?'pos':'neg');
      }
    }
  }
}

/* ══════════════════════════════════════════
   FUND TABS
══════════════════════════════════════════ */
function switchFundTab(el, view){
  currentFundView = view;
  document.querySelectorAll('.fund-tool-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.fund-view').forEach(v=>v.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('fund-'+view).classList.add('active');
  const printBtn = document.getElementById('fundPrintBtn');
  if(printBtn) printBtn.style.display = view === 'report' ? 'inline-flex' : 'none';
  if(view==='report') renderReport();
  if(el) scrollChipIntoView(el);
}

/* ══════════════════════════════════════════
   MORTY STOCK ANALYSIS
══════════════════════════════════════════ */
const STOCKS_DB = [
  {ticker:'RELIANCE',name:'Reliance Industries Ltd',sector:'Energy',exchange:'NSE',isin:'INE002A01018'},
  {ticker:'TCS',name:'Tata Consultancy Services',sector:'IT',exchange:'NSE',isin:'INE467B01029'},
  {ticker:'INFY',name:'Infosys Ltd',sector:'IT',exchange:'NSE',isin:'INE009A01021'},
  {ticker:'HDFCBANK',name:'HDFC Bank Ltd',sector:'Banking',exchange:'NSE',isin:'INE040A01034'},
  {ticker:'ICICIBANK',name:'ICICI Bank Ltd',sector:'Banking',exchange:'NSE',isin:'INE090A01021'},
  {ticker:'SBIN',name:'State Bank of India',sector:'Banking',exchange:'NSE',isin:'INE062A01020'},
  {ticker:'WIPRO',name:'Wipro Ltd',sector:'IT',exchange:'NSE',isin:'INE075A01022'},
  {ticker:'AXISBANK',name:'Axis Bank Ltd',sector:'Banking',exchange:'NSE',isin:'INE238A01034'},
  {ticker:'LT',name:'Larsen & Toubro Ltd',sector:'Capital Goods',exchange:'NSE',isin:'INE018A01030'},
  {ticker:'BAJFINANCE',name:'Bajaj Finance Ltd',sector:'Finance',exchange:'NSE',isin:'INE296A01024'},
  {ticker:'MARUTI',name:'Maruti Suzuki India Ltd',sector:'Auto',exchange:'NSE',isin:'INE585B01010'},
  {ticker:'HINDUNILVR',name:'Hindustan Unilever Ltd',sector:'FMCG',exchange:'NSE',isin:'INE030A01027'},
  {ticker:'ASIANPAINT',name:'Asian Paints Ltd',sector:'Consumer',exchange:'NSE',isin:'INE021A01026'},
  {ticker:'KOTAKBANK',name:'Kotak Mahindra Bank Ltd',sector:'Banking',exchange:'NSE',isin:'INE237A01028'},
  {ticker:'TATASTEEL',name:'Tata Steel Ltd',sector:'Metals',exchange:'NSE',isin:'INE081A01012'},
  {ticker:'BHARTIARTL',name:'Bharti Airtel Ltd',sector:'Telecom',exchange:'NSE',isin:'INE397D01024'},
  {ticker:'SUNPHARMA',name:'Sun Pharmaceutical Industries',sector:'Pharma',exchange:'NSE',isin:'INE044A01036'},
  {ticker:'NTPC',name:'NTPC Ltd',sector:'Power',exchange:'NSE',isin:'INE733E01010'},
  {ticker:'HCLTECH',name:'HCL Technologies Ltd',sector:'IT',exchange:'NSE',isin:'INE860A01027'},
  {ticker:'TATAMOTORS',name:'Tata Motors Ltd',sector:'Auto',exchange:'NSE',isin:'INE155A01022'},
];

let mortySearchTimeout;
let mortySelected = -1;
let mortyResults = [];

function mortySearch(val){
  clearTimeout(mortySearchTimeout);
  const drop = document.getElementById('mortyDropdown');
  if(!val.trim()){ drop.classList.remove('show'); return; }
  mortySearchTimeout = setTimeout(()=>{
    const q = val.toLowerCase();
    mortyResults = STOCKS_DB.filter(s=>
      s.ticker.toLowerCase().includes(q)||s.name.toLowerCase().includes(q)
    ).slice(0,8);
    if(!mortyResults.length){ drop.classList.remove('show'); return; }
    drop.classList.add('show');
    drop.innerHTML = `<div class="ac-head">NSE/BSE Stocks</div>` +
      mortyResults.map((s,i)=>`
        <div class="ac-item" onclick="mortySelectStock(${i})">
          <span class="ac-ticker">${s.ticker}</span>
          <span class="ac-name">${s.name}</span>
          <span class="ac-badge badge-nse">${s.exchange}</span>
        </div>`).join('');
  }, 200);
}

function mortyKeydown(e){
  if(e.key==='Enter'){ mortyAnalyse(); }
}

function mortySelectStock(i){
  const s = mortyResults[i];
  document.getElementById('mortyInput').value = s.ticker;
  document.getElementById('mortyDropdown').classList.remove('show');
  mortyAnalyse(s);
}

function mortyQuickSearch(ticker){
  document.getElementById('mortyInput').value = ticker;
  mortyAnalyse();
}

async function mortyAnalyse(stockObj){
  const input = document.getElementById('mortyInput').value.trim().toUpperCase();
  const stock = stockObj || STOCKS_DB.find(s=>s.ticker===input) || {ticker:input, name:input+' Ltd', sector:'—', exchange:'NSE'};
  document.getElementById('mortyDropdown').classList.remove('show');
  document.getElementById('mortyEmpty').style.display='none';
  const dash = document.getElementById('mortyDashboard');
  dash.classList.add('show');
  dash.innerHTML = '<div class="spin-wrap"><div class="spinner"></div></div>';

  // Fetch quote
  let price='—', change='—', chgPct='—', isUp=true;
  const sym = stock.ticker+'.NS';
  const data = await fetchFinnhub(sym) || await fetchFinnhub(stock.ticker);
  if(data && data.c && data.c>0){
    price = '₹'+data.c.toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:2});
    const c = data.c - data.pc;
    chgPct = ((c/data.pc)*100).toFixed(2);
    change = (c>=0?'+':'')+c.toFixed(2);
    isUp = c>=0;
  }

  // Deterministic score based on ticker
  const scoreBase = (stock.ticker.charCodeAt(0)*7+stock.ticker.charCodeAt(1||0)*3)%40+52;
  const score = Math.min(99, scoreBase);
  const scoreLabel = score>=75?'Strong Buy':score>=60?'Buy':score>=45?'Hold':'Cautious';
  const scoreColor = score>=75?'var(--green)':score>=60?'var(--green)':score>=45?'var(--amber)':'var(--red)';

  const metricsData = generateMockMetrics(stock.ticker);

  dash.innerHTML = `
    <div class="company-hdr">
      <div class="co-ticker">${stock.ticker} • ${stock.exchange}</div>
      <div class="co-name">${stock.name}</div>
      <div class="co-meta">
        <span class="co-tag">${stock.sector}</span>
        <span class="co-tag">Large Cap</span>
        <span class="co-tag">Nifty 50</span>
      </div>
      <div class="co-price-row">
        <div class="co-price">${price}</div>
        <div class="co-chg-pill ${isUp?'up':'down'}">${isUp?'▲':'▼'} ${change} (${chgPct}%)</div>
      </div>
    </div>
    <div class="score-strip">
      <div style="text-align:center;flex-shrink:0">
        <div class="score-num" style="color:${scoreColor}">${score}</div>
        <div class="score-label">MORTY Score</div>
      </div>
      <div class="score-info">
        <div class="score-label">Fundamental Rating</div>
        <div class="score-title" style="color:${scoreColor}">${scoreLabel}</div>
        <div class="score-track"><div class="score-fill" style="width:${score}%;background:linear-gradient(90deg,var(--gold-lt),${scoreColor})"></div></div>
        <div class="score-range"><span>0</span><span>50</span><span>100</span></div>
      </div>
    </div>
    <div class="rec-card">
      <div class="rec-pill ${scoreLabel.toLowerCase().includes('buy')?'buy':scoreLabel==='Hold'?'hold':'sell'}">${score>=60?'BUY':score>=45?'HOLD':'CAUTIOUS'}</div>
      <div class="rec-title">${scoreLabel.includes('Buy')?'Fundamentally strong — suitable for medium-long term':scoreLabel==='Hold'?'Fair value — hold existing positions':'Mixed signals — wait for clarity'}</div>
      <div class="rec-body">${stock.name} shows ${score>=60?'strong revenue growth, healthy margins, and improving ROE. Sector tailwinds support upside.':'consolidation in key metrics. Monitor quarterly results for directional clarity.'}</div>
      <div class="pros-cons">
        <div class="pros-box"><div class="pros-label">Pros</div><p>• Strong brand moat<br>• Consistent cash flows<br>• Management quality</p></div>
        <div class="cons-box"><div class="cons-label">Cons</div><p>• Valuation premium<br>• Global macro risk<br>• Competition</p></div>
      </div>
    </div>
    <div class="sec-head">Key Fundamentals</div>
    <div class="metrics-grid">${metricsData.map(m=>`
      <div class="metric-card">
        <div class="metric-label">${m.label}</div>
        <div class="metric-val">${m.val}</div>
        <div class="metric-sub">${m.sub}</div>
      </div>`).join('')}
    </div>
    <div class="disclaimer-text">Data sourced from public filings. Not SEBI investment advice. For educational use only.</div>
  `;
}

function generateMockMetrics(ticker){
  const h = ticker.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  const pe = (18+h%20).toFixed(1);
  const pb = (1.8+(h%30)/10).toFixed(1);
  const roe = (12+h%18).toFixed(1);
  const de = (0.1+(h%8)/10).toFixed(2);
  const eps = (35+h%80).toFixed(1);
  const rev = (h%500+200).toFixed(0);
  return [
    {label:'P/E Ratio', val:pe+'x', sub:'Industry: 25x'},
    {label:'P/B Ratio', val:pb+'x', sub:'Industry: 3.2x'},
    {label:'ROE', val:roe+'%', sub:'YoY: +2.1%'},
    {label:'D/E Ratio', val:de, sub:'Conservative'},
    {label:'EPS (TTM)', val:'₹'+eps, sub:'Growth: +12% YoY'},
    {label:'Rev (₹Cr)', val:rev+'00', sub:'QoQ: +4.2%'},
  ];
}

/* ══════════════════════════════════════════
   DAILY REPORT
══════════════════════════════════════════ */
function switchReportPane(el, pane){}

function renderReport(){
  const todayBlock = `
    <div class="verdict-hero">
      <div class="verdict-label">Today's Bias — 7 May 2026</div>
      <div class="verdict-title">Gap Up Open — Bullish</div>
      <div class="verdict-sub">Market expected to open with ~38pt gap up. Global cues supportive, VIX low at 13.4, and technical structure intact above pivot.</div>
      <span class="verdict-conf high">● High Confidence</span>
    </div>
    <div class="key-level-box">
      <div class="kl-head"><span class="kl-label">Key Level Today</span><span class="kl-val" style="font-family:var(--ff-mono)">24,148</span></div>
      <div class="kl-row holds">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
        <span>If holds: Continuation toward <strong>24,285 (R1)</strong> and 24,421 (R2). Bullish momentum intact.</span>
      </div>
      <div class="kl-row breaks">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        <span>If breaks: Pullback to <strong>24,011 (S1)</strong> then 23,875. Avoid chasing shorts on first dip.</span>
      </div>
    </div>
    <div class="context-box">For intraday: Wait for 9:15–9:30 to settle. Initiate longs only above pivot 24,148. Hard stop below S1 (24,011). Do not chase gap-up opens.</div>
    <div class="disclaimer-text">No buy/sell calls. No position advice. Context only. Consult SEBI RA.</div>`;

  const globalBlock = `
    <div class="sec-head">US Markets — Last Close</div>
    <div style="border-radius:var(--radius-sm);border:1px solid var(--border);overflow:hidden;margin-bottom:14px">
      <div class="idx-row"><span class="idx-name">S&P 500</span><span class="idx-val">5,842</span><span class="idx-chg pos">+0.54%</span></div>
      <div class="idx-row"><span class="idx-name">NASDAQ</span><span class="idx-val">18,448</span><span class="idx-chg pos">+0.91%</span></div>
      <div class="idx-row"><span class="idx-name">DOW JONES</span><span class="idx-val">42,184</span><span class="idx-chg pos">+0.38%</span></div>
      <div class="idx-row"><span class="idx-name">US 10Y Yield</span><span class="idx-val">4.38%</span><span class="idx-chg neg">-0.04</span></div>
      <div class="idx-row"><span class="idx-name">Dollar Index</span><span class="idx-val">104.2</span><span class="idx-chg neg">-0.18%</span></div>
    </div>
    <div class="sec-head">Asia-Pacific</div>
    <div style="border-radius:var(--radius-sm);border:1px solid var(--border);overflow:hidden;margin-bottom:14px">
      <div class="idx-row"><span class="idx-name">Nikkei 225</span><span class="idx-val">35,892</span><span class="idx-chg neg">-0.32%</span></div>
      <div class="idx-row"><span class="idx-name">Hang Seng</span><span class="idx-val">24,312</span><span class="idx-chg neg">-0.78%</span></div>
      <div class="idx-row"><span class="idx-name">SGX Nifty</span><span class="idx-val">24,162</span><span class="idx-chg pos">+0.22%</span></div>
    </div>
    <div class="sec-head">Commodities</div>
    <div style="border-radius:var(--radius-sm);border:1px solid var(--border);overflow:hidden">
      <div class="idx-row"><span class="idx-name">Crude (WTI)</span><span class="idx-val">$61.84</span><span class="idx-chg neg">-1.24%</span></div>
      <div class="idx-row"><span class="idx-name">Gold</span><span class="idx-val">$3,326</span><span class="idx-chg pos">+0.38%</span></div>
      <div class="idx-row"><span class="idx-name">USD/INR</span><span class="idx-val">84.12</span><span class="idx-chg neg">-0.08%</span></div>
    </div>`;

  const fiiBlock = `
    <div style="padding:10px 12px;border-radius:8px;background:var(--surface2);font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.6">
      <strong style="color:var(--text)">FII vs DII explained:</strong> Both net buyers this week — a strong co-buying signal. Typically supports sustained rally vs short-covering bounce.
    </div>
    <div class="sec-head">Weekly Flow Table</div>
    <table class="flow-table" style="margin-top:6px">
      <thead><tr><th>Day</th><th>FII Net</th><th>DII Net</th></tr></thead>
      <tbody>
        <tr><td>Mon 5 May</td><td class="pos">+₹1,242cr</td><td class="pos">+₹890cr</td></tr>
        <tr><td>Tue 6 May</td><td class="pos">+₹2,100cr</td><td class="pos">+₹1,240cr</td></tr>
        <tr><td>Wed 7 May</td><td class="pos">+₹3,001cr</td><td class="pos">+₹3,570cr</td></tr>
        <tr><td colspan="3" style="text-align:center;font-size:10px;color:var(--text3)">Live data via NSE India</td></tr>
      </tbody>
      <tfoot><tr><td>Total</td><td class="pos">+₹6,343cr</td><td class="pos">+₹5,700cr</td></tr></tfoot>
    </table>
    <div class="context-box" style="margin-top:14px">FII futures long addition (+₹1,840cr) is particularly bullish for index direction next week. Both cash and futures showing conviction buys.</div>`;

  const levelsBlock = `
    <div class="sec-head">NIFTY 50 — Camarilla Pivots</div>
    <div style="border-radius:var(--radius-sm);border:1px solid var(--border);overflow:hidden;margin-bottom:14px">
      <div class="level-map">
        <div class="lm-row r"><span class="lm-label">R2</span><div class="lm-line"></div><span class="lm-val">24,421</span></div>
        <div class="lm-row r"><span class="lm-label">R1</span><div class="lm-line"></div><span class="lm-val">24,285</span></div>
        <div class="lm-row pivot"><span class="lm-label">PIVOT</span><div class="lm-line"></div><span class="lm-val">24,148</span></div>
        <div class="lm-row s"><span class="lm-label">S1</span><div class="lm-line"></div><span class="lm-val">24,011</span></div>
        <div class="lm-row s"><span class="lm-label">S2</span><div class="lm-line"></div><span class="lm-val">23,875</span></div>
      </div>
    </div>
    <div class="sec-head">BANK NIFTY — Pivots</div>
    <div style="border-radius:var(--radius-sm);border:1px solid var(--border);overflow:hidden">
      <div class="level-map">
        <div class="lm-row r"><span class="lm-label">R2</span><div class="lm-line"></div><span class="lm-val">49,820</span></div>
        <div class="lm-row r"><span class="lm-label">R1</span><div class="lm-line"></div><span class="lm-val">49,580</span></div>
        <div class="lm-row pivot"><span class="lm-label">PIVOT</span><div class="lm-line"></div><span class="lm-val">49,340</span></div>
        <div class="lm-row s"><span class="lm-label">S1</span><div class="lm-line"></div><span class="lm-val">49,100</span></div>
        <div class="lm-row s"><span class="lm-label">S2</span><div class="lm-line"></div><span class="lm-val">48,860</span></div>
      </div>
    </div>`;

  const newsBlock = `<div class="news-list">`+[
    ['DOMESTIC','tag-dom','India-US tariff pause extended — 90-day window intact','Positive for IT exports, pharma, and textiles. Reduces near-term FPI risk.','08:12 IST','Economic Times'],
    ['GLOBAL','tag-glo','US Fed signals no cut before Sep 2026','Higher-for-longer rates → watch INR for FII equity flows.','06:44 IST','Reuters'],
    ['CORPORATE','tag-corp','TCS Q4: Revenue +5.8% YoY — beats estimates','TCS gap up expected. Positive read for Infosys, Wipro, HCL.','07:30 IST','Moneycontrol'],
    ['SECTOR','tag-sec','Crude below $62 — 4-month low','OMC stocks (BPCL, IOC, HPCL) to rally. Supports RBI inflation outlook.','07:58 IST','Business Standard'],
    ['ALERT','tag-alert','India-Pakistan tensions: Elevated volatility risk','Defence stocks (HAL, BEL, Bharat Forge) may see activity. Watch for escalation.','08:30 IST','NDTV Profit'],
  ].map(([cat,tagCls,what,impact,time,source])=>`
    <div class="news-item">
      <div class="news-item-top"><span class="post-tag ${tagCls}">${cat}</span></div>
      <div class="news-what">${what}</div>
      <div class="news-impact">${impact}</div>
      <div class="news-meta"><span class="news-source">${source}</span><span class="news-time">${time}</span></div>
    </div>`).join('')+'</div>';
  document.getElementById('rpt-continuous').innerHTML = todayBlock + globalBlock + fiiBlock + levelsBlock + newsBlock;
}

function printDailyReport(){ window.print(); }

function getDailyReportDateLabel(){
  return new Date().toLocaleDateString('en-IN',{weekday:'long', day:'numeric', month:'long', year:'numeric'});
}
function getDailyReportRadar(){
  return getSearchUniverse()
    .map(item=>({...item, move: Math.abs(parseFloat(String(item.chg).replace('%','')) || 0)}))
    .sort((a,b)=>b.move-a.move)
    .slice(0,8);
}
function renderReport(){
  const dateLabel = getDailyReportDateLabel();
  const session = getMarketSessionState();
  const radar = getDailyReportRadar();
  const radarRows = radar.map(item=>`
    <div class="idx-row">
      <span class="idx-name">${escapeHtml(item.sym)} · ${escapeHtml(item.name)}</span>
      <span class="idx-val">${formatINR(item.price)}</span>
      <span class="idx-chg ${item.up?'pos':'neg'}">${item.chg}</span>
    </div>
  `).join('');
  document.getElementById('rpt-continuous').innerHTML = `
    <div class="verdict-hero">
      <div class="verdict-label">${escapeHtml(dateLabel)}</div>
      <div class="verdict-title">${session==='open'?'Trend Day Playbook':'Opening Game Plan'} · Bullish Bias Above Pivot</div>
      <div class="verdict-sub">Use the daily report as a decision framework, not a prediction sheet. The plan below combines overnight cues, levels, sector leadership, flows, and trade execution guardrails.</div>
      <span class="verdict-conf high">● High Focus Session</span>
    </div>
    <div class="key-level-box">
      <div class="kl-head"><span class="kl-label">NIFTY Decision Zone</span><span class="kl-val" style="font-family:var(--ff-mono)">24,148</span></div>
      <div class="kl-row holds">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
        <span>If price accepts above pivot, watch 24,285 then 24,421 with IT and OMC leadership.</span>
      </div>
      <div class="kl-row breaks">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        <span>If the gap fails under 24,011, expect pullback toward 23,875 and tighten intraday risk fast.</span>
      </div>
    </div>
    <div class="context-box">Execution note: let the first 15-minute candle complete, then trade the side that shows acceptance with sector breadth and order-flow confirmation.</div>
    <div class="sec-head">Global Cues</div>
    <div style="border-radius:var(--radius-sm);border:1px solid var(--border);overflow:hidden;margin-bottom:14px">
      <div class="idx-row"><span class="idx-name">S&P 500</span><span class="idx-val">5,842</span><span class="idx-chg pos">+0.54%</span></div>
      <div class="idx-row"><span class="idx-name">NASDAQ</span><span class="idx-val">18,448</span><span class="idx-chg pos">+0.91%</span></div>
      <div class="idx-row"><span class="idx-name">SGX Nifty</span><span class="idx-val">24,162</span><span class="idx-chg pos">+0.22%</span></div>
      <div class="idx-row"><span class="idx-name">Crude</span><span class="idx-val">$61.84</span><span class="idx-chg neg">-1.24%</span></div>
      <div class="idx-row"><span class="idx-name">USD/INR</span><span class="idx-val">84.12</span><span class="idx-chg neg">-0.08%</span></div>
    </div>
    <div class="sec-head">Flow + Breadth Read</div>
    <div class="context-box">FII and DII flows are aligned on the buy side, India VIX is calm, and weak crude adds a tailwind for domestic inflation-sensitive pockets. That combination usually supports buy-the-dip behavior unless the open is immediately sold with heavy bank pressure.</div>
    <div class="sec-head">Watchlist Radar</div>
    <div style="border-radius:var(--radius-sm);border:1px solid var(--border);overflow:hidden;margin-bottom:14px">${radarRows}</div>
    <div class="sec-head">Trader Checklist</div>
    <div class="context-box">
      1. Wait for range confirmation before sizing up.<br>
      2. Favor relative-strength sectors first, then individual names.<br>
      3. If breadth weakens while index holds, reduce chase entries.<br>
      4. Use the Print button for the full multi-page trading brief.
    </div>
    <div class="disclaimer-text">This report is a demo analytical brief generated inside WizardPRO. It is for education and workflow planning, not investment advice.</div>
  `;
}
function buildDailyReportPrintDocument(){
  const dateLabel = getDailyReportDateLabel();
  const marketState = getMarketSessionState();
  const radar = getDailyReportRadar();
  const watchNames = watchlist.slice(0,10).map(item=>item.sym).join(', ') || 'RELIANCE, INFY, TCS, HDFCBANK, SBIN';
  const radarTable = radar.map(item=>`
    <tr>
      <td>${escapeHtml(item.sym)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${formatINR(item.price)}</td>
      <td style="color:${item.up ? '#0f9d58' : '#d93025'}">${escapeHtml(item.chg)}</td>
      <td>${escapeHtml(item.tag?.toUpperCase() || 'FNO')}</td>
    </tr>
  `).join('');
  const positionsTable = openPositions.length ? openPositions.map(pos=>`
    <tr>
      <td>${escapeHtml(pos.sym)}</td>
      <td>${escapeHtml(pos.side.toUpperCase())}</td>
      <td>${pos.qty}</td>
      <td>${formatINR(pos.avgPrice)}</td>
      <td>${formatINR(pos.ltp || pos.avgPrice)}</td>
      <td>${formatINR(calcPosPnL(pos))}</td>
    </tr>
  `).join('') : `<tr><td colspan="6">No live positions. Use this page as a pre-trade execution map.</td></tr>`;
  const pages = [
    {
      title:'Executive Summary',
      subtitle:'Bias, opening framework, and the one-page decision map',
      body:`
        <div class="hero-card">
          <div class="hero-tag">${escapeHtml(dateLabel)}</div>
          <h1>WizardPRO Daily Trading Report</h1>
          <p>The current session state is <strong>${marketState.toUpperCase()}</strong>. The priority is to trade acceptance, not prediction. If price sustains above pivot with sector breadth, keep a bullish bias. If the opening gap is sold below support, shift to capital preservation and wait for a cleaner second setup.</p>
        </div>
        <div class="two-col">
          <div class="panel">
            <h3>Primary plan</h3>
            <ul>
              <li>Use 24,148 as the key NIFTY decision zone.</li>
              <li>Above 24,285, favor continuation names in IT, OMC, and selective large-cap banks.</li>
              <li>Below 24,011, cut aggressive longs and wait for base formation before re-entry.</li>
              <li>Position size should scale only after the first 15-minute range confirms direction.</li>
            </ul>
          </div>
          <div class="panel">
            <h3>Fast caution list</h3>
            <ul>
              <li>Gap-up opens are easy to chase and hard to defend.</li>
              <li>Bank Nifty weakness can cap broader upside even if NIFTY looks strong.</li>
              <li>Geopolitical headlines can spike implied volatility without warning.</li>
              <li>If breadth lags while the index rises, treat it as a warning sign.</li>
            </ul>
          </div>
        </div>
        <div class="note-box">Watchlist focus for today: ${escapeHtml(watchNames)}.</div>
      `
    },
    {
      title:'Overnight Macro Map',
      subtitle:'Global markets, rates, commodities, and INR context',
      body:`
        <table>
          <thead><tr><th>Asset</th><th>Level</th><th>Change</th><th>Interpretation</th></tr></thead>
          <tbody>
            <tr><td>S&P 500</td><td>5,842</td><td style="color:#0f9d58">+0.54%</td><td>Constructive risk sentiment into Asia.</td></tr>
            <tr><td>NASDAQ</td><td>18,448</td><td style="color:#0f9d58">+0.91%</td><td>Supports growth and IT sentiment.</td></tr>
            <tr><td>US 10Y Yield</td><td>4.38%</td><td style="color:#d93025">-0.04</td><td>Mildly supportive for emerging-market risk assets.</td></tr>
            <tr><td>Dollar Index</td><td>104.2</td><td style="color:#d93025">-0.18%</td><td>Softer dollar reduces INR pressure.</td></tr>
            <tr><td>WTI Crude</td><td>$61.84</td><td style="color:#d93025">-1.24%</td><td>Positive for OMCs and inflation-sensitive sectors.</td></tr>
            <tr><td>USD/INR</td><td>84.12</td><td style="color:#0f9d58">Stable</td><td>Currency risk contained for now.</td></tr>
          </tbody>
        </table>
        <div class="two-col">
          <div class="panel">
            <h3>Why it matters</h3>
            <p>A softer crude and stable INR combination often improves the trading backdrop for domestic cyclicals, transport, paints, chemicals, and OMCs. At the same time, a firm NASDAQ close supports sentiment in IT heavyweights.</p>
          </div>
          <div class="panel">
            <h3>What can go wrong</h3>
            <p>If yields reverse higher or geopolitical risk headlines hit before the open, the market can ignore benign overnight cues. In that case, let price lead and reduce dependence on global narratives.</p>
          </div>
        </div>
      `
    },
    {
      title:'Index Structure And Levels',
      subtitle:'NIFTY and Bank NIFTY trigger map for intraday traders',
      body:`
        <table>
          <thead><tr><th>Index</th><th>R2</th><th>R1</th><th>Pivot</th><th>S1</th><th>S2</th></tr></thead>
          <tbody>
            <tr><td>NIFTY 50</td><td>24,421</td><td>24,285</td><td>24,148</td><td>24,011</td><td>23,875</td></tr>
            <tr><td>Bank Nifty</td><td>49,820</td><td>49,580</td><td>49,340</td><td>49,100</td><td>48,860</td></tr>
          </tbody>
        </table>
        <div class="panel">
          <h3>Interpretation framework</h3>
          <ul>
            <li>If NIFTY opens above pivot and Bank Nifty also holds above 49,340, the odds favor continuation rather than fade.</li>
            <li>If NIFTY is above pivot but banks stay weak, prefer stock-specific longs over aggressive index chasing.</li>
            <li>If both indices lose pivot after the opening range, prioritize capital defense and mean-reversion setups only after fresh structure appears.</li>
            <li>If range is narrow and volume light, trade smaller and wait for the second expansion move.</li>
          </ul>
        </div>
      `
    },
    {
      title:'Flows, Breadth, And Volatility',
      subtitle:'What order flow is saying about conviction',
      body:`
        <table>
          <thead><tr><th>Day</th><th>FII Net</th><th>DII Net</th><th>Read</th></tr></thead>
          <tbody>
            <tr><td>Mon</td><td style="color:#0f9d58">+₹1,242cr</td><td style="color:#0f9d58">+₹890cr</td><td>Healthy participation</td></tr>
            <tr><td>Tue</td><td style="color:#0f9d58">+₹2,100cr</td><td style="color:#0f9d58">+₹1,240cr</td><td>Momentum follow-through</td></tr>
            <tr><td>Wed</td><td style="color:#0f9d58">+₹3,001cr</td><td style="color:#0f9d58">+₹3,570cr</td><td>Broad-based conviction</td></tr>
          </tbody>
        </table>
        <div class="two-col">
          <div class="panel">
            <h3>Volatility posture</h3>
            <p>Low-volatility sessions reward discipline, not aggression. When VIX is calm, traders often over-size because candles look cleaner. That is usually where slippage from late entries begins.</p>
          </div>
          <div class="panel">
            <h3>Breadth checklist</h3>
            <ul>
              <li>Advance-decline ratio above 1.4:1 supports trend continuation.</li>
              <li>Bank and IT both green usually improve index trade quality.</li>
              <li>Rally led only by a few heavyweights deserves reduced conviction.</li>
            </ul>
          </div>
        </div>
      `
    },
    {
      title:'Sector Rotation',
      subtitle:'Where leadership is likely to come from',
      body:`
        <table>
          <thead><tr><th>Sector</th><th>Bias</th><th>Why it matters</th><th>Execution note</th></tr></thead>
          <tbody>
            <tr><td>IT</td><td>Bullish</td><td>Positive global tech tone and tariff relief narrative.</td><td>Prefer strength after first pullback.</td></tr>
            <tr><td>OMC / Energy</td><td>Bullish</td><td>Lower crude improves margin outlook.</td><td>Look for continuation, not blind gap chase.</td></tr>
            <tr><td>Banks</td><td>Neutral to bullish</td><td>Need confirmation from Bank Nifty above pivot.</td><td>Use as market health gauge.</td></tr>
            <tr><td>Defence</td><td>Event-driven</td><td>Headline risk can create sharp momentum bursts.</td><td>Trade smaller, tighten stop.</td></tr>
            <tr><td>Metals</td><td>Cautious</td><td>Global growth sensitivity and commodity softness.</td><td>Prefer only if relative strength improves.</td></tr>
          </tbody>
        </table>
        <div class="panel">
          <h3>Sector rotation playbook</h3>
          <p>Start the day by watching which sectors absorb profit-taking best after the opening burst. Strength that survives the first retracement is usually more tradeable than raw opening momentum.</p>
        </div>
      `
    },
    {
      title:'F&O Playbook',
      subtitle:'Option-chain, PCR, and scenario mapping',
      body:`
        <div class="two-col">
          <div class="panel">
            <h3>Current read</h3>
            <ul>
              <li>PCR remains supportive with put writing concentrated below spot.</li>
              <li>Call resistance is visible near 24,300 and 24,400.</li>
              <li>Bank Nifty participation will decide whether the index trend broadens or stalls.</li>
              <li>Low-volatility regimes favor spreads and discipline over lottery-style naked premium buying.</li>
            </ul>
          </div>
          <div class="panel">
            <h3>Trader scenarios</h3>
            <ul>
              <li>Trend continuation: buy pullbacks in leaders, sell weak OTM premium with defined risk.</li>
              <li>Range day: mean-reversion and short premium structures can work better than breakout chasing.</li>
              <li>Gap-fade: wait for failed acceptance under pivot before shorting confidently.</li>
              <li>Volatility spike: reduce size, widen targets, and favor clearer structures.</li>
            </ul>
          </div>
        </div>
        <div class="note-box">If you trade options aggressively, make Bank Nifty and NIFTY opening breadth part of the checklist before every second entry.</div>
      `
    },
    {
      title:'Stock Radar',
      subtitle:'High-utility watchlist names for the session',
      body:`
        <table>
          <thead><tr><th>Symbol</th><th>Name</th><th>Price</th><th>Move</th><th>Bucket</th></tr></thead>
          <tbody>${radarTable}</tbody>
        </table>
        <div class="panel">
          <h3>How to use this list</h3>
          <ul>
            <li>Do not trade all of them. Reduce to two long candidates and two short or fade candidates by 9:30.</li>
            <li>Favor stocks that align with the stronger sector and also hold their opening range.</li>
            <li>If the broader market is mixed, relative-strength stock setups often outperform index trades.</li>
            <li>If a symbol is already in your live position book, use its trigger levels before adding size.</li>
          </ul>
        </div>
      `
    },
    {
      title:'Event Calendar And Catalysts',
      subtitle:'What can disrupt the tape today',
      body:`
        <table>
          <thead><tr><th>Time</th><th>Event</th><th>Potential impact</th></tr></thead>
          <tbody>
            <tr><td>Pre-open</td><td>Overnight global reaction</td><td>Sets initial gap expectations and sector tone.</td></tr>
            <tr><td>09:15-09:30</td><td>Opening range</td><td>Most important price-discovery window for execution.</td></tr>
            <tr><td>11:00</td><td>Institutional flow read</td><td>Helps confirm whether the morning move has sponsorship.</td></tr>
            <tr><td>13:30</td><td>Sector rotation check</td><td>Useful for deciding whether to hold or trim trend trades.</td></tr>
            <tr><td>15:00 onward</td><td>Closing hour positioning</td><td>Watch for fresh momentum or protective unwinds.</td></tr>
          </tbody>
        </table>
        <div class="panel">
          <h3>Headline sensitivity</h3>
          <p>Keep a special eye on geopolitical headlines and macro commentary. Even when the market opens cleanly, a late headline can flip leadership and trap late momentum entries.</p>
        </div>
      `
    },
    {
      title:'Risk Management Framework',
      subtitle:'Sizing, invalidation, and what to do when wrong',
      body:`
        <div class="two-col">
          <div class="panel">
            <h3>Mandatory rules</h3>
            <ul>
              <li>Risk per idea should be defined before entry, not after the first adverse candle.</li>
              <li>Cut size by half if you are down on the first two attempts.</li>
              <li>Avoid adding to losers unless it is a planned scale at a pre-marked level.</li>
              <li>Use the position sizing tool for every non-trivial setup.</li>
            </ul>
          </div>
          <div class="panel">
            <h3>Failure modes</h3>
            <ul>
              <li>Chasing the opening impulse without breadth confirmation.</li>
              <li>Ignoring bank weakness while staying aggressively long index names.</li>
              <li>Overtrading range days because candles look active but have no acceptance.</li>
              <li>Moving stop loss wider to “give it room” after a poor entry.</li>
            </ul>
          </div>
        </div>
        <div class="note-box">The best report is still useless without discipline. Treat this page as your operating rules page before taking the first real size trade.</div>
      `
    },
    {
      title:'Execution Journal',
      subtitle:'Use this final page during the session',
      body:`
        <table>
          <thead><tr><th>Live positions</th><th>Side</th><th>Qty</th><th>Avg</th><th>LTP</th><th>P&L</th></tr></thead>
          <tbody>${positionsTable}</tbody>
        </table>
        <div class="panel">
          <h3>Session notes template</h3>
          <p>Opening read: ________________________________</p>
          <p>Best setup taken: _____________________________</p>
          <p>What invalidated the alternate scenario: _________</p>
          <p>Emotional state / discipline score: _____________</p>
          <p>One lesson to carry into tomorrow: ______________</p>
        </div>
        <div class="note-box">Generated by WizardPRO. Educational workflow brief only, not financial advice.</div>
      `
    }
  ];
  return `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>WizardPRO Daily Report</title>
      <style>
        :root{color-scheme:light;}
        *{box-sizing:border-box}
        body{margin:0;font-family:Georgia,"Times New Roman",serif;color:#1f2937;background:#f7f4ee}
        .page{min-height:100vh;padding:36px 42px 30px;background:#fff;page-break-after:always;border-bottom:8px solid #efe7d7}
        .page:last-child{page-break-after:auto}
        .topline{display:flex;justify-content:space-between;gap:16px;font:600 11px/1.4 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#9a7a48}
        h1,h2,h3{margin:0 0 12px;color:#1f2937}
        h1{font-size:34px;line-height:1.1}
        h2{font-size:28px;line-height:1.15;margin-top:14px}
        h3{font-size:16px;font-family:Arial,sans-serif}
        p,li,td,th{font-size:13.2px;line-height:1.65}
        .subtitle{font:600 13px/1.5 Arial,sans-serif;color:#6b7280;margin-bottom:18px}
        .hero-card,.panel,.note-box{border:1px solid #e5dccd;border-radius:16px;background:#fffdf8}
        .hero-card{padding:22px 24px;margin:18px 0}
        .hero-tag{font:700 11px/1 Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#9a7a48;margin-bottom:12px}
        .panel{padding:16px 18px}
        .note-box{padding:14px 16px;margin-top:18px;background:#faf5eb}
        .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
        table{width:100%;border-collapse:collapse;margin-top:14px}
        th,td{border:1px solid #e6dece;padding:10px 11px;text-align:left;vertical-align:top}
        th{background:#f8f2e7;font:700 11px/1.4 Arial,sans-serif;text-transform:uppercase;letter-spacing:.08em;color:#8a6a3b}
        ul{margin:0;padding-left:18px}
        .footer{margin-top:20px;font:600 10px/1.5 Arial,sans-serif;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em}
        @media print{
          body{background:#fff}
          .page{border-bottom:none}
        }
      </style>
    </head>
    <body>
      ${pages.map((page, index)=>`
        <section class="page">
          <div class="topline">
            <span>WizardPRO Daily Report</span>
            <span>Page ${index + 1} / ${pages.length}</span>
          </div>
          <h2>${page.title}</h2>
          <div class="subtitle">${page.subtitle}</div>
          ${page.body}
          <div class="footer">${escapeHtml(dateLabel)} · Demo analytical brief for traders</div>
        </section>
      `).join('')}
    </body>
    </html>
  `;
}
function printDailyReport(){
  const printWin = window.open('', '_blank', 'width=1000,height=900');
  if(!printWin){
    showToast('Please allow popups to open the print report');
    return;
  }
  printWin.document.open();
  printWin.document.write(buildDailyReportPrintDocument());
  printWin.document.close();
  setTimeout(()=>{
    printWin.focus();
    printWin.print();
  }, 250);
}

/* ══════════════════════════════════════════
   WATCHLIST (TradeLab)
══════════════════════════════════════════ */
const DEFAULT_WATCHLIST = [
  {sym:'RELIANCE',name:'Reliance Industries',price:2914.85,chg:'+1.24%',up:true,tag:'nifty50'},
  {sym:'NIFTY50',name:'Nifty 50 Index',price:24168,chg:'+0.44%',up:true,tag:'nifty50'},
  {sym:'BANKNIFTY',name:'Bank Nifty Index',price:49380,chg:'+0.28%',up:true,tag:'fno'},
  {sym:'TCS',name:'Tata Consultancy Services',price:3482.50,chg:'+2.14%',up:true,tag:'nifty50'},
  {sym:'HDFC',name:'HDFC Bank Ltd',price:1842.30,chg:'+0.72%',up:true,tag:'nifty50'},
  {sym:'INFY',name:'Infosys Ltd',price:1521.90,chg:'+1.88%',up:true,tag:'nifty50'},
  {sym:'ICICIBANK',name:'ICICI Bank Ltd',price:1382.40,chg:'+0.54%',up:true,tag:'fno'},
  {sym:'SBIN',name:'State Bank of India',price:824.15,chg:'-0.32%',up:false,tag:'fno'},
  {sym:'TATAMOTORS',name:'Tata Motors Ltd',price:702.80,chg:'-0.88%',up:false,tag:'fno'},
  {sym:'GOLDBEES',name:'Nippon India Gold ETF',price:55.42,chg:'+0.22%',up:true,tag:'etf'},
  {sym:'NIFTYBEES',name:'Nippon India ETF Nifty 50',price:241.8,chg:'+0.41%',up:true,tag:'etf'},
  {sym:'IRFC',name:'Indian Railway Finance Corp',price:148.20,chg:'+3.12%',up:true,tag:'fno'},
];
const DEFAULT_WATCHLIST_COLLECTIONS = {
  'My Watchlist': DEFAULT_WATCHLIST.map(item=>({...item})),
  'Watchlist 1': DEFAULT_WATCHLIST.slice(0,4).map(item=>({...item})),
  'Watchlist 2': [
    {sym:'ICICIBANK',name:'ICICI Bank Ltd',price:1382.40,chg:'+0.54%',up:true,tag:'fno'},
    {sym:'SBIN',name:'State Bank of India',price:824.15,chg:'-0.32%',up:false,tag:'fno'},
    {sym:'AXISBANK',name:'Axis Bank Ltd',price:1224.30,chg:'+0.44%',up:true,tag:'nifty50'},
    {sym:'KOTAKBANK',name:'Kotak Mahindra Bank',price:1764.80,chg:'+0.61%',up:true,tag:'nifty50'}
  ],
  'Watchlist 3': [
    {sym:'GOLDBEES',name:'Nippon India Gold ETF',price:55.42,chg:'+0.22%',up:true,tag:'etf'},
    {sym:'NIFTYBEES',name:'Nippon India ETF Nifty 50',price:241.8,chg:'+0.41%',up:true,tag:'etf'},
    {sym:'HAL',name:'Hindustan Aeronautics Ltd',price:4280.60,chg:'+4.82%',up:true,tag:'fno'},
    {sym:'BEL',name:'Bharat Electronics Ltd',price:284.30,chg:'+3.44%',up:true,tag:'fno'}
  ]
};
function buildWatchlistCollections(rawCollections){
  const next = {};
  Object.entries(DEFAULT_WATCHLIST_COLLECTIONS).forEach(([name, items])=>{
    next[name] = (rawCollections && Array.isArray(rawCollections[name]) ? rawCollections[name] : items).map(item=>({...item}));
  });
  Object.entries(rawCollections || {}).forEach(([name, items])=>{
    if(next[name]) return;
    next[name] = Array.isArray(items) ? items.map(item=>({...item})) : [];
  });
  return next;
}
let watchlistCollections = buildWatchlistCollections(JSON.parse(localStorage.getItem('wp_watchlists') || '{}'));
let activeWatchlistName = localStorage.getItem('wp_watchlist_active') || 'My Watchlist';
if(!watchlistCollections[activeWatchlistName]) activeWatchlistName = Object.keys(watchlistCollections)[0];
watchlist = watchlistCollections[activeWatchlistName].map(item=>({...item}));

const SEARCH_DB = [
  {sym:'ZOMATO',name:'Zomato Ltd',price:224.80,chg:'+2.14%',up:true,tag:'fno'},
  {sym:'PAYTM',name:'One97 Communications',price:512.40,chg:'-0.88%',up:false,tag:'fno'},
  {sym:'ADANIPORTS',name:'Adani Ports & SEZ',price:1184.20,chg:'-0.42%',up:false,tag:'nifty50'},
  {sym:'HAL',name:'Hindustan Aeronautics Ltd',price:4280.60,chg:'+4.82%',up:true,tag:'fno'},
  {sym:'BEL',name:'Bharat Electronics Ltd',price:284.30,chg:'+3.44%',up:true,tag:'fno'},
  {sym:'NAUKRI',name:'Info Edge (India) Ltd',price:8240.50,chg:'+1.22%',up:true,tag:''},
  {sym:'LT',name:'Larsen & Toubro Ltd',price:3682.40,chg:'+0.54%',up:true,tag:'nifty50'},
  {sym:'WIPRO',name:'Wipro Ltd',price:284.90,chg:'+1.04%',up:true,tag:'nifty50'},
];
[
  ['RECLTD','REC Ltd'],['PFC','Power Finance Corp'],['COALINDIA','Coal India'],
  ['ONGC','ONGC'],['NTPC','NTPC'],['POWERGRID','Power Grid'],['AXISBANK','Axis Bank'],
  ['KOTAKBANK','Kotak Mahindra Bank'],['BAJFINANCE','Bajaj Finance'],['BAJAJFINSV','Bajaj Finserv'],
  ['MARUTI','Maruti Suzuki'],['M&M','Mahindra & Mahindra'],['ULTRACEMCO','UltraTech Cement'],
  ['ASIANPAINT','Asian Paints'],['ITC','ITC Ltd'],['HCLTECH','HCL Technologies'],
  ['TECHM','Tech Mahindra'],['SUNPHARMA','Sun Pharma'],['DRREDDY','Dr Reddys'],
  ['CIPLA','Cipla'],['TATASTEEL','Tata Steel'],['JSWSTEEL','JSW Steel'],
  ['HINDALCO','Hindalco'],['BPCL','BPCL'],['IOC','Indian Oil Corp'],['ADANIENT','Adani Enterprises']
].forEach((x,i)=>SEARCH_DB.push({sym:x[0],name:x[1],price:100+i*37,chg:(i%2?'+':'-')+(0.5+(i%9)/10).toFixed(2)+'%',up:i%2===1,tag:i%3===0?'nifty50':'fno'}));
let addStockVisible=false;

function persistWatchlists(){
  watchlistCollections[activeWatchlistName] = watchlist;
  localStorage.setItem('wp_watchlists', JSON.stringify(watchlistCollections));
  localStorage.setItem('wp_watchlist_active', activeWatchlistName);
}
function renderWatchlistPicker(){
  const picker = document.getElementById('watchlistPicker');
  if(!picker) return;
  picker.innerHTML = Object.keys(watchlistCollections).map(n=>`<option ${n===activeWatchlistName?'selected':''}>${n}</option>`).join('');
}
function switchWatchlist(name){
  activeWatchlistName = name;
  watchlist = (watchlistCollections[name] || []).map(item=>({...item}));
  localStorage.setItem('wp_watchlist_active', activeWatchlistName);
  closeWatchlistMenu();
  renderWatchlist();
}
function closeWatchlistMenu(){
  watchlistMenuVisible = false;
  document.getElementById('watchlistMenu')?.classList.remove('show');
}
function toggleWatchlistMenu(event){
  if(event) event.stopPropagation();
  watchlistMenuVisible = !watchlistMenuVisible;
  document.getElementById('watchlistMenu')?.classList.toggle('show', watchlistMenuVisible);
}
function toggleAddStockFromMenu(){
  toggleAddStock(true);
}
function createWatchlist(){
  const name = prompt('New watchlist name');
  if(!name || !name.trim()) return;
  const clean = name.trim();
  if(watchlistCollections[clean]){ showToast('Watchlist already exists'); return; }
  watchlistCollections[clean] = [];
  activeWatchlistName = clean;
  watchlist = watchlistCollections[clean];
  persistWatchlists();
  renderWatchlistPicker();
  closeWatchlistMenu();
  renderWatchlist();
}
function renameWatchlist(){
  const name = prompt('Rename watchlist', activeWatchlistName);
  if(!name || !name.trim()) return;
  const clean = name.trim();
  if(clean === activeWatchlistName) return;
  if(watchlistCollections[clean]){ showToast('Name already used'); return; }
  watchlistCollections[clean] = watchlistCollections[activeWatchlistName];
  delete watchlistCollections[activeWatchlistName];
  activeWatchlistName = clean;
  watchlist = watchlistCollections[activeWatchlistName];
  persistWatchlists();
  renderWatchlistPicker();
  closeWatchlistMenu();
  renderWatchlist();
}

function renderWatchlist(){
  const container = document.getElementById('watchlistContainer');
  const items = watchlist;
  if(!items.length){
    container.innerHTML='<div class="empty-state" style="padding:28px"><p>No stocks found</p></div>';
    return;
  }
  container.innerHTML = items.map((s,i)=>`
    <div class="wl-item" onclick="openOrderModal('${s.sym}',${s.price})">
      <div class="wl-sym">${s.sym}</div>
      <div class="wl-name">${s.name}</div>
      <div class="wl-price-block">
        <div class="wl-price">₹${typeof s.price==='number'?s.price.toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:2}):s.price}</div>
        <span class="wl-chg ${s.up?'pos':'neg'}">${s.chg}</span>
      </div>
      <div class="wl-actions" onclick="event.stopPropagation()">
        <button class="wl-action-btn buy" onclick="openOrderModalSide('${s.sym}',${s.price},'buy')">B</button>
        <button class="wl-action-btn sell" onclick="openOrderModalSide('${s.sym}',${s.price},'sell')">S</button>
        <button class="wl-action-btn delete" onclick="removeFromWatchlist(${watchlist.indexOf(s)})">×</button>
      </div>
    </div>`).join('');
}

function toggleAddStock(forceOpen = null){
  addStockVisible = typeof forceOpen === 'boolean' ? forceOpen : !addStockVisible;
  document.getElementById('addStockSearch').classList.toggle('show', addStockVisible);
  if(addStockVisible) document.getElementById('addStockInput').focus();
  closeWatchlistMenu();
}

function searchToAdd(val){
  {
    const res = document.getElementById('addSearchResults');
    if(!val.trim()){ res.innerHTML=''; return; }
    const q = val.toLowerCase();
    const matches = getSearchUniverse().filter(s=>
      (s.sym.toLowerCase().includes(q)||s.name.toLowerCase().includes(q)) &&
      !watchlist.find(w=>w.sym===s.sym)
    ).slice(0,6);
    if(!matches.length){
      res.innerHTML = '<div class="empty-state" style="padding:18px"><p>No matching stock found</p></div>';
      return;
    }
    res.innerHTML = matches.map(s=>`
      <div class="search-result-item" onclick="addToWatchlist('${s.sym}')">
        <span class="sri-sym">${s.sym}</span>
        <span class="sri-name">${s.name}</span>
        <span class="sri-price ${s.up?'pos':'neg'}">${formatINR(s.price)}</span>
      </div>`).join('');
    return;
  }
  const res = document.getElementById('addSearchResults');
  if(!val.trim()){ res.innerHTML=''; return; }
  const q = val.toLowerCase();
  const matches = [...SEARCH_DB,...DEFAULT_WATCHLIST].filter(s=>
    (s.sym.toLowerCase().includes(q)||s.name.toLowerCase().includes(q)) &&
    !watchlist.find(w=>w.sym===s.sym)
  ).slice(0,6);
  res.innerHTML = matches.map(s=>`
    <div class="search-result-item" onclick="addToWatchlist('${s.sym}')">
      <span class="sri-sym">${s.sym}</span>
      <span class="sri-name">${s.name}</span>
      <span class="sri-price ${s.up?'pos':'neg'}">₹${s.price}</span>
    </div>`).join('');
}

function addToWatchlist(sym){
  {
    const s = getSearchUniverse().find(x=>x.sym===sym);
    if(!s||watchlist.find(w=>w.sym===sym)){ showToast(sym+' already in watchlist'); return; }
    watchlist.push({...s});
    persistWatchlists();
    renderWatchlist();
    if(addStockVisible) toggleAddStock();
    updatePortfolioSummary();
    showToast(sym+' added to watchlist ✓');
    return;
  }
  const s = [...SEARCH_DB,...DEFAULT_WATCHLIST].find(x=>x.sym===sym);
  if(!s||watchlist.find(w=>w.sym===sym)){ showToast(sym+' already in watchlist'); return; }
  watchlist.push(s);
  persistWatchlists();
  renderWatchlist();
  document.getElementById('portCount').textContent = watchlist.length;
  toggleAddStock();
  showToast(sym+' added to watchlist ✓');
}

function removeFromWatchlist(idx){
  watchlist.splice(idx,1);
  persistWatchlists();
  renderWatchlist();
  updatePortfolioSummary();
  showToast('Removed from watchlist');
}

/* ══════════════════════════════════════════
   ORDER MODAL
══════════════════════════════════════════ */
let currentOrderSym='', currentOrderPrice=0;
function openOrderModal(sym, price){
  currentOrderSym=sym; currentOrderPrice=price;
  document.getElementById('orderModalTitle').textContent = sym;
  const nse = document.getElementById('orderNsePrice');
  const bse = document.getElementById('orderBsePrice');
  if(nse) nse.textContent = '₹'+price.toFixed(2);
  if(bse) bse.textContent = '₹'+(price+0.02).toFixed(2);
  document.getElementById('orderPrice').value = price;
  document.getElementById('orderQty').value = 1;
  document.getElementById('orderMarginReq').textContent = '₹'+price.toLocaleString('en-IN',{maximumFractionDigits:0});
  document.getElementById('orderType').value = 'Market';
  resetSwipeControl();
  onOrderTypeChange();
  setOrderSide('buy');
  document.getElementById('orderModal').classList.add('show');
}
function openOrderModalSide(sym, price, side){
  openOrderModal(sym, price);
  setOrderSide(side);
}
function setOrderSide(side){
  orderSide=side;
  const buyTab = document.getElementById('orderBuyTab');
  const sellTab = document.getElementById('orderSellTab');
  if(buyTab) buyTab.classList.toggle('active',side==='buy');
  if(sellTab) sellTab.classList.toggle('active',side==='sell');
  const btn = document.getElementById('orderSubmitBtn');
  if(btn){
    btn.className='order-submit '+side;
    btn.textContent='Slide to '+side.toUpperCase();
  }
  const txt = document.getElementById('kiteSwipeText');
  if(txt) txt.textContent = side==='buy'?'SWIPE TO BUY':'SWIPE TO SELL';
}
function onOrderTypeChange(){
  const type = document.getElementById('orderType').value;
  const priceInput = document.getElementById('orderPrice');
  if(!priceInput) return;
  if(type === 'Market'){
    priceInput.value = currentOrderPrice;
    priceInput.readOnly = true;
    priceInput.style.opacity = '0.75';
  } else {
    priceInput.readOnly = false;
    priceInput.style.opacity = '1';
  }
}
function resetSwipeControl(){
  swipeConfirmed = false;
  const thumb = document.getElementById('kiteSwipeThumb');
  const hint = document.getElementById('slideHint');
  if(thumb) thumb.style.left = '6px';
  if(hint) hint.textContent = 'Drag all the way right to place';
}
function setupSwipeControl(){
  const track = document.getElementById('kiteSwipe');
  const thumb = document.getElementById('kiteSwipeThumb');
  if(!track || !thumb) return;
  let dragging = false;
  const getX = (e) => (e.touches ? e.touches[0].clientX : e.clientX);
  const moveThumb = (clientX) => {
    const rect = track.getBoundingClientRect();
    const min = 6;
    const max = rect.width - thumb.offsetWidth - 6;
    const left = Math.max(min, Math.min(max, clientX - rect.left - thumb.offsetWidth/2));
    thumb.style.left = left + 'px';
    const pct = (left - min) / (max - min);
    swipeConfirmed = pct > 0.92;
  };
  const start = (e) => { dragging = true; thumb.classList.add('dragging'); e.preventDefault(); };
  const move = (e) => { if(!dragging) return; moveThumb(getX(e)); };
  const end = () => {
    if(!dragging) return;
    dragging = false;
    thumb.classList.remove('dragging');
    if(!swipeConfirmed) thumb.style.left = '6px';
    document.getElementById('slideHint').textContent = swipeConfirmed ? 'Ready to place order' : 'Drag all the way right to place';
  };
  thumb.addEventListener('mousedown', start);
  thumb.addEventListener('touchstart', start, {passive:false});
  window.addEventListener('mousemove', move);
  window.addEventListener('touchmove', move, {passive:false});
  window.addEventListener('mouseup', end);
  window.addEventListener('touchend', end);
}
/* ══════════════════════════════════════════
   ORDER ENGINE — State
══════════════════════════════════════════ */
let openPositions = JSON.parse(localStorage.getItem('wp_positions') || '[]');
let allOrders     = JSON.parse(localStorage.getItem('wp_orders')    || '[]');
let closedTrades  = JSON.parse(localStorage.getItem('wp_trades')    || '[]');
let exitingPosIdx = -1;
openPositions = openPositions.map(pos=>({
  ...pos,
  qty: Number(pos.qty) || 0,
  avgPrice: Number(pos.avgPrice) || 0,
  ltp: Number(pos.ltp) || Number(pos.avgPrice) || 0,
}));
allOrders = allOrders.map(order=>({
  variant:'Regular',
  exchange:'NSE',
  marketProtection:false,
  triggerPrice:null,
  targetPrice:null,
  stopLossPrice:null,
  ...order,
}));
closedTrades = closedTrades.map(trade=>({
  ...trade,
  qty: Number(trade.qty) || 0,
  entryPrice: Number(trade.entryPrice) || 0,
  exitPrice: Number(trade.exitPrice) || 0,
  pnl: Number(trade.pnl) || 0,
}));

function saveTradeState(){
  localStorage.setItem('wp_positions', JSON.stringify(openPositions));
  localStorage.setItem('wp_orders',    JSON.stringify(allOrders));
  localStorage.setItem('wp_trades',    JSON.stringify(closedTrades));
}

function submitOrder(){
  const qty   = parseFloat(document.getElementById('orderQty').value)   || 1;
  const price = parseFloat(document.getElementById('orderPrice').value)  || currentOrderPrice;
  const type  = document.getElementById('orderType').value;
  if(!swipeConfirmed){ showToast('Slide to the end to confirm'); return; }
  const prod  = document.getElementById('orderProduct').value;
  const now   = new Date();
  const timeStr = now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

  // Create order record
  const order = {
    id:       'ORD' + Date.now().toString().slice(-6),
    sym:      currentOrderSym,
    side:     orderSide,
    qty,
    price,
    type,
    product:  prod,
    time:     timeStr,
    date:     now.toLocaleDateString('en-IN'),
    status:   type === 'Market' ? 'executed' : 'pending',
    execPrice: type === 'Market' ? currentOrderPrice : null,
  };
  if(order.execPrice) order.execPrice = parseFloat(order.execPrice.toFixed(2));
  allOrders.unshift(order);

  // If market order → create/update position
  if(order.status === 'executed'){
    processExecution(order);
  }
  saveTradeState();
  closeModalById('orderModal');
  resetSwipeControl();

  const statusMsg = order.status === 'executed'
    ? `✅ ${order.side.toUpperCase()} ${order.qty} × ${order.sym} executed @ ₹${order.execPrice}`
    : `⏳ ${order.side.toUpperCase()} ${order.qty} × ${order.sym} order placed — pending`;
  showToast(statusMsg, 3000);

  // Refresh views if open
  if(currentTab === 'tradelab'){
    const activeTLView = document.querySelector('.tl-view.active');
    if(activeTLView?.id === 'tl-positions') renderPositions();
    if(activeTLView?.id === 'tl-orders')    renderOrders();
    if(activeTLView?.id === 'tl-pnl')       renderPnL();
  }
  updatePortfolioSummary();
}

function processExecution(order){
  const existing = openPositions.find(p => p.sym === order.sym && p.product === order.product);
  if(existing){
    if(existing.side === order.side){
      // Average up/down
      const totalQty = existing.qty + order.qty;
      existing.avgPrice = ((existing.avgPrice * existing.qty) + (order.execPrice * order.qty)) / totalQty;
      existing.avgPrice = parseFloat(existing.avgPrice.toFixed(2));
      existing.qty = totalQty;
    } else {
      // Reduce / square-off
      const pnlPerUnit = existing.side === 'buy'
        ? order.execPrice - existing.avgPrice
        : existing.avgPrice - order.execPrice;
      const closedQty = Math.min(existing.qty, order.qty);
      const realizedPnl = parseFloat((pnlPerUnit * closedQty).toFixed(2));

      // Record closed trade
      closedTrades.unshift({
        sym:      existing.sym,
        side:     existing.side,
        qty:      closedQty,
        entryPrice: existing.avgPrice,
        exitPrice:  order.execPrice,
        pnl:      realizedPnl,
        product:  existing.product,
        date:     order.date,
        time:     order.time,
      });

      existing.qty -= closedQty;
      if(existing.qty <= 0){
        openPositions = openPositions.filter(p => p !== existing);
      }
    }
  } else {
    // New position
    openPositions.push({
      sym:      order.sym,
      side:     order.side,
      qty:      order.qty,
      avgPrice: order.execPrice,
      ltp:      order.execPrice,
      product:  order.product,
      openTime: order.time,
      openDate: order.date,
    });
  }
}

function getSelectedExchange(){
  return document.querySelector('input[name="orderExchange"]:checked')?.value || 'NSE';
}
function getCurrentOrderHorizon(){
  return document.querySelector('input[name="orderHorizon"]:checked')?.value || 'intraday';
}
function setOrderVariant(el, variant){
  currentOrderVariant = variant;
  document.querySelectorAll('#orderVariantTabs .order-tab').forEach(tab=>tab.classList.remove('active'));
  if(el) el.classList.add('active');
  if(variant === 'MTF') document.getElementById('orderProduct').value = 'MTF';
  if(variant === 'Cover' || variant === 'Bracket') orderStoplossEnabled = true;
  updateOrderFormState();
  if(el) scrollChipIntoView(el);
}
function toggleOrderAdvanced(force){
  orderAdvancedOpen = typeof force === 'boolean' ? force : !orderAdvancedOpen;
  const panel = document.getElementById('orderAdvancedPanel');
  const toggle = document.getElementById('orderAdvancedToggle');
  if(panel) panel.style.display = orderAdvancedOpen ? 'block' : 'none';
  if(toggle) toggle.textContent = orderAdvancedOpen ? 'Advanced ▴' : 'Advanced ▾';
}
function toggleOrderSetting(kind, btn){
  if(kind === 'stoploss') orderStoplossEnabled = !orderStoplossEnabled;
  if(kind === 'protection') orderProtectionEnabled = !orderProtectionEnabled;
  if(btn){
    const enabled = kind === 'stoploss' ? orderStoplossEnabled : orderProtectionEnabled;
    btn.classList.toggle('active', enabled);
  }
  updateOrderFormState();
}
function setOrderHorizon(mode){
  document.querySelectorAll('input[name="orderHorizon"]').forEach(radio=>radio.checked = radio.value === mode);
  if(mode === 'longterm' && document.getElementById('orderProduct').value === 'Intraday (MIS)'){
    document.getElementById('orderProduct').value = currentOrderVariant === 'MTF' ? 'MTF' : 'Carry Forward (CNC)';
  }
  if(mode === 'intraday' && document.getElementById('orderProduct').value === 'Carry Forward (CNC)' && currentOrderVariant !== 'MTF'){
    document.getElementById('orderProduct').value = 'Intraday (MIS)';
  }
  updateOrderFormState();
}
function syncOrderPriceToMarket(){
  const live = getLivePrice(currentOrderSym) || currentOrderPrice;
  currentOrderPrice = roundPrice(live);
  document.getElementById('orderPrice').value = currentOrderPrice;
  updateOrderFormState();
}
function cycleOrderQty(){
  const input = document.getElementById('orderQty');
  const steps = currentOrderVariant === 'Iceberg' ? [25, 50, 75, 100, 150] : [1, 5, 10, 25, 50];
  const current = Number(input.value) || steps[0];
  const next = steps[(steps.indexOf(current) + 1 + steps.length) % steps.length] || steps[0];
  input.value = next;
  updateOrderMarginEstimate();
}
function updateOrderMarginEstimate(){
  const qty = Number(document.getElementById('orderQty').value) || 1;
  const price = Number(document.getElementById('orderPrice').value) || currentOrderPrice || 0;
  const product = document.getElementById('orderProduct').value;
  let factor = product.includes('MIS') ? 0.2 : product === 'MTF' ? 0.45 : product.includes('NRML') ? 0.35 : 1;
  if(currentOrderVariant === 'Cover') factor *= 0.7;
  if(currentOrderVariant === 'Bracket') factor *= 0.78;
  if(currentOrderVariant === 'Iceberg') factor *= 0.5;
  if(currentOrderVariant === 'AMO') factor *= 0.25;
  const margin = roundPrice(Math.max(price * qty * factor, price * Math.min(qty, 1)));
  document.getElementById('orderMarginReq').textContent = formatINR(margin, 0);
}
function updateOrderFormState(){
  const type = document.getElementById('orderType').value;
  const priceInput = document.getElementById('orderPrice');
  const triggerWrap = document.getElementById('orderTriggerWrap');
  const targetWrap = document.getElementById('orderTargetWrap');
  const triggerLabel = document.getElementById('orderTriggerLabel');
  const triggerInput = document.getElementById('orderTriggerPrice');
  const targetInput = document.getElementById('orderTargetPrice');
  const stopBtn = document.getElementById('orderStopSwitch');
  const protectBtn = document.getElementById('orderProtectSwitch');
  const requiresEntryTrigger = type === 'SL' || type === 'SL-M';
  const requiresProtectiveStop = currentOrderVariant === 'Cover' || currentOrderVariant === 'Bracket' || orderStoplossEnabled;
  const requiresTarget = currentOrderVariant === 'Bracket';
  if(stopBtn) stopBtn.classList.toggle('active', orderStoplossEnabled);
  if(protectBtn) protectBtn.classList.toggle('active', orderProtectionEnabled);
  if(currentOrderVariant === 'MTF') document.getElementById('orderProduct').value = 'MTF';
  if(type === 'Market' || type === 'SL-M'){
    priceInput.readOnly = true;
    priceInput.style.opacity = '0.75';
    priceInput.value = currentOrderPrice;
  } else {
    priceInput.readOnly = false;
    priceInput.style.opacity = '1';
  }
  const showTrigger = requiresEntryTrigger || requiresProtectiveStop;
  triggerWrap.style.display = showTrigger ? 'block' : 'none';
  targetWrap.style.display = requiresTarget ? 'block' : 'none';
  triggerLabel.textContent = requiresEntryTrigger && !requiresProtectiveStop ? 'Trigger Price' : 'Stop Loss Price';
  if(showTrigger && !Number(triggerInput.value)){
    triggerInput.value = roundPrice(currentOrderPrice * (orderSide === 'buy' ? 0.99 : 1.01));
  }
  if(requiresTarget && !Number(targetInput.value)){
    targetInput.value = roundPrice(currentOrderPrice * (orderSide === 'buy' ? 1.02 : 0.98));
  }
  const track = document.getElementById('kiteSwipe');
  if(track) track.classList.toggle('sell', orderSide === 'sell');
  updateOrderMarginEstimate();
}
function openOrderModal(sym, price){
  currentOrderSym = sym;
  currentOrderPrice = roundPrice(Number(price) || getLivePrice(sym) || 0);
  document.getElementById('orderModalTitle').textContent = sym;
  document.getElementById('orderNsePrice').textContent = formatINR(currentOrderPrice);
  document.getElementById('orderBsePrice').textContent = formatINR(currentOrderPrice + 0.02);
  document.querySelectorAll('input[name="orderExchange"]').forEach(radio=>radio.checked = radio.value === 'NSE');
  document.getElementById('orderQty').value = 1;
  document.getElementById('orderPrice').value = currentOrderPrice;
  document.getElementById('orderType').value = 'Market';
  document.getElementById('orderProduct').value = 'Intraday (MIS)';
  document.getElementById('orderTriggerPrice').value = '';
  document.getElementById('orderTargetPrice').value = '';
  document.querySelectorAll('input[name="orderHorizon"]').forEach(radio=>radio.checked = radio.value === 'intraday');
  orderStoplossEnabled = false;
  orderProtectionEnabled = false;
  orderAdvancedOpen = false;
  toggleOrderAdvanced(false);
  const defaultVariant = document.querySelector('#orderVariantTabs .order-tab');
  if(defaultVariant) setOrderVariant(defaultVariant, 'Regular');
  setOrderSide('buy');
  resetSwipeControl();
  document.getElementById('orderModal').classList.add('show');
}
function openOrderModalSide(sym, price, side){
  openOrderModal(sym, price);
  setOrderSide(side);
}
function setOrderSide(side){
  orderSide = side;
  const buyTab = document.getElementById('orderBuyTab');
  const sellTab = document.getElementById('orderSellTab');
  if(buyTab) buyTab.classList.toggle('active', side === 'buy');
  if(sellTab) sellTab.classList.toggle('active', side === 'sell');
  const btn = document.getElementById('orderSubmitBtn');
  if(btn){
    btn.className = 'order-submit ' + side;
    btn.textContent = 'Place ' + side.toUpperCase() + ' Order';
  }
  const txt = document.getElementById('kiteSwipeText');
  if(txt) txt.textContent = side === 'buy' ? 'SWIPE TO BUY' : 'SWIPE TO SELL';
  updateOrderFormState();
  resetSwipeControl();
}
function onOrderTypeChange(){
  updateOrderFormState();
}
function resetSwipeControl(){
  swipeConfirmed = false;
  swipeAutoSubmitting = false;
  const thumb = document.getElementById('kiteSwipeThumb');
  const hint = document.getElementById('slideHint');
  const track = document.getElementById('kiteSwipe');
  if(thumb) thumb.style.left = '6px';
  if(track) track.classList.toggle('sell', orderSide === 'sell');
  if(hint){
    hint.className = 'slide-hint';
    hint.textContent = 'Drag all the way right to place';
  }
}
function setupSwipeControl(){
  const track = document.getElementById('kiteSwipe');
  const thumb = document.getElementById('kiteSwipeThumb');
  if(!track || !thumb || track.dataset.bound === '1') return;
  track.dataset.bound = '1';
  let dragging = false;
  const getX = event => (event.touches ? event.touches[0].clientX : event.clientX);
  const moveThumb = clientX => {
    const rect = track.getBoundingClientRect();
    const min = 6;
    const max = rect.width - thumb.offsetWidth - 6;
    const left = Math.max(min, Math.min(max, clientX - rect.left - thumb.offsetWidth / 2));
    thumb.style.left = left + 'px';
    const pct = (left - min) / Math.max(1, (max - min));
    swipeConfirmed = pct > 0.9;
  };
  const start = event => {
    dragging = true;
    thumb.classList.add('dragging');
    moveThumb(getX(event));
    if(event.cancelable) event.preventDefault();
  };
  const move = event => {
    if(!dragging) return;
    moveThumb(getX(event));
    if(event.cancelable) event.preventDefault();
  };
  const end = () => {
    if(!dragging) return;
    dragging = false;
    thumb.classList.remove('dragging');
    const hint = document.getElementById('slideHint');
    if(!swipeConfirmed){
      if(thumb) thumb.style.left = '6px';
      if(hint){
        hint.className = 'slide-hint';
        hint.textContent = 'Drag all the way right to place';
      }
      return;
    }
    if(hint){
      hint.className = 'slide-hint ready ' + orderSide;
      hint.textContent = 'Placing order...';
    }
    if(!swipeAutoSubmitting){
      swipeAutoSubmitting = true;
      setTimeout(()=>submitOrder(), 40);
    }
  };
  track.addEventListener('mousedown', start);
  track.addEventListener('touchstart', start, {passive:false});
  window.addEventListener('mousemove', move);
  window.addEventListener('touchmove', move, {passive:false});
  window.addEventListener('mouseup', end);
  window.addEventListener('touchend', end);
}
function applyMarketFill(order, marketPrice){
  let fill = Number(marketPrice) || currentOrderPrice || order.price || 0;
  if(order.marketProtection){
    fill += fill * (order.side === 'buy' ? 0.0007 : -0.0007);
  }
  return roundPrice(fill);
}
function resolveImmediateExecutionPrice(order, marketPrice = getLivePrice(order.sym) || currentOrderPrice){
  const session = getMarketSessionState();
  if(order.variant === 'AMO' && session !== 'open') return null;
  if(order.type === 'Market'){
    if(session === 'closed') return null;
    return applyMarketFill(order, marketPrice);
  }
  if(order.type === 'Limit'){
    return order.side === 'buy'
      ? (marketPrice <= order.price ? roundPrice(order.price) : null)
      : (marketPrice >= order.price ? roundPrice(order.price) : null);
  }
  if(order.type === 'SL' || order.type === 'SL-M'){
    const trigger = Number(order.triggerPrice) || Number(order.price);
    const triggered = order.side === 'buy' ? marketPrice >= trigger : marketPrice <= trigger;
    if(!triggered) return null;
    if(order.type === 'SL-M') return applyMarketFill(order, marketPrice);
    return order.side === 'buy'
      ? (marketPrice <= order.price ? roundPrice(order.price) : null)
      : (marketPrice >= order.price ? roundPrice(order.price) : null);
  }
  return null;
}
function applyProtectiveLegs(position, order){
  if(Number(order.stopLossPrice)) position.stopLossPrice = roundPrice(order.stopLossPrice);
  if(Number(order.targetPrice)) position.targetPrice = roundPrice(order.targetPrice);
  position.variant = order.variant || position.variant || 'Regular';
  position.exchange = order.exchange || position.exchange || 'NSE';
}
function recordClosedTrade(position, qty, exitPrice, meta = {}){
  const exit = roundPrice(exitPrice);
  const pnlPerUnit = position.side === 'buy' ? exit - position.avgPrice : position.avgPrice - exit;
  const pnl = roundPrice(pnlPerUnit * qty);
  const now = new Date();
  closedTrades.unshift({
    sym: position.sym,
    side: position.side,
    qty,
    entryPrice: position.avgPrice,
    exitPrice: exit,
    pnl,
    product: position.product,
    date: now.toLocaleDateString('en-IN'),
    time: now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
    reason: meta.reason || 'Executed',
  });
  return pnl;
}
function processExecution(order){
  let remainingQty = Number(order.qty) || 0;
  const execPrice = roundPrice(order.execPrice || order.price || currentOrderPrice);
  const existingIndex = openPositions.findIndex(pos => pos.sym === order.sym && pos.product === order.product);
  if(existingIndex >= 0){
    const existing = openPositions[existingIndex];
    if(existing.side === order.side){
      const totalQty = existing.qty + remainingQty;
      existing.avgPrice = roundPrice(((existing.avgPrice * existing.qty) + (execPrice * remainingQty)) / Math.max(totalQty, 1));
      existing.qty = totalQty;
      existing.ltp = execPrice;
      applyProtectiveLegs(existing, order);
      return;
    }
    const closedQty = Math.min(existing.qty, remainingQty);
    recordClosedTrade(existing, closedQty, execPrice, {reason:'Square Off'});
    existing.qty -= closedQty;
    existing.ltp = execPrice;
    remainingQty -= closedQty;
    if(existing.qty <= 0){
      openPositions.splice(existingIndex, 1);
    }
  }
  if(remainingQty > 0){
    const position = {
      sym: order.sym,
      side: order.side,
      qty: remainingQty,
      avgPrice: execPrice,
      ltp: execPrice,
      product: order.product,
      openTime: order.time,
      openDate: order.date,
      exchange: order.exchange,
      variant: order.variant,
    };
    applyProtectiveLegs(position, order);
    openPositions.push(position);
  }
}
function submitOrder(){
  const qty = parseFloat(document.getElementById('orderQty').value) || 0;
  if(!currentOrderSym || qty <= 0){ showToast('Enter a valid quantity'); resetSwipeControl(); return; }
  if(!swipeConfirmed){ showToast('Slide to the end to confirm'); return; }
  const price = parseFloat(document.getElementById('orderPrice').value) || currentOrderPrice;
  const type = document.getElementById('orderType').value;
  const product = document.getElementById('orderProduct').value;
  const triggerInput = parseFloat(document.getElementById('orderTriggerPrice').value);
  const targetInput = parseFloat(document.getElementById('orderTargetPrice').value);
  const now = new Date();
  const order = {
    id: 'ORD' + Date.now().toString().slice(-6),
    sym: currentOrderSym,
    side: orderSide,
    qty,
    price: roundPrice(price),
    type,
    product,
    variant: currentOrderVariant,
    exchange: getSelectedExchange(),
    horizon: getCurrentOrderHorizon(),
    time: now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
    date: now.toLocaleDateString('en-IN'),
    triggerPrice: Number.isFinite(triggerInput) ? roundPrice(triggerInput) : null,
    targetPrice: Number.isFinite(targetInput) ? roundPrice(targetInput) : null,
    stopLossPrice: (currentOrderVariant === 'Cover' || currentOrderVariant === 'Bracket' || orderStoplossEnabled) && Number.isFinite(triggerInput) ? roundPrice(triggerInput) : null,
    marketProtection: orderProtectionEnabled,
    status: 'pending',
    execPrice: null,
    slices: currentOrderVariant === 'Iceberg' ? Math.min(5, Math.max(2, Math.ceil(qty / 25))) : 1,
  };
  const immediateFill = resolveImmediateExecutionPrice(order, getLivePrice(order.sym) || currentOrderPrice);
  if(immediateFill !== null){
    order.status = 'executed';
    order.execPrice = immediateFill;
    processExecution(order);
  }
  allOrders.unshift(order);
  maybeExecutePendingOrders();
  saveTradeState();
  closeModalById('orderModal');
  resetSwipeControl();
  const statusMsg = order.status === 'executed'
    ? `${order.side.toUpperCase()} ${order.qty} × ${order.sym} executed @ ${formatINR(order.execPrice)}`
    : `${order.side.toUpperCase()} ${order.qty} × ${order.sym} order placed as ${order.variant} ${order.type}`;
  showToast(statusMsg, 3200);
  if(currentTab === 'tradelab'){
    if(currentTradeLabView === 'positions') renderPositions();
    if(currentTradeLabView === 'orders') renderOrders();
    if(currentTradeLabView === 'pnl') renderPnL();
  }
  updatePortfolioSummary();
}
function closePositionAtIndex(posIdx, exitPrice, reason = 'Manual Exit'){
  const pos = openPositions[posIdx];
  if(!pos) return null;
  const fill = roundPrice(exitPrice || pos.ltp || pos.avgPrice);
  const pnl = recordClosedTrade(pos, pos.qty, fill, {reason});
  const now = new Date();
  allOrders.unshift({
    id: 'ORD' + Date.now().toString().slice(-6),
    sym: pos.sym,
    side: pos.side === 'buy' ? 'sell' : 'buy',
    qty: pos.qty,
    price: fill,
    type: 'Market',
    product: pos.product,
    variant: reason,
    exchange: pos.exchange || 'NSE',
    time: now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
    date: now.toLocaleDateString('en-IN'),
    status: 'executed',
    execPrice: fill,
  });
  openPositions.splice(posIdx, 1);
  return {pos, pnl, fill};
}
function maybeExecutePendingOrders(){
  let changed = false;
  allOrders.forEach(order=>{
    if(order.status !== 'pending') return;
    const marketPrice = getLivePrice(order.sym) || order.price;
    const fill = resolveImmediateExecutionPrice(order, marketPrice);
    if(fill === null) return;
    order.status = 'executed';
    order.execPrice = fill;
    processExecution(order);
    changed = true;
  });
  if(changed) saveTradeState();
}
function evaluateProtectedPositions(){
  const closers = [];
  openPositions.forEach((pos, index)=>{
    if(Number.isFinite(Number(pos.stopLossPrice))){
      const stopHit = pos.side === 'buy' ? pos.ltp <= pos.stopLossPrice : pos.ltp >= pos.stopLossPrice;
      if(stopHit){
        closers.push({index, price: pos.stopLossPrice, reason:'Stop Loss'});
        return;
      }
    }
    if(Number.isFinite(Number(pos.targetPrice))){
      const targetHit = pos.side === 'buy' ? pos.ltp >= pos.targetPrice : pos.ltp <= pos.targetPrice;
      if(targetHit){
        closers.push({index, price: pos.targetPrice, reason:'Target'});
      }
    }
  });
  closers.sort((a,b)=>b.index-a.index).forEach(item=>{
    const result = closePositionAtIndex(item.index, item.price, item.reason);
    if(result) showToast(`${result.pos.sym} ${item.reason} hit @ ${formatINR(item.price)}`, 2600);
  });
  if(closers.length) saveTradeState();
}
function setPositionStop(i){
  const pos = openPositions[i];
  if(!pos) return;
  const suggested = pos.stopLossPrice || roundPrice(pos.avgPrice * (pos.side === 'buy' ? 0.985 : 1.015));
  const value = prompt(`Set stop loss for ${pos.sym}`, suggested);
  if(value === null) return;
  const stop = parseFloat(value);
  if(!Number.isFinite(stop) || stop <= 0){
    delete pos.stopLossPrice;
    showToast('Stop loss removed');
  } else {
    pos.stopLossPrice = roundPrice(stop);
    showToast(`${pos.sym} stop set @ ${formatINR(pos.stopLossPrice)}`);
  }
  saveTradeState();
  renderPositions();
}

/* ══════════════════════════════════════════
   LIVE P&L UPDATES FOR POSITIONS
══════════════════════════════════════════ */
function updatePositionLTPs(){
  openPositions.forEach(pos => {
    const wl = watchlist.find(w => w.sym === pos.sym);
    if(wl) pos.ltp = wl.price;
    else {
      // small simulated tick
      const tick = (Math.random() - 0.48) * pos.avgPrice * 0.0015;
      pos.ltp = parseFloat((pos.ltp + tick).toFixed(2));
    }
  });
  saveTradeState();
  if(currentTab === 'tradelab'){
    const v = document.querySelector('.tl-view.active');
    if(v?.id === 'tl-positions') renderPositions();
    if(v?.id === 'tl-pnl')       renderPnL();
  }
  updatePortfolioSummary();
}

function calcPosPnL(pos){
  const mult = pos.side === 'buy' ? 1 : -1;
  return parseFloat(((pos.ltp - pos.avgPrice) * pos.qty * mult).toFixed(2));
}

function calcPosPnLPct(pos){
  const pnl = calcPosPnL(pos);
  return parseFloat(((pnl / (pos.avgPrice * pos.qty)) * 100).toFixed(2));
}

/* ══════════════════════════════════════════
   RENDER POSITIONS
══════════════════════════════════════════ */
function renderPositions(){
  const el = document.getElementById('positionsContent');
  if(!el) return;

  const totalUnrealPnl = openPositions.reduce((s, p) => s + calcPosPnL(p), 0);
  const totalRealPnl   = closedTrades.filter(t => t.date === new Date().toLocaleDateString('en-IN')).reduce((s,t) => s + t.pnl, 0);
  const dayPnl = totalUnrealPnl + totalRealPnl;

  let html = `
    <div class="pnl-hero">
      <div class="pnl-hero-left">
        <div class="pnl-label">Unrealised P&L</div>
        <div class="pnl-value ${totalUnrealPnl >= 0 ? 'pos' : 'neg'}">
          ${totalUnrealPnl >= 0 ? '+' : ''}₹${Math.abs(totalUnrealPnl).toLocaleString('en-IN',{maximumFractionDigits:2})}
        </div>
        <div class="pnl-pct ${totalUnrealPnl >= 0 ? 'pos' : 'neg'}">Day P&L incl. realised: ${dayPnl >= 0 ? '+' : ''}₹${dayPnl.toFixed(2)}</div>
      </div>
      <div class="pnl-stats-row">
        <div class="pnl-stat">
          <span class="pnl-stat-val">${openPositions.length}</span>
          <span class="pnl-stat-lbl">Open</span>
        </div>
        <div class="pnl-stat">
          <span class="pnl-stat-val">${closedTrades.filter(t=>t.date===new Date().toLocaleDateString('en-IN')).length}</span>
          <span class="pnl-stat-lbl">Closed Today</span>
        </div>
      </div>
    </div>`;

  if(openPositions.length === 0){
    html += `<div class="tl-empty">
      <div class="tl-empty-icon">📭</div>
      <p>No open positions</p>
      <p class="tl-empty-sub">Place orders from the Watchlist tab<br>to see your positions here.</p>
    </div>`;
  } else {
    html += openPositions.map((pos, i) => {
      const pnl    = calcPosPnL(pos);
      const pnlPct = calcPosPnLPct(pos);
      const isPos  = pnl >= 0;
      const maxBar = Math.max(...openPositions.map(p => Math.abs(calcPosPnLPct(p))), 1);
      const barW   = Math.min(100, Math.abs(pnlPct) / maxBar * 100);
      return `
      <div class="pos-card">
        <div class="pos-card-head" onclick="togglePosCard(${i})">
          <div>
            <div class="pos-sym">${pos.sym}</div>
            <div style="display:flex;align-items:center;gap:5px;margin-top:3px">
              <span class="pos-type-badge ${pos.side}">${pos.side.toUpperCase()}</span>
              <span class="pos-product">${pos.product.includes('Intraday')?'MIS':pos.product.includes('Carry')?'CNC':'NRML'}</span>
            </div>
          </div>
          <div class="pos-pnl-block">
            <div class="pos-pnl ${isPos?'pos':'neg'}">${isPos?'+':''}₹${Math.abs(pnl).toLocaleString('en-IN',{maximumFractionDigits:2})}</div>
            <span class="pos-pnl-pct ${isPos?'pos':'neg'}">${isPos?'+':''}${pnlPct}%</span>
          </div>
        </div>
        <div class="pos-pnl-bar">
          <div class="pos-pnl-fill ${isPos?'pos':'neg'}" style="width:${barW}%"></div>
        </div>
        <div class="pos-card-body" id="posBody${i}">
          <div class="pos-detail">
            <span class="pos-detail-label">Qty</span>
            <span class="pos-detail-val">${pos.qty}</span>
          </div>
          <div class="pos-detail">
            <span class="pos-detail-label">Avg Price</span>
            <span class="pos-detail-val">₹${pos.avgPrice.toLocaleString('en-IN',{maximumFractionDigits:2})}</span>
          </div>
          <div class="pos-detail">
            <span class="pos-detail-label">LTP</span>
            <span class="pos-detail-val" style="color:${isPos?'var(--green)':'var(--red)'}">₹${pos.ltp.toLocaleString('en-IN',{maximumFractionDigits:2})}</span>
          </div>
          <div class="pos-detail">
            <span class="pos-detail-label">Value</span>
            <span class="pos-detail-val">₹${(pos.ltp*pos.qty).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
          </div>
        </div>
        <div class="pos-actions">
          <button class="pos-action-btn exit-btn" onclick="openExitModal(${i})">Exit Position</button>
          <button class="pos-action-btn add-btn-pos" onclick="openOrderModalSide('${pos.sym}',${pos.ltp},'${pos.side}')">Add</button>
          <button class="pos-action-btn sl-btn" onclick="showToast('SL order feature coming soon!')">Set SL</button>
        </div>
      </div>`;
    }).join('');
  }

  // Closed today section
  const todayClosed = closedTrades.filter(t => t.date === new Date().toLocaleDateString('en-IN'));
  if(todayClosed.length){
    html += `<div class="sec-head" style="padding:0;margin:16px 0 10px">Closed Today</div>`;
    html += `<div style="border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--border)">`;
    html += todayClosed.map(t => {
      const isPos = t.pnl >= 0;
      return `<div class="pnl-trade-row">
        <div class="pnl-trade-sym">${t.sym}</div>
        <div class="pnl-trade-detail">${t.side.toUpperCase()} ${t.qty} · Avg ₹${t.entryPrice} → ₹${t.exitPrice}</div>
        <div class="pnl-trade-pnl ${isPos?'pos':'neg'}">${isPos?'+':''}₹${t.pnl.toFixed(2)}</div>
      </div>`;
    }).join('') + '</div>';
  }

  el.innerHTML = html;
}

function togglePosCard(i){
  // Cards are always expanded — just a hook for future collapse
}

/* ══════════════════════════════════════════
   EXIT POSITION MODAL
══════════════════════════════════════════ */
function openExitModal(posIdx){
  exitingPosIdx = posIdx;
  const pos = openPositions[posIdx];
  const pnl = calcPosPnL(pos);
  const exitSide = pos.side === 'buy' ? 'SELL' : 'BUY';

  document.getElementById('exitModalTitle').innerHTML =
    `Exit ${pos.sym} <span class="modal-close" onclick="closeModalById('exitModal')">×</span>`;

  document.getElementById('exitConfirmRows').innerHTML = `
    <div class="exit-confirm-row"><span class="exit-confirm-label">Symbol</span><span class="exit-confirm-val">${pos.sym}</span></div>
    <div class="exit-confirm-row"><span class="exit-confirm-label">Action</span><span class="exit-confirm-val" style="color:${exitSide==='SELL'?'var(--red)':'var(--green)'}">${exitSide} (Square Off)</span></div>
    <div class="exit-confirm-row"><span class="exit-confirm-label">Quantity</span><span class="exit-confirm-val">${pos.qty}</span></div>
    <div class="exit-confirm-row"><span class="exit-confirm-label">Avg Entry</span><span class="exit-confirm-val">₹${pos.avgPrice}</span></div>
    <div class="exit-confirm-row"><span class="exit-confirm-label">Exit Price (LTP)</span><span class="exit-confirm-val">₹${pos.ltp}</span></div>
    <div class="exit-confirm-row">
      <span class="exit-confirm-label">Estimated P&L</span>
      <span class="exit-confirm-val" style="color:${pnl>=0?'var(--green)':'var(--red)'}">
        ${pnl>=0?'+':''}₹${pnl.toFixed(2)} (${calcPosPnLPct(pos)}%)
      </span>
    </div>
    <div class="exit-confirm-row"><span class="exit-confirm-label">Order Type</span><span class="exit-confirm-val">Market</span></div>
  `;
  document.getElementById('exitModal').classList.add('show');
}

function confirmExit(){
  if(exitingPosIdx < 0) return;
  const pos = openPositions[exitingPosIdx];
  const exitSide = pos.side === 'buy' ? 'sell' : 'buy';
  const pnl = calcPosPnL(pos);

  // Record as closed trade
  closedTrades.unshift({
    sym:        pos.sym,
    side:       pos.side,
    qty:        pos.qty,
    entryPrice: pos.avgPrice,
    exitPrice:  pos.ltp,
    pnl:        pnl,
    product:    pos.product,
    date:       new Date().toLocaleDateString('en-IN'),
    time:       new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
  });

  // Add exit order
  allOrders.unshift({
    id:        'ORD' + Date.now().toString().slice(-6),
    sym:       pos.sym,
    side:      exitSide,
    qty:       pos.qty,
    price:     pos.ltp,
    type:      'Market',
    product:   pos.product,
    time:      new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
    date:      new Date().toLocaleDateString('en-IN'),
    status:    'executed',
    execPrice: pos.ltp,
  });

  openPositions.splice(exitingPosIdx, 1);
  exitingPosIdx = -1;
  saveTradeState();
  closeModalById('exitModal');

  const isProfit = pnl >= 0;
  showToast(`${isProfit?'🟢':'🔴'} ${pos.sym} squared off · ${isProfit?'+':''}₹${pnl.toFixed(2)}`, 3500);

  renderPositions();
  renderOrders();
  renderPnL();
  updatePortfolioSummary();
}

/* ══════════════════════════════════════════
   RENDER ORDERS
══════════════════════════════════════════ */
function renderOrders(){
  const el = document.getElementById('ordersContent');
  if(!el) return;

  const pending   = allOrders.filter(o => o.status === 'pending');
  const executed  = allOrders.filter(o => o.status === 'executed');
  const cancelled = allOrders.filter(o => o.status === 'cancelled');

  let html = `
    <div class="summary-cards">
      <div class="sum-card">
        <span class="sum-card-val">${allOrders.length}</span>
        <span class="sum-card-lbl">Total</span>
      </div>
      <div class="sum-card">
        <span class="sum-card-val" style="color:var(--green)">${executed.length}</span>
        <span class="sum-card-lbl">Executed</span>
      </div>
      <div class="sum-card">
        <span class="sum-card-val" style="color:var(--amber)">${pending.length}</span>
        <span class="sum-card-lbl">Pending</span>
      </div>
    </div>`;

  if(allOrders.length === 0){
    html += `<div class="tl-empty">
      <div class="tl-empty-icon">📋</div>
      <p>No orders yet</p>
      <p class="tl-empty-sub">Place orders from the Watchlist —<br>they'll show up here with full details.</p>
    </div>`;
  } else {
    // Pending orders first
    if(pending.length){
      html += `<div class="sec-head" style="padding:0;margin:4px 0 8px">Pending (${pending.length})</div>`;
      html += `<div style="border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--border);margin-bottom:12px">`;
      html += pending.map((o,i) => orderRow(o, allOrders.indexOf(o))).join('');
      html += '</div>';
    }

    // All orders
    html += `<div class="sec-head" style="padding:0;margin:4px 0 8px">All Orders</div>`;
    html += `<div style="border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--border)">`;
    html += allOrders.map((o,i) => orderRow(o, i)).join('');
    html += '</div>';
  }

  el.innerHTML = html;
}

function orderRow(o, i){
  const isBuy = o.side === 'buy';
  const showCancel = o.status === 'pending';
  return `
  <div class="order-row">
    <div class="order-status-dot ${o.status}"></div>
    <div class="order-info">
      <div class="order-sym-row">
        <span class="order-sym">${o.sym}</span>
        <span class="order-side-badge ${o.side}">${o.side.toUpperCase()}</span>
        <span style="font-size:9.5px;color:var(--text3)">${o.type}</span>
      </div>
      <div class="order-detail-row">
        Qty <span>${o.qty}</span> · 
        ${o.execPrice ? 'Exec @ <span>₹'+o.execPrice+'</span>' : 'Limit @ <span>₹'+o.price+'</span>'}
        · <span>${o.product.includes('Intraday')?'MIS':o.product.includes('Carry')?'CNC':'NRML'}</span>
      </div>
    </div>
    <div class="order-right">
      <span class="order-price">${o.execPrice ? '₹'+o.execPrice : '₹'+o.price}</span>
      <span class="order-time">${o.time}</span>
      <span class="order-status-label ${o.status}">${o.status.charAt(0).toUpperCase()+o.status.slice(1)}</span>
    </div>
    ${showCancel ? `<button class="order-cancel-btn" onclick="cancelOrder(${i})">Cancel</button>` : ''}
  </div>`;
}

function cancelOrder(i){
  allOrders[i].status = 'cancelled';
  saveTradeState();
  renderOrders();
  showToast('Order cancelled');
}

/* ══════════════════════════════════════════
   RENDER P&L
══════════════════════════════════════════ */
function renderPnL(){
  const el = document.getElementById('pnlContent');
  if(!el) return;

  const today = new Date().toLocaleDateString('en-IN');
  const todayTrades  = closedTrades.filter(t => t.date === today);
  const totalRealized   = todayTrades.reduce((s,t) => s+t.pnl, 0);
  const totalUnrealized = openPositions.reduce((s,p) => s+calcPosPnL(p), 0);
  const dayPnl = totalRealized + totalUnrealized;
  const winning = todayTrades.filter(t => t.pnl > 0).length;
  const losing  = todayTrades.filter(t => t.pnl < 0).length;
  const grossProfit = todayTrades.filter(t=>t.pnl>0).reduce((s,t)=>s+t.pnl,0);
  const grossLoss   = Math.abs(todayTrades.filter(t=>t.pnl<0).reduce((s,t)=>s+t.pnl,0));
  const pf = grossLoss > 0 ? (grossProfit/grossLoss).toFixed(2) : '—';
  const winRate = todayTrades.length > 0 ? ((winning/todayTrades.length)*100).toFixed(0) : '—';
  const avgWin  = winning > 0 ? (grossProfit/winning).toFixed(0) : '—';
  const avgLoss = losing  > 0 ? (grossLoss/losing).toFixed(0)  : '—';

  let html = `
    <div class="pnl-hero">
      <div class="pnl-hero-left">
        <div class="pnl-label">Day P&L (Realised + Unrealised)</div>
        <div class="pnl-value ${dayPnl >= 0 ? 'pos' : 'neg'}">
          ${dayPnl >= 0 ? '+' : ''}₹${Math.abs(dayPnl).toLocaleString('en-IN',{maximumFractionDigits:2})}
        </div>
        <div class="pnl-pct ${totalRealized >= 0 ? 'pos' : 'neg'}">Realised: ${totalRealized>=0?'+':''}₹${totalRealized.toFixed(2)} · Unrealised: ${totalUnrealized>=0?'+':''}₹${totalUnrealized.toFixed(2)}</div>
      </div>
    </div>

    <div class="summary-cards">
      <div class="sum-card">
        <span class="sum-card-val" style="color:var(--green)">${winning}</span>
        <span class="sum-card-lbl">Winners</span>
      </div>
      <div class="sum-card">
        <span class="sum-card-val" style="color:var(--red)">${losing}</span>
        <span class="sum-card-lbl">Losers</span>
      </div>
      <div class="sum-card">
        <span class="sum-card-val">${winRate}${winRate!=='—'?'%':''}</span>
        <span class="sum-card-lbl">Win Rate</span>
      </div>
    </div>

    <div class="summary-cards">
      <div class="sum-card">
        <span class="sum-card-val">${pf}</span>
        <span class="sum-card-lbl">Profit Factor</span>
      </div>
      <div class="sum-card">
        <span class="sum-card-val" style="color:var(--green)">${avgWin!=='—'?'₹'+avgWin:'—'}</span>
        <span class="sum-card-lbl">Avg Win</span>
      </div>
      <div class="sum-card">
        <span class="sum-card-val" style="color:var(--red)">${avgLoss!=='—'?'₹'+avgLoss:'—'}</span>
        <span class="sum-card-lbl">Avg Loss</span>
      </div>
    </div>`;

  // Mini equity curve
  if(todayTrades.length > 1){
    const pnls = todayTrades.map(t=>t.pnl).reverse();
    let running = 0;
    const curve = pnls.map(p => { running += p; return running; });
    const minV = Math.min(...curve, 0);
    const maxV = Math.max(...curve, 1);
    const range = maxV - minV || 1;
    const W = 300, H = 80;
    const pts = curve.map((v,i) => {
      const x = (i/(curve.length-1||1))*W;
      const y = H - ((v-minV)/range)*H;
      return `${x},${y}`;
    }).join(' ');
    const lastIsPos = curve[curve.length-1] >= 0;
    html += `
      <div class="pnl-chart-wrap">
        <div class="pnl-chart-title">Equity Curve — Today</div>
        <svg class="pnl-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${lastIsPos?'var(--green)':'var(--red)'}" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="${lastIsPos?'var(--green)':'var(--red)'}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <polygon points="${pts} ${W},${H} 0,${H}" fill="url(#eqGrad)"/>
          <polyline points="${pts}" fill="none" stroke="${lastIsPos?'var(--green)':'var(--red)'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>`;
  }

  // Trade history
  html += `<div class="sec-head" style="padding:0;margin:4px 0 8px">Trade History</div>`;
  if(closedTrades.length === 0){
    html += `<div class="tl-empty">
      <div class="tl-empty-icon">📊</div>
      <p>No closed trades yet</p>
      <p class="tl-empty-sub">Exit positions to see your trade history<br>and performance analytics here.</p>
    </div>`;
  } else {
    html += `<div class="pnl-trade-history">`;
    html += closedTrades.map(t => {
      const isPos = t.pnl >= 0;
      return `<div class="pnl-trade-row">
        <div class="pnl-trade-sym">${t.sym}</div>
        <div class="pnl-trade-detail">
          ${t.side.toUpperCase()} ${t.qty} · Avg ₹${t.entryPrice} → ₹${t.exitPrice}<br>
          <span style="color:var(--text3)">${t.date} ${t.time}</span>
        </div>
        <div class="pnl-trade-pnl ${isPos?'pos':'neg'}">${isPos?'+':''}₹${t.pnl.toFixed(2)}</div>
      </div>`;
    }).join('');
    html += '</div>';
    html += `<button onclick="clearTradeHistory()" style="margin-top:10px;padding:10px;width:100%;border-radius:8px;background:var(--bg3);border:1px solid var(--border);color:var(--text3);font-size:12px;font-weight:600;cursor:pointer;">Clear History</button>`;
  }

  el.innerHTML = html;
}

function clearTradeHistory(){
  if(!confirm('Clear all trade history?')) return;
  closedTrades = [];
  openPositions = [];
  allOrders = [];
  saveTradeState();
  renderPositions();
  renderOrders();
  renderPnL();
  updatePortfolioSummary();
  showToast('History cleared');
}

/* ══════════════════════════════════════════
   PORTFOLIO SUMMARY UPDATE
══════════════════════════════════════════ */
function updatePortfolioSummary(){
  const totalUnreal = openPositions.reduce((s,p) => s+calcPosPnL(p), 0);
  const today = new Date().toLocaleDateString('en-IN');
  const todayReal = closedTrades.filter(t=>t.date===today).reduce((s,t)=>s+t.pnl,0);
  const dayPnl = totalUnreal + todayReal;

  const portPL = document.getElementById('portPL');
  if(portPL){
    portPL.textContent = (dayPnl>=0?'+':'') + '₹' + Math.abs(dayPnl).toLocaleString('en-IN',{maximumFractionDigits:0});
    portPL.className = 'port-val ' + (dayPnl>=0?'pos':'neg');
  }
  const portCount = document.getElementById('portCount');
  if(portCount) portCount.textContent = openPositions.length;
}

function updatePositionLTPs(){
  openPositions.forEach(pos => {
    const wl = watchlist.find(w => w.sym === pos.sym);
    if(wl) pos.ltp = Number(wl.price);
    else {
      const tick = (Math.random() - 0.48) * pos.avgPrice * 0.0015;
      pos.ltp = roundPrice((Number(pos.ltp) || pos.avgPrice) + tick);
    }
  });
  maybeExecutePendingOrders();
  evaluateProtectedPositions();
  saveTradeState();
  if(currentTab === 'tradelab'){
    if(currentTradeLabView === 'positions') renderPositions();
    if(currentTradeLabView === 'orders') renderOrders();
    if(currentTradeLabView === 'pnl') renderPnL();
  }
  updatePortfolioSummary();
}
function renderPositions(){
  const el = document.getElementById('positionsContent');
  if(!el) return;
  const totalUnrealPnl = openPositions.reduce((sum, pos)=>sum + calcPosPnL(pos), 0);
  const totalRealPnl = closedTrades.filter(trade => trade.date === new Date().toLocaleDateString('en-IN')).reduce((sum, trade)=>sum + trade.pnl, 0);
  const dayPnl = totalUnrealPnl + totalRealPnl;
  let html = `
    <div class="pnl-hero">
      <div class="pnl-hero-left">
        <div class="pnl-label">Unrealised P&L</div>
        <div class="pnl-value ${totalUnrealPnl >= 0 ? 'pos' : 'neg'}">
          ${totalUnrealPnl >= 0 ? '+' : '-'}${formatINR(Math.abs(totalUnrealPnl))}
        </div>
        <div class="pnl-pct ${totalUnrealPnl >= 0 ? 'pos' : 'neg'}">Day P&L incl. realised: ${dayPnl >= 0 ? '+' : '-'}${formatINR(Math.abs(dayPnl))}</div>
      </div>
      <div class="pnl-stats-row">
        <div class="pnl-stat"><span class="pnl-stat-val">${openPositions.length}</span><span class="pnl-stat-lbl">Open</span></div>
        <div class="pnl-stat"><span class="pnl-stat-val">${closedTrades.filter(t=>t.date===new Date().toLocaleDateString('en-IN')).length}</span><span class="pnl-stat-lbl">Closed Today</span></div>
      </div>
    </div>`;
  if(!openPositions.length){
    html += `<div class="tl-empty"><div class="tl-empty-icon">📭</div><p>No open positions</p><p class="tl-empty-sub">Place orders from the Watchlist tab<br>to see your positions here.</p></div>`;
  } else {
    const maxBar = Math.max(...openPositions.map(pos=>Math.abs(calcPosPnLPct(pos))), 1);
    html += openPositions.map((pos, i)=>{
      const pnl = calcPosPnL(pos);
      const pnlPct = calcPosPnLPct(pos);
      const isPos = pnl >= 0;
      const barW = Math.min(100, Math.abs(pnlPct) / maxBar * 100);
      return `
        <div class="pos-card">
          <div class="pos-card-head" onclick="togglePosCard(${i})">
            <div>
              <div class="pos-sym">${pos.sym}</div>
              <div style="display:flex;align-items:center;gap:5px;margin-top:3px">
                <span class="pos-type-badge ${pos.side}">${pos.side.toUpperCase()}</span>
                <span class="pos-product">${pos.product.includes('Intraday')?'MIS':pos.product.includes('Carry')?'CNC':pos.product}</span>
              </div>
            </div>
            <div class="pos-pnl-block">
              <div class="pos-pnl ${isPos?'pos':'neg'}">${isPos?'+':'-'}${formatINR(Math.abs(pnl))}</div>
              <span class="pos-pnl-pct ${isPos?'pos':'neg'}">${isPos?'+':''}${pnlPct}%</span>
            </div>
          </div>
          <div class="pos-pnl-bar"><div class="pos-pnl-fill ${isPos?'pos':'neg'}" style="width:${barW}%"></div></div>
          <div class="pos-card-body" id="posBody${i}">
            <div class="pos-detail"><span class="pos-detail-label">Qty</span><span class="pos-detail-val">${pos.qty}</span></div>
            <div class="pos-detail"><span class="pos-detail-label">Avg Price</span><span class="pos-detail-val">${formatINR(pos.avgPrice)}</span></div>
            <div class="pos-detail"><span class="pos-detail-label">LTP</span><span class="pos-detail-val" style="color:${isPos?'var(--green)':'var(--red)'}">${formatINR(pos.ltp)}</span></div>
            <div class="pos-detail"><span class="pos-detail-label">Value</span><span class="pos-detail-val">${formatINR(pos.ltp * pos.qty, 0)}</span></div>
            ${pos.stopLossPrice ? `<div class="pos-detail"><span class="pos-detail-label">Stop Loss</span><span class="pos-detail-val" style="color:var(--red)">${formatINR(pos.stopLossPrice)}</span></div>` : ''}
            ${pos.targetPrice ? `<div class="pos-detail"><span class="pos-detail-label">Target</span><span class="pos-detail-val" style="color:var(--green)">${formatINR(pos.targetPrice)}</span></div>` : ''}
          </div>
          <div class="pos-actions">
            <button class="pos-action-btn exit-btn" onclick="openExitModal(${i})">Exit Position</button>
            <button class="pos-action-btn add-btn-pos" onclick="openOrderModalSide('${pos.sym}',${pos.ltp},'${pos.side}')">Add</button>
            <button class="pos-action-btn sl-btn" onclick="setPositionStop(${i})">${pos.stopLossPrice ? 'Edit SL' : 'Set SL'}</button>
          </div>
        </div>`;
    }).join('');
  }
  const todayClosed = closedTrades.filter(trade => trade.date === new Date().toLocaleDateString('en-IN'));
  if(todayClosed.length){
    html += `<div class="sec-head" style="padding:0;margin:16px 0 10px">Closed Today</div>`;
    html += `<div style="border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--border)">`;
    html += todayClosed.map(trade=>{
      const isPos = trade.pnl >= 0;
      return `<div class="pnl-trade-row">
        <div class="pnl-trade-sym">${trade.sym}</div>
        <div class="pnl-trade-detail">${trade.side.toUpperCase()} ${trade.qty} · Avg ${formatINR(trade.entryPrice)} → ${formatINR(trade.exitPrice)}</div>
        <div class="pnl-trade-pnl ${isPos?'pos':'neg'}">${isPos?'+':'-'}${formatINR(Math.abs(trade.pnl))}</div>
      </div>`;
    }).join('');
    html += `</div>`;
  }
  el.innerHTML = html;
}
function confirmExit(){
  if(exitingPosIdx < 0) return;
  const result = closePositionAtIndex(exitingPosIdx, openPositions[exitingPosIdx]?.ltp, 'Manual Exit');
  exitingPosIdx = -1;
  saveTradeState();
  closeModalById('exitModal');
  if(result){
    const isProfit = result.pnl >= 0;
    showToast(`${result.pos.sym} squared off · ${isProfit?'+':'-'}${formatINR(Math.abs(result.pnl))}`, 3500);
  }
  renderPositions();
  renderOrders();
  renderPnL();
  updatePortfolioSummary();
}
function orderRow(o, i){
  const showCancel = o.status === 'pending';
  const productLabel = o.product.includes('Intraday') ? 'MIS' : o.product.includes('Carry') ? 'CNC' : o.product;
  return `
    <div class="order-row">
      <div class="order-status-dot ${o.status}"></div>
      <div class="order-info">
        <div class="order-sym-row">
          <span class="order-sym">${o.sym}</span>
          <span class="order-side-badge ${o.side}">${o.side.toUpperCase()}</span>
          <span style="font-size:9.5px;color:var(--text3)">${o.variant && o.variant!=='Regular' ? `${o.variant} · ` : ''}${o.type}</span>
        </div>
        <div class="order-detail-row">
          Qty <span>${o.qty}</span> · ${o.execPrice ? 'Exec @ <span>'+formatINR(o.execPrice)+'</span>' : 'Price @ <span>'+formatINR(o.price)+'</span>'}
          ${o.triggerPrice ? '· Trig <span>'+formatINR(o.triggerPrice)+'</span>' : ''}
          ${o.targetPrice ? '· Tgt <span>'+formatINR(o.targetPrice)+'</span>' : ''}
          · <span>${productLabel}</span>
        </div>
      </div>
      <div class="order-right">
        <span class="order-price">${o.execPrice ? formatINR(o.execPrice) : formatINR(o.price)}</span>
        <span class="order-time">${o.time}</span>
        <span class="order-status-label ${o.status}">${o.status.charAt(0).toUpperCase()+o.status.slice(1)}</span>
      </div>
      ${showCancel ? `<button class="order-cancel-btn" onclick="cancelOrder(${i})">Cancel</button>` : ''}
    </div>`;
}
function updatePortfolioSummary(){
  const totalUnreal = openPositions.reduce((sum, pos) => sum + calcPosPnL(pos), 0);
  const today = new Date().toLocaleDateString('en-IN');
  const todayReal = closedTrades.filter(trade=>trade.date===today).reduce((sum, trade)=>sum + trade.pnl, 0);
  const dayPnl = totalUnreal + todayReal;
  const liveValue = openPositions.reduce((sum, pos)=>sum + ((Number(pos.ltp) || 0) * (Number(pos.qty) || 0)), 0);
  const portPL = document.getElementById('portPL');
  if(portPL){
    portPL.textContent = (dayPnl>=0?'+':'-') + formatINR(Math.abs(dayPnl), 0);
    portPL.className = 'port-val ' + (dayPnl>=0?'pos':'neg');
  }
  const portCount = document.getElementById('portCount');
  if(portCount) portCount.textContent = openPositions.length;
  const portValue = document.getElementById('portValue');
  if(portValue) portValue.textContent = liveValue ? formatINR(liveValue, 0) : '₹0';
}

/* ══════════════════════════════════════════
   POSITION CALCULATOR
══════════════════════════════════════════ */
function setCalcMode(el, mode){
  calcMode = mode;
  document.querySelectorAll('.calc-mode-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  // Show/hide relevant fields
  const isFutures = mode==='indian_futures';
  const isOptions = mode==='options';
  document.getElementById('cLotSizeWrap').style.display = (isFutures||isOptions)?'block':'none';
  document.getElementById('cMarginWrap').style.display = isFutures?'block':'none';
}

function runCalc(){
  const capital = parseFloat(document.getElementById('cCapital').value)||0;
  const riskPct = parseFloat(document.getElementById('cRisk').value)||1;
  const entry = parseFloat(document.getElementById('cEntry').value)||0;
  const sl = parseFloat(document.getElementById('cSL').value)||0;
  const target = parseFloat(document.getElementById('cTarget').value)||0;
  const lotSize = parseFloat(document.getElementById('cLotSize').value)||50;
  const margin = parseFloat(document.getElementById('cMargin').value)||0;
  const brokerage = parseFloat(document.getElementById('cBrokerage').value)||0;

  if(!entry||!sl){ showToast('Enter entry and stop loss prices'); return; }

  const riskAmt = (capital*riskPct)/100;
  const riskPerUnit = Math.abs(entry-sl);
  if(riskPerUnit===0){ showToast('Entry and stop loss cannot be equal'); return; }

  let size, capitalUsed, maxLoss, reward, rr;

  if(calcMode==='indian_futures'||calcMode==='options'){
    const rawLots = riskAmt/(riskPerUnit*lotSize);
    size = Math.max(0,Math.floor(rawLots));
    capitalUsed = size*(margin||entry*lotSize*0.15);
    maxLoss = size*riskPerUnit*lotSize + brokerage;
    reward = target?size*(target-entry)*lotSize:0;
    rr = reward/maxLoss;
  } else {
    size = Math.floor(riskAmt/riskPerUnit);
    capitalUsed = size*entry;
    maxLoss = size*riskPerUnit+brokerage;
    reward = target?size*(target-entry):0;
    rr = reward/maxLoss;
  }

  const isBuy = entry>sl;
  const warnings = [];
  if(capitalUsed>capital*0.3) warnings.push('Capital usage exceeds 30% of account — high concentration risk.');
  if(rr<1.5&&target) warnings.push('Risk:Reward below 1.5. Consider widening target or tightening stop.');
  if(size===0) warnings.push('Position size = 0. Risk cap hit before execution — increase capital or reduce risk.');

  document.getElementById('calcResultsSection').style.display='block';
  document.getElementById('calcSummarySection').style.display='block';
  document.getElementById('rRiskAmt').textContent = '₹'+riskAmt.toLocaleString('en-IN',{maximumFractionDigits:0});
  document.getElementById('rRiskUnit').textContent = '₹'+riskPerUnit.toFixed(2);
  document.getElementById('rLots').textContent = size+(calcMode==='indian_futures'||calcMode==='options'?' lots':' qty');
  document.getElementById('rCapital').textContent = '₹'+capitalUsed.toLocaleString('en-IN',{maximumFractionDigits:0});
  document.getElementById('rMaxLoss').textContent = '₹'+maxLoss.toLocaleString('en-IN',{maximumFractionDigits:0});
  document.getElementById('rReward').textContent = target?'₹'+reward.toLocaleString('en-IN',{maximumFractionDigits:0}):'—';
  document.getElementById('rRR').textContent = target?rr.toFixed(2)+':1':'—';
  document.getElementById('rCapPct').textContent = ((capitalUsed/capital)*100).toFixed(1)+'%';
  document.getElementById('calcFormula').innerHTML = `<strong>Formula (${calcMode}):</strong><br>Risk Amount = ₹${capital.toLocaleString('en-IN')} × ${riskPct}% = ₹${riskAmt.toFixed(0)}<br>Risk/Unit = |${entry} − ${sl}| = ₹${riskPerUnit}<br>${calcMode.includes('futures')?`Lots = ₹${riskAmt.toFixed(0)} ÷ (₹${riskPerUnit} × ${lotSize}) = ${size} lots`:`Qty = ₹${riskAmt.toFixed(0)} ÷ ₹${riskPerUnit} = ${size} shares`}`;

  const warnEl = document.getElementById('calcWarn');
  if(warnings.length){ warnEl.style.display='block'; warnEl.textContent='⚠ '+warnings.join(' | '); }
  else { warnEl.style.display='none'; }

  const summaryLines = [
    `MODE: ${calcMode.toUpperCase().replace('_',' ')}`,
    `DATE: ${new Date().toLocaleDateString('en-IN')}`,
    ``,
    `CAPITAL: ₹${capital.toLocaleString('en-IN')}`,
    `RISK: ${riskPct}% = ₹${riskAmt.toFixed(0)}`,
    ``,
    `ENTRY: ₹${entry}`,
    `STOP LOSS: ₹${sl} (₹${riskPerUnit}/unit)`,
    `TARGET: ${target?'₹'+target:'Not set'}`,
    ``,
    `POSITION: ${size}${calcMode.includes('futures')||calcMode==='options'?' lots':'  qty'}`,
    `CAPITAL USED: ₹${capitalUsed.toLocaleString('en-IN',{maximumFractionDigits:0})} (${((capitalUsed/capital)*100).toFixed(1)}%)`,
    `MAX LOSS @ SL: ₹${maxLoss.toLocaleString('en-IN',{maximumFractionDigits:0})}`,
    target?`POTENTIAL REWARD: ₹${reward.toLocaleString('en-IN',{maximumFractionDigits:0})}`:'',
    target?`RISK:REWARD = ${rr.toFixed(2)}:1`:'',
    ``,
    warnings.length?`⚠ WARNINGS:\n${warnings.map(w=>'• '+w).join('\n')}`:'✓ No warnings',
    ``,
    `Generated by WizardPRO — Not financial advice.`,
  ].filter(l=>l!==undefined).join('\n');
  document.getElementById('calcSummaryText').value = summaryLines;
}

function copySummary(){
  const txt = document.getElementById('calcSummaryText').value;
  navigator.clipboard.writeText(txt).then(()=>showToast('Copied to clipboard ✓')).catch(()=>showToast('Select text and copy manually'));
}

/* ══════════════════════════════════════════
   TRADELAB TABS
══════════════════════════════════════════ */
function switchTLTab(el, view){
  currentTradeLabView = view;
  document.querySelectorAll('.tl-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tl-view').forEach(v=>v.classList.remove('active'));
  if(el) el.classList.add('active');
  const calcBtn = document.getElementById('calcLaunchBtn');
  if(calcBtn) calcBtn.classList.toggle('is-active', view === 'calc');
  document.getElementById('tl-'+view).classList.add('active');
  if(view === 'positions') renderPositions();
  if(view === 'orders')    renderOrders();
  if(view === 'pnl')       renderPnL();
  if(el) scrollChipIntoView(el);
  requestAnimationFrame(()=>{ if(window.segRefresh) window.segRefresh('seg-tradelab'); });
}

/* ══════════════════════════════════════════
   NEWS
══════════════════════════════════════════ */
const NEWS_DATA = [
  {cat:'india',icon:'🇮🇳',headline:'India-US Tariff Pause Extended for 90 Days',source:'Economic Times',time:'08:12 IST',tickers:['NIFTYIT','INFY','TCS'],summary:'The 90-day pause on India-US tariffs remains intact, benefiting Indian IT exports, pharma manufacturers, and textile exporters. FPI risk substantially reduced in the near term.'},
  {cat:'global',icon:'🌐',headline:'US Fed Signals No Rate Cut Before September 2026',source:'Reuters',time:'06:44 IST',tickers:['USDINR'],summary:'Federal Reserve officials indicated rates will remain elevated until there is sustained evidence of 2% inflation. Higher-for-longer stance could impact FII equity flows to India.'},
  {cat:'corporate',icon:'📈',headline:'TCS Q4 Results: Revenue Up 5.8% YoY, Beats Estimates',source:'Moneycontrol',time:'07:30 IST',tickers:['TCS','INFY','WIPRO'],summary:'Tata Consultancy Services posted revenue growth of 5.8% year-on-year, beating analyst estimates of 4.2%. Management guided for continued demand in BFSI and retail verticals.'},
  {cat:'india',icon:'🛢️',headline:'Crude Oil Falls Below $62 — Lowest in 4 Months',source:'Business Standard',time:'07:58 IST',tickers:['BPCL','IOC','HPCL'],summary:'WTI crude dropped below $62 per barrel amid weak global demand expectations. Indian OMC stocks (BPCL, IOC, HPCL) are expected to rally sharply at open. Lower crude also supports RBI\'s inflation trajectory.'},
  {cat:'macro',icon:'📊',headline:'India Manufacturing PMI Rises to 58.2 — 14-Month High',source:'Mint',time:'06:20 IST',tickers:['NIFTY'],summary:'April Manufacturing PMI of 58.2 signals robust domestic demand, well above the expansion threshold of 50. Capital goods and auto sectors are direct beneficiaries of the strong reading.'},
  {cat:'india',icon:'⚠️',headline:'India-Pakistan Tensions: Market Volatility Risk Elevated',source:'NDTV Profit',time:'08:30 IST',tickers:['HAL','BEL','BHARTFORGE'],summary:'Geopolitical tensions between India and Pakistan have elevated near-term market volatility. Defence sector stocks are seeing heightened activity. Analysts suggest cautious position sizing.'},
  {cat:'corporate',icon:'🏦',headline:'HDFC Bank Q4 PAT Up 6.7% — Inline with Estimates',source:'Moneycontrol',time:'05:45 IST',tickers:['HDFCBANK','NIFTYBANK'],summary:'HDFC Bank reported Q4 profit after tax growth of 6.7%, broadly in line with consensus. Net interest margins remained stable at 3.4%. Credit costs were slightly elevated due to seasonal factors.'},
  {cat:'global',icon:'🤖',headline:'AI Capex Boom: Nvidia Revenue Guidance Raised to $45B',source:'Bloomberg',time:'04:30 IST',tickers:['NIFTYIT','INFY'],summary:'Nvidia raised its revenue guidance for Q2 to $45 billion, citing unprecedented demand for AI infrastructure. Positive read-through for Indian IT companies with cloud and AI practice areas.'},
];
for(let i=1;i<=30;i++){
  NEWS_DATA.push({
    cat: i%4===0?'global':i%4===1?'india':i%4===2?'corporate':'macro',
    icon: i%4===0?'🌐':i%4===1?'🇮🇳':i%4===2?'🏢':'📊',
    headline:`Live Market Update ${i}: Key development impacting Indian equities`,
    source: i%3===0?'Reuters':i%3===1?'Economic Times':'Business Standard',
    time:`${String((i%12)+1).padStart(2,'0')}:${String((i*3)%60).padStart(2,'0')} IST`,
    tickers: i%2===0?['NIFTY','BANKNIFTY','USDINR']:['RELIANCE','HDFCBANK','TCS'],
    summary:`Auto-generated premium feed item ${i}. Includes macro cue, sector impact, and probable near-term effect on benchmark indices with risk context.`
  });
}
let newsPage = 0;
let activeNewsFilter = 'all';

function renderNews(reset=false){
  if(reset){ newsPage=0; document.getElementById('newsFeed').innerHTML=''; }
  const feed = document.getElementById('newsFeed');
  const filtered = activeNewsFilter==='all'?NEWS_DATA:NEWS_DATA.filter(n=>n.cat===activeNewsFilter);
  const start = newsPage*4, end = start+4;
  const items = filtered.slice(start,end);
  if(!items.length){ showToast('No more news'); return; }
  feed.innerHTML += items.map(n=>`
    <div class="news-card" onclick="showToast('Full article: ${n.source}')">
      <div class="nc-top">
        <div class="nc-icon">${n.icon}</div>
        <div class="nc-headline">${n.headline}</div>
      </div>
      <div class="nc-tickers">${n.tickers.map(t=>`<span class="nc-ticker">${t}</span>`).join('')}</div>
      <div class="nc-summary">${n.summary}</div>
      <div class="nc-source-row">
        <span class="nc-source">${n.source}</span>
        <span class="nc-time">${n.time}</span>
      </div>
    </div>`).join('');
  newsPage++;
}

function filterNews(el, filter){
  document.querySelectorAll('#newsFilterBar .filter-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  activeNewsFilter=filter;
  renderNews(true);
  scrollChipIntoView(el);
}

function loadMoreNews(){ renderNews(); }

/* ══════════════════════════════════════════
   DAILY ANALYSIS TOOL
══════════════════════════════════════════ */
let dailyRoute='intraday', dailyTab='t1';
function renderDailyAnalysisTool(){
  const root = document.getElementById('dailyAnalysisRoot');
  if(!root) return;
  const tabNames = dailyRoute==='intraday'
    ? ['Opening Brief','Levels','Technicals','F&O Pulse','Commodities','News (8)','Verdict']
    : dailyRoute==='swing'
    ? ['Weekly Trend','Global','Sectors','FII/DII','Top Movers','IPO/Actions','Commodities','Verdict']
    : ['Opening','Levels','Technicals','F&O','Weekly','Flows','Calendar','Verdict'];
  const tabBtns = tabNames.map((n,idx)=>`<div class="rpt-tab ${dailyTab===('t'+(idx+1))?'active':''}" onclick="setDailyTab('t${idx+1}')">${n}</div>`).join('');
  root.innerHTML = `
    <div style="padding:12px">
      <div class="context-box">Good morning. What kind of trader are you today? <strong>A) Intraday B) Swing C) Full Report</strong></div>
      <div class="report-pane-tabs" style="margin-top:8px">
        <div class="rpt-tab ${dailyRoute==='intraday'?'active':''}" onclick="setDailyRoute('intraday')">A Intraday</div>
        <div class="rpt-tab ${dailyRoute==='swing'?'active':''}" onclick="setDailyRoute('swing')">B Swing</div>
        <div class="rpt-tab ${dailyRoute==='full'?'active':''}" onclick="setDailyRoute('full')">C Full Report</div>
      </div>
      <div class="report-pane-tabs">${tabBtns}</div>
      <div class="news-item">
        <div class="news-what">[Live] Data Routing Priority: NSE > BSE > Google Finance</div>
        <div class="news-impact">Freshness tags are shown as [Live] or [Prev Close]. Sources are cited per block.</div>
      </div>
      ${dailyTabContent()}
    </div>`;
}
function setDailyRoute(route){ dailyRoute=route; dailyTab='t1'; renderDailyAnalysisTool(); }
function setDailyTab(tab){ dailyTab=tab; renderDailyAnalysisTool(); }
function dailyTabContent(){
  const blocks = {
    t1:`<div class="sec-head">Opening Brief</div><div class="context-box">GIFT Nifty [Live]: +42 | Nifty/Sensex/BankNifty opening map [Prev Close] with India VIX mood neutral-greed. Source: <a href="https://www.nseindia.com" target="_blank">NSE</a>.</div>`,
    t2:`<div class="sec-head">Levels</div><div class="context-box">OHLC + Pivot ladder R1/R2/S1/S2 and A/D ratio [Live]. Source: <a href="https://www.bseindia.com" target="_blank">BSE</a>.</div>`,
    t3:`<div class="sec-head">Technicals</div><div class="context-box">DMA, RSI, MACD snapshot [Prev Close] for Nifty and BankNifty. Source: <a href="https://www.google.com/finance" target="_blank">Google Finance</a>.</div>`,
    t4:`<div class="sec-head">F&O Pulse</div><div class="context-box">PCR, Max Pain, top CE/PE OI [Live]. Source: <a href="https://www.nseindia.com/option-chain" target="_blank">NSE Option Chain</a>.</div>`,
    t5:`<div class="sec-head">Commodities / Weekly</div><div class="context-box">USDINR, Brent, Gold/Silver MCX + weekly trend overlays [Live]. Source: <a href="https://www.nseindia.com" target="_blank">NSE</a>.</div>`,
    t6:`<div class="sec-head">High-Impact News (Exactly 8)</div><div class="news-list">${[
      ['DOMESTIC','Reuters','https://www.reuters.com/world/india/'],
      ['DOMESTIC','Economic Times','https://economictimes.indiatimes.com/markets'],
      ['GLOBAL','Reuters','https://www.reuters.com/markets/'],
      ['GLOBAL','Bloomberg','https://www.bloomberg.com/markets'],
      ['DOMESTIC','Business Standard','https://www.business-standard.com/markets'],
      ['GLOBAL','CNBC','https://www.cnbc.com/markets/'],
      ['DOMESTIC','Moneycontrol','https://www.moneycontrol.com/news/business/markets/'],
      ['GLOBAL','Financial Times','https://www.ft.com/markets']
    ].map((n,i)=>`<div class="news-item"><div class="news-what">[${n[0]}] Impact item ${i+1}</div><div class="news-impact"><a href="${n[2]}" target="_blank">${n[1]} URL</a></div></div>`).join('')}</div>`,
    t7:`<div class="sec-head">Verdict</div><div class="verdict-hero"><div class="verdict-title">${dailyRoute==='swing'?'Weekly Swing Bias':'Opening Bias'}: Constructive with event-risk controls</div><div class="verdict-sub">Critical level map + confidence score: <strong>78/100</strong>.</div></div>`,
    t8:`<div class="sec-head">Earnings Calendar</div><div class="context-box">Upcoming earnings and event calendar integrated for full report route.</div>`
  };
  if(dailyRoute==='full' && dailyTab==='t8') return blocks.t8 + blocks.t7;
  if(dailyRoute==='full' && dailyTab==='t7') return blocks.t8 + blocks.t7;
  return blocks[dailyTab] || blocks.t1;
}

// Fetch live news from Finnhub
async function fetchLiveNews(){
  try {
    const r = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_KEY}`);
    const data = await r.json();
    if(!data||!data.length) return;
    const feed = document.getElementById('newsFeed');
    const liveItems = data.slice(0,3).map(n=>`
      <div class="news-card" onclick="window.open('${n.url}','_blank')">
        <div class="nc-top">
          <div class="nc-icon">📡</div>
          <div class="nc-headline">${n.headline}</div>
        </div>
        <div class="nc-summary">${n.summary?.slice(0,120)||''}...</div>
        <div class="nc-source-row">
          <span class="nc-source" style="color:var(--green)">🔴 LIVE · ${n.source}</span>
          <span class="nc-time">${new Date(n.datetime*1000).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})} IST</span>
        </div>
      </div>`).join('');
    feed.innerHTML = liveItems + feed.innerHTML;
    document.getElementById('newsBadge').style.display='block';
    setTimeout(()=>document.getElementById('newsBadge').style.display='none',30000);
  } catch(e){ /* Silently fail */ }
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   CALCULATOR SAMPLE DATA & RESET
══════════════════════════════════════════ */
function loadSampleData(){
  const samples = {
    indian_futures: {entry:24150, sl:23950, target:24550, capital:500000, risk:1, lotSize:50, margin:65000, brokerage:40},
    indian_cash:    {entry:2920, sl:2870, target:3050, capital:200000, risk:1.5, lotSize:1, margin:0, brokerage:20},
    options:        {entry:180, sl:100, target:320, capital:300000, risk:1, lotSize:50, margin:0, brokerage:20},
    forex:          {entry:84.20, sl:84.50, target:83.40, capital:100000, risk:1, lotSize:1, margin:0, brokerage:5},
  };
  const s = samples[calcMode]||samples.indian_futures;
  document.getElementById('cEntry').value = s.entry;
  document.getElementById('cSL').value = s.sl;
  document.getElementById('cTarget').value = s.target;
  document.getElementById('cCapital').value = s.capital;
  document.getElementById('cRisk').value = s.risk;
  document.getElementById('cLotSize').value = s.lotSize;
  document.getElementById('cMargin').value = s.margin;
  document.getElementById('cBrokerage').value = s.brokerage;
  showToast('Sample data loaded');
}

function resetCalc(){
  ['cEntry','cSL','cTarget'].forEach(id=>{document.getElementById(id).value='';});
  document.getElementById('cCapital').value=500000;
  document.getElementById('cRisk').value=1;
  document.getElementById('cLotSize').value=50;
  document.getElementById('cMargin').value=65000;
  document.getElementById('cBrokerage').value=0;
  document.getElementById('calcResultsSection').style.display='none';
  document.getElementById('calcSummarySection').style.display='none';
  showToast('Calculator reset');
}

function init(){
  // Restore saved state
  const savedUser = localStorage.getItem('wp_user');
  const defaultThemePref = localStorage.getItem('wp_default_theme') || 'light';
  const savedTheme = localStorage.getItem('wp_theme');
  const bootTheme = savedTheme || getEffectiveTheme(defaultThemePref);
  applyTheme(bootTheme);
  const defaultSel = document.getElementById('defaultThemeSelect');
  if(defaultSel) defaultSel.value = defaultThemePref;
  if(savedUser){
    currentUser = normalizeUser(JSON.parse(savedUser));
    document.getElementById('authOverlay')?.classList.add('hidden');
    updateProfileUI();
    seedSocialData();
  } else {
    showLandingExperience();
    return;
  }
  const journalDate = document.getElementById('journalDate');
  if(journalDate) journalDate.value = new Date().toISOString().slice(0,10);
  persistWatchlists();
  // Render community
  renderPosts();
  // Render watchlist
  renderWatchlistPicker();
  renderWatchlist();
  // Render news
  renderNews();
  // Init report content
  renderReport();
  const activeFundTab = document.querySelector('.fund-tool-tab.active');
  if(activeFundTab) switchFundTab(activeFundTab, 'overview');
  const activeTlTab = document.querySelector('.tradelab-tabs .tl-tab.active');
  if(activeTlTab) switchTLTab(activeTlTab, 'watchlist');
  setupSwipeControl();
  initSwipeNavigation();
  // Fetch live market data (includes Indian indices via Yahoo Finance)
  loadMarketData();
  loadIndianIndices();
  // Try live news
  setTimeout(fetchLiveNews, 2000);
  setInterval(fetchLiveNews, 120000);
  setInterval(loadMarketData, 60000);
  // Set default calc mode display
  document.getElementById('cLotSizeWrap').style.display='block';
  document.getElementById('cMarginWrap').style.display='block';
  updatePortfolioSummary();
  updateTopbarContext(currentTab);
  maybeExecutePendingOrders();
}

function switchTLTabByName(name){
  const target = document.getElementById('tl-'+name);
  if(!target) return;
  const btn = [...document.querySelectorAll('.tradelab-tabs .tl-tab')].find(el=>el.getAttribute('onclick')===`switchTLTab(this,'${name}')`);
  currentTradeLabView = name;
  document.querySelectorAll('.tl-tab').forEach(tab=>tab.classList.remove('active'));
  document.querySelectorAll('.tl-view').forEach(view=>view.classList.remove('active'));
  if(btn) btn.classList.add('active');
  target.classList.add('active');
  const calcBtn = document.getElementById('calcLaunchBtn');
  if(calcBtn) calcBtn.classList.toggle('is-active', name === 'calc');
  if(name === 'positions') renderPositions();
  if(name === 'orders') renderOrders();
  if(name === 'pnl') renderPnL();
  if(btn) scrollChipIntoView(btn);
}

window.__wizardProInit = init;

// Close dropdowns on outside click
document.addEventListener('click', (e)=>{
  if(!e.target.closest('#mortyInput')&&!e.target.closest('.morty-search-btn')){
    document.getElementById('mortyDropdown').classList.remove('show');
  }
  if(!e.target.closest('#addStockSearch')&&!e.target.closest('.watchlist-menu-btn')&&!e.target.closest('.watchlist-menu-item')&&addStockVisible){
    addStockVisible=false;
    document.getElementById('addStockSearch').classList.remove('show');
  }
  if(!e.target.closest('.watchlist-toolbar') && watchlistMenuVisible){
    closeWatchlistMenu();
  }
});

/* ══════════════════════════════════════════
   YAHOO FINANCE — Indian Indices
══════════════════════════════════════════ */
async function fetchYahooQuote(sym){
  try{
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`);
    const d = await r.json();
    if(d?.chart?.result?.[0]){
      const m = d.chart.result[0].meta;
      return { price: m.regularMarketPrice, prev: m.chartPreviousClose||m.previousClose };
    }
  } catch(e){}
  return null;
}

async function loadIndianIndices(){
  const pairs = [
    {valId:'niftyVal',chgId:'niftyChg',sym:'^NSEI'},
    {valId:'sensexVal',chgId:'sensexChg',sym:'^BSESN'},
    {valId:'bankNiftyVal',chgId:'bankNiftyChg',sym:'^NSEBANK'},
  ];
  for(const p of pairs){
    const d = await fetchYahooQuote(p.sym);
    if(d){
      const chg = d.price - d.prev;
      const chgPct = ((chg/d.prev)*100).toFixed(2);
      const el = document.getElementById(p.valId);
      const chgEl = document.getElementById(p.chgId);
      if(el) el.textContent = d.price.toLocaleString('en-IN',{maximumFractionDigits:0});
      if(chgEl){
        chgEl.textContent = (chg>=0?'+':'')+chgPct+'%';
        chgEl.className = 'mkt-card__chg '+(chg>=0?'pos':'neg');
      }
    }
  }
}

/* ══════════════════════════════════════════
   LIVE WATCHLIST PRICE ANIMATION
══════════════════════════════════════════ */
function animatePriceChange(el, newPrice, oldPrice){
  el.style.transition='color 0.4s ease';
  el.style.color = newPrice>oldPrice?'var(--green)':newPrice<oldPrice?'var(--red)':'';
  setTimeout(()=>{ el.style.color=''; el.style.transition=''; }, 1200);
}

async function refreshWatchlistPrices(){
  // Simulate live ticks with small random changes
  watchlist = watchlist.map(s=>{
    const tick = (Math.random()-0.48)*s.price*0.0012;
    const newPrice = parseFloat((s.price+tick).toFixed(2));
    const chgPct = ((newPrice-s.price)/s.price*100);
    return {...s, price:newPrice, chg:(chgPct>=0?'+':'')+chgPct.toFixed(2)+'%', up:chgPct>=0};
  });
  if(currentTab==='tradelab'){
    const items = document.querySelectorAll('.wl-item');
    items.forEach((item,i)=>{
      if(watchlist[i]){
        const priceEl = item.querySelector('.wl-price');
        const chgEl = item.querySelector('.wl-chg');
        if(priceEl){
          const old = parseFloat(priceEl.textContent.replace(/[₹,]/g,''));
          priceEl.textContent = '₹'+watchlist[i].price.toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:2});
          if(Math.abs(watchlist[i].price-old)>0.01) animatePriceChange(priceEl, watchlist[i].price, old);
        }
        if(chgEl){
          chgEl.textContent = watchlist[i].chg;
          chgEl.className = 'wl-chg '+(watchlist[i].up?'pos':'neg');
        }
      }
    });
  }
}

/* ══════════════════════════════════════════
   LIVE TICKER SCROLLBAR (topbar)
══════════════════════════════════════════ */
function createLiveTicker(){
  const tickers = [
    {sym:'NIFTY 50', val:'24,168', chg:'+0.44%', up:true},
    {sym:'SENSEX', val:'79,442', chg:'+0.38%', up:true},
    {sym:'BANK NIFTY', val:'49,380', chg:'+0.28%', up:true},
    {sym:'NIFTY IT', val:'34,820', chg:'+1.82%', up:true},
    {sym:'INDIA VIX', val:'13.42', chg:'-5.76%', up:false},
    {sym:'USD/INR', val:'84.12', chg:'-0.08%', up:false},
    {sym:'GOLD MCX', val:'₹94,280', chg:'+0.38%', up:true},
    {sym:'CRUDE MCX', val:'₹5,142', chg:'-1.24%', up:false},
  ];
  // Already have topbar — ticker displayed via market pill, skip standalone
}

/* ══════════════════════════════════════════
   EXTENDED INIT
══════════════════════════════════════════ */
// Indian indices - also called inside loadMarketData on each refresh

// Watchlist live simulation + position LTP updates
setInterval(()=>{
  refreshWatchlistPrices();
  updatePositionLTPs();
}, 4000);

/* Main tab swipe switching intentionally disabled to prevent accidental tab changes. */

/* ══════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════ */
document.addEventListener('keydown', e=>{
  if((e.metaKey||e.ctrlKey)&&e.key==='k'){
    e.preventDefault();
    if(currentTab==='fundamental'){
      const mortyTab = [...document.querySelectorAll('.fund-tool-tab')].find(tab=>tab.getAttribute('onclick')?.includes("'morty'"));
      switchFundTab(mortyTab,'morty');
      document.getElementById('mortyInput').focus();
    }
  }
});

/* ══════════════════════════════════════════
   SERVICE WORKER (PWA offline support hint)
══════════════════════════════════════════ */
// Register SW if available (for PWA installability)
if('serviceWorker' in navigator){
  // Inline SW registration placeholder
  // navigator.serviceWorker.register('/sw.js');
}

/* ══════════════════════════════════════════
   SEGMENTED CONTROL — SLIDING INDICATOR ENGINE
══════════════════════════════════════════ */
(function(){
  /**
   * initSegTrack(trackEl)
   * Injects a .seg-indicator div into a .seg-track and keeps it
   * positioned under the currently .active child.
   * Re-uses a single rAF-debounced ResizeObserver for layout shifts.
   */
  function initSegTrack(track){
    if(track.dataset.segInit) return;
    track.dataset.segInit = '1';

    // Create the indicator
    const ind = document.createElement('div');
    ind.className = 'seg-indicator';
    // Insert as FIRST child so it sits below text via z-index
    track.insertBefore(ind, track.firstChild);

    function positionIndicator(animate){
      const active = track.querySelector('.active');
      if(!active){ ind.style.opacity='0'; return; }
      ind.style.opacity='1';

      const trackRect = track.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();

      // offsetLeft relative to track's padding-left (3px)
      const leftRelative = activeRect.left - trackRect.left;
      const width = activeRect.width;

      if(!animate){
        // Suppress transition for first paint
        ind.style.transition = 'none';
        ind.style.left = leftRelative + 'px';
        ind.style.width = width + 'px';
        // Re-enable transition on next frame
        requestAnimationFrame(()=>{
          ind.style.transition = '';
        });
      } else {
        ind.style.left = leftRelative + 'px';
        ind.style.width = width + 'px';
      }
    }

    // Initial position (no animation)
    positionIndicator(false);

    // Reposition on click of any child
    track.addEventListener('click', function(e){
      const pill = e.target.closest('.filter-pill,.tl-tab,.mt-tab,.calc-mode-tab,.rpt-tab');
      if(!pill) return;
      // Defer so the .active class has been toggled by the existing handler
      requestAnimationFrame(()=> positionIndicator(true));
    }, true); // capture phase — fires before existing onclick handlers finish but we defer anyway

    // Handle layout reflows (tab switching, orientation change)
    if(typeof ResizeObserver !== 'undefined'){
      const ro = new ResizeObserver(()=> positionIndicator(false));
      ro.observe(track);
    }
    window.addEventListener('resize', ()=> positionIndicator(false));
  }

  /**
   * Scan for all .seg-track elements and initialise them.
   * Runs on DOMContentLoaded + after dynamic renders (renderDailyAnalysisTool etc.)
   * We monkey-patch the relevant render functions to re-scan after they run.
   */
  function scanAndInit(){
    document.querySelectorAll('.seg-track').forEach(initSegTrack);
  }

  // Boot
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', scanAndInit);
  } else {
    scanAndInit();
  }

  // Re-run after any dynamic content renders that inject .rpt-tab rows
  function patchAfter(fnName){
    const orig = window[fnName];
    if(typeof orig !== 'function') return;
    window[fnName] = function(){
      const result = orig.apply(this, arguments);
      requestAnimationFrame(scanAndInit);
      return result;
    };
  }
  // Patch functions that dynamically inject seg-track children
  ['renderDailyAnalysisTool','setDailyRoute','setDailyTab'].forEach(patchAfter);

  // Also expose helper so existing tab-switch functions can trigger repositioning
  window.segRefresh = function(trackId){
    const t = trackId ? document.getElementById(trackId) : null;
    if(t) { t.dataset.segInit=''; initSegTrack(t); }
    else scanAndInit();
  };

})();

(function(){
  var initialized = false;
  window.showLandingExperience = function(){
    document.documentElement.classList.remove('wizard-app-boot');
    document.body.classList.remove('wizard-app-active');
    if (typeof showPage === 'function') showPage('page-home');
    var form = document.getElementById('emailAuthForm');
    var err = document.getElementById('emailAuthError');
    if (form) form.classList.remove('active');
    if (err) err.classList.remove('active');
    window.scrollTo(0, 0);
  };
  window.activateWizardApp = function(){
    document.documentElement.classList.add('wizard-app-boot');
    document.body.classList.add('wizard-app-active');
    window.scrollTo(0, 0);
    if (!initialized && typeof window.__wizardProInit === 'function') {
      initialized = true;
      window.__wizardProInit();
    } else if (window.currentUser && typeof updateProfileUI === 'function') {
      updateProfileUI();
    }
  };
  window.addEventListener('load', function(){
    if (typeof drawSparkline === 'function') {
      drawSparkline('sp-nifty',  false);
      drawSparkline('sp-bnifty', true);
      drawSparkline('sp-sgx',    true);
      drawSparkline('sp-nikkei', false);
      drawSparkline('sp-sp500',  true);
      drawSparkline('sp-nasdaq', true);
    }
    if (localStorage.getItem('wp_user')) activateWizardApp();
    else showLandingExperience();
  });
})();

/* ══════════════════════════════════════════
   DEMO USERS DATA
══════════════════════════════════════════ */
const DEMO_USERS = [
  {
    id: 'hari',
    name: 'Hari Krishnan',
    handle: '@hari_trader',
    avatar: 'H',
    avatarColor: '#0891B2',
    bio: 'Full-time trader | Nifty & BankNifty specialist | 6 years in markets | SEBI registered | DM for market views',
    joinDate: 'March 2022',
    friendStatus: 'friends', // already friends
    winRate: '68%',
    trades: 142,
    pnl: '+₹2.4L',
    posts: 38,
    tradingStyle: 'Swing + Intraday',
    experience: 'Advanced (6+ years)',
    favSector: 'Index Derivatives',
    demoTrades: [
      {type:'buy',sym:'NIFTY 24200 CE',entry:'₹142',exit:'₹218',pnl:'+₹5,700',date:'7 May',status:'Closed'},
      {type:'sell',sym:'BANKNIFTY 49500 PE',entry:'₹88',exit:'₹54',pnl:'+₹2,040',date:'6 May',status:'Closed'},
      {type:'buy',sym:'RELIANCE',entry:'₹2,882',exit:'₹2,941',pnl:'+₹3,540',date:'5 May',status:'Closed'},
      {type:'sell',sym:'HDFC BANK',entry:'₹1,620',exit:'₹1,598',pnl:'+₹1,320',date:'2 May',status:'Closed'},
      {type:'buy',sym:'NIFTY FUT',entry:'₹24,068',exit:'₹24,188',pnl:'+₹6,000',date:'30 Apr',status:'Closed'},
    ],
    demoPosts: [
      {content:'NIFTY 24,200 CE — booked 65% gains at ₹218. Scalp in 47 mins. Momentum trade is alive today.', tag:'bull', likes:92, comments:18, time:'2h ago'},
      {content:'BANKNIFTY PCR reading 0.78 — slightly bearish. Will wait for confirmation at 49,200 before entering any put options. Patience is the edge.', tag:'options', likes:56, comments:9, time:'Yesterday'},
    ]
  },
  {
    id: 'jithin',
    name: 'Jithin Mathew',
    handle: '@jithin_m',
    avatar: 'J',
    avatarColor: '#059669',
    bio: 'Options trader | Quantitative setups | Volatility strategies | Kerala 🌴 | Coffee ☕ + Charts 📈',
    joinDate: 'June 2021',
    friendStatus: 'friends',
    winRate: '71%',
    trades: 218,
    pnl: '+₹5.8L',
    posts: 62,
    tradingStyle: 'Options & Volatility',
    experience: 'Expert (8 years)',
    favSector: 'IT & Banking Options',
    demoTrades: [
      {type:'sell',sym:'TCS 3800 CE',entry:'₹72',exit:'₹28',pnl:'+₹4,400',date:'7 May',status:'Closed'},
      {type:'buy',sym:'NIFTY 24000 PE',entry:'₹95',exit:'₹142',pnl:'+₹4,700',date:'6 May',status:'Closed'},
      {type:'sell',sym:'INFY 1600 CE',entry:'₹38',exit:'₹18',pnl:'+₹2,000',date:'5 May',status:'Closed'},
      {type:'buy',sym:'BANKNIFTY FUT',entry:'₹49,180',exit:'₹49,420',pnl:'+₹6,000',date:'2 May',status:'Closed'},
      {type:'sell',sym:'WIPRO 260 CE',entry:'₹15',exit:'₹6',pnl:'+₹1,800',date:'30 Apr',status:'Closed'},
    ],
    demoPosts: [
      {content:'TCS 3800 CE short — IV crush after results worked beautifully. 61% gain in 2 days. Selling options after big moves is the play.', tag:'options', likes:138, comments:24, time:'1h ago'},
      {content:'Volatility smile analysis: NIFTY 30-day IV at 13.4 — historically low. Good time to be a net option buyer for breakout plays next week.', tag:'options', likes:88, comments:16, time:'3h ago'},
    ]
  },
  {
    id: 'abhijeeth',
    name: 'Abhijeeth Kumar',
    handle: '@abhijeeth_k',
    avatar: 'AK',
    avatarColor: '#7C3AED',
    bio: 'Aspiring full-time trader | Learning market structure | Sharing my journey 📊 | Chennai 🏙️',
    joinDate: 'January 2024',
    friendStatus: 'none', // NOT friends initially
    winRate: '54%',
    trades: 47,
    pnl: '+₹38,400',
    posts: 15,
    tradingStyle: 'Price Action',
    experience: 'Intermediate (2 years)',
    favSector: 'Large Cap Equities',
    demoTrades: [
      {type:'buy',sym:'HDFC BANK',entry:'₹1,598',exit:'₹1,631',pnl:'+₹1,980',date:'7 May',status:'Closed'},
      {type:'buy',sym:'TCS',entry:'₹3,720',exit:'₹3,775',pnl:'+₹2,750',date:'5 May',status:'Closed'},
      {type:'sell',sym:'ITC',entry:'₹458',exit:'₹441',pnl:'+₹1,020',date:'2 May',status:'Closed'},
    ],
    demoPosts: [
      {content:'HDFC Bank broke above 1,620 resistance on good volume — booked ₹1,980 profit. Slowly getting better at reading breakouts.', tag:'bull', likes:34, comments:5, time:'4h ago'},
      {content:'Still learning options pricing. If anyone has good resources on delta and theta, please share in comments!', tag:'options', likes:28, comments:12, time:'Yesterday'},
    ]
  }
];

// Track friend request states
const friendStates = {}; // userId -> 'none'|'pending'|'accepted'|'friends'

function getDemoUser(id) {
  return DEMO_USERS.find(u => u.id === id);
}

function getFriendState(userId) {
  const user = getDemoUser(userId);
  if (!user) return 'none';
  if (friendStates[userId]) return friendStates[userId];
  return user.friendStatus;
}

/* ══════════════════════════════════════════
   ACTIVE USERS STRIP
══════════════════════════════════════════ */
function renderActiveUsersStrip() {
  const strip = document.getElementById('activeUsersStrip');
  if (!strip) return;
  const users = [...DEMO_USERS];
  strip.innerHTML = users.map(u => `
    <div class="au-avatar-wrap" onclick="openUserProfile('${u.id}')">
      <div class="au-avatar has-story" style="background:${u.avatarColor}">
        ${u.avatar}
        <div class="au-online-dot"></div>
      </div>
      <div class="au-name">${u.name.split(' ')[0]}</div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════
   USER SEARCH SYSTEM
══════════════════════════════════════════ */
function openUserSearchOverlay() {
  const wrap = document.getElementById('userSearchOverlayWrap');
  const blur = document.getElementById('searchBgBlur');
  const inp  = document.getElementById('userSearchInput');
  if (wrap) wrap.classList.add('search-open');
  if (blur) blur.classList.add('show');
  if (inp)  { inp.value = ''; setTimeout(() => inp.focus(), 80); }
  // Always hide FAB when search is open
  const fabWrapper = document.getElementById('fabWrapper');
  if (fabWrapper) fabWrapper.style.display = 'none';
  userSearch('');
}

function userSearch(val) {
  const drop = document.getElementById('userSearchDropdown');
  if (!drop) return;
  const q = (val || '').trim().toLowerCase();
  const pool = typeof DEMO_USERS !== 'undefined' ? DEMO_USERS : [];
  const results = q ? pool.filter(u =>
    u.name.toLowerCase().includes(q) ||
    u.handle.toLowerCase().includes(q) ||
    (u.bio || '').toLowerCase().includes(q)
  ) : pool.slice(0, 6);
  if (!results.length) {
    drop.classList.add('show');
    drop.innerHTML = '<div class="usd-head">Traders</div><div class="usd-item" style="pointer-events:none"><div class="usd-info"><div class="usd-name">No matching traders</div><div class="usd-handle">Try another name or handle</div></div></div>';
    return;
  }
  drop.classList.add('show');
  drop.innerHTML = `<div class="usd-head">${q ? 'Matching traders' : 'Recommended traders'}</div>` + results.map(u => {
    const state = getFriendState(u.id);
    const statusLabel = state === 'friends' || state === 'accepted' ? 'Friends' : state === 'pending' ? 'Pending' : 'Add';
    const statusClass = state === 'friends' || state === 'accepted' ? 'friends' : state === 'pending' ? 'pending' : 'add';
    return `<div class="usd-item" onclick="closeUserSearch();setTimeout(()=>openUserProfile('${u.id}'),60)">
      <div class="usd-avatar" style="background:${u.avatarColor}">${u.avatar}</div>
      <div class="usd-info">
        <div class="usd-name">${u.name}</div>
        <div class="usd-handle">${u.handle} · ${u.tradingStyle}</div>
      </div>
      <div class="usd-status ${statusClass}">${statusLabel}</div>
    </div>`;
  }).join('');
}

function closeUserSearch() {
  const drop = document.getElementById('userSearchDropdown');
  const wrap = document.getElementById('userSearchOverlayWrap');
  const blur = document.getElementById('searchBgBlur');
  const inp  = document.getElementById('userSearchInput');
  if (drop) drop.classList.remove('show');
  if (wrap) wrap.classList.remove('search-open');
  if (blur) blur.classList.remove('show');
  if (inp)  { inp.blur(); inp.value = ''; }
  // Restore FAB only if on community tab
  const fabWrapper = document.getElementById('fabWrapper');
  if (fabWrapper && typeof currentTab !== 'undefined' && currentTab === 'community') {
    fabWrapper.style.display = '';
  }
}

/* ══════════════════════════════════════════
   USER PROFILE MODAL
══════════════════════════════════════════ */
let currentProfileUserId = null;
let currentPmTab = 'posts';

function openUserProfile(userId) {
  closeUserSearch();
  const user = getDemoUser(userId);
  if (!user) return;
  currentProfileUserId = userId;
  currentPmTab = 'posts';

  // Set cover gradient based on avatar color
  document.getElementById('pmCover').style.background = `linear-gradient(135deg, ${user.avatarColor} 0%, #1E222D 100%)`;
  document.getElementById('pmAvatarWrap').style.background = user.avatarColor;
  document.getElementById('pmAvatarWrap').textContent = user.avatar;
  document.getElementById('pmName').textContent = user.name;
  document.getElementById('pmHandle').textContent = user.handle;
  document.getElementById('pmBio').textContent = user.bio;
  document.getElementById('pmJoinDate').textContent = 'Joined ' + user.joinDate;
  document.getElementById('pmWinRate').textContent = user.winRate;
  document.getElementById('pmTrades').textContent = user.trades;
  document.getElementById('pmPnl').textContent = user.pnl;
  document.getElementById('pmPostCount').textContent = user.posts;

  // Mutual friends indicator
  const mutualWrap = document.getElementById('pmMutualWrap');
  if (userId !== 'abhijeeth') {
    mutualWrap.style.display = 'flex';
    document.getElementById('pmMutualText').textContent = '2 mutual friends';
  } else {
    mutualWrap.style.display = 'none';
  }

  // Friend button state
  updateFriendButton(userId);

  // Tabs: reset to posts
  document.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.pm-tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('.pm-tab').classList.add('active');
  document.getElementById('pmTab-posts').classList.add('active');

  renderPmPostsTab(user);
  renderPmTradesTab(user);
  renderPmAboutTab(user);

  document.getElementById('profileModalOverlay').classList.add('show');
}

function updateFriendButton(userId) {
  const btn = document.getElementById('pmFriendBtn');
  const state = getFriendState(userId);
  btn.className = 'pm-friend-btn';
  if (state === 'friends') {
    btn.classList.add('friends');
    btn.textContent = '✓ Friends';
  } else if (state === 'pending') {
    btn.classList.add('pending');
    btn.textContent = 'Request Sent ✓';
  } else if (state === 'accepted') {
    btn.classList.add('accepted');
    btn.textContent = '✓ Friends';
  } else {
    btn.classList.add('add');
    btn.textContent = 'Add Friend';
  }
}

function handleFriendAction() {
  if (!currentProfileUserId) return;
  const state = getFriendState(currentProfileUserId);
  if (state === 'friends' || state === 'accepted') {
    showToast('Already friends! 🤝');
    return;
  }
  if (state === 'pending') {
    // Simulate acceptance for Abhijeeth
    if (currentProfileUserId === 'abhijeeth') {
      friendStates[currentProfileUserId] = 'accepted';
      updateFriendButton(currentProfileUserId);
      showFriendAcceptedToast('Abhijeeth Kumar');
      // Re-render profile content (unlock)
      const user = getDemoUser(currentProfileUserId);
      renderPmPostsTab(user);
      renderPmTradesTab(user);
      // Switch to Trade + Message row
      _patchActionRowToFriend(currentProfileUserId);
    }
    return;
  }
  // Send request
  friendStates[currentProfileUserId] = 'pending';
  updateFriendButton(currentProfileUserId);
  showToast('Friend request sent! 📨');

  // For Abhijeeth simulate acceptance after 2.5 seconds
  if (currentProfileUserId === 'abhijeeth') {
    setTimeout(() => {
      if (friendStates['abhijeeth'] === 'pending') {
        friendStates['abhijeeth'] = 'accepted';
        if (currentProfileUserId === 'abhijeeth') {
          updateFriendButton('abhijeeth');
          const user = getDemoUser('abhijeeth');
          renderPmPostsTab(user);
          renderPmTradesTab(user);
          _patchActionRowToFriend('abhijeeth');
        }
        showFriendAcceptedToast('Abhijeeth Kumar');
      }
    }, 2500);
  }
}

function _patchActionRowToFriend(userId) {
  const overlay = document.getElementById('profileModalOverlay');
  if (!overlay) return;
  const row = overlay.querySelector('.pm-action-row');
  if (!row) return;
  row.innerHTML = `
    <button class="pm-trade-btn-pro" onclick="closeProfileModal(new MouseEvent('click'));openTradeProfile('${userId}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      Trades
    </button>
    <button class="pm-msg-btn-pro" onclick="closeProfileModal(new MouseEvent('click'));if(typeof closeProfileAndOpenDM==='function')closeProfileAndOpenDM();else openMessages()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      Message
    </button>`;
}

function showFriendAcceptedToast(name) {
  const el = document.createElement('div');
  el.className = 'fr-toast-accepted';
  el.textContent = `${name} accepted your request! 🎉`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function isPrivateContent(userId) {
  const state = getFriendState(userId);
  return state === 'none' || state === 'pending';
}

function renderPmPostsTab(user) {
  const el = document.getElementById('pmPostsContent');
  if (!el) return;
  const locked = isPrivateContent(user.id);
  if (locked && user.id === 'abhijeeth') {
    el.innerHTML = `
      <div class="pm-locked">
        <div class="pm-locked-icon">🔒</div>
        <div class="pm-locked-title">Private Profile</div>
        <div class="pm-locked-sub">Send a friend request to see ${user.name.split(' ')[0]}'s posts and trade history.</div>
      </div>
    `;
    return;
  }
  // Show posts
  const allPosts = [...user.demoPosts];
  const tagClasses = {bull:'tag-bull',bear:'tag-bear',options:'tag-options',macro:'tag-macro',news:'tag-news'};
  const tagLabels = {bull:'↗ Bullish',bear:'↘ Bearish',options:'⎔ Options',macro:'◎ Macro',news:'◉ News'};
  el.innerHTML = allPosts.map(p => `
    <div class="post-card" style="margin:0 0 10px">
      <div class="post-header">
        <div class="avatar" style="background:${user.avatarColor}">${user.avatar}</div>
        <div class="post-meta">
          <div class="post-name">${user.name}</div>
          <div class="post-handle">${user.handle}</div>
        </div>
        ${p.tag ? `<span class="post-tag ${tagClasses[p.tag]||''}">${tagLabels[p.tag]||p.tag}</span>` : ''}
      </div>
      ${p.image ? `<img src="${p.image}" class="post-image" alt="post image"/>` : ''}
      <div class="post-body">${p.content}</div>
      <div class="post-actions">
        <span class="post-action"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> ${p.likes}</span>
        <span class="post-action"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> ${p.comments}</span>
        <span class="post-time">${p.time}</span>
      </div>
    </div>
  `).join('');
}

function renderPmTradesTab(user) {
  const el = document.getElementById('pmTradesContent');
  if (!el) return;
  const locked = isPrivateContent(user.id);
  if (locked && user.id === 'abhijeeth') {
    el.innerHTML = `
      <div class="pm-locked">
        <div class="pm-locked-icon">🔒</div>
        <div class="pm-locked-title">Trade History Locked</div>
        <div class="pm-locked-sub">Become friends with ${user.name.split(' ')[0]} to see their demo trade history.</div>
      </div>
    `;
    return;
  }
  el.innerHTML = user.demoTrades.map(t => `
    <div class="trade-history-item">
      <div class="th-type ${t.type}">${t.type.toUpperCase()}</div>
      <div class="th-info">
        <div class="th-sym">${t.sym}</div>
        <div class="th-detail">Entry: ${t.entry} → Exit: ${t.exit}</div>
      </div>
      <div class="th-pnl">
        <div class="th-pnl-val ${t.pnl.startsWith('+') ? 'pos' : 'dn'}">${t.pnl}</div>
        <div class="th-date">${t.date}</div>
      </div>
    </div>
  `).join('');
}

function renderPmAboutTab(user) {
  const el = document.getElementById('pmAboutContent');
  if (!el) return;
  el.innerHTML = `
    <div class="about-row"><div class="about-label">Bio</div><div class="about-val">${user.bio}</div></div>
    <div class="about-row"><div class="about-label">Experience</div><div class="about-val">${user.experience}</div></div>
    <div class="about-row"><div class="about-label">Trading Style</div><div class="about-val">${user.tradingStyle}</div></div>
    <div class="about-row"><div class="about-label">Fav Sector</div><div class="about-val">${user.favSector}</div></div>
    <div class="about-row"><div class="about-label">Win Rate</div><div class="about-val">${user.winRate}</div></div>
    <div class="about-row"><div class="about-label">Total Trades</div><div class="about-val">${user.trades} demo trades</div></div>
    <div class="about-row"><div class="about-label">Demo P&L</div><div class="about-val" style="color:var(--green)">${user.pnl}</div></div>
    <div class="about-row"><div class="about-label">Joined</div><div class="about-val">${user.joinDate}</div></div>
  `;
}

function switchPmTab(el, tab) {
  document.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.pm-tab-content').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('pmTab-' + tab).classList.add('active');
  currentPmTab = tab;
}

function closeProfileModal(event) {
  if (event && event.target !== document.getElementById('profileModalOverlay')) return;
  document.getElementById('profileModalOverlay').classList.remove('show');
  currentProfileUserId = null;
}

function closeProfileAndOpenDM() {
  document.getElementById('profileModalOverlay').classList.remove('show');
  openConversationsScreen();
}

/* ══════════════════════════════════════════
   SAVED POSTS SYSTEM
══════════════════════════════════════════ */
const _savedPosts = new Set();

window.toggleSavePost = function(el, postId) {
  if (typeof currentUser === 'undefined' || !currentUser) { showToast('Sign in to save posts'); return; }
  const isSaved = _savedPosts.has(postId);
  if (isSaved) {
    _savedPosts.delete(postId);
    el.classList.remove('bookmarked');
    el.querySelector('svg path').setAttribute('fill','none');
    showToast('Removed from saved');
  } else {
    _savedPosts.add(postId);
    el.classList.add('bookmarked');
    el.querySelector('svg path').setAttribute('fill','currentColor');
    el.style.transform = 'scale(1.35)';
    setTimeout(() => { el.style.transform = ''; }, 220);
    showToast('Saved! 🔖');
  }
};

function openSavedPosts() {
  if (!currentUser) { showToast('Sign in first'); return; }
  const allPosts = [...(typeof DEMO_POSTS!=='undefined'?DEMO_POSTS:[]), ...(typeof posts!=='undefined'?posts:[])];
  const saved = allPosts.filter(p => _savedPosts.has(p.id));
  const overlay = document.getElementById('savedPostsOverlay');
  const list = document.getElementById('savedPostsList');
  if (!overlay || !list) return;
  if (!saved.length) {
    list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--text3);font-size:14px">No saved posts yet.<br/>Tap the bookmark on any post to save it.</div>';
  } else {
    const tagClasses = {bull:'tag-bull',bear:'tag-bear',options:'tag-options',macro:'tag-macro',news:'tag-news'};
    const tagLabels = {bull:'↗ Bullish',bear:'↘ Bearish',options:'⎔ Options',macro:'◎ Macro',news:'◉ News'};
    list.innerHTML = saved.map(p => `
      <div class="post-card" style="margin:0 0 10px" onclick="closeModalById('savedPostsOverlay');setTimeout(()=>openPostDetail(${p.id}),80)">
        <div class="post-header">
          <div class="avatar" style="background:${p.avatarColor||'var(--accent)'}"></div>
          <div class="post-meta">
            <div class="post-name">${p.user}</div>
            <div class="post-handle">${p.handle}</div>
          </div>
          ${p.tag?`<span class="post-tag ${tagClasses[p.tag]||''}">${tagLabels[p.tag]||p.tag}</span>`:''}
        </div>
        ${p.image?`<img src="${p.image}" class="post-image" style="margin:8px 0" alt=""/>` :''}
        <div class="post-body">${p.content}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:6px">${p.time||'Just now'}</div>
      </div>`).join('');
  }
  overlay.classList.add('show');
}


let composeImageData = null;

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    composeImageData = e.target.result;
    const preview = document.getElementById('composeImgPreview');
    const area = document.getElementById('composeImageArea');
    if (preview && area) {
      preview.src = composeImageData;
      area.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function removeComposeImage() {
  composeImageData = null;
  const area = document.getElementById('composeImageArea');
  const preview = document.getElementById('composeImgPreview');
  if (area) area.style.display = 'none';
  if (preview) preview.src = '';
}

/* ══════════════════════════════════════════
   EXTEND publishPost with image support
══════════════════════════════════════════ */
const _origPublishPost = window.publishPost;
window.publishPost = function() {
  if (!currentUser) { showToast('Please sign in to post'); return; }
  const txt = document.getElementById('postTextarea').value.trim();
  if (!txt && !composeImageData) { showToast('Write something or add a photo first'); return; }
  const p = {
    id: Date.now(),
    user: currentUser.name,
    handle: currentUser.handle,
    avatar: currentUser.avatarTheme?.emoji || currentUser.name.charAt(0).toUpperCase(),
    avatarColor: currentUser.avatarTheme?.color || 'var(--accent)',
    tag: activePostTag,
    content: txt,
    image: composeImageData || null,
    likes: 0,
    comments: 0,
    time: 'Just now'
  };
  posts.unshift(p);
  postCount++;
  document.getElementById('profilePostCount').textContent = postCount;
  document.getElementById('postTextarea').value = '';
  composeImageData = null;
  removeComposeImage();
  activePostTag = '';
  document.querySelectorAll('.compose-tag-btn').forEach(b => b.classList.remove('selected'));
  closeModalById('newPostModal');
  renderPosts();
  showToast('Posted! 🚀');
};

/* ══════════════════════════════════════════
   EXTEND postCard with image + author click
══════════════════════════════════════════ */
const _origPostCard = window.postCard;
window.postCard = function(p, source) {
  const tagClasses = {bull:'tag-bull',bear:'tag-bear',options:'tag-options',macro:'tag-macro',news:'tag-news'};
  const tagLabels = {bull:'↗ Bullish',bear:'↘ Bearish',options:'⎔ Options',macro:'◎ Macro',news:'◉ News'};
  // Find if this post belongs to a demo user
  const demoUser = DEMO_USERS.find(u => u.handle === p.handle);
  const authorClickAttr = demoUser ? `onclick="openUserProfile('${demoUser.id}')"` : '';
  const authorClass = demoUser ? 'post-author-link' : '';
  return `
  <div class="post-card" data-tag="${p.tag||''}">
    <div class="post-header ${authorClass}" ${authorClickAttr}>
      <div class="avatar" style="background:${p.avatarColor||'var(--accent)'}">${p.avatar}</div>
      <div class="post-meta">
        <div class="post-name">${p.user}</div>
        <div class="post-handle">${p.handle}</div>
      </div>
      ${p.tag ? `<span class="post-tag ${tagClasses[p.tag]||''}">${tagLabels[p.tag]||p.tag}</span>` : ''}
    </div>
    ${p.image ? `<img src="${p.image}" class="post-image" alt="post image"/>` : ''}
    ${p.chart ? `<div class="chart-preview"><svg class="chart-svg" viewBox="0 0 300 60" preserveAspectRatio="none"><polyline points="0,50 30,45 60,40 90,42 120,35 150,28 180,32 210,22 240,18 270,24 300,15" fill="none" stroke="var(--red)" stroke-width="1.5"/><polygon points="0,60 0,50 30,45 60,40 90,42 120,35 150,28 180,32 210,22 240,18 270,24 300,15 300,60" fill="var(--red-lt)" opacity="0.5"/></svg></div>` : ''}
    <div class="post-body">${p.content}</div>
    <div class="post-actions">
      <span class="post-action" onclick="likePost(this,${p.id})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        ${p.likes}
      </span>
      <span class="post-action" onclick="showToast('Comments coming soon!')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        ${p.comments}
      </span>
      <span class="post-action" onclick="sharePost(this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Share
      </span>
      ${demoUser ? `<span class="post-action" onclick="openUserProfile('${demoUser.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-1a6 6 0 0 1 12 0v1"/></svg></span>` : ''}
      <span class="post-time">${p.time||'Just now'}</span>
    </div>
  </div>`;
};

/* ══════════════════════════════════════════
   ADD DEMO USERS POSTS TO FEED
══════════════════════════════════════════ */
// Inject demo user posts into DEMO_POSTS array
(function injectDemoUserPosts() {
  DEMO_USERS.forEach(user => {
    user.demoPosts.forEach((p, i) => {
      DEMO_POSTS.unshift({
        id: 'demo_' + user.id + '_' + i,
        user: user.name,
        handle: user.handle,
        avatar: user.avatar,
        avatarColor: user.avatarColor,
        tag: p.tag,
        content: p.content,
        image: p.image || null,
        likes: p.likes,
        comments: p.comments,
        time: p.time
      });
    });
  });
})();

/* ══════════════════════════════════════════
   INIT HOOKS
══════════════════════════════════════════ */
// Hook into the existing community render
const _origRenderPosts = window.renderPosts;
window.renderPosts = function(filter) {
  if (typeof _origRenderPosts === 'function') _origRenderPosts(filter || 'all');
  // Active users strip removed — no-op
};

// DOMContentLoaded init
document.addEventListener('DOMContentLoaded', () => {
  // No active users strip anymore — removed per design upgrade
  // Patch switchTab if needed
  const origSwitchTab2 = window.switchTab;
  if (typeof origSwitchTab2 === 'function') {
    window.switchTab = function(tab) {
      origSwitchTab2(tab);
    };
  }
});

/* ══════════════════════════════════════════
   PREMIUM FAB SYSTEM
══════════════════════════════════════════ */
function toggleFab(){
  const main = document.getElementById('fabMain');
  const menu = document.getElementById('fabMenu');
  const overlay = document.getElementById('fabOverlay');
  const isOpen = main.classList.contains('open');
  if(isOpen){ closeFab(); } else {
    main.classList.add('open');
    menu.classList.add('open');
    overlay.classList.add('open');
  }
}
function closeFab(){
  document.getElementById('fabMain')?.classList.remove('open');
  document.getElementById('fabMenu')?.classList.remove('open');
  document.getElementById('fabOverlay')?.classList.remove('open');
}
function fabAction(type){
  closeFab();
  if(type === 'post'){
    setTimeout(()=> { if(typeof openNewPost==='function') openNewPost(); }, 150);
  } else if(type === 'photo'){
    document.getElementById('fabPhotoInput')?.click();
  } else if(type === 'live'){
    const s = document.getElementById('liveScreen');
    if(s){ s.classList.remove('closing'); s.classList.add('active'); }
  } else if(type === 'space'){
    const s = document.getElementById('spaceScreen');
    if(s){ s.classList.remove('closing'); s.classList.add('active'); }
  }
}
function closePlaceholderScreen(id){
  const s = document.getElementById(id);
  if(!s) return;
  s.classList.add('closing');
  setTimeout(()=>{ s.classList.remove('active','closing'); }, 260);
}
function handleFabPhotoUpload(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    // Pre-fill compose image and open compose modal
    window.composeImageData = e.target.result;
    const preview = document.getElementById('composeImgPreview');
    const area = document.getElementById('composeImageArea');
    if(preview && area){ preview.src = window.composeImageData; area.style.display='block'; }
    if(typeof openNewPost==='function') openNewPost();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// Ensure FAB is shown when app is active
document.addEventListener('DOMContentLoaded', ()=>{
  // Hide FAB on landing, show in app
  const fab = document.getElementById('fabWrapper');
  const fabO = document.getElementById('fabOverlay');
  if(fab && fabO){
    const checkApp = () => {
      const inApp = document.body.classList.contains('wizard-app-active');
      fab.style.display = inApp ? '' : 'none';
      fabO.style.display = inApp ? '' : 'none';
    };
    checkApp();
    const obs = new MutationObserver(checkApp);
    obs.observe(document.body, {attributes:true, attributeFilter:['class']});
  }
});

/* ── SECTION 4: Remove notification badge ── */
document.addEventListener('DOMContentLoaded', () => {
  const badge = document.getElementById('newsBadge');
  if (badge) badge.style.display = 'none';
});

/* ── SECTION 6: Profile Side Menu (X/Twitter style) ── */
function openProfileSideMenu() {
  if (typeof currentUser === 'undefined' || !currentUser) { if(typeof openProfile==='function') openProfile(); return; }
  const nameEl = document.getElementById('psmSideName');
  const handleEl = document.getElementById('psmSideHandle');
  if (nameEl) nameEl.textContent = currentUser.name || 'User';
  if (handleEl) handleEl.textContent = currentUser.handle || '@user';
  document.getElementById('profileSideMenu').classList.add('open');
  document.getElementById('psmOverlay').classList.add('open');
}
function closeProfileSideMenu() {
  document.getElementById('profileSideMenu').classList.remove('open');
  document.getElementById('psmOverlay').classList.remove('open');
}

/* ── SECTION 1: Functional Like Button ── */
const _likedPosts = new Set();
function formatEngagementCount(value) {
  const n = Number(value) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return String(n);
}
function getPostById(id) {
  return [...(typeof DEMO_POSTS !== 'undefined' ? DEMO_POSTS : []), ...(typeof posts !== 'undefined' ? posts : [])].find(p => p.id == id);
}
function getPostCommentCount(post) {
  return (post?.postComments || []).length + (parseInt(post?.comments) || 0);
}
function jsArg(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
function renderEngagementRow(post) {
  const isLiked = _likedPosts.has(post.id);
  const isRep = _repostedPosts.has(post.id);
  const comments = getPostCommentCount(post);
  const views = post.views || Math.max(1200, ((parseInt(post.likes) || 0) + comments + 1) * 137);
  const idArg = jsArg(post.id);
  /* FIX 3: Order = Like, Comment, Reshare, Save. Share & Views removed. */
  return `<div class="post-actions x-engagement-row">
    <button class="x-engage-btn like ${isLiked ? 'liked' : ''}" type="button" onclick="event.stopPropagation();likePost(this,${idArg})" title="Like">
      <svg viewBox="0 0 24 24"><path d="M20.9 4.7a5.4 5.4 0 0 0-7.7 0L12 5.9l-1.2-1.2a5.4 5.4 0 0 0-7.7 7.7L12 21.3l8.9-8.9a5.4 5.4 0 0 0 0-7.7Z"/></svg><span class="engage-count">${formatEngagementCount(post.likes || 0)}</span>
    </button>
    <button class="x-engage-btn comment" type="button" onclick="event.stopPropagation();openPostDetail(${idArg})" title="Comment">
      <svg viewBox="0 0 24 24"><path d="M21 12a8.5 8.5 0 0 1-8.5 8.5 9.7 9.7 0 0 1-4.1-.9L3 21l1.4-4.6A8.5 8.5 0 1 1 21 12Z"/></svg><span class="engage-count">${formatEngagementCount(comments)}</span>
    </button>
    <button class="x-engage-btn repost ${isRep ? 'reposted' : ''}" type="button" onclick="event.stopPropagation();toggleRepost(this,${idArg})" oncontextmenu="showRepostMenu(this,${idArg},event)" ontouchstart="event.stopPropagation();startRepostLongPress(this,${idArg},event)" ontouchend="cancelRepostLongPress()" title="Reshare">
      <svg viewBox="0 0 24 24"><path d="M17 2l4 4-4 4"/><path d="M3 11V8a2 2 0 0 1 2-2h16"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v3a2 2 0 0 1-2 2H3"/></svg><span class="engage-count">${isRep ? '1' : ''}</span>
    </button>
    <button class="x-engage-btn bookmark" type="button" onclick="event.stopPropagation();toggleSavePost(this,${idArg})" title="Save">
      <svg viewBox="0 0 24 24"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/></svg>
    </button>
  </div>`;
}
window.likePost = function(el, id) {
  const isLiked = _likedPosts.has(id);
  if (isLiked) { _likedPosts.delete(id); el.classList.remove('liked'); }
  else { _likedPosts.add(id); el.classList.add('liked'); }
  const post = getPostById(id);
  if (post) post.likes = Math.max(0, (post.likes || 0) + (isLiked ? -1 : 1));
  const count = el.querySelector('.engage-count');
  if (count && post) count.textContent = formatEngagementCount(post.likes || 0);
  const icon = el.querySelector('svg');
  if (icon) icon.style.fill = isLiked ? 'none' : 'currentColor';
  el.style.transform = 'scale(1.4)';
  setTimeout(() => { el.style.transform = ''; }, 220);
};

/* ── SECTION 1: Comment button opens Post Detail screen ── */
window.openPostDetail = function(postId) {
  const post = getPostById(postId);
  if (!post) return;
  const screen = document.getElementById('postDetailScreen');
  const tagLabels = {bull:'⚡ Intraday',bear:'📈 Swing',options:'⎔ F&O',macro:'🪙 Commodities',news:'◉ News'};
  const tagClasses = {bull:'tag-bull',bear:'tag-bear',options:'tag-options',macro:'tag-macro',news:'tag-news'};
  const views = post.views || Math.max(1200, ((parseInt(post.likes) || 0) + getPostCommentCount(post) + 1) * 137);
  document.getElementById('pdOriginalPost').innerHTML = `
    <div class="post-header" style="align-items:flex-start;margin-bottom:0">
      <div class="avatar" style="background:${post.avatarColor||'var(--accent)'}"></div>
      <div class="post-meta">
        <div class="pd-post-name">${post.user}</div>
        <div class="pd-post-handle">${post.handle}</div>
      </div>
      ${post.tag ? `<span class="post-tag ${tagClasses[post.tag]||''}">${tagLabels[post.tag]||post.tag}</span>` : ''}
    </div>
    ${post.image ? `<img src="${post.image}" class="post-image" onclick="openImgFullscreen(this.src)" style="margin:10px 0"/>` : ''}
    <div class="pd-post-body">${post.content}</div>
    <div class="pd-post-stamp">${post.time||'Just now'} · <strong>${formatEngagementCount(views)}</strong> Views</div>
    ${renderEngagementRow(post)}`;
  renderPdComments(post);
  document.getElementById('pdBody').dataset.postId = postId;
  screen.classList.add('open');
};

function renderPdComments(post) {
  const list = document.getElementById('pdCommentsList');
  const comments = post.postComments || [];
  if (!comments.length) {
    list.innerHTML = `<div style="padding:24px 16px;text-align:center;color:var(--text3);font-size:13px">No comments yet. Start the conversation!</div>`;
    return;
  }
  list.innerHTML = comments.map(c => `
    <div class="pd-comment">
      <div class="pd-comment-avatar"></div>
      <div class="pd-comment-body">
        <div class="pd-comment-name">${c.name||'User'} <span class="pd-comment-handle">${c.handle||''}</span></div>
        <div class="pd-comment-text">${c.text}</div>
        <div class="pd-comment-time">${c.time||'Just now'}</div>
      </div>
    </div>`).join('');
}

function closePostDetail() {
  document.getElementById('postDetailScreen').classList.remove('open');
}
function pdCommentKeydown(e) { if (e.key === 'Enter') submitPdComment(); }
function submitPdComment() {
  if (typeof currentUser === 'undefined' || !currentUser) { showToast('Sign in to comment'); return; }
  const input = document.getElementById('pdCommentInput');
  const text = input.value.trim();
  if (!text) return;
  const postId = document.getElementById('pdBody').dataset.postId;
  const allPosts = [...(typeof DEMO_POSTS!=='undefined'?DEMO_POSTS:[]), ...(typeof posts!=='undefined'?posts:[])];
  const post = allPosts.find(p => p.id == postId);
  if (!post) return;
  if (!post.postComments) post.postComments = [];
  post.postComments.push({ name:currentUser.name, handle:currentUser.handle, text, time:'Just now' });
  post.comments = (parseInt(post.comments)||0) + 1;
  input.value = '';
  renderPdComments(post);
  document.getElementById('pdOriginalPost').innerHTML = `
    <div class="post-header" style="align-items:flex-start;margin-bottom:0">
      <div class="avatar" style="background:${post.avatarColor||'var(--accent)'}"></div>
      <div class="post-meta">
        <div class="pd-post-name">${post.user}</div>
        <div class="pd-post-handle">${post.handle}</div>
      </div>
    </div>
    ${post.image ? `<img src="${post.image}" class="post-image" onclick="openImgFullscreen(this.src)" style="margin:10px 0"/>` : ''}
    <div class="pd-post-body">${post.content}</div>
    <div class="pd-post-stamp">${post.time||'Just now'} · <strong>${formatEngagementCount(post.views || 1200)}</strong> Views</div>
    ${renderEngagementRow(post)}`;
  const body = document.getElementById('pdBody');
  body.scrollTop = body.scrollHeight;
  showToast('Comment posted! 💬');
}

/* ── SECTION 2: Repost System ── */
const _repostedPosts = new Set();
let _ctxPostId = null;

window.toggleRepost = function(el, postId) {
  const isReposted = _repostedPosts.has(postId);
  if (isReposted) {
    _repostedPosts.delete(postId); el.classList.remove('reposted');
    showToast('Repost removed');
  } else {
    _repostedPosts.add(postId); el.classList.add('reposted');
    el.style.transform = 'scale(1.35) rotate(15deg)';
    setTimeout(() => { el.style.transform = ''; }, 280);
    showToast('Reposted! 🔄');
    if (typeof currentUser !== 'undefined' && currentUser) {
      const allPosts = [...(typeof DEMO_POSTS!=='undefined'?DEMO_POSTS:[]), ...(typeof posts!=='undefined'?posts:[])];
      const post = allPosts.find(p => p.id == postId);
      if (post) {
        const rp = {...post, id:Date.now(), repostedBy:currentUser.name, repostedHandle:currentUser.handle, time:'Just now'};
        if (typeof posts !== 'undefined') { posts.unshift(rp); renderPosts(); }
      }
    }
  }
};

window.showRepostMenu = function(el, postId, event) {
  event.preventDefault(); event.stopPropagation();
  _ctxPostId = postId;
  const menu = document.getElementById('repostCtxMenu');
  const x = event.clientX || event.pageX || 50;
  const y = event.clientY || event.pageY || 200;
  menu.style.display = 'block';
  menu.style.top = Math.min(y + 8, window.innerHeight - 120) + 'px';
  menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
  document.getElementById('repostCtxRepost').onclick = () => { hideRepostMenu(); toggleRepost(el, postId); };
  document.getElementById('repostCtxQuote').onclick = () => { hideRepostMenu(); openQuotePost(postId); };
  setTimeout(() => document.addEventListener('click', hideRepostMenu, {once:true}), 50);
};
function hideRepostMenu() { document.getElementById('repostCtxMenu').style.display = 'none'; }

let _rpLpTimer = null;
function startRepostLongPress(el, postId, event) {
  _rpLpTimer = setTimeout(() => showRepostMenu(el, postId, event.touches?.[0]||event), 500);
}
function cancelRepostLongPress() { if (_rpLpTimer) clearTimeout(_rpLpTimer); }

function openQuotePost(postId) {
  const allPosts = [...(typeof DEMO_POSTS!=='undefined'?DEMO_POSTS:[]), ...(typeof posts!=='undefined'?posts:[])];
  const post = allPosts.find(p => p.id == postId);
  if (!post) return;
  document.getElementById('quotePostOverlay').classList.add('show');
  document.getElementById('quotePostOverlay').dataset.postId = postId;
  document.getElementById('quoteOriginalContent').innerHTML = `
    <div class="quote-original-header">
      <div class="quote-original-name">${post.user}</div>
      <div class="quote-original-handle">${post.handle}</div>
    </div>
    <div class="quote-original-body">${post.content.replace(/<[^>]*>/g,'').slice(0,120)}${post.content.length>120?'...':''}</div>`;
  setTimeout(()=>document.getElementById('quoteTextarea').focus(),100);
}
function closeQuoteOverlay(e) {
  if (!e || e.target===document.getElementById('quotePostOverlay')) {
    document.getElementById('quotePostOverlay').classList.remove('show');
  }
}
function publishQuotePost() {
  if (typeof currentUser==='undefined'||!currentUser) { showToast('Sign in first'); return; }
  const text = document.getElementById('quoteTextarea').value.trim();
  if (!text) { showToast('Add your thoughts'); return; }
  const postId = document.getElementById('quotePostOverlay').dataset.postId;
  const allPosts = [...(typeof DEMO_POSTS!=='undefined'?DEMO_POSTS:[]), ...(typeof posts!=='undefined'?posts:[])];
  const orig = allPosts.find(p => p.id == postId);
  const qp = {
    id:Date.now(), user:currentUser.name, handle:currentUser.handle,
    avatar:currentUser.name.charAt(0), avatarColor:'var(--accent)',
    tag:orig?.tag||'', likes:0, comments:0, time:'Just now',
    content:`${text}<div style="border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-top:8px;font-size:12px;color:var(--text2)"><strong style="color:var(--text);font-size:11px">${orig?.user} ${orig?.handle}</strong><br/>${(orig?.content||'').replace(/<[^>]*>/g,'').slice(0,100)}</div>`
  };
  if (typeof posts!=='undefined') { posts.unshift(qp); }
  document.getElementById('quoteTextarea').value='';
  document.getElementById('quotePostOverlay').classList.remove('show');
  if (typeof renderPosts==='function') renderPosts();
  showToast('Quote posted! ✨');
}

/* ── SECTION 3: Trade Profile Screen ── */
window.openTradeProfile = function(userId) {
  const user = (typeof DEMO_USERS!=='undefined'?DEMO_USERS:[]).find(u => u.id === userId);
  if (!user) return;
  document.getElementById('tpTopTitle').textContent = user.name.split(' ')[0] + "'s Trades";
  const tradesHtml = (user.demoTrades||[]).map(t => `
    <div class="tp-trade-row">
      <div>
        <div class="tp-trade-sym">${t.sym}</div>
        <div class="tp-trade-meta">${t.type.toUpperCase()} · ${t.date} · ${t.status}</div>
      </div>
      <div>
        <div class="tp-trade-pnl ${t.pnl.startsWith('+')?'pos':'neg'}">${t.pnl}</div>
        <div style="font-size:10px;color:var(--text3);text-align:right">${t.entry} → ${t.exit}</div>
      </div>
    </div>`).join('');
  document.getElementById('tradeProfileContent').innerHTML = `
    <div class="tp-hero">
      <div class="tp-name">${user.name}</div>
      <div class="tp-handle">${user.handle}</div>
      <div class="tp-badge">🏆 ${user.tradingStyle}</div>
    </div>
    <div class="tp-perf-grid">
      <div class="tp-perf-card"><div class="tp-perf-val pos">${user.winRate}</div><div class="tp-perf-label">Win Rate</div></div>
      <div class="tp-perf-card"><div class="tp-perf-val pos">${user.pnl}</div><div class="tp-perf-label">P&amp;L</div></div>
      <div class="tp-perf-card"><div class="tp-perf-val">${user.trades}</div><div class="tp-perf-label">Trades</div></div>
    </div>
    <div style="padding:0 16px 10px">
      <div class="tp-section-head">Trading Profile</div>
      <div class="tp-style-row">
        <div class="tp-style-pill">${user.tradingStyle}</div>
        <div class="tp-style-pill">${user.experience}</div>
        <div class="tp-style-pill">${user.favSector}</div>
      </div>
    </div>
    <div style="padding:0 16px 8px"><div class="tp-section-head">Recent Trades</div></div>
    <div style="border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--border);margin:0 16px 20px">${tradesHtml}</div>
    <div style="padding:0 16px 12px;font-size:10px;color:var(--text3)">Demo trade data. Not investment advice.</div>`;
  document.getElementById('tradeProfileScreen').classList.add('open');
};
function closeTradeProfile() { document.getElementById('tradeProfileScreen').classList.remove('open'); }

/* ── Override user profile action buttons after modal opens ── */
const _origOUP = window.openUserProfile;
window.openUserProfile = function(userId) {
  if (typeof _origOUP === 'function') _origOUP(userId);
  setTimeout(() => {
    const overlay = document.getElementById('profileModalOverlay');
    if (!overlay) return;
    const row = overlay.querySelector('.pm-action-row');
    if (!row) return;
    const state = typeof getFriendState === 'function' ? getFriendState(userId) : 'none';
    const isFriend = state === 'friends' || state === 'accepted';
    if (isFriend) {
      row.innerHTML = `
        <button class="pm-trade-btn-pro" onclick="closeProfileModal(new MouseEvent('click'));openTradeProfile('${userId}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Trades
        </button>
        <button class="pm-msg-btn-pro" onclick="closeProfileModal(new MouseEvent('click'));if(typeof closeProfileAndOpenDM==='function')closeProfileAndOpenDM();else openMessages()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:14px;height:14px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Message
        </button>`;
    } else {
      // Show Add Friend + Message
      const friendBtn = row.querySelector('#pmFriendBtn');
      if (friendBtn) {
        // updateFriendButton already handles this via openUserProfile base
      }
    }
  }, 120);
};

/* ── SECTION 5: Image fullscreen ── */
window.openImgFullscreen = function(src) {
  document.getElementById('imgFullscreenImg').src = src;
  document.getElementById('imgFullscreen').classList.add('open');
};
function closeImgFullscreen() {
  document.getElementById('imgFullscreen').classList.remove('open');
  document.getElementById('imgFullscreenImg').src = '';
}

/* ── SECTION 5 & 2: Upgraded postCard — all features ── */
(function patchPostCard() {
  const tagClasses = {bull:'tag-bull',bear:'tag-bear',options:'tag-options',macro:'tag-macro',news:'tag-news'};
  const tagLabels  = {bull:'⚡ Intraday',bear:'📈 Swing',options:'⎔ F&O',macro:'🪙 Commodities',news:'◉ News'};
  window.postCard = function(p) {
    const dUser = typeof DEMO_USERS!=='undefined' ? DEMO_USERS.find(u=>u.handle===p.handle) : null;
    const aClick = dUser ? `onclick="event.stopPropagation();openUserProfile('${dUser.id}')"` : '';
    const repBanner = p.repostedBy ? `<div class="repost-banner"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:12px;height:12px"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>Reposted by ${p.repostedBy}</div>` : '';
    const idArg = jsArg(p.id);
    return `${repBanner}<div class="post-card" data-tag="${p.tag||''}" data-post-id="${p.id}" onclick="openPostDetail(${idArg})">
      <div class="post-header ${dUser?'post-author-link':''}" ${aClick} style="${dUser?'cursor:pointer':''}">
        <div class="avatar" style="background:${p.avatarColor||'var(--accent)'}"></div>
        <div class="post-meta"><div class="post-name">${p.user}</div><div class="post-handle">${p.handle}</div></div>
        ${p.tag?`<span class="post-tag ${tagClasses[p.tag]||''}">${tagLabels[p.tag]||p.tag}</span>`:''}
      </div>
      ${p.image?`<img src="${p.image}" class="post-image" onclick="event.stopPropagation();openImgFullscreen(this.src)" loading="lazy" alt=""/>`:''}
      ${p.chart?`<div class="chart-preview"><svg class="chart-svg" viewBox="0 0 300 60" preserveAspectRatio="none"><polyline points="0,50 30,45 60,40 90,42 120,35 150,28 180,32 210,22 240,18 270,24 300,15" fill="none" stroke="var(--red)" stroke-width="1.5"/><polygon points="0,60 0,50 30,45 60,40 90,42 120,35 150,28 180,32 210,22 240,18 270,24 300,15 300,60" fill="var(--red-lt)" opacity="0.5"/></svg></div>`:''}
      <div class="post-body">${p.content}</div>
      ${renderEngagementRow(p)}
    </div>`;
  };

  /* Patch renderPosts to use upgraded postCard */
  window.renderPosts = function(filter) {
    filter = filter || 'all';
    const feed = document.getElementById('communityFeed');
    if (!feed) return;
    const allSrc = typeof DEMO_POSTS!=='undefined' ? DEMO_POSTS : [];
    const userSrc = typeof posts!=='undefined' ? posts : [];
    const filtered = filter==='all' ? allSrc : allSrc.filter(p=>p.tag===filter);
    const userFiltered = filter==='all' ? userSrc : userSrc.filter(p=>p.tag===filter);
    const combined = [...userFiltered, ...filtered];
    feed.innerHTML = combined.length ? combined.map(p=>window.postCard(p)).join('') : '<div class="empty-state"><p>No posts in this category yet.</p></div>';
    if (typeof updatePostCount==='function') updatePostCount();
  };
})();

/* ── SECTION 8: search overlay now handled by HTML elements + openUserSearchOverlay() ── */