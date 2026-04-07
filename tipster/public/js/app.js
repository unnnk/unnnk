/* ============================================
   EXP Tips Bot - Shared App Utilities
   ============================================ */

// ─── TOAST ───
const toastContainer = document.getElementById('toast-container');

function showToast(msg, type = 'info', duration = 3500) {
  if (!toastContainer) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.4s'; setTimeout(() => t.remove(), 400); }, duration);
}

// ─── API HELPERS ───
async function apiGet(url) {
  const r = await fetch(url, { credentials: 'include' });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Erro desconhecido');
  return data;
}

async function apiPost(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include'
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Erro desconhecido');
  return data;
}

async function apiPut(url, body) {
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include'
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Erro desconhecido');
  return data;
}

async function apiDelete(url) {
  const r = await fetch(url, { method: 'DELETE', credentials: 'include' });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Erro desconhecido');
  return data;
}

// ─── AUTH ───
let currentUser = null;

async function loadCurrentUser() {
  try {
    const data = await apiGet('/api/auth/me');
    currentUser = data.user;
    return currentUser;
  } catch {
    currentUser = null;
    return null;
  }
}

async function logout() {
  await apiPost('/api/auth/logout', {});
  window.location.href = '/login.html';
}

// ─── RENDER NAVBAR ───
function renderNavbar(activeLink) {
  const nav = document.getElementById('navbar');
  if (!nav || !currentUser) return;

  const isAdmin = currentUser.role === 'admin';
  const initial = currentUser.username.charAt(0).toUpperCase();

  nav.innerHTML = `
    <a href="/portal.html" class="brand">
      <span class="icon">⚡</span>
      EXP Tips Bot
    </a>
    <div class="nav-links">
      <a href="/portal.html" class="${activeLink === 'portal' ? 'active' : ''}">🎯 <span>Tips</span></a>
      <a href="/dashboard.html" class="${activeLink === 'dashboard' ? 'active' : ''}">📊 <span>Meus Resultados</span></a>
      ${isAdmin ? `<a href="/admin.html" class="${activeLink === 'admin' ? 'active' : ''}">⚙️ <span>Admin</span></a>` : ''}
    </div>
    <div class="nav-user">
      <div class="avatar">${initial}</div>
      <span>${currentUser.username}</span>
      ${isAdmin ? '<span class="badge-admin">Admin</span>' : ''}
      <button onclick="logout()" class="btn btn-sm btn-outline" style="padding:5px 10px;font-size:0.78rem;">Sair</button>
    </div>
  `;
}

// ─── SPORT ICONS ───
function sportIcon(sport) {
  const icons = {
    'Futebol': '⚽', 'Basquete': '🏀', 'Tênis': '🎾',
    'Vôlei': '🏐', 'Fórmula 1': '🏎️', 'MMA': '🥊',
    'Futebol Americano': '🏈', 'Beisebol': '⚾', 'Hóquei': '🏒',
    'Rugby': '🏉', 'Ciclismo': '🚴', 'Natação': '🏊'
  };
  return icons[sport] || '🏆';
}

// ─── FORMAT DATE ───
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + (d.includes('T') ? '' : 'T12:00:00'));
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── CONFIDENCE STARS ───
function confidenceStars(n) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < n ? 'filled' : ''}">★</span>`
  ).join('');
}

// ─── STATUS LABEL ───
function statusLabel(tip) {
  if (tip.result === 'won') return '<span class="tip-status-badge won">✅ Ganhou</span>';
  if (tip.result === 'lost') return '<span class="tip-status-badge lost">❌ Perdeu</span>';
  if (tip.status === 'resolved') return '<span class="tip-status-badge resolved">📋 Encerrado</span>';
  return '<span class="tip-status-badge pending">⏳ Pendente</span>';
}
