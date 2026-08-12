// ============================================================
// 1. Supabase Client (ඔබේ පවතින getClient ක්‍රමයම භාවිතා කරයි)
// ============================================================
function getClient() {
    if (typeof window.getAuthSupabaseClient === 'function') {
        return window.getAuthSupabaseClient();
    }
    if (typeof window.supabaseClient !== 'undefined') {
        return window.supabaseClient;
    }
    // Fallback - ඔබේ supabase-config.js නොමැති නම් මෙය භාවිතා වේ
    const SUPABASE_URL = 'https://jtzttfdxoidnypxqlfms.supabase.co';
    // ⚠️ පහත key එක ඔබේ actual ANON_KEY එකෙන් ප්‍රතිස්ථාපනය කරන්න
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0enR0ZmR4b2lkbnlweHFsZm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NDc0MzgsImV4cCI6MjEwMTQyMzQzOH0.6Yfe2ohFoMl6k1SRKM-pjoObXEAy-HJAbpHDcHPvLE0';

    return supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ============================================================
// 2. Global Variables
// ============================================================
let allSuttas = [];
let filteredSuttas = [];
let currentPage = 1;
const PAGE_SIZE = 12;

// ============================================================
// 3. Fetch Data & Render
// ============================================================
async function fetchSuttas() {
    const container = document.getElementById('suttaListContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-msg"><i class="fa-solid fa-spinner fa-spin"></i> දත්ත පූරණය වෙමින්...</div>';

    const client = getClient();
    if (!client) {
        container.innerHTML = '<div class="loading-msg" style="color:#dc2626;">Supabase සම්බන්ධතාවය අසාර්ථකයි.</div>';
        return;
    }

    try {
        const { data, error } = await client.from('sutta_analysis').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allSuttas = data || [];
        // Populate filter dropdowns
        populateFilters(allSuttas);
        // Apply search and filters
        applyFilters();
    } catch (err) {
        console.error('Fetch error:', err);
        container.innerHTML = `<div class="loading-msg" style="color:#dc2626;">දත්ත ලබා ගැනීමේ දෝෂයක්: ${err.message}</div>`;
    }
}

function populateFilters(data) {
    const getUnique = (key) => [...new Set(data.map(item => item[key]).filter(Boolean))];
    const setOptions = (id, values) => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = `<option value="">${select.placeholder || 'සියල්ල'}</option>` +
            values.map(v => `<option value="${v}">${v}</option>`).join('');
    };
    setOptions('filterPitaka', getUnique('pitaka'));
    setOptions('filterNikaya', getUnique('nikaya'));
    setOptions('filterVagga', getUnique('vagga'));
    setOptions('filterCategory', getUnique('category'));
}

// ============================================================
// 4. Filtering & Search
// ============================================================
function applyFilters() {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const pitaka = document.getElementById('filterPitaka').value;
    const nikaya = document.getElementById('filterNikaya').value;
    const vagga = document.getElementById('filterVagga').value;
    const category = document.getElementById('filterCategory').value;

    filteredSuttas = allSuttas.filter(item => {
        // Search match (title, subtitle, sutta_id, speaker, pali_text)
        if (search) {
            const haystack = (item.title + item.subtitle + item.sutta_id + item.speaker + item.pali_text).toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        if (pitaka && item.pitaka !== pitaka) return false;
        if (nikaya && item.nikaya !== nikaya) return false;
        if (vagga && item.vagga !== vagga) return false;
        if (category && item.category !== category) return false;
        return true;
    });

    currentPage = 1;
    renderPage();
}

// Event listeners for filters
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('filterPitaka').addEventListener('change', applyFilters);
    document.getElementById('filterNikaya').addEventListener('change', applyFilters);
    document.getElementById('filterVagga').addEventListener('change', applyFilters);
    document.getElementById('filterCategory').addEventListener('change', applyFilters);
});

// ============================================================
// 5. Pagination & Rendering
// ============================================================
function renderPage() {
    const container = document.getElementById('suttaListContainer');
    const pagination = document.getElementById('paginationControls');
    if (!container) return;

    const total = filteredSuttas.length;
    const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageData = filteredSuttas.slice(start, end);

    if (total === 0) {
        container.innerHTML = '<div class="loading-msg">කිසිදු සූත්‍රයක් හමු නොවීය.</div>';
        pagination.classList.add('hidden');
        return;
    }

    // Build cards
    container.innerHTML = pageData.map(item => `
        <div class="card" onclick="openModal('${item.id}')">
            <h3>${escapeHtml(item.title || 'මාතෘකාවක් නැත')}</h3>
            <span class="sutta-id">${escapeHtml(item.sutta_id || '')}</span>
            <div class="meta">
                ${item.speaker ? `<span>🎙 ${escapeHtml(item.speaker)}</span>` : ''}
                ${item.pitaka ? `<span>${escapeHtml(item.pitaka)}</span>` : ''}
                ${item.nikaya ? `<span>${escapeHtml(item.nikaya)}</span>` : ''}
            </div>
            <div class="pali-snippet">${escapeHtml((item.pali_text || '').substring(0, 80))}${(item.pali_text || '').length > 80 ? '...' : ''}</div>
            <div class="date">📅 ${new Date(item.created_at).toLocaleDateString('si-LK')}</div>
        </div>
    `).join('');

    // Pagination controls
    pagination.classList.remove('hidden');
    document.getElementById('pageIndicator').innerText = `${currentPage} / ${totalPages}`;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
}

function changePage(delta) {
    const totalPages = Math.ceil(filteredSuttas.length / PAGE_SIZE);
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderPage();
    }
}

// ============================================================
// 6. Modal (Detail View)
// ============================================================
async function openModal(id) {
    const modal = document.getElementById('suttaModal');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;

    modal.classList.remove('hidden');
    body.innerHTML = '<div class="loading-msg">පූරණය වෙමින්...</div>';

    // Find item locally (or fetch again to be safe)
    let item = allSuttas.find(s => s.id === id);
    if (!item) {
        // Fetch single record if not in cache
        const client = getClient();
        const { data, error } = await client.from('sutta_analysis').select('*').eq('id', id).single();
        if (error || !data) {
            body.innerHTML = `<div class="loading-msg" style="color:#dc2626;">දත්ත සොයා ගැනීමට නොහැකි විය.</div>`;
            return;
        }
        item = data;
    }

    // Build detail HTML
    const html = `
        <h2 class="detail-title">${escapeHtml(item.title || 'මාතෘකාවක් නැත')}</h2>
        <p class="detail-sub">${escapeHtml(item.subtitle || '')}</p>
        <div class="detail-meta">
            <span>📖 ${escapeHtml(item.sutta_id || 'N/A')}</span>
            ${item.speaker ? `<span>🎙 ${escapeHtml(item.speaker)}</span>` : ''}
            ${item.pitaka ? `<span>📚 ${escapeHtml(item.pitaka)}</span>` : ''}
            ${item.nikaya ? `<span>📚 ${escapeHtml(item.nikaya)}</span>` : ''}
            ${item.vagga ? `<span>📑 ${escapeHtml(item.vagga)}</span>` : ''}
            ${item.category ? `<span>🏷 ${escapeHtml(item.category)}</span>` : ''}
        </div>

        <div class="section">
            <h4>📜 පාළි පෙළ</h4>
            <p style="font-style:italic;background:var(--bg);padding:1rem;border-radius:6px;">${escapeHtml(item.pali_text)}</p>
        </div>

        ${item.translation ? `
        <div class="section">
            <h4>🌐 පරිවර්තනය</h4>
            <div class="json-view">${escapeHtml(JSON.stringify(item.translation, null, 2))}</div>
        </div>` : ''}

        ${item.word_analysis && item.word_analysis.length > 0 ? `
        <div class="section">
            <h4>🔍 වචන විශ්ලේෂණය (Word-by-Word)</h4>
            <div style="overflow-x:auto;">
                <table class="table-view">
                    <thead><tr>
                        <th>#</th><th>පාළි පදය</th><th>ධාතුව</th><th>ධාතු අර්ථය</th><th>ප්‍රත්‍යය</th><th>විභක්තිය</th><th>නිරවද්‍ය අර්ථය</th>
                    </tr></thead>
                    <tbody>
                        ${item.word_analysis.map(w => `
                            <tr>
                                <td>${w.index || '-'}</td>
                                <td>${escapeHtml(w.pali_word)}</td>
                                <td>${escapeHtml(w.root)}</td>
                                <td>${escapeHtml(w.root_meaning)}</td>
                                <td>${escapeHtml(w.suffix)}</td>
                                <td>${escapeHtml(w.case_ending)}</td>
                                <td>${escapeHtml(w.grammatical_meaning)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>` : ''}

        ${item.sandhi_etymology && item.sandhi_etymology.length > 0 ? `
        <div class="section">
            <h4>📖 සන්ධි හා නිරුක්තිය</h4>
            <div class="json-view">${escapeHtml(JSON.stringify(item.sandhi_etymology, null, 2))}</div>
        </div>` : ''}

        ${item.literal_breakdown && item.literal_breakdown.length > 0 ? `
        <div class="section">
            <h4>📝 පියවරෙන් පියවර ව්‍යුත්පත්තිය</h4>
            <ul style="list-style:disc;padding-left:1.5rem;">
                ${item.literal_breakdown.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
            </ul>
        </div>` : ''}

        ${item.disclaimer ? `
        <div class="section" style="border-top:2px solid #dc2626;background:#fef2f2;padding:1rem;border-radius:6px;">
            <h4 style="color:#dc2626;">⚠️ අවවාදය</h4>
            <p>${escapeHtml(item.disclaimer)}</p>
        </div>` : ''}

        ${item.user_prompt ? `
        <div class="section">
            <h4>🤖 භාවිතා කළ ප්‍රොම්ප්ට් එක</h4>
            <div class="json-view">${escapeHtml(item.user_prompt)}</div>
        </div>` : ''}
    `;

    body.innerHTML = html;
}

function closeModal() {
    document.getElementById('suttaModal').classList.add('hidden');
}
// Close modal on click outside
document.getElementById('suttaModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
});
// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ============================================================
// 7. Utility
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ============================================================
// 8. Init
// ============================================================
document.addEventListener('DOMContentLoaded', fetchSuttas);