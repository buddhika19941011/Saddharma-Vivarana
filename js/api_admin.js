/**
 * API Admin – JavaScript
 * Inline Preview with Edit, Copy Sections, and Copy All feature.
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
let pendingSuttaData = null;

// ============================================================
// 3. Utility Functions
// ============================================================
function showAlert(message, type = 'info') {
    const alertBox = document.getElementById('authAlert');
    if (!alertBox) return console.log(`[Alert - ${type}]: ${message}`);
    alertBox.className = 'alert-box hidden';
    alertBox.classList.remove('hidden', 'alert-error', 'alert-success', 'alert-info');
    const typeMap = { error: 'alert-error', success: 'alert-success', info: 'alert-info' };
    alertBox.classList.add(typeMap[type] || 'alert-info');
    alertBox.textContent = message;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================================
// 4. Admin Access & Login
// ============================================================
async function checkAdminAccess() {
    const client = getClient();
    if (!client) return false;
    try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user) {
            document.getElementById('loginSection').classList.remove('hidden');
            document.getElementById('adminContent').classList.add('hidden');
            document.getElementById('userInfoDisplay').classList.add('hidden');
            return false;
        }
        const { data: profile, error: profileError } = await client.from('profiles')
            .select('role, is_blocked').eq('id', user.id).maybeSingle();
        if (profile?.is_blocked === true) {
            alert('ඔබගේ ගිණුම තාවකාලිකව අත්හිටුවා ඇත (Blocked).');
            await client.auth.signOut(); window.location.reload(); return false;
        }
        const adminEmailDisplay = document.getElementById('currentAdminEmail');
        if (adminEmailDisplay) {
            const role = profile?.role || 'viewer';
            adminEmailDisplay.innerText = `${user.email} (${role.toUpperCase()})`;
            document.getElementById('userInfoDisplay').classList.remove('hidden');
        }
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('adminContent').classList.remove('hidden');
        return true;
    } catch (err) { console.error('Admin Check Exception:', err); return false; }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const client = getClient();
    if (!client) return showAlert('පද්ධතිය හා සම්බන්ධ වීමට නොහැකි විය.', 'error');
    const email = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) return showAlert('කරුණාකර ඊමේල් සහ මුරපදය ඇතුළත් කරන්න.', 'error');
    showAlert('ප්‍රවේශ වෙමින් පවතී...', 'info');
    try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showAlert('ප්‍රවේශය සාර්ථකයි!', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) { showAlert('ප්‍රවේශ වීම අසාර්ථකයි: ' + err.message, 'error'); }
}

async function loginWithGoogle() {
    const client = getClient();
    if (!client) return showAlert('Supabase සම්බන්ධතාවය අසාර්ථකයි.', 'error');
    const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/api_admin.html' }
    });
    if (error) showAlert('Google ලොග් වීම අසාර්ථකයි: ' + error.message, 'error');
}

// ============================================================
// 5. Prompt Template
// ============================================================
const DEFAULT_PROMPT_TEMPLATE = 'පහත දක්වා ඇති පාලි පෙළ වචනයෙන් වචනය (Word-by-Word) ඉතාම සවිස්තරාත්මකව, භාෂාමය වශයෙන් විග්‍රහ කර දෙන්න... (ඔබේ මුල් ප්‍රොම්ප්ට් එක මෙහි තබන්න) \n\nපාලි පාඨය:\n${paliText}\n\nඔබගේ පිළිතුර JSON ආකෘතියෙන් පමණක් ලබා දෙන්න.';

function resetPromptTemplate() {
    const promptInput = document.getElementById('customPrompt');
    if (promptInput) {
        promptInput.value = DEFAULT_PROMPT_TEMPLATE.replace('${paliText}', '... [ඔබේ පාලි පාඨය මෙහි ඇතුළත් වේ] ...');
    }
}

// ============================================================
// 6. Gemini AI Import (Triggers Preview)
// ============================================================
async function importViaGemini() {
    const input = document.getElementById('aiPaliInput');
    const promptInput = document.getElementById('customPrompt');
    const modelSelect = document.getElementById('geminiModel');
    const statusDiv = document.getElementById('aiImportStatus');

    if (!input || !statusDiv) return;
    const paliText = input.value.trim();
    if (!paliText) {
        statusDiv.innerHTML = '⚠️ කරුණාකර පාලි පාඨය ඇතුළත් කරන්න.';
        statusDiv.className = 'api-status error'; return;
    }

    let finalPrompt = promptInput ? promptInput.value : DEFAULT_PROMPT_TEMPLATE;
    finalPrompt = finalPrompt.replace(/\$\{paliText\}/g, paliText);
    statusDiv.innerHTML = '⏳ Gemini AI මගින් පාලි පාඨය විග්‍රහ කරමින් පවතී...';
    statusDiv.className = 'api-status';

    try {
        const selectedModel = modelSelect ? modelSelect.value : 'gemini-2.0-flash-lite';
        const client = getClient();
        if (!client) throw new Error('Supabase Client ලබා ගැනීමට නොහැක.');
        const { data: { user }, error: userError } = await client.auth.getUser();
        if (userError || !user) throw new Error('පරිශීලක හැඳුනුම්පත ලබා ගැනීමට නොහැකි විය.');
        const { data: { session } } = await client.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('ප්‍රවේශ ටෝකනය හමු නොවීය.');
        const SUPABASE_URL = client.supabaseUrl || 'https://jtzttfdxoidnypxqlfms.supabase.co';

        const response = await fetch(SUPABASE_URL + '/functions/v1/ai-import-sutta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ paliText, model: selectedModel, prompt: finalPrompt })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'දත්ත ආනයනය අසාර්ථක විය.');
        if (!result.data || typeof result.data !== 'object') throw new Error('Edge Function එකෙන් නිවැරදි දත්ත ලැබී නැත.');

        const analysisData = {
            pali_text: result.data.pali_text || '',
            sutta_id: result.data.sutta_id || null,
            title: result.data.title || null,
            subtitle: result.data.subtitle || null,
            meta_title: result.data.meta_title || null,
            meta_subtitle: result.data.meta_subtitle || null,
            speaker: result.data.speaker || null,
            pitaka: result.data.pitaka || null,
            nikaya: result.data.nikaya || null,
            vagga: result.data.vagga || null,
            category: result.data.category || null,
            word_analysis: result.data.word_analysis || [],
            sandhi_etymology: result.data.sandhi_etymology || [],
            literal_breakdown: result.data.literal_breakdown || [],
            translation: result.data.translation || {},
            disclaimer: result.data.disclaimer || '',
            user_prompt: finalPrompt,
            user_id: user.id
        };

        pendingSuttaData = analysisData;
        displayInlinePreview(analysisData);
        document.getElementById('previewSection').classList.remove('hidden');
        statusDiv.innerHTML = '✅ ප්‍රතිඵලය ලබා ගන්නා ලදී. පහත සංස්කරණය කර "අනුමත කර සුරකින්න" ඔබන්න.';
        statusDiv.className = 'api-status success';

    } catch (err) {
        console.error('Gemini API Error:', err);
        statusDiv.innerHTML = `❌ දෝෂයක්: ${err.message || err}`;
        statusDiv.className = 'api-status error';
    }
}

// ============================================================
// 7. Inline Preview Rendering & Binding
// ============================================================
function displayInlinePreview(data) {
    const container = document.getElementById('previewContainer');
    if (!container) return;

    // Build the editable form dynamically
    const renderField = (id, label, value, isJson = false, fullWidth = false) => {
        const val = isJson ? JSON.stringify(value, null, 2) : (value || '');
        const tag = isJson ? 'textarea' : 'input';
        const rows = isJson ? 'rows="6"' : '';
        const placeholder = isJson ? '{ ... }' : '...';
        return `
            <div class="preview-field ${fullWidth ? 'full-width' : ''}">
                <label>
                    ${label}
                    <button type="button" class="copy-btn" onclick="copySection('${id}')"><i class="fa-regular fa-copy"></i> Copy</button>
                </label>
                <${tag} id="preview-${id}" placeholder="${placeholder}" ${rows} ${!isJson ? 'type="text"' : ''}>${val}</${tag}>
            </div>
        `;
    };

    let html = '';
    // Basic fields (Half width)
    html += renderField('sutta_id', 'Sutta ID', data.sutta_id);
    html += renderField('title', 'Title', data.title);
    html += renderField('subtitle', 'Subtitle', data.subtitle);
    html += renderField('speaker', 'Speaker', data.speaker);
    html += renderField('pitaka', 'Pitaka', data.pitaka);
    html += renderField('nikaya', 'Nikaya', data.nikaya);
    html += renderField('vagga', 'Vagga', data.vagga);
    html += renderField('category', 'Category', data.category);
    
    // Full width JSON / Text areas
    html += renderField('pali_text', 'Pali Text (Original)', data.pali_text, false, true);
    html += renderField('translation', 'Translation (JSON)', data.translation, true, true);
    html += renderField('word_analysis', 'Word Analysis (JSON)', data.word_analysis, true, true);
    html += renderField('sandhi_etymology', 'Sandhi Etymology (JSON)', data.sandhi_etymology, true, true);
    html += renderField('literal_breakdown', 'Literal Breakdown (JSON)', data.literal_breakdown, true, true);
    html += renderField('disclaimer', 'Disclaimer', data.disclaimer, false, true);

    container.innerHTML = html;

    // Attach input listeners to sync data to global object
    const inputs = container.querySelectorAll('input, textarea');
    inputs.forEach(el => {
        el.addEventListener('input', (e) => {
            const id = e.target.id.replace('preview-', '');
            const value = e.target.value;
            
            // Validate JSON if it's a JSON field
            if (id === 'translation' || id === 'word_analysis' || id === 'sandhi_etymology' || id === 'literal_breakdown') {
                try {
                    JSON.parse(value);
                    e.target.classList.remove('invalid-json');
                } catch (err) {
                    e.target.classList.add('invalid-json');
                    return; // Don't update data if invalid JSON
                }
            }
            
            // Update pending data
            if (pendingSuttaData) {
                if (id === 'translation' || id === 'word_analysis' || id === 'sandhi_etymology' || id === 'literal_breakdown') {
                    pendingSuttaData[id] = JSON.parse(value);
                } else {
                    pendingSuttaData[id] = value;
                }
            }
        });
    });
}

// ============================================================
// 8. Copy Functions
// ============================================================
function copySection(id) {
    const el = document.getElementById(`preview-${id}`);
    if (!el) return;
    const text = el.value || el.innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector(`#preview-${id}`).parentElement.querySelector('.copy-btn');
        const origText = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        setTimeout(() => btn.innerHTML = origText, 2000);
    }).catch(err => alert('Copy අසාර්ථකයි: ' + err));
}

function copyAllData() {
    if (!pendingSuttaData) return alert('පිටපත් කිරීමට දත්ත හමු නොවීය.');
    const jsonString = JSON.stringify(pendingSuttaData, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
        alert('✅ සම්පූර්ණ JSON දත්ත ක්ලිප්බෝඩ් එකට පිටපත් කරන ලදී!');
    }).catch(err => alert('Copy All අසාර්ථකයි: ' + err));
}

// ============================================================
// 9. Save Approved Data to Database
// ============================================================
async function saveApprovedData() {
    if (!pendingSuttaData) {
        alert('සුරැකීමට දත්ත හමු නොවීය. කරුණාකර නැවත AI ආනයනය උත්සාහ කරන්න.');
        return;
    }

    const client = getClient();
    if (!client) return alert('Supabase සම්බන්ධතාවය අසාර්ථකයි.');

    const saveBtn = document.querySelector('#previewSection .btn-primary:last-child');
    const origText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> සුරකිමින්...';
    saveBtn.disabled = true;

    try {
        const { error: insertError } = await client.from('sutta_analysis').insert([pendingSuttaData]);
        if (insertError) throw insertError;

        alert('✅ දත්ත සාර්ථකව sutta_analysis වගුවට ඇතුළත් විය!');
        document.getElementById('aiPaliInput').value = '';
        document.getElementById('previewSection').classList.add('hidden');
        pendingSuttaData = null;
        
        // Refresh the imported list below
        await loadSuttasTable();

    } catch (err) {
        console.error('Insert error:', err);
        alert(`❌ සුරැකීම අසාර්ථකයි: ${err.message}`);
    } finally {
        saveBtn.innerHTML = origText;
        saveBtn.disabled = false;
    }
}

// ============================================================
// 10. Load Suttas Table (Fixed to use sutta_analysis)
// ============================================================
async function loadSuttasTable() {
    const tbody = document.getElementById('suttas_table_body');
    if (!tbody) return;
    const client = getClient();
    if (!client) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-msg">Supabase සම්බන්ධතාවය අසාර්ථකයි.</td></tr>';
        return;
    }
    tbody.innerHTML = '<tr><td colspan="4" class="loading-msg">පූරණය වෙමින්...</td></tr>';
    try {
        // Fixed table to 'sutta_analysis'
        const { data, error } = await client.from('sutta_analysis')
            .select('id, title, pitaka, created_at')
            .order('created_at', { ascending: false });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading-msg">කිසිදු සූත්‍රයක් ඇතුළත් කර නැත.</td></tr>';
            return;
        }
        const rowsHtml = data.map(sutta => `
            <tr>
                <td><strong>${escapeHtml(sutta.id)}</strong></td>
                <td>${escapeHtml(sutta.title)}</td>
                <td>${escapeHtml(sutta.pitaka || 'N/A')}</td>
                <td>
                    <a href="sutta_analysis.html" target="_blank" class="action-btn-view">
                        <i class="fa-solid fa-eye"></i> බලන්න
                    </a>
                </td>
            </tr>
        `).join('');
        tbody.innerHTML = rowsHtml;
    } catch (err) {
        console.error('Table load error:', err);
        tbody.innerHTML = `<tr><td colspan="4" class="loading-msg" style="color:#dc2626;">දත්ත ලබා ගැනීමේ දෝෂයකි: ${escapeHtml(err.message)}</td></tr>`;
    }
}

// ============================================================
// 11. Theme Toggle
// ============================================================
function toggleTheme() {
    const htmlEl = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    if (htmlEl.classList.contains('dark')) {
        htmlEl.classList.remove('dark');
        themeIcon.className = 'fa-solid fa-sun';
        localStorage.setItem('theme', 'light');
    } else {
        htmlEl.classList.add('dark');
        themeIcon.className = 'fa-solid fa-moon';
        localStorage.setItem('theme', 'dark');
    }
}

// ============================================================
// 12. Initialization
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    }
    resetPromptTemplate();
    const hasAccess = await checkAdminAccess();
    if (hasAccess) await loadSuttasTable();
});