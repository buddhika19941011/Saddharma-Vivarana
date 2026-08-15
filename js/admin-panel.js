/**
 * සද්ධර්ම විවරණ - Admin Panel Logic (admin.html සඳහා පමණක්)
 * ගොනුව: js/admin-panel.js
 * 
 * මෙය admin.js හි සමාන කාර්යයන් ඇතුළත් වේ, නමුත් admin.html සඳහා පමණක් විශේෂිත වේ.
 * admin.js වෙනුවට මෙය භාවිතා කළ හැක.
 */

// ============================================================
// 1. Supabase Client ලබා ගැනීම
// ============================================================

function getClient() {
    if (typeof window.getAuthSupabaseClient === 'function') {
        return window.getAuthSupabaseClient();
    }
    // Fallback: auth.js හි ඇති global supabaseClient භාවිතා කරන්න
    if (typeof window.supabaseClient !== 'undefined') {
        return window.supabaseClient;
    }
    console.error('Supabase Client ලබා ගැනීමට නොහැකි විය.');
    return null;
}

// ============================================================
// 2. උපකාරක ශ්‍රිත (Helper Functions)
// ============================================================

function getInputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

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
// 3. Admin Access පරීක්ෂාව
// ============================================================

async function checkAdminAccess() {
    const client = getClient();
    if (!client) {
        console.error('Supabase Client සක්‍රීය වී නැත.');
        return false;
    }

    try {
        const authResponse = await client.auth.getUser();
        const user = authResponse?.data?.user;
        const authError = authResponse?.error;

        if (authError || !user) {
            console.warn('ලොග් වී නොමැත. Login පිටුවට යොමු කෙරේ.');
            window.location.href = 'login.html';
            return false;
        }

        let { data: profile, error: profileError } = await client
            .from('profiles')
            .select('role, is_blocked')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('Database Profile Read Error:', profileError);
        }

        if (!profile && user.email) {
            const { data: emailProfile } = await client
                .from('profiles')
                .select('role, is_blocked')
                .eq('email', user.email)
                .maybeSingle();
            profile = emailProfile;
        }

        const userRole = profile?.role ? String(profile.role).trim().toLowerCase() : 'viewer';
        const isBlocked = profile?.is_blocked || false;

        if (isBlocked) {
            alert('ඔබගේ ගිණුම තාවකාලිකව අත්හිටුවා ඇත.');
            await client.auth.signOut();
            window.location.href = 'login.html';
            return false;
        }

        // Admin හෝ Editor පමණක් admin panel එකට පිවිසිය හැක
        if (userRole !== 'admin' && userRole !== 'editor') {
            alert(`පාලක පුවරුවට පිවිසීමට ඔබට අවසර නොමැත. (වත්මන් Role එක: '${userRole}')`);
            window.location.href = 'index.html';
            return false;
        }

        const adminEmailDisplay = document.getElementById('currentAdminEmail');
        if (adminEmailDisplay) {
            adminEmailDisplay.innerText = `${user.email} (${userRole.toUpperCase()})`;
        }

        // Editor ට User Tab එක නොපෙන්වන්න
        if (userRole === 'editor') {
            const userTabBtn = document.getElementById('btnTab-user');
            if (userTabBtn) {
                userTabBtn.style.display = 'none';
            }
        }

        return true;

    } catch (err) {
        console.error('Admin Check Exception:', err);
        return false;
    }
}

// ============================================================
// 4. Tab Switcher
// ============================================================

function switchTab(tabId) {
    const suttaTab = document.getElementById('sutta_tab');
    const userTab = document.getElementById('user_tab');
    const btnSutta = document.getElementById('btnTab-sutta');
    const btnUser = document.getElementById('btnTab-user');

    if (!suttaTab || !userTab) return;

    // Editor ට User Tab එක නොපෙන්වන්න
    const client = getClient();
    if (client) {
        client.auth.getUser().then(({ data }) => {
            if (data?.user) {
                client.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
                    .then(({ data: profile }) => {
                        if (profile?.role === 'editor' && tabId === 'user_tab') {
                            showToast('ඔබට පරිශීලක නියාමනය සඳහා අවසර නොමැත.', 'error');
                            return;
                        }
                    });
            }
        });
    }

    if (tabId === 'sutta_tab') {
        suttaTab.classList.remove('hidden');
        userTab.classList.add('hidden');
        if (btnSutta) {
            btnSutta.className = 'tab-btn active';
        }
        if (btnUser) {
            btnUser.className = 'tab-btn';
        }
    } else {
        suttaTab.classList.add('hidden');
        userTab.classList.remove('hidden');
        if (btnUser) {
            btnUser.className = 'tab-btn active';
        }
        if (btnSutta) {
            btnSutta.className = 'tab-btn';
        }
        loadUsersTable();
    }
}

// ============================================================
// 5. Input Method Switchers
// ============================================================

function toggleInputMethod() {
    const methodEl = document.getElementById('input_method');
    const lineContainer = document.getElementById('line_by_line_container');
    const fullContainer = document.getElementById('full_text_container');

    if (!methodEl || !lineContainer || !fullContainer) return;

    if (methodEl.value === 'line_by_line') {
        lineContainer.classList.remove('hidden');
        fullContainer.classList.add('hidden');
    } else {
        lineContainer.classList.add('hidden');
        fullContainer.classList.remove('hidden');
    }
}

function toggleGlossaryInputMethod() {
    const methodEl = document.getElementById('glossary_input_method');
    const bulkContainer = document.getElementById('glossary_bulk_container');
    const lineContainer = document.getElementById('glossary_line_container');

    if (!methodEl || !bulkContainer || !lineContainer) return;

    if (methodEl.value === 'bulk_paste') {
        bulkContainer.classList.remove('hidden');
        lineContainer.classList.add('hidden');
    } else {
        bulkContainer.classList.add('hidden');
        lineContainer.classList.remove('hidden');
    }
}

// ============================================================
// 6. Dynamic Rows - Passages
// ============================================================

function addPassageRow(pali = '', sinhala = '') {
    const container = document.getElementById('passages_dynamic_rows');
    if (!container) return;

    const rowId = 'passage_row_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const rowDiv = document.createElement('div');
    rowDiv.id = rowId;
    rowDiv.className = 'dynamic-row';

    rowDiv.innerHTML = `
        <div class="field">
            <label>පාලි ඡේදය</label>
            <textarea class="passage-pali" rows="3"></textarea>
        </div>
        <div class="field">
            <label>සිංහල පරිවර්තනය</label>
            <textarea class="passage-sinhala" rows="3"></textarea>
        </div>
        <button type="button" onclick="removeRow('${rowId}')" class="row-remove-btn" title="ඡේදය ඉවත් කරන්න">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;

    container.appendChild(rowDiv);
    const paliEl = rowDiv.querySelector('.passage-pali');
    const sinhalaEl = rowDiv.querySelector('.passage-sinhala');
    if (paliEl) paliEl.value = pali;
    if (sinhalaEl) sinhalaEl.value = sinhala;
}

function removeRow(rowId) {
    const el = document.getElementById(rowId);
    if (el) el.remove();
}

// ============================================================
// 7. Dynamic Rows - Glossary
// ============================================================

function addGlossaryRow(word = '', meaning = '') {
    const container = document.getElementById('glossary_dynamic_rows');
    if (!container) return;

    const rowId = 'glossary_row_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const rowDiv = document.createElement('div');
    rowDiv.id = rowId;
    rowDiv.className = 'dynamic-row';

    rowDiv.innerHTML = `
        <div class="field">
            <label>පාලි වචනය (Word)</label>
            <input type="text" class="glossary-word" />
        </div>
        <div class="field">
            <label>සිංහල තේරුම (Meaning)</label>
            <input type="text" class="glossary-meaning" />
        </div>
        <button type="button" onclick="removeRow('${rowId}')" class="row-remove-btn" title="වචනය ඉවත් කරන්න">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;

    container.appendChild(rowDiv);
    const wordEl = rowDiv.querySelector('.glossary-word');
    const meaningEl = rowDiv.querySelector('.glossary-meaning');
    if (wordEl) wordEl.value = word;
    if (meaningEl) meaningEl.value = meaning;
}

function removeRow(rowId) {
    const el = document.getElementById(rowId);
    if (el) el.remove();
}

// ============================================================
// 8. Sutta CRUD Operations
// ============================================================

let isSavingSutta = false;

// Save / Update Sutta
document.addEventListener('DOMContentLoaded', function () {
    const suttaForm = document.getElementById('suttaForm');
    if (suttaForm) {
        suttaForm.addEventListener('submit', handleSuttaSubmit);
    }
});

async function handleSuttaSubmit(e) {
    e.preventDefault();

    if (isSavingSutta) {
        showToast('දත්ත සුරැකීම දැනට ක්‍රියාත්මකයි — කරුණාකර රැඳී සිටින්න...', 'info');
        return;
    }

    const client = getClient();
    if (!client) {
        showToast('Supabase සම්බන්ධතාවය අසාර්ථකයි.', 'error');
        return;
    }

    const saveBtn = document.getElementById('saveSuttaBtn');
    const editId = getInputValue('edit_sutta_id');
    const suttaId = getInputValue('sutta_id_input');
    const title = getInputValue('title');
    const status = getInputValue('sutta_status') || 'published'; // Status එක ලබා ගැනීම

    if (!editId && !suttaId) {
        showToast('කරුණාකර සූත්‍ර හඳුනාගැනීමේ අංකය (Sutta ID) ඇතුළත් කරන්න.', 'error');
        return;
    }
    if (!title) {
        showToast('කරුණාකර සූත්‍ර මාතෘකාව ඇතුළත් කරන්න.', 'error');
        return;
    }

    const subtitle = getInputValue('subtitle');
    const order_no = parseInt(getInputValue('order_no'), 10) || 1;
    const pitaka = getInputValue('pitaka');
    const nikaya = getInputValue('nikaya');
    const vagga = getInputValue('vagga');
    const speaker = getInputValue('speaker');
    const category = getInputValue('category');

    // Collect passages
    let passages = [];
    const method = getInputValue('input_method') || 'full_text'; // Default to full_text

    // Only full_text method is now supported effectively
    const fullPali = getInputValue('full_pali_text');
    const fullSinhala = getInputValue('full_sinhala_text');

    const paliParagraphs = fullPali ? fullPali.split(/\n\s*\n/) : [];
    const sinhalaParagraphs = fullSinhala ? fullSinhala.split(/\n\s*\n/) : [];

    const maxLen = Math.max(paliParagraphs.length, sinhalaParagraphs.length);
    for (let i = 0; i < maxLen; i++) {
        const pali = paliParagraphs[i] ? paliParagraphs[i].trim() : '';
        const sinhala = sinhalaParagraphs[i] ? sinhalaParagraphs[i].trim() : '';
        if (pali || sinhala) {
            passages.push({ pali, sinhala });
        }
    }

    // Collect glossary
    let glossary = [];
    const glossaryMethod = getInputValue('glossary_input_method') || 'bulk_paste';

    if (glossaryMethod === 'bulk_paste') {
        const bulkGlossaryText = getInputValue('full_glossary_text');
        if (bulkGlossaryText) {
            const lines = bulkGlossaryText.split(/\n+/);
            let currentSection = 'සාමාන්‍ය';

            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return;

                const sectionMatch = trimmedLine.match(/^(?:පරිච්ඡේද|pariccheda|section)\s*[:\-–]?\s*(.+)$/i);
                if (sectionMatch) {
                    currentSection = sectionMatch[1].trim() || 'සාමාන්‍ය';
                    return;
                }

                const parts = trimmedLine.split(/[-:=–]/);
                if (parts.length >= 2) {
                    const word = parts[0].trim();
                    const meaning = parts.slice(1).join('-').trim();
                    if (word || meaning) {
                        glossary.push({ section: currentSection, word, meaning });
                    }
                }
            });
        }
    } else {
        // Fallback if somehow line_by_line is selected
        const gRows = document.querySelectorAll('#glossary_dynamic_rows > .dynamic-row');
        gRows.forEach(row => {
            const word = row.querySelector('.glossary-word')?.value.trim() || '';
            const meaning = row.querySelector('.glossary-meaning')?.value.trim() || '';
            if (word || meaning) {
                glossary.push({ word, meaning });
            }
        });
    }

    const suttaPayload = {
        title,
        subtitle,
        order_no,
        pitaka,
        nikaya,
        vagga,
        speaker,
        category,
        passages: passages,
        glossary: glossary,
        status: status // Status එක payload එකට ඇතුළත් කිරීම
    };

    // Begin save
    isSavingSutta = true;
    setSuttaFormDisabled(true);
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> සුරකිමින් පවතී...';
    }

    try {
        let result;
        if (editId) {
            result = await client.from('suththra').update(suttaPayload).eq('id', editId);
        } else {
            suttaPayload.id = suttaId;
            result = await client.from('suththra').insert([suttaPayload]);
        }

        if (result.error) throw result.error;

        showToast('සූත්‍ර දත්ත සාර්ථකව සුරක්ෂිත කරන ලදී.', 'success');
        resetSuttaForm();
        await loadSuttasTable();

    } catch (err) {
        console.error('Save error:', err);
        showToast('දත්ත සුරැකීමේදී දෝෂයක්: ' + (err?.message || err), 'error', 7000);
    } finally {
        isSavingSutta = false;
        setSuttaFormDisabled(false);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> සූත්‍රය සුරකින්න';
        }
    }
}

function setSuttaFormDisabled(state) {
    const form = document.getElementById('suttaForm');
    if (!form) return;
    const elements = form.querySelectorAll('input, textarea, select, button');
    elements.forEach(el => {
        if (el.id !== 'saveSuttaBtn') {
            el.disabled = state;
        }
    });
}

// ============================================================
// 9. Reset Form
// ============================================================

function resetSuttaForm() {
    const form = document.getElementById('suttaForm');
    if (form) form.reset();

    const editIdInput = document.getElementById('edit_sutta_id');
    const suttaIdInput = document.getElementById('sutta_id_input');
    const formTitleText = document.getElementById('formTitleText');

    if (editIdInput) editIdInput.value = '';
    if (suttaIdInput) suttaIdInput.disabled = false;
    if (formTitleText) formTitleText.innerText = 'නව සූත්‍ර දේශනාවක් එක් කිරීම';

    const passagesContainer = document.getElementById('passages_dynamic_rows');
    const glossaryContainer = document.getElementById('glossary_dynamic_rows');

    if (passagesContainer) passagesContainer.innerHTML = '';
    if (glossaryContainer) glossaryContainer.innerHTML = '';

    addPassageRow();
    addGlossaryRow();

    const methodEl = document.getElementById('input_method');
    if (methodEl) {
        methodEl.value = 'full_text'; // Default to full_text
        toggleInputMethod();
    }

    const glossaryMethodEl = document.getElementById('glossary_input_method');
    if (glossaryMethodEl) {
        glossaryMethodEl.value = 'bulk_paste';
        toggleGlossaryInputMethod();
    }

    const statusEl = document.getElementById('sutta_status');
    if (statusEl) statusEl.value = 'published'; // Reset status to published
}

// ============================================================
// 10. Load Suttas Table (Status column & View button added)
// ============================================================

async function loadSuttasTable() {
    const tbody = document.getElementById('suttas_table_body');
    if (!tbody) return;

    // Ensure the status column exists in the table header (dynamically)
    const thead = tbody.closest('table').querySelector('thead tr');
    if (thead) {
        let statusTh = thead.querySelector('.status-col');
        if (!statusTh) {
            // Insert Status column before Actions
            const actionTh = thead.querySelector('.text-center');
            if (actionTh) {
                statusTh = document.createElement('th');
                statusTh.className = 'status-col';
                statusTh.textContent = 'තත්ත්වය';
                thead.insertBefore(statusTh, actionTh);
            }
        }
    }

    const client = getClient();
    if (!client) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-msg">Supabase සම්බන්ධතාවය අසාර්ථකයි.</td></tr>';
        return;
    }

    tbody.innerHTML = '<tr><td colspan="6" class="loading-msg">පූරණය වෙමින්...</td></tr>';

    try {
        const { data, error } = await client.from('suththra').select('*').order('order_no', { ascending: true });
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-msg">දැනට කිසිදු සූත්‍රයක් ඇතුළත් කර නැත.</td></tr>';
            return;
        }

        const rowsHtml = data.map(sutta => {
            const encodedId = encodeURIComponent(sutta.id);
            const statusDisplay = sutta.status === 'draft' ? 'කටු සටහන' : 'ප්‍රකාශිත';
            const statusClass = sutta.status === 'draft' ? 'status-badge status-badge-blocked' : 'status-badge status-badge-active';
            return `
                <tr>
                    <td>${sutta.order_no ?? 1}</td>
                    <td><strong>${escapeHtml(sutta.id)}</strong></td>
                    <td>${escapeHtml(sutta.title)}</td>
                    <td>${escapeHtml(sutta.nikaya || '')} (${escapeHtml(sutta.pitaka || '')})</td>
                    <td><span class="${statusClass}">${statusDisplay}</span></td>
                    <td class="text-center">
                        <button onclick="viewSutta(decodeURIComponent('${encodedId}'))" class="action-btn action-btn-view" title="සූත්‍රය බලන්න">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button onclick="editSutta(decodeURIComponent('${encodedId}'))" class="action-btn action-btn-edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="deleteSutta(decodeURIComponent('${encodedId}'))" class="action-btn action-btn-delete">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rowsHtml;

    } catch (err) {
        console.error('Table load error:', err);
        tbody.innerHTML = '<tr><td colspan="6" class="loading-msg" style="color:#dc2626;">දත්ත ලබා ගැනීමේ දෝෂයකි: ' + escapeHtml(err.message) + '</td></tr>';
    }
}

// ============================================================
// 11. View Sutta (New function to open the sutta in a new tab)
// ============================================================

function viewSutta(id) {
    if (id) {
        window.open('suththra.html?id=' + encodeURIComponent(id), '_blank');
    }
}

// ============================================================
// 12. Edit Sutta - Full Text & Bulk Glossary only
// ============================================================

async function editSutta(id) {
    const client = getClient();
    if (!client) {
        showToast('Supabase සම්බන්ධතාවය අසාර්ථකයි.', 'error');
        return;
    }

    try {
        const { data: sutta, error } = await client.from('suththra').select('*').eq('id', id).single();
        if (error) throw error;

        // --- 1. මූලික දත්ත පිරවීම ---
        const editIdInput = document.getElementById('edit_sutta_id');
        const suttaIdInput = document.getElementById('sutta_id_input');
        const titleInput = document.getElementById('title');
        const subtitleInput = document.getElementById('subtitle');
        const orderNoInput = document.getElementById('order_no');
        const pitakaInput = document.getElementById('pitaka');
        const nikayaInput = document.getElementById('nikaya');
        const vaggaInput = document.getElementById('vagga');
        const speakerInput = document.getElementById('speaker');
        const categoryInput = document.getElementById('category');
        const formTitleText = document.getElementById('formTitleText');
        const statusEl = document.getElementById('sutta_status');

        if (editIdInput) editIdInput.value = sutta.id;
        if (suttaIdInput) {
            suttaIdInput.value = sutta.id;
            suttaIdInput.disabled = true;
        }
        if (titleInput) titleInput.value = sutta.title || '';
        if (subtitleInput) subtitleInput.value = sutta.subtitle || '';
        if (orderNoInput) orderNoInput.value = sutta.order_no ?? 1;
        if (pitakaInput) pitakaInput.value = sutta.pitaka || '';
        if (nikayaInput) nikayaInput.value = sutta.nikaya || '';
        if (vaggaInput) vaggaInput.value = sutta.vagga || '';
        if (speakerInput) speakerInput.value = sutta.speaker || '';
        if (categoryInput) categoryInput.value = sutta.category || '';
        if (formTitleText) {
            formTitleText.innerText = 'සූත්‍රය සංස්කරණය කිරීම (' + (sutta.title || '') + ')';
        }
        if (statusEl) statusEl.value = sutta.status || 'published';

        // --- 2. Passages - Full Text Only (Remove line-by-line) ---
        let passagesData = sutta.passages;
        if (typeof passagesData === 'string') {
            try { passagesData = JSON.parse(passagesData); } catch (e) { passagesData = []; }
        }

        const fullPaliEl = document.getElementById('full_pali_text');
        const fullSinhalaEl = document.getElementById('full_sinhala_text');
        const methodEl = document.getElementById('input_method');
        const passagesContainer = document.getElementById('passages_dynamic_rows');

        // Clear any existing line-by-line rows
        if (passagesContainer) passagesContainer.innerHTML = '';

        // Fill the full text areas
        if (Array.isArray(passagesData) && passagesData.length > 0) {
            if (fullPaliEl) fullPaliEl.value = passagesData.map(p => p.pali || '').join('\n\n');
            if (fullSinhalaEl) fullSinhalaEl.value = passagesData.map(p => p.sinhala || '').join('\n\n');
        } else {
            if (fullPaliEl) fullPaliEl.value = '';
            if (fullSinhalaEl) fullSinhalaEl.value = '';
        }

        // Set method to full_text and toggle
        if (methodEl) {
            methodEl.value = 'full_text';
            toggleInputMethod();
        }

        // --- 3. Glossary - Bulk Paste Only (Remove row-by-row) ---
        let glossaryData = sutta.glossary;
        if (typeof glossaryData === 'string') {
            try { glossaryData = JSON.parse(glossaryData); } catch (e) { glossaryData = []; }
        }

        const glossaryContainer = document.getElementById('glossary_dynamic_rows');
        const glossaryMethodEl = document.getElementById('glossary_input_method');
        const bulkGlossaryEl = document.getElementById('full_glossary_text');

        // Clear any existing glossary rows
        if (glossaryContainer) glossaryContainer.innerHTML = '';

        // Fill the bulk glossary text area
        if (Array.isArray(glossaryData) && glossaryData.length > 0) {
            if (bulkGlossaryEl) {
                bulkGlossaryEl.value = glossaryData.map(g => (g.word || '') + ' – ' + (g.meaning || '')).join('\n');
            }
        } else {
            if (bulkGlossaryEl) bulkGlossaryEl.value = '';
        }

        // Set method to bulk_paste and toggle
        if (glossaryMethodEl) {
            glossaryMethodEl.value = 'bulk_paste';
            toggleGlossaryInputMethod();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
        showToast('සංස්කරණය සඳහා දත්ත ලබා ගැනීමේ දෝෂයකි: ' + err.message, 'error');
    }
}

// ============================================================
// 13. Delete Sutta
// ============================================================

async function deleteSutta(id) {
    if (!confirm(`'${id}' අංකනය සහිත සූත්‍ර දේශනාව පද්ධතියෙන් සම්පූර්ණයෙන්ම මකා දැමීමට ඔබට අවශ්‍යද?`)) {
        return;
    }

    const client = getClient();
    if (!client) {
        showToast('Supabase සම්බන්ධතාවය අසාර්ථකයි.', 'error');
        return;
    }

    try {
        const { error } = await client.from('suththra').delete().eq('id', id);
        if (error) throw error;

        showToast('සූත්‍රය සාර්ථකව මකා දමන ලදී.', 'success');
        await loadSuttasTable();
    } catch (err) {
        console.error('Delete error:', err);
        showToast('සූත්‍රය මකා දැමීමේදී දෝෂයක් විය: ' + err.message, 'error');
    }
}

// ============================================================
// 14. Load Users Table
// ============================================================

async function loadUsersTable() {
    const tbody = document.getElementById('users_table_body');
    if (!tbody) return;

    const client = getClient();
    if (!client) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-msg">Supabase සම්බන්ධතාවය අසාර්ථකයි.</td></tr>';
        return;
    }

    tbody.innerHTML = '<tr><td colspan="5" class="loading-msg">පරිශීලක දත්ත පූරණය වෙමින්...</td></tr>';

    try {
        const { data: profiles, error } = await client.from('profiles').select('*');
        if (error) throw error;

        if (!profiles || profiles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading-msg">ලියාපදිංචි පරිශීලකයන් නොමැත.</td></tr>';
            return;
        }

        const rowsHtml = profiles.map(user => {
            const role = user.role || 'viewer';
            const isBlocked = user.is_blocked || false;
            const encodedUserId = encodeURIComponent(user.id);

            const statusBadge = isBlocked
                ? '<span class="status-badge status-badge-blocked">Blocked</span>'
                : '<span class="status-badge status-badge-active">Active</span>';

            return `
                <tr>
                    <td>${escapeHtml(user.full_name || 'නම සඳහන් නැත')}</td>
                    <td>${escapeHtml(user.email || '')}</td>
                    <td><strong>${escapeHtml(role)}</strong></td>
                    <td>${statusBadge}</td>
                    <td class="text-center">
                        <select onchange="updateUserRole(decodeURIComponent('${encodedUserId}'), this.value)" class="role-select">
                            <option value="viewer" ${role === 'viewer' ? 'selected' : ''}>Viewer</option>
                            <option value="editor" ${role === 'editor' ? 'selected' : ''}>Editor</option>
                            <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button onclick="toggleBlockUser(decodeURIComponent('${encodedUserId}'), ${isBlocked})" class="action-btn ${isBlocked ? 'action-btn-unblock' : 'action-btn-block'}">
                            ${isBlocked ? 'Unblock' : 'Block'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rowsHtml;

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-msg" style="color:#dc2626;">පරිශීලකයන් ලබා ගැනීමේ දෝෂයකි: ' + escapeHtml(err.message) + '</td></tr>';
    }
}

// ============================================================
// 15. User Management
// ============================================================

async function updateUserRole(userId, newRole) {
    const client = getClient();
    if (!client) {
        showToast('Supabase සම්බන්ධතාවය අසාර්ථකයි.', 'error');
        return;
    }

    try {
        const { error } = await client.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) throw error;
        showToast('පරිශීලක බලතල (Role) සාර්ථකව යාවත්කාලීන කරන ලදී.', 'success');
        await loadUsersTable();
    } catch (err) {
        showToast('Role යාවත්කාලීන කිරීමේ දෝෂයකි: ' + err.message, 'error');
    }
}

async function toggleBlockUser(userId, currentStatus) {
    if (!confirm('මෙම පරිශීලකයාගේ පිවිසුම් තත්ත්වය වෙනස් කිරීමට අවශ්‍ය බව තහවුරු කරන්න.')) return;

    const client = getClient();
    if (!client) {
        showToast('Supabase සම්බන්ධතාවය අසාර්ථකයි.', 'error');
        return;
    }

    try {
        const { error } = await client.from('profiles').update({ is_blocked: !currentStatus }).eq('id', userId);
        if (error) throw error;
        showToast('පරිශීලක තත්ත්වය සාර්ථකව වෙනස් විය.', 'success');
        await loadUsersTable();
    } catch (err) {
        showToast('තත්ත්වය වෙනස් කිරීමේ දෝෂයකි: ' + err.message, 'error');
    }
}

// ============================================================
// 16. Logout & Theme
// ============================================================

async function logoutAdmin() {
    const client = getClient();
    if (client) {
        await client.auth.signOut();
    }
    window.location.href = 'login.html';
}

function toggleTheme() {
    const htmlEl = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    if (!themeIcon) return;

    if (htmlEl.classList.contains('dark')) {
        htmlEl.classList.remove('dark');
        themeIcon.className = 'fa-solid fa-sun';
    } else {
        htmlEl.classList.add('dark');
        themeIcon.className = 'fa-solid fa-moon';
    }
}

// ============================================================
// 17. Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Admin access පරීක්ෂා කරන්න
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) return;

    // 2. මුලින්ම එක් ඡේදයක් සහ Glossary පේළියක් එක් කරන්න (for new forms)
    addPassageRow();
    addGlossaryRow();

    // 3. සූත්‍ර වගුව පූරණය කරන්න
    await loadSuttasTable();

    // 4. තේමාව පරීක්ෂා කරන්න (පෙර තේමාව මතක තබා ගැනීමට)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    }
});

// තේමාව වෙනස් වන විට localStorage එකේ සුරකින්න
const origToggleTheme = toggleTheme;
toggleTheme = function () {
    origToggleTheme();
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};