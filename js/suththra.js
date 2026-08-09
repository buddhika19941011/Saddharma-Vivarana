/**
 * සද්ධර්ම විවරණ – සූත්‍ර පාඨක පිටුව (suththra.html)
 * ගොනුව: js/suththra.js
 * 
 * කාර්යයන්: සූත්‍ර පෙන්වීම, පැති තීරුව, ටැබ්, සෙවුම, අකුරු ප්‍රමාණය, තේමාව, පරිශීලක.
 */

// ============================================================
// 1. Supabase Client ලබා ගැනීම
// ============================================================

function getClient() {
  if (typeof window.getAuthSupabaseClient === 'function') {
    return window.getAuthSupabaseClient();
  }
  if (typeof window.supabaseClient !== 'undefined') {
    return window.supabaseClient;
  }
  console.error('Supabase Client ලබා ගැනීමට නොහැකි විය.');
  return null;
}

// ============================================================
// 2. උපකාරක ශ්‍රිත
// ============================================================

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info', timeout = 4000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.setAttribute('aria-live', 'polite');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const base = 'toast-message';
  const colours = {
    info: 'toast-info',
    success: 'toast-success',
    error: 'toast-error',
    warning: 'toast-warning'
  };
  toast.className = `${base} ${colours[type] || colours.info}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-fadeout');
    setTimeout(() => toast.remove(), 400);
  }, timeout);
}

// ============================================================
// 3. State
// ============================================================

let currentSuttaId = null;
let allSuttas = []; // මෙටා දත්ත පමණක් ගබඩා කරන අතුරු ලැයිස්තුව
let suttaMap = {};   // සම්පූර්ණ දත්ත (passages සහ glossary ඇතුළුව) සඳහා cache
let currentSearchTerm = '';

// ============================================================
// 4. Sidebar functions (with overlay & page-click close)
// ============================================================

function toggleSidebar() {
  const sidebar = document.getElementById('suttaSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle('open');
  if (overlay) {
    overlay.classList.toggle('active', isOpen);
  }
  const toggleBtn = document.querySelector('.sidebar-toggle-btn');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', isOpen);
  }
  // Prevent body scroll when sidebar is open
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeSidebar() {
  const sidebar = document.getElementById('suttaSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  const toggleBtn = document.querySelector('.sidebar-toggle-btn');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', 'false');
  }
  document.body.style.overflow = '';
}

// Close sidebar when clicking on the main content area (or overlay)
document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  const mainContent = document.getElementById('mainContent');
  if (mainContent) {
    mainContent.addEventListener('click', function(e) {
      const sidebar = document.getElementById('suttaSidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        // If the click is not inside the sidebar, close it
        if (!sidebar.contains(e.target)) {
          closeSidebar();
        }
      }
    });
  }
});

// ============================================================
// 5. Sidebar Tree (මෙටා දත්ත පමණක් භාවිතා කරයි)
// ============================================================

function buildSidebarTree() {
  const nav = document.getElementById('sidebarNav');
  if (!nav) return;

  const tree = {};
  allSuttas.forEach(s => {
    const pitaka = s.pitaka || 'අනෙකුත්';
    const nikaya = s.nikaya || 'අනෙකුත්';
    const vagga = s.vagga || 'අනෙකුත්';
    if (!tree[pitaka]) tree[pitaka] = {};
    if (!tree[pitaka][nikaya]) tree[pitaka][nikaya] = {};
    if (!tree[pitaka][nikaya][vagga]) tree[pitaka][nikaya][vagga] = [];
    tree[pitaka][nikaya][vagga].push(s);
  });

  let html = '<ul class="tree-root">';
  for (const pitaka in tree) {
    html += `<li class="tree-node expanded"><div class="node-label"><span class="toggle-icon"><i class="fa-solid fa-chevron-down"></i></span><span class="node-icon"><i class="fa-solid fa-book"></i></span><span class="node-name">${escapeHtml(pitaka)}</span></div><ul>`;
    for (const nikaya in tree[pitaka]) {
      html += `<li class="tree-node expanded"><div class="node-label"><span class="toggle-icon"><i class="fa-solid fa-chevron-down"></i></span><span class="node-icon"><i class="fa-solid fa-folder"></i></span><span class="node-name">${escapeHtml(nikaya)}</span></div><ul>`;
      for (const vagga in tree[pitaka][nikaya]) {
        const suttas = tree[pitaka][nikaya][vagga];
        html += `<li class="tree-node expanded"><div class="node-label"><span class="toggle-icon"><i class="fa-solid fa-chevron-down"></i></span><span class="node-icon"><i class="fa-solid fa-folder-open"></i></span><span class="node-name">${escapeHtml(vagga)}</span></div><ul>`;
        suttas.sort((a, b) => (a.order_no || 0) - (b.order_no || 0));
        suttas.forEach(s => {
          const active = (s.id === currentSuttaId) ? 'active' : '';
          html += `<li class="tree-node sutta-node ${active}"><div class="node-label" data-sutta-id="${escapeHtml(s.id)}"><span class="node-icon"><i class="fa-solid fa-scroll"></i></span><span class="node-name">${escapeHtml(s.title || s.id)}</span></div></li>`;
        });
        html += `</ul></li>`;
      }
      html += `</ul></li>`;
    }
    html += `</ul></li>`;
  }
  html += '</ul>';

  nav.innerHTML = html;

  // Sidebar click events for sutta navigation
  nav.querySelectorAll('.node-label[data-sutta-id]').forEach(el => {
    el.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.dataset.suttaId;
      if (id) loadSutta(id);
      closeSidebar();
    });
  });

  // Toggle expand/collapse
  nav.querySelectorAll('.tree-node > .node-label .toggle-icon').forEach(icon => {
    icon.addEventListener('click', function(e) {
      e.stopPropagation();
      const parentLi = this.closest('.tree-node');
      if (parentLi) {
        parentLi.classList.toggle('expanded');
        const iconEl = parentLi.querySelector('.toggle-icon i');
        if (iconEl) {
          iconEl.className = parentLi.classList.contains('expanded') ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right';
        }
      }
    });
  });
}

// ============================================================
// 6. Sidebar Filtering (parent categories hide if no children)
// ============================================================

function filterSidebar(query) {
  const nav = document.getElementById('sidebarNav');
  if (!nav) return;
  const items = nav.querySelectorAll('.tree-node.sutta-node');
  const q = query.trim().toLowerCase();
  
  items.forEach(item => {
    const label = item.querySelector('.node-name');
    if (label) {
      const text = label.textContent.toLowerCase();
      const match = text.includes(q);
      item.style.display = match ? '' : 'none';
    }
  });

  // Walk up from sutta-nodes to hide empty parents
  const allParentNodes = nav.querySelectorAll('.tree-root > li, .tree-root ul > li');
  allParentNodes.forEach(parentLi => {
    // Check if this parent contains any visible sutta-node
    const visibleChildren = parentLi.querySelectorAll('.sutta-node');
    let hasVisible = false;
    visibleChildren.forEach(child => {
      if (child.style.display !== 'none') hasVisible = true;
    });
    parentLi.style.display = hasVisible ? '' : 'none';
  });
}

// ============================================================
// 7. Load & Render Sutta (with Lazy Loading)
// ============================================================

async function loadSutta(suttaId) {
  if (!suttaId) return;
  currentSuttaId = suttaId;

  // Check if full data is already cached
  if (suttaMap[suttaId] && suttaMap[suttaId].passages) {
    renderSutta(suttaMap[suttaId]);
    return;
  }

  // Fetch full data from database
  const client = getClient();
  if (!client) {
    showToast('Supabase සම්බන්ධතාවය අසාර්ථකයි.', 'error');
    return;
  }

  try {
    const { data, error } = await client
      .from('suththra')
      .select('*')
      .eq('id', suttaId)
      .single();

    if (error) throw error;
    if (!data) {
      showToast('සූත්‍රය සොයා ගැනීමට නොහැකි විය.', 'error');
      return;
    }

    // Parse JSON fields
    if (typeof data.passages === 'string') {
      try { data.passages = JSON.parse(data.passages); } catch(e) { data.passages = []; }
    }
    if (typeof data.glossary === 'string') {
      try { data.glossary = JSON.parse(data.glossary); } catch(e) { data.glossary = []; }
    }

    // Cache and render
    suttaMap[suttaId] = data;
    renderSutta(data);
  } catch (err) {
    console.error('Load sutta error:', err);
    showToast('සූත්‍රය පූරණය කිරීමේ දෝෂයකි: ' + err.message, 'error');
  }
}

function renderSutta(data) {
  if (!data) return;

  document.getElementById('metaVagga').textContent = data.vagga || 'වග්ගය සඳහන් නැත';
  document.getElementById('metaTitle').textContent = data.title || 'නම් රහිත සූත්‍රය';
  document.getElementById('metaSubtitle').textContent = data.subtitle || '';
  document.getElementById('metaSpeaker').textContent = data.speaker || 'භාග්‍යවතුන් වහන්සේ';

  const passages = data.passages || [];
  renderComparative(passages);
  renderPali(passages);
  renderSinhala(passages);

  const glossary = data.glossary || [];
  renderGlossary(glossary);

  if (history.pushState) {
    const url = new URL(window.location);
    url.searchParams.set('id', data.id);
    history.pushState({ suttaId: data.id }, '', url);
  }
  document.title = data.title + ' – ත්‍රිපිටක පාලි-සිංහල පරිවර්තනය';

  // Re-apply search highlight if there is a current search term
  if (currentSearchTerm) {
    highlightSearch(currentSearchTerm);
  }
}

// ============================================================
// 8. Tabs (with search status reset)
// ============================================================

function navigateToPage(page) {
  document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
  const container = document.getElementById('pageContainer-' + page);
  if (container) container.classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById('btnPage-' + page);
  if (activeBtn) activeBtn.classList.add('active');

  // Reset search highlighting and status when switching tabs
  const statusEl = document.getElementById('searchStatusInfo');
  if (statusEl) statusEl.classList.add('hidden');
  currentSearchTerm = '';
  // Clear all highlights
  document.querySelectorAll('.search-highlight').forEach(el => {
    const parent = el.parentNode;
    parent.replaceChild(document.createTextNode(el.textContent), el);
    parent.normalize();
  });
}

// ============================================================
// 9. Render functions (comparative, pali, sinhala, glossary)
// ============================================================

function renderComparative(passages) {
  const container = document.getElementById('comparativeContentTable');
  if (!container) return;
  if (!passages || passages.length === 0) {
    container.innerHTML = '<p class="empty-msg">මෙම සූත්‍රය සඳහා ඡේද නොමැත.</p>';
    return;
  }
  let html = '';
  passages.forEach((p, idx) => {
    const paliText = escapeHtml(p.pali || '');
    const sinhalaText = escapeHtml(p.sinhala || '');
    html += `
      <div class="comparative-row">
        <div class="comparative-pali-col">
          <span class="comparative-badge pali-badge">පාලි</span>
          <div class="pali-text">${paliText}</div>
        </div>
        <div class="comparative-sinhala-col">
          <span class="comparative-badge sinhala-badge">සිංහල</span>
          <div class="sinhala-text">${sinhalaText}</div>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderPali(passages) {
  const container = document.getElementById('paliOnlyContent');
  if (!container) return;
  if (!passages || passages.length === 0) {
    container.innerHTML = '<p class="empty-msg">පාලි ඡේද නොමැත.</p>';
    return;
  }
  let html = '';
  passages.forEach((p, idx) => {
    const paliText = escapeHtml(p.pali || '');
    html += `
      <div class="pali-only-block">
        <div class="pali-block-number">${idx + 1}</div>
        <div class="pali-only-text">${paliText}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderSinhala(passages) {
  const container = document.getElementById('sinhalaOnlyContent');
  if (!container) return;
  if (!passages || passages.length === 0) {
    container.innerHTML = '<p class="empty-msg">සිංහල ඡේද නොමැත.</p>';
    return;
  }
  let html = '';
  passages.forEach((p, idx) => {
    const sinhalaText = escapeHtml(p.sinhala || '');
    html += `
      <div class="sinhala-only-block">
        <div class="sinhala-block-header">
          <span class="sinhala-block-number">${idx + 1}</span>
          <hr class="sinhala-divider" />
        </div>
        <div class="sinhala-only-text">${sinhalaText}</div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderGlossary(glossary) {
  const container = document.getElementById('fullGlossaryContainer');
  if (!container) return;
  if (!glossary || glossary.length === 0) {
    container.innerHTML = '<div class="glossary-empty">මෙම සූත්‍රය සඳහා පද නිරුක්ති නොමැත.</div>';
    return;
  }
  let html = '';
  glossary.forEach(g => {
    const word = escapeHtml(g.word || '');
    const meaning = escapeHtml(g.meaning || '');
    html += `
      <div class="glossary-card">
        <span class="glossary-word">${word}</span>
        <span class="glossary-meaning">${meaning}</span>
      </div>
    `;
  });
  container.innerHTML = html;
}

// ============================================================
// 10. Search (XSS-safe with data-original-text, extended to Glossary)
// ============================================================

function searchSutta() {
  const input = document.getElementById('searchQuery');
  if (!input) return;
  const term = input.value.trim();
  currentSearchTerm = term;
  const statusEl = document.getElementById('searchStatusInfo');
  if (statusEl) {
    if (term) {
      statusEl.classList.remove('hidden');
      statusEl.textContent = `“${escapeHtml(term)}” සඳහා කහ පැහැයෙන් ඉස්මතු කර ඇත.`;
    } else {
      statusEl.classList.add('hidden');
    }
  }
  highlightSearch(term);
}

function highlightSearch(term) {
  // Reset to original text using data-original-text attribute
  document.querySelectorAll('[data-original-text]').forEach(el => {
    el.textContent = el.dataset.originalText;
  });

  if (!term) return;

  // ✅ වෙනස් කිරීම: සෙවීමට අදාළ සියලුම කන්ටේනර් ඇතුළත් කර ඇත (Glossary ඇතුළුව)
  const containers = [
    document.getElementById('comparativeContentTable'),
    document.getElementById('paliOnlyContent'),
    document.getElementById('sinhalaOnlyContent'),
    document.getElementById('fullGlossaryContainer') // පද නිරුක්ති සඳහා එකතු කරන ලදී
  ];

  containers.forEach(container => {
    if (!container) return;
    // ✅ වෙනස් කිරීම: Glossary වල ඇති වචන සහ තේරුම් ද සොයා ගැනීමට
    const elements = container.querySelectorAll(
      '.pali-text, .sinhala-text, .pali-only-text, .sinhala-only-text, ' +
      '.glossary-word, .glossary-meaning'
    );
    elements.forEach(el => {
      // Save original text if not already saved
      if (!el.dataset.originalText) {
        el.dataset.originalText = el.textContent;
      }
      const text = el.textContent;
      if (!text) return;
      const regex = new RegExp(escapeRegex(term), 'gi');
      if (!regex.test(text)) return;
      const parts = text.split(regex);
      const matches = text.match(regex);
      if (!matches) return;
      let newHtml = '';
      for (let i = 0; i < parts.length; i++) {
        newHtml += escapeHtml(parts[i]);
        if (i < matches.length) {
          newHtml += `<span class="search-highlight">${escapeHtml(matches[i])}</span>`;
        }
      }
      el.innerHTML = newHtml;
    });
  });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// 11. Font size & Theme (Resize only text data inside the 4 tabs)
// ============================================================

// ✅ වෙනස් කිරීම: අකුරු ප්‍රමාණය වෙනස් වන්නේ පාඨ දත්ත අඩංගු මූලද්‍රව්‍ය සඳහා පමණි
function changeFontSize(delta) {
  // Target only the text containers inside the reader card
  const textElements = document.querySelectorAll(
    '.comparative-row .pali-text, .comparative-row .sinhala-text, ' +
    '.pali-only-block .pali-only-text, .sinhala-only-block .sinhala-only-text, ' +
    '.glossary-card .glossary-word, .glossary-card .glossary-meaning'
  );
  
  if (!textElements.length) return;
  
  // Get current font size from the first element
  let current = parseFloat(getComputedStyle(textElements[0]).fontSize);
  let newSize = current + delta * 2;
  if (newSize < 12) newSize = 12;
  if (newSize > 26) newSize = 26;
  
  textElements.forEach(el => {
    el.style.fontSize = newSize + 'px';
  });
  
  // Update percentage based on base 18px
  document.getElementById('fontSizeIndicator').textContent = Math.round((newSize / 18) * 100) + '%';
}

function toggleTheme() {
  const html = document.documentElement;
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  const isDark = html.classList.toggle('dark');
  icon.className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// ============================================================
// 12. User dropdown & logout (show full name instead of email)
// ============================================================

function toggleDropdown() {
  const menu = document.getElementById('dropdownMenu');
  if (menu) {
    menu.classList.toggle('open');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('userDropdown');
    const menu = document.getElementById('dropdownMenu');
    if (dropdown && menu && !dropdown.contains(e.target)) {
      menu.classList.remove('open');
    }
  });
});

async function handleLogout() {
  const client = getClient();
  if (client) {
    await client.auth.signOut();
  }
  window.location.href = 'login.html';
}

async function loadUserInfo() {
  const client = getClient();
  if (!client) return;

  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) {
      document.getElementById('userDisplayName').textContent = 'ආගන්තුක';
      document.getElementById('userAvatar').src = 'https://placehold.co/30x30/9ca3af/ffffff?text=G';
      return;
    }

    const { data: profile } = await client
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    // Use full_name from profile, else fallback to metadata, then email, then default
    const name = profile?.full_name || user.user_metadata?.full_name || user.email || 'පරිශීලක';
    document.getElementById('userDisplayName').textContent = name;
    if (profile?.avatar_url) {
      document.getElementById('userAvatar').src = profile.avatar_url;
    } else {
      document.getElementById('userAvatar').src = `https://placehold.co/30x30/f59e0b/ffffff?text=${name.charAt(0).toUpperCase()}`;
    }
  } catch (err) {
    console.warn('User info load error:', err);
    document.getElementById('userDisplayName').textContent = 'ආගන්තුක';
  }
}

// ============================================================
// 13. Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', async function() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    document.getElementById('themeIcon').className = 'fa-solid fa-moon';
  }

  await loadUserInfo();

  const client = getClient();
  if (client) {
    try {
      // Load ONLY metadata initially for performance
      const { data, error } = await client
        .from('suththra')
        .select('id, pitaka, nikaya, vagga, title, order_no')
        .order('order_no', { ascending: true });

      if (error) throw error;
      allSuttas = data || [];
      // Populate suttaMap with metadata (passages and glossary will be loaded on demand)
      allSuttas.forEach(s => {
        suttaMap[s.id] = { ...s }; // store metadata initially
      });

      buildSidebarTree();

      const params = new URLSearchParams(window.location.search);
      const suttaId = params.get('id');
      if (suttaId && suttaMap[suttaId]) {
        // Attempt to load full data (will fetch if not already cached)
        await loadSutta(suttaId);
        const nav = document.getElementById('sidebarNav');
        if (nav) {
          nav.querySelectorAll('.tree-node.sutta-node').forEach(li => {
            li.classList.toggle('active', li.querySelector('.node-label')?.dataset?.suttaId === suttaId);
          });
        }
      } else if (suttaId) {
        await loadSutta(suttaId);
      } else if (allSuttas.length > 0) {
        const first = allSuttas[0];
        await loadSutta(first.id);
        const url = new URL(window.location);
        url.searchParams.set('id', first.id);
        history.replaceState({ suttaId: first.id }, '', url);
      } else {
        showToast('කිසිදු සූත්‍රයක් හමු නොවීය.', 'warning');
      }
    } catch (err) {
      console.error('Initialization error:', err);
      showToast('දත්ත පූරණය අසාර්ථකයි: ' + err.message, 'error');
    }
  } else {
    showToast('Supabase සම්බන්ධතාවය අසාර්ථකයි.', 'error');
  }

  // Update font indicator based on default size
  const defaultText = document.querySelector('.pali-text, .sinhala-text, .pali-only-text, .sinhala-only-text, .glossary-word');
  const baseFontSize = defaultText ? parseFloat(getComputedStyle(defaultText).fontSize) : 18;
  const percent = Math.round((baseFontSize / 18) * 100);
  document.getElementById('fontSizeIndicator').textContent = percent + '%';
});

// ============================================================
// 14. Toast styles (injected)
// ============================================================
(function injectToastStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .toast-container {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 320px;
    }
    .toast-message {
      padding: 0.75rem 1rem;
      border-radius: 0.75rem;
      background: var(--card-bg, #fff);
      color: var(--text-primary, #1e1a17);
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      border-left: 4px solid #f59e0b;
      font-size: 0.75rem;
      font-weight: 500;
      transition: opacity 0.3s ease, transform 0.3s ease;
      opacity: 1;
      transform: translateY(0);
    }
    .toast-message.toast-fadeout {
      opacity: 0;
      transform: translateY(10px);
    }
    .toast-success { border-left-color: #22c55e; }
    .toast-error { border-left-color: #ef4444; }
    .toast-warning { border-left-color: #f59e0b; }
    .toast-info { border-left-color: #3b82f6; }
  `;
  document.head.appendChild(style);
})();