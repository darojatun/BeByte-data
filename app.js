// BeByte-data — builder CONFIG + MENU -> data.js (kompatibel d-abi/js/data.js)
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Urutan key disamakan dengan bebyte/js/data.js (key, tipe)
const CFG_SCHEMA = [
  ['STORE_NAME','str'],['EVENT_NAME','str'],['TAG_LINE','str'],['VERSION','str'],
  ['MASCOT','str'],['LOGO','str'],['RECEIPT_LOGO','bool'],['RECEIPT_FOOTER','str'],
  ['QRIS_STATIC','str'],['DISCORD','bool'],['WEBHOOK_URL','str'],['ROLE_ID_DAPUR','str'],
];
const cleanImg = (s) => String(s ?? '').trim().replace(/^\.\/+/, '');
const LS_KEY = 'bebyte-data-draft-v1';

const menuList = $('#menu-list');
const tplItem = $('#tpl-item');
const tplVariant = $('#tpl-variant');
const preview = $('#preview');
const previewInfo = $('#preview-info');
const saveState = $('#save-state');

// ---------- CONFIG ----------
function getConfig() {
  const o = {};
  CFG_SCHEMA.forEach(([k, t]) => {
    o[k] = t === 'bool' ? ($('#cfg-' + k)?.checked === true) : ($('#cfg-' + k)?.value ?? '').trim();
  });
  return o;
}
function setConfig(c = {}) {
  CFG_SCHEMA.forEach(([k, t]) => {
    const el = $('#cfg-' + k);
    if (!el) return;
    if (t === 'bool') { if (c[k] !== undefined) el.checked = c[k] === true; }
    else if (c[k] != null) el.value = c[k];
  });
}

// ---------- ITEMS ----------
function nextId() {
  const ids = $$('.menu-item [data-f="id"]').map(i => Number(i.value) || 0);
  return (Math.max(0, ...ids)) + 1;
}
function addVariant(listEl, data = {}) {
  const node = tplVariant.content.cloneNode(true);
  const row = node.querySelector('.variant-row');
  row.querySelector('[data-v="name"]').value = data.name ?? '';
  row.querySelector('[data-v="nickname"]').value = data.nickname ?? '';
  row.querySelector('[data-v="desc"]').value = data.desc ?? '';
  row.querySelector('[data-v="active"]').checked = data.active !== false;
  row.querySelector('.btn-del-variant').onclick = () => { row.remove(); sync(); };
  row.querySelectorAll('input').forEach(i => i.addEventListener('input', sync));
  listEl.appendChild(node);
}
function addItem(data = {}) {
  const node = tplItem.content.cloneNode(true);
  const card = node.querySelector('.menu-item');
  const F = (k) => card.querySelector(`[data-f="${k}"]`);
  F('id').value = data.id ?? nextId();
  F('name').value = data.name ?? '';
  F('nickname').value = data.nickname ?? '';
  F('price').value = data.price ?? '';
  F('category').value = data.category ?? '';
  F('img').value = cleanImg(data.img ?? '');
  F('desc').value = data.desc ?? '';
  F('active').checked = data.active !== false;
  F('custom_qty').checked = !!data.custom_qty;
  const hasVar = Array.isArray(data.variants) && data.variants.length > 0;
  F('has_variants').checked = hasVar;
  const box = card.querySelector('.variant-box');
  const vlist = card.querySelector('.variant-list');
  // Nickname item hanya dipakai kalau TANPA varian (d-abi: displayName pakai nickname cuma saat no-variants).
  // Kalau varian aktif -> field di-disable + isi penanda "lihat varian" (biar yg awam tidak bingung);
  // nilai asli disimpan di dataset dan dikembalikan kalau varian dimatikan lagi. Tidak ikut ke data.js.
  const NICK_MARKER = 'lihat varian 👇';
  const refreshNick = () => {
    const off = F('has_variants').checked;
    const inp = F('nickname');
    if (off) {
      if (!inp.disabled && inp.value !== NICK_MARKER) card.dataset.nickSaved = inp.value;
      inp.value = NICK_MARKER;
      inp.disabled = true;
      inp.title = 'Nonaktif: nickname diambil dari masing-masing varian';
    } else {
      inp.disabled = false;
      inp.title = '';
      if (card.dataset.nickSaved !== undefined) {
        if (inp.value === NICK_MARKER) inp.value = card.dataset.nickSaved;
        delete card.dataset.nickSaved;
      }
    }
  };
  const refreshBox = () => box.classList.toggle('hidden', !F('has_variants').checked);
  refreshBox(); refreshNick();
  F('has_variants').addEventListener('change', () => {
    refreshBox(); refreshNick();
    if (F('has_variants').checked && !vlist.children.length) addVariant(vlist);
    sync();
  });
  (data.variants || []).forEach(v => addVariant(vlist, v));
  card.querySelector('.btn-add-variant').onclick = () => { addVariant(vlist); sync(); };
  card.querySelector('.btn-del').onclick = () => {
    if (menuList.children.length === 1) { alert('Minimal 1 item. Kosongkan saja kalau belum ada menu.'); return; }
    if (confirm('Hapus item ini?')) { card.remove(); renumber(); sync(); }
  };
  card.querySelector('.btn-dup').onclick = () => { addItem(readItem(card)); renumber(); sync(); };
  card.querySelectorAll('input').forEach(i => i.addEventListener('input', sync));
  menuList.appendChild(card);
  renumber();
  sync();
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function readItem(card) {
  const F = (k) => card.querySelector(`[data-f="${k}"]`).value.trim();
  const C = (k) => card.querySelector(`[data-f="${k}"]`).checked;
  const item = {
    id: Number(F('id')) || nextId(),
    name: F('name'),
    price: Number(F('price')) || 0,
    category: F('category') || '',
    img: cleanImg(F('img')),
    active: C('active'),
  };
  if (!C('has_variants') && F('nickname')) item.nickname = F('nickname');
  if (F('desc')) item.desc = F('desc');
  if (C('custom_qty')) item.custom_qty = true;
  if (C('has_variants')) {
    item.variants = $$('.variant-row', card).map(r => {
      const V = (k) => r.querySelector(`[data-v="${k}"]`);
      const v = { name: V('name').value.trim() };
      if (V('nickname').value.trim()) v.nickname = V('nickname').value.trim();
      if (V('desc').value.trim()) v.desc = V('desc').value.trim();
      v.active = V('active').checked;
      return v;
    }).filter(v => v.name);
    if (!item.variants.length) item.variants = [{ name: 'Reguler', active: true }];
  } else {
    item.variants = null;
  }
  return item;
}
function collectMenu() {
  return $$('.menu-item', menuList).map(readItem);
}
function renumber() {
  $$('.menu-item', menuList).forEach((c, i) => {
    c.querySelector('.item-title').textContent = `ITEM #${i + 1}`;
  });
  $('#menu-count').textContent = menuList.children.length;
}

// ---------- GENERATE data.js ----------
function generateDataJs() {
  const cfg = getConfig();
  const menu = collectMenu();
  const cfgStr = 'export const CONFIG = ' + JSON.stringify(cfg, null, 2) + ';';
  const menuStr = 'export const MENU = ' + JSON.stringify(menu, null, 2) + ';';
  return cfgStr + '\n' + menuStr + '\n';
}
function sync() {
  try {
    const code = generateDataJs();
    preview.textContent = code;
    const menu = collectMenu();
    previewInfo.textContent = `${menu.length} item • ${code.length} char`;
    localStorage.setItem(LS_KEY, JSON.stringify({ config: getConfig(), menu }));
    saveState.textContent = 'draft tersimpan ✓ ' + new Date().toLocaleTimeString('id-ID');
  } catch (e) { console.warn(e); }
}

// ---------- UPLOAD (parse data.js) ----------
async function parseDataJsFile(file) {
  const text = await file.text();
  // 1) coba dynamic import via blob (paling akurat)
  try {
    const blob = new Blob([text], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const mod = await import(url);
    URL.revokeObjectURL(url);
    if (mod.CONFIG || mod.MENU) return { config: mod.CONFIG || {}, menu: mod.MENU || [] };
  } catch (e) { console.warn('import fail, fallback eval:', e); }
  // 2) fallback: ambil blok export -> eval (MENU = export terakhir, jadi match sampai akhir file)
  const mCfg = text.match(/export\s+const\s+CONFIG\s*=\s*(\{[\s\S]*?\});/);
  const mMenu = text.match(/export\s+const\s+MENU\s*=\s*(\[[\s\S]*\])\s*;/);
  if (!mCfg && !mMenu) throw new Error('Format tidak dikenali (CONFIG/MENU tidak ketemu)');
  const cfg = mCfg ? (new Function('return (' + mCfg[1] + ')'))() : {};
  const menu = mMenu ? (new Function('return (' + mMenu[1] + ')'))() : [];
  return { config: cfg, menu };
}
function loadToForm({ config, menu }) {
  setConfig(config || {});
  menuList.innerHTML = '';
  (menu && menu.length ? menu : [{}]).forEach(m => addItem({
    id: m.id, name: m.name, nickname: m.nickname, desc: m.desc,
    price: m.price, category: m.category, img: m.img,
    active: m.active, custom_qty: m.custom_qty, variants: m.variants,
  }));
  renumber(); sync();
}

// ---------- EVENTS ----------
$('#btn-add-item').onclick = () => addItem();
$('#btn-add-item-2').onclick = () => addItem();
$('#btn-download').onclick = () => {
  const menu = collectMenu();
  if (menu.some(m => !m.name)) { alert('Ada item yang namanya masih kosong!'); return; }
  if (menu.some(m => !m.variants && !m.nickname)) { alert('Ada item TANPA varian yang nickname-nya masih kosong! Nickname wajib diisi kalau tidak pakai varian.'); return; }
  if (menu.some(m => !m.category)) { alert('Ada item yang kategorinya masih kosong! Pilih dari daftar (Nasi, Teh, Kopi, ...).'); return; }
  const code = generateDataJs();
  const blob = new Blob([code], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'data.js';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
$('#btn-copy').onclick = async () => {
  try { await navigator.clipboard.writeText(generateDataJs()); alert('Copied! Paste ke d-abi/js/data.js'); }
  catch { alert('Gagal copy, blok preview manual saja.'); }
};
$('#btn-reset').onclick = () => {
  if (!confirm('Reset semua form ke kosong?')) return;
  localStorage.removeItem(LS_KEY);
  setConfig({ STORE_NAME:'', EVENT_NAME:'', TAG_LINE:'', VERSION:'2026', MASCOT:'', LOGO:'', RECEIPT_LOGO:false, RECEIPT_FOOTER:'-= Terima Kasih =-', QRIS_STATIC:'', DISCORD:true, WEBHOOK_URL:'', ROLE_ID_DAPUR:'' });
  menuList.innerHTML = ''; addItem(); renumber(); sync();
};
$('#btn-upload').onclick = () => { $('#input-upload').value = ''; $('#input-upload').click(); };
$('#input-upload').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const data = await parseDataJsFile(f);
    if (!confirm(`Muat ${data.menu?.length ?? 0} item dari ${f.name}? Form sekarang akan ditimpa.`)) return;
    loadToForm(data);
  } catch (err) { alert('Gagal parse: ' + err.message); }
});
$('#cfg-SHOW_WEBHOOK').addEventListener('change', (e) => {
  $('#cfg-WEBHOOK_URL').type = e.target.checked ? 'text' : 'password';
});
$$('#config-form input, #config-form textarea').forEach(el => { el.addEventListener('input', sync); el.addEventListener('change', sync); });

// ---------- INIT ----------
(function init() {
  try {
    const draft = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (draft && (draft.menu?.length || draft.config)) { loadToForm(draft); return; }
  } catch {}
  // default: contoh 1 item kosong + config d-abi
  // Default dicocokkan dengan /home/darojatun/Projects/bebyte/js/data.js
  // (WEBHOOK_URL & QRIS_STATIC sengaja kosong — kredensial, isi manual per toko)
  setConfig({
    STORE_NAME: 'D`Abi Coffee & Resto',
    EVENT_NAME: 'D`Abi Coffee & Resto🎉',
    TAG_LINE: '🛋️Nongkrong 🍽️Makan 🥤Minum 🎤Karaoke 🎮Mabar 📺Nobar 📶Free WiFi',
    VERSION: '2026',
    MASCOT: 'assets/qr.dc.d-abi.png',
    LOGO: 'assets/d-abi-logo.png',
    RECEIPT_LOGO: false,
    RECEIPT_FOOTER: '-= Terima Kasih =-',
    QRIS_STATIC: '',
    DISCORD: true,
    WEBHOOK_URL: '',
    ROLE_ID_DAPUR: '',
  });
  addItem({ id: 1, name: '', price: '', category: 'Food', img: '', desc: '', active: true, variants: null });
})();
