/**
 * සද්ධර්ම විවරණ - සූත්‍ර කියවීමේ පිටුව (suththra.html සඳහා පමණක්)
 * ගොනුව: js/suththra.js
 */

// ============================================================
// 1. Supabase Client
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
// 2. Global Variables
// ============================================================

let TRIPITAKA_DATABASE = [];
let currentSuttaId = "";
let currentPageMode = 'comparative';
let zoomMultiplier = 1.0;
let currentSearchQuery = "";
let allSuttasForSidebar = [];
let sidebarTreeData = null;

const urlParams = new URLSearchParams(window.location.search);
const suththraIdFromUrl = urlParams.get('id') || '';

// ============================================================
// 3. XSS Protection
// ============================================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================================
// 4. Sidebar Tree Functions
// ============================================================

async function fetchAllSuttas() {
    const client = getClient();
    if (!client) return;

    try {
        const { data, error } = await client
            .from('suththra')
            .select('id, title, pitaka, nikaya, vagga, order_no')
            .order('order_no', { ascending: true });

        if (error) throw error;
        allSuttasForSidebar = data || [];
        return allSuttasForSidebar;
    } catch (err) {
        console.error('සියලු සූත්‍ර ලබා ගැනීමේ දෝෂය:', err);
        return [];
    }
}

function buildTree(suttas) {
    const tree = {};

    suttas.forEach(sutta => {
        const pitaka = sutta.pitaka || 'සූත්‍ර පිටකය';
        const nikaya = sutta.nikaya || 'වෙනත් නිකාය';
        const vagga = sutta.vagga || 'වෙනත් වග්ගය';

        if (!tree[pitaka]) tree[pitaka] = {};
        if (!tree[pitaka][nikaya]) tree[pitaka][nikaya] = {};
        if (!tree[pitaka][nikaya][vagga]) tree[pitaka][nikaya][vagga] = [];

        tree[pitaka][nikaya][vagga].push(sutta);
    });

    return tree;
}

function renderTreeHTML(tree, currentId) {
    let html = '<ul class="tree-root">';

    for (const [pitaka, nikayas] of Object.entries(tree)) {
        html += `<li class="tree-node expanded">
            <div class="node-label" onclick="toggleNode(this)">
                <span class="toggle-icon"><i class="fa-solid fa-chevron-down"></i></span>
                <span class="node-icon"><i class="fa-solid fa-book"></i></span>
                <span class="node-name">${escapeHtml(pitaka)}</span>
            </div>
            <ul class="node-children">`;

        for (const [nikaya, vaggas] of Object.entries(nikayas)) {
            html += `<li class="tree-node expanded">
                <div class="node-label" onclick="toggleNode(this)">
                    <span class="toggle-icon"><i class="fa-solid fa-chevron-down"></i></span>
                    <span class="node-icon"><i class="fa-solid fa-folder-open"></i></span>
                    <span class="node-name">${escapeHtml(nikaya)}</span>
                </div>
                <ul class="node-children">`;

            for (const [vagga, suttaList] of Object.entries(vaggas)) {
                html += `<li class="tree-node expanded">
                    <div class="node-label" onclick="toggleNode(this)">
                        <span class="toggle-icon"><i class="fa-solid fa-chevron-down"></i></span>
                        <span class="node-icon"><i class="fa-solid fa-tags"></i></span>
                        <span class="node-name">${escapeHtml(vagga)}</span>
                    </div>
                    <ul class="node-children">`;

                suttaList.forEach(sutta => {
                    const isActive = (sutta.id === currentId) ? 'active' : '';
                    html += `<li class="tree-node sutta-node ${isActive}">
                        <a href="suththra.html?id=${encodeURIComponent(sutta.id)}" class="node-label">
                            <span class="node-icon"><i class="fa-solid fa-dharmachakra"></i></span>
                            <span class="node-name">${escapeHtml(sutta.title)}</span>
                        </a>
                    </li>`;
                });

                html += `</ul></li>`;
            }

            html += `</ul></li>`;
        }

        html += `</ul></li>`;
    }

    html += '</ul>';
    return html;
}

// ============================================================
// 5. Sidebar Toggle + Close on Main Click
// ============================================================

function toggleSidebar() {
    const sidebar = document.getElementById('suttaSidebar');
    if (!sidebar) return;

    let overlay = document.getElementById('sidebarOverlay');
    const isMobile = window.innerWidth <= 1024;

    if (isMobile && !overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.className = 'sidebar-overlay';
        overlay.onclick = closeSidebar;
        document.body.appendChild(overlay);
    }

    const isOpen = sidebar.classList.toggle('open');
    if (isMobile && overlay) {
        overlay.classList.toggle('active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    const toggleBtn = document.querySelector('.sidebar-toggle-btn');
    if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', isOpen);
    }

    if (isOpen) {
        const closeBtn = sidebar.querySelector('.sidebar-close-btn');
        if (closeBtn) setTimeout(() => closeBtn.focus(), 100);
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('suttaSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
    const toggleBtn = document.querySelector('.sidebar-toggle-btn');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
}

// Close sidebar when clicking on main content area (except sidebar itself)
document.addEventListener('click', function (event) {
    const sidebar = document.getElementById('suttaSidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleBtn = document.querySelector('.sidebar-toggle-btn');

    // If sidebar is open and click is outside sidebar and not on toggle button
    if (sidebar && sidebar.classList.contains('open')) {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnToggle = toggleBtn && toggleBtn.contains(event.target);
        if (!isClickInsideSidebar && !isClickOnToggle) {
            closeSidebar();
        }
    }
});

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        const sidebar = document.getElementById('suttaSidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    }
});

window.addEventListener('resize', function () {
    if (window.innerWidth > 1024) {
        const sidebar = document.getElementById('suttaSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});

function toggleNode(labelEl) {
    const li = labelEl.closest('.tree-node');
    if (!li) return;
    li.classList.toggle('expanded');
}

async function loadSidebarTree(currentId) {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;

    if (allSuttasForSidebar.length === 0) {
        await fetchAllSuttas();
    }

    if (allSuttasForSidebar.length === 0) {
        nav.innerHTML = `<p class="loading-state">කිසිදු සූත්‍රයක් හමු නොවීය.</p>`;
        return;
    }

    const tree = buildTree(allSuttasForSidebar);
    sidebarTreeData = tree;
    const html = renderTreeHTML(tree, currentId);
    nav.innerHTML = html;
}

function filterSidebar(query) {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;
    const links = nav.querySelectorAll('.tree-node.sutta-node');
    const q = query.trim().toLowerCase();

    links.forEach(link => {
        const name = link.querySelector('.node-name')?.textContent?.toLowerCase() || '';
        if (q === '' || name.includes(q)) {
            link.style.display = '';
        } else {
            link.style.display = 'none';
        }
    });
}

// ============================================================
// 6. Database Functions (Sutta Fetch) - JSON.parse එකතු කර ඇත
// ============================================================

async function fetchSuttaFromDatabase(id) {
    const client = getClient();
    if (!client) {
        console.error('Supabase Client ලබා ගැනීමට නොහැකි විය.');
        return;
    }

    try {
        const { data, error } = await client
            .from('suththra')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.error('දත්ත ගැනීමේ දෝෂයක්:', error.message);
            return;
        }

        if (!data) {
            console.warn(`'${id}' ID එක සහිත සූත්‍රයක් Database එකේ හමුවූයේ නැත.`);
            const metaTitle = document.getElementById('metaTitle');
            const metaSubtitle = document.getElementById('metaSubtitle');
            if (metaTitle) metaTitle.innerText = 'සූත්‍රය හමුවූයේ නැත';
            if (metaSubtitle) metaSubtitle.innerText = 'කරුණාකර Database එකෙහි ID එක නිවැරදිදැයි පරීක්ෂා කරන්න.';
            return;
        }

        // *** වැදගත්: JSON string ලෙස එන දත්ත parse කිරීම ***
        if (data.glossary && typeof data.glossary === 'string') {
            try {
                data.glossary = JSON.parse(data.glossary);
            } catch (e) {
                data.glossary = [];
            }
        }
        if (data.passages && typeof data.passages === 'string') {
            try {
                data.passages = JSON.parse(data.passages);
            } catch (e) {
                data.passages = [];
            }
        }

        TRIPITAKA_DATABASE = [data];
        currentSuttaId = data.id;
        renderActivePage();
        loadSidebarTree(currentSuttaId);

        // Update user dropdown with sutta info if needed? Not required.

    } catch (err) {
        console.error('Unexpected Error:', err);
    }
}

// ============================================================
// 7. Search & Highlighting
// ============================================================

function highlightText(text, query) {
    if (!query || !text) return text;
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, `<mark class="search-highlight">$1</mark>`);
}

function searchSutta() {
    const searchInput = document.getElementById('searchQuery');
    if (!searchInput) return;

    const query = searchInput.value.trim().toLowerCase();
    currentSearchQuery = query;

    const searchStatus = document.getElementById('searchStatusInfo');
    const generalInfo = document.getElementById('comparativeGeneralInfo');

    if (query.length > 0) {
        if (searchStatus) searchStatus.classList.remove('hidden');
        if (generalInfo) generalInfo.classList.add('hidden');
    } else {
        if (searchStatus) searchStatus.classList.add('hidden');
        if (generalInfo) generalInfo.classList.remove('hidden');
    }

    const sidebarSearch = document.getElementById('sidebarSearchInput');
    if (sidebarSearch) {
        filterSidebar(query);
    }

    renderActivePage();
}

// ============================================================
// 8. Page Rendering
// ============================================================

function renderActivePage() {
    const setHTML = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    let sutta = null;
    if (Array.isArray(TRIPITAKA_DATABASE)) {
        sutta = TRIPITAKA_DATABASE.find(item => item.id === currentSuttaId);
    }

    if (!sutta) {
        setHTML('metaTitle', `<span class="loading-pulse"><span>ධර්ම කරුණු පූරණය වෙමින් පවතී</span><span class="loading-dot"></span></span>`);
        setText('metaSubtitle', 'දත්ත සමුදායෙන් සූත්‍ර පාඨ ලබාගනිමින් පවතී...');
        setText('metaVagga', '');
        setText('metaCategory', 'පූරණය වෙමින්...');
        setText('metaSpeaker', 'ශ්‍රී සද්ධර්මය');

        const loadingHTML = `<div class="loading-state"><div class="loading-spinner"><i class="fa-solid fa-dharmachakra"></i></div><h3 class="loading-title">ත්‍රිපිටක දත්ත සමුදායෙන් සූත්‍රය පූරණය වේ...</h3><p class="loading-desc">පාලි පාඨ, සිංහල පරිවර්තනයන් සහ පද නිරුක්ති විග්‍රහයන් ලබාගනිමින් පවතී. කරුණාකර මොහොතක් රැඳී සිටින්න.</p></div>`;
        setHTML('comparativeContentTable', loadingHTML);
        setHTML('paliOnlyContent', loadingHTML);
        setHTML('sinhalaOnlyContent', loadingHTML);
        // glossary හිස් කරන්න
        const fullContainer = document.getElementById('fullGlossaryContainer');
        if (fullContainer) fullContainer.innerHTML = '<p class="glossary-empty">පද නිරුක්ති ඇතුළත් කර නැත.</p>';
        return;
    }

    // --- Display Meta Data ---
    setText('metaVagga', sutta.vagga || '');
    setHTML('metaTitle', highlightText(escapeHtml(sutta.title), currentSearchQuery));
    setHTML('metaSubtitle', highlightText(escapeHtml(sutta.subtitle || ''), currentSearchQuery));
    setText('metaCategory', escapeHtml(sutta.category || ''));
    setText('metaSpeaker', escapeHtml(sutta.speaker || ''));

    // --- Render Glossary (only for the full glossary tab) ---
    renderGlossary(sutta.glossary || []);

    // --- Render Passages ---
    if (currentPageMode === 'comparative') {
        renderComparativePage(sutta.passages || []);
    } else if (currentPageMode === 'pali') {
        renderPaliOnlyPage(sutta.passages || []);
    } else if (currentPageMode === 'sinhala') {
        renderSinhalaOnlyPage(sutta.passages || []);
    } else if (currentPageMode === 'glossary-page') {
        // ග්ලොසරි පිටුව සඳහා කිසිදු පාඨයක් නොපෙන්වයි, එය දැනටමත් renderGlossary මගින් පුරවා ඇත.
    }

    applyFontSize();
}

function renderComparativePage(passages) {
    const container = document.getElementById('comparativeContentTable');
    if (!container) return;
    container.innerHTML = '';

    if (!passages || passages.length === 0) {
        container.innerHTML = '<p class="empty-msg">මෙම සූත්‍රය සඳහා ඡේද ඇතුළත් කර නැත.</p>';
        return;
    }

    passages.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'comparative-row';

        const highlightedPali = highlightText(escapeHtml(item.pali), currentSearchQuery);
        const highlightedSinhala = highlightText(escapeHtml(item.sinhala), currentSearchQuery);

        row.innerHTML = `
            <div class="comparative-pali-col">
                <span class="comparative-badge pali-badge">පාලි ඡේදය ${index + 1}</span>
                <p class="pali-text">${highlightedPali}</p>
            </div>
            <div class="comparative-sinhala-col">
                <span class="comparative-badge sinhala-badge">සිංහල පරිවර්තනය ${index + 1}</span>
                <p class="sinhala-text">${highlightedSinhala}</p>
            </div>
        `;
        container.appendChild(row);
    });
}

function renderPaliOnlyPage(passages) {
    const container = document.getElementById('paliOnlyContent');
    if (!container) return;
    container.innerHTML = '';

    if (!passages || passages.length === 0) {
        container.innerHTML = '<p class="empty-msg">මෙම සූත්‍රය සඳහා පාලි ඡේද ඇතුළත් කර නැත.</p>';
        return;
    }

    passages.forEach((item, index) => {
        const block = document.createElement('div');
        block.className = 'pali-only-block';

        const highlightedPali = highlightText(escapeHtml(item.pali), currentSearchQuery);

        block.innerHTML = `
            <div class="pali-block-number">${index + 1}</div>
            <p class="pali-only-text">${highlightedPali}</p>
        `;
        container.appendChild(block);
    });
}

function renderSinhalaOnlyPage(passages) {
    const container = document.getElementById('sinhalaOnlyContent');
    if (!container) return;
    container.innerHTML = '';

    if (!passages || passages.length === 0) {
        container.innerHTML = '<p class="empty-msg">මෙම සූත්‍රය සඳහා සිංහල ඡේද ඇතුළත් කර නැත.</p>';
        return;
    }

    passages.forEach((item, index) => {
        const block = document.createElement('div');
        block.className = 'sinhala-only-block';

        const highlightedSinhala = highlightText(escapeHtml(item.sinhala), currentSearchQuery);

        block.innerHTML = `
            <div class="sinhala-block-header">
                <span class="sinhala-block-number">${index + 1}</span>
                <hr class="sinhala-divider" />
            </div>
            <p class="sinhala-only-text">${highlightedSinhala}</p>
        `;
        container.appendChild(block);
    });
}

// ============================================================
// 9. Glossary Rendering (සරල කර ඇත - "පද නිරුක්ති" ටැබය සඳහා පමණක්)
// ============================================================

function renderGlossary(glossaryList) {
    const fullContainer = document.getElementById('fullGlossaryContainer');
    if (!fullContainer) return;

    fullContainer.innerHTML = '';

    if (!Array.isArray(glossaryList) || glossaryList.length === 0) {
        fullContainer.innerHTML = `<p class="glossary-empty">පද නිරුක්ති ඇතුළත් කර නැත.</p>`;
        return;
    }

    glossaryList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'glossary-card';

        const highlightedWord = highlightText(escapeHtml(item.word), currentSearchQuery);
        const highlightedMeaning = highlightText(escapeHtml(item.meaning), currentSearchQuery);

        card.innerHTML = `
            <span class="glossary-word">${highlightedWord}</span>
            <span class="glossary-meaning">${highlightedMeaning}</span>
        `;
        fullContainer.appendChild(card);
    });
}

// ============================================================
// 10. Navigation
// ============================================================

function navigateToPage(mode) {
    currentPageMode = mode;

    document.querySelectorAll('.page-view').forEach(container => {
        container.classList.add('hidden');
    });

    document.querySelectorAll('[id^="btnPage-"]').forEach(btn => {
        btn.className = 'tab-btn';
    });

    const actualMode = mode === 'glossary-page' ? 'glossary' : mode;
    const activeContainer = document.getElementById(`pageContainer-${actualMode}`);
    if (activeContainer) activeContainer.classList.remove('hidden');

    const activeBtn = document.getElementById(`btnPage-${mode}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    renderActivePage();
}

function loadSuttaById(id) {
    currentSuttaId = id;
    renderActivePage();
    loadSidebarTree(id);
}

// ============================================================
// 11. Font Size Controls
// ============================================================

function changeFontSize(direction) {
    if (direction === 1 && zoomMultiplier < 1.4) {
        zoomMultiplier += 0.1;
    } else if (direction === -1 && zoomMultiplier > 0.8) {
        zoomMultiplier -= 0.1;
    }

    const indicator = document.getElementById('fontSizeIndicator');
    if (indicator) {
        indicator.innerText = `${Math.round(zoomMultiplier * 100)}%`;
    }
    applyFontSize();
    localStorage.setItem('fontSize', zoomMultiplier);
}

function applyFontSize() {
    const paliTexts = document.querySelectorAll('.pali-text, .pali-only-text');
    paliTexts.forEach(el => {
        el.style.fontSize = `${1.1 * zoomMultiplier}rem`;
    });

    const sinhalaTexts = document.querySelectorAll('.sinhala-text, .sinhala-only-text');
    sinhalaTexts.forEach(el => {
        el.style.fontSize = `${0.95 * zoomMultiplier}rem`;
    });

    const glossaryWords = document.querySelectorAll('.glossary-word');
    glossaryWords.forEach(el => {
        el.style.fontSize = `${0.8 * zoomMultiplier}rem`;
    });

    const glossaryMeanings = document.querySelectorAll('.glossary-meaning');
    glossaryMeanings.forEach(el => {
        el.style.fontSize = `${0.7 * zoomMultiplier}rem`;
    });
}

// ============================================================
// 12. Theme Controls
// ============================================================

function toggleTheme() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');

    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
        localStorage.setItem('theme', 'dark');
    }
}

// ============================================================
// 13. User Dropdown Functions
// ============================================================

function toggleDropdown() {
    const menu = document.getElementById('dropdownMenu');
    const btn = document.getElementById('dropdownBtn');
    if (!menu) return;
    const isOpen = menu.classList.toggle('open');
    if (btn) btn.setAttribute('aria-expanded', isOpen);
}

// Close dropdown when clicking outside
document.addEventListener('click', function (event) {
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown) return;
    const menu = document.getElementById('dropdownMenu');
    const btn = document.getElementById('dropdownBtn');
    if (!menu || !btn) return;
    if (!dropdown.contains(event.target)) {
        menu.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
    }
});

// Load user info from Supabase (if available)
async function loadUserInfo() {
    const client = getClient();
    if (!client) return;

    try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user) {
            // User not logged in - show default
            document.getElementById('userDisplayName').textContent = 'ආගන්තුක';
            document.getElementById('userAvatar').src = 'https://placehold.co/30x30/64748b/ffffff?text=G';
            return;
        }

        // User is logged in
        const name = user.user_metadata?.full_name || user.email || 'පරිශීලක';
        document.getElementById('userDisplayName').textContent = name;
        const avatarUrl = user.user_metadata?.avatar_url || `https://placehold.co/30x30/f59e0b/ffffff?text=${name.charAt(0).toUpperCase()}`;
        document.getElementById('userAvatar').src = avatarUrl;
    } catch (err) {
        console.error('User info load error:', err);
        document.getElementById('userDisplayName').textContent = 'ආගන්තුක';
    }
}

// Logout function
async function handleLogout() {
    const client = getClient();
    if (!client) return;

    try {
        await client.auth.signOut();
        window.location.href = 'index.html';
    } catch (err) {
        console.error('Logout error:', err);
        alert('ඉවත් වීමේදී දෝෂයක් ඇති විය. කරුණාකර නැවත උත්සාහ කරන්න.');
    }
}

// ============================================================
// 14. Random Sutta Logic
// ============================================================

async function loadRandomSutta() {
    // If we already have all suttas loaded, pick random
    if (allSuttasForSidebar.length === 0) {
        await fetchAllSuttas();
    }

    if (allSuttasForSidebar.length === 0) {
        console.error('No suttas available to pick random.');
        return;
    }

    const randomIndex = Math.floor(Math.random() * allSuttasForSidebar.length);
    const randomSutta = allSuttasForSidebar[randomIndex];
    if (randomSutta && randomSutta.id) {
        await fetchSuttaFromDatabase(randomSutta.id);
        // Update URL without reload
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('id', randomSutta.id);
        window.history.pushState({}, '', newUrl);
    }
}

// ============================================================
// 15. Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Load saved font size
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        zoomMultiplier = parseFloat(savedFontSize);
        const indicator = document.getElementById('fontSizeIndicator');
        if (indicator) {
            indicator.innerText = `${Math.round(zoomMultiplier * 100)}%`;
        }
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    }

    // Load user info
    await loadUserInfo();

    // Fetch all suttas for sidebar (needed for random selection)
    await fetchAllSuttas();

    // Determine which sutta to load
    if (suththraIdFromUrl) {
        // Load sutta from URL
        currentSuttaId = suththraIdFromUrl;
        await fetchSuttaFromDatabase(suththraIdFromUrl);
    } else {
        // No sutta in URL – load random
        await loadRandomSutta();
    }

    // Setup search listener
    const searchInput = document.getElementById('searchQuery');
    if (searchInput) {
        searchInput.addEventListener('input', searchSutta);
    }

    // Sidebar search listener
    const sidebarSearch = document.getElementById('sidebarSearchInput');
    if (sidebarSearch) {
        sidebarSearch.addEventListener('input', function () {
            filterSidebar(this.value);
        });
    }
});