/**
 * සද්ධර්ම විවරණ - සූත්‍ර කියවීමේ පිටුව (suththra.html සඳහා පමණක්)
 * ගොනුව: js/suththra-page.js
 * 
 * මෙය suththra.js හි සමාන කාර්යයන් ඇතුළත් වේ, නමුත් suththra.html සඳහා පමණක් විශේෂිත වේ.
 * suththra.js වෙනුවට මෙය භාවිතා කළ හැක.
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
// 2. Global Variables
// ============================================================

let TRIPITAKA_DATABASE = [];
let currentSuttaId = "";
let currentPageMode = 'comparative'; // 'comparative', 'pali', 'sinhala', 'glossary-page'
let zoomMultiplier = 1.0;
let currentSearchQuery = "";

// URL එකෙන් සූත්‍රයේ ID එක ලබා ගැනීම
const urlParams = new URLSearchParams(window.location.search);
const suththraIdFromUrl = urlParams.get('id') || '';

// ============================================================
// 3. XSS ආරක්ෂාව සඳහා escape function
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
// 4. Database Functions
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

        TRIPITAKA_DATABASE = [data];
        currentSuttaId = data.id;
        renderActivePage();

    } catch (err) {
        console.error('Unexpected Error:', err);
    }
}

// ============================================================
// 5. Search & Highlighting
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

    const matchedSuttaIds = new Set();
    TRIPITAKA_DATABASE.forEach(sutta => {
        let isMatch = false;

        if (sutta.title.toLowerCase().includes(query) || (sutta.subtitle && sutta.subtitle.toLowerCase().includes(query))) {
            isMatch = true;
        }

        if (sutta.passages) {
            sutta.passages.forEach(passage => {
                if ((passage.pali && passage.pali.toLowerCase().includes(query)) ||
                    (passage.sinhala && passage.sinhala.toLowerCase().includes(query))) {
                    isMatch = true;
                }
            });
        }

        if (sutta.glossary) {
            sutta.glossary.forEach(gloss => {
                if ((gloss.word && gloss.word.toLowerCase().includes(query)) ||
                    (gloss.meaning && gloss.meaning.toLowerCase().includes(query))) {
                    isMatch = true;
                }
            });
        }

        if (isMatch) matchedSuttaIds.add(sutta.id);
    });

    renderActivePage();
}

// ============================================================
// 6. Page Rendering
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
        setHTML('metaTitle', `
            <span class="loading-pulse">
                <span>ධර්ම කරුණු පූරණය වෙමින් පවතී</span>
                <span class="loading-dot"></span>
            </span>`);
        setText('metaSubtitle', 'දත්ත සමුදායෙන් සූත්‍ර පාඨ ලබාගනිමින් පවතී...');
        setText('metaCategory', 'පූරණය වෙමින්...');
        setText('metaSpeaker', 'ශ්‍රී සද්ධර්මය');

        const loadingHTML = `
            <div class="loading-state">
                <div class="loading-spinner">
                    <i class="fa-solid fa-dharmachakra"></i>
                </div>
                <h3 class="loading-title">ත්‍රිපිටක දත්ත සමුදායෙන් සූත්‍රය පූරණය වේ...</h3>
                <p class="loading-desc">පාලි පාඨ, සිංහල පරිවර්තනයන් සහ පද නිරුක්ති විග්‍රහයන් ලබාගනිමින් පවතී. කරුණාකර මොහොතක් රැඳී සිටින්න.</p>
            </div>
        `;

        setHTML('comparativeContentTable', loadingHTML);
        setHTML('paliOnlyContent', loadingHTML);
        setHTML('sinhalaOnlyContent', loadingHTML);

        renderGlossary([]);
        return;
    }

    // Display sutta metadata
    setHTML('metaTitle', highlightText(escapeHtml(sutta.title), currentSearchQuery));
    setHTML('metaSubtitle', highlightText(escapeHtml(sutta.subtitle || ''), currentSearchQuery));
    setText('metaCategory', escapeHtml(sutta.category || ''));
    setText('metaSpeaker', escapeHtml(sutta.speaker || ''));

    // Render glossary
    renderGlossary(sutta.glossary || []);

    // Render passages based on current page mode
    if (currentPageMode === 'comparative') {
        renderComparativePage(sutta.passages || []);
    } else if (currentPageMode === 'pali') {
        renderPaliOnlyPage(sutta.passages || []);
    } else if (currentPageMode === 'sinhala') {
        renderSinhalaOnlyPage(sutta.passages || []);
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
// 7. Glossary Rendering
// ============================================================

function renderGlossary(glossaryList) {
    const bottomContainer = document.getElementById('glossaryContainer');
    const fullContainer = document.getElementById('fullGlossaryContainer');
    if (!bottomContainer || !fullContainer) return;

    bottomContainer.innerHTML = '';
    fullContainer.innerHTML = '';

    if (!glossaryList || glossaryList.length === 0 || !glossaryList[0] || glossaryList[0].word === '') {
        const emptyMsg = `<p class="glossary-empty">පද නිරුක්ති ඇතුළත් කර නැත.</p>`;
        bottomContainer.innerHTML = emptyMsg;
        fullContainer.innerHTML = emptyMsg;
        return;
    }

    // Full glossary
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

    // Bottom glossary preview (first 3 items)
    const previewList = glossaryList.slice(0, 3);
    previewList.forEach(item => {
        const card = document.createElement('div');
        card.className = 'glossary-card preview';

        const highlightedWord = highlightText(escapeHtml(item.word), currentSearchQuery);
        const highlightedMeaning = highlightText(escapeHtml(item.meaning), currentSearchQuery);

        card.innerHTML = `
            <span class="glossary-word">${highlightedWord}</span>
            <span class="glossary-meaning">${highlightedMeaning}</span>
        `;
        bottomContainer.appendChild(card);
    });

    // "View all" button if more than 3
    if (glossaryList.length > 3) {
        const linkBtn = document.createElement('button');
        linkBtn.onclick = () => navigateToPage('glossary-page');
        linkBtn.className = 'glossary-more-btn';
        linkBtn.innerHTML = `
            <span>සම්පූර්ණ පද නිරුක්ති සහ වචනාර්ථ විග්‍රහය බලන්න (සියල්ලම ${glossaryList.length} ක් දක්වන්න)</span>
            <i class="fa-solid fa-arrow-right"></i>
        `;
        bottomContainer.appendChild(linkBtn);
    }

    // Back button
    const backLink = document.createElement('button');
    backLink.onclick = () => { window.location.href = '../index.html'; };
    backLink.className = 'glossary-back-btn';
    backLink.innerHTML = `
        <i class="fa-solid fa-arrow-left"></i>
        <span>-- ධර්ම සංගායනා ව්‍යුහය -- ඔබට අවශ්‍ය සූත්‍ර දේශනාව තෝරාගැනීම සඳහා ප්‍රවේශ වන්න</span>
    `;
    bottomContainer.appendChild(backLink);
}

// ============================================================
// 8. Navigation
// ============================================================

function navigateToPage(mode) {
    currentPageMode = mode;

    // Hide all page views
    document.querySelectorAll('.page-view').forEach(container => {
        container.classList.add('hidden');
    });

    // Reset all tab buttons
    document.querySelectorAll('[id^="btnPage-"]').forEach(btn => {
        btn.className = 'tab-btn';
    });

    // Show the selected page
    const actualMode = mode === 'glossary-page' ? 'glossary' : mode;
    const activeContainer = document.getElementById(`pageContainer-${actualMode}`);
    if (activeContainer) activeContainer.classList.remove('hidden');

    // Activate the corresponding tab button
    const activeBtn = document.getElementById(`btnPage-${mode}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Show/hide bottom glossary
    const bottomGlossary = document.getElementById('bottomGlossarySection');
    if (bottomGlossary) {
        if (mode === 'comparative') {
            bottomGlossary.classList.remove('hidden');
        } else {
            bottomGlossary.classList.add('hidden');
        }
    }

    renderActivePage();
}

function loadSuttaById(id) {
    currentSuttaId = id;
    renderActivePage();
}

// ============================================================
// 9. Font Size Controls
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

    // Save to localStorage
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
}

// ============================================================
// 10. Theme Controls
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
// 11. Sidebar Functions (placeholder - to be implemented if needed)
// ============================================================

function renderSidebarTree() {
    // This function can be implemented to show navigation sidebar
    // Currently empty as per original suththra.js
}

function toggleSidebar() {
    // Sidebar toggle functionality
    // Currently empty as per original suththra.js
}

// ============================================================
// 12. Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load saved font size
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        zoomMultiplier = parseFloat(savedFontSize);
        const indicator = document.getElementById('fontSizeIndicator');
        if (indicator) {
            indicator.innerText = `${Math.round(zoomMultiplier * 100)}%`;
        }
    }

    // 2. Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    }

    // 3. Render sidebar tree (placeholder)
    renderSidebarTree();

    // 4. Fetch sutta from database
    if (suththraIdFromUrl) {
        await fetchSuttaFromDatabase(suththraIdFromUrl);
    } else {
        // If no ID, show a message
        const metaTitle = document.getElementById('metaTitle');
        if (metaTitle) metaTitle.innerText = 'සූත්‍රයක් තෝරාගෙන නැත';
        const metaSubtitle = document.getElementById('metaSubtitle');
        if (metaSubtitle) metaSubtitle.innerText = 'කරුණාකර ප්‍රධාන පිටුවෙන් සූත්‍රයක් තෝරන්න.';
    }

    // 5. Setup search listener
    const searchInput = document.getElementById('searchQuery');
    if (searchInput) {
        searchInput.addEventListener('input', searchSutta);
    }
});