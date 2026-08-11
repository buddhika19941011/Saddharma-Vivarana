/**
 * API Admin – JavaScript (Fixed prompt template reference error)
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
// 2. Alert Messages
// ============================================================
function showAlert(message, type = 'info') {
    const alertBox = document.getElementById('authAlert');
    if (!alertBox) {
        console.log(`[Alert - ${type}]: ${message}`);
        return;
    }
    alertBox.className = 'alert-box';
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
// 3. Admin Access & Login
// ============================================================
async function checkAdminAccess() {
    const client = getClient();
    if (!client) {
        console.error('Supabase Client සක්‍රීය වී නැත.');
        return false;
    }
    try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user) {
            document.getElementById('loginSection').classList.remove('hidden');
            document.getElementById('adminContent').classList.add('hidden');
            document.getElementById('userInfoDisplay').classList.add('hidden');
            return false;
        }
        const { data: profile, error: profileError } = await client.from('profiles')
            .select('role, is_blocked')
            .eq('id', user.id)
            .maybeSingle();
        if (profileError) console.warn('Profile load error:', profileError);
        if (profile?.is_blocked === true) {
            alert('ඔබගේ ගිණුම තාවකාලිකව අත්හිටුවා ඇත (Blocked).');
            await client.auth.signOut();
            window.location.reload();
            return false;
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
    } catch (err) {
        console.error('Admin Check Exception:', err);
        return false;
    }
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
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showAlert('ප්‍රවේශය සාර්ථකයි!', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
        showAlert('ප්‍රවේශ වීම අසාර්ථකයි: ' + err.message, 'error');
    }
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

async function logoutAdmin() {
    const client = getClient();
    if (client) await client.auth.signOut();
    window.location.reload();
}

// ============================================================
// 4. Prompt Template (FIXED: Now uses a literal string, not a template literal)
// ============================================================
const DEFAULT_PROMPT_TEMPLATE = 'පහත දක්වා ඇති පාලි පෙළ වචනයෙන් වචනය (Word-by-Word) ඉතාම සවිස්තරාත්මකව, භාෂාමය වශයෙන් විග්‍රහ කර දෙන්න. ඔබ පාලි භාෂාව පිළිබඳ ශුද්ධ ව්‍යාකරණ හා නිරුක්ති (Etymology) විශේෂඥයෙකු ලෙස කටයුතු කරන්න.\n\nමෙම විග්‍රහය සිදු කිරීමේදී පහත සඳහන් කරුණු දැඩි ලෙස අනුගමනය කරන්න:\n- ආගමික හෝ දාර්ශනික අර්ථකථනයක් කිසිසේත් ඇතුළත් නොකරන්න.\n- ශුද්ධ ව්‍යාකරණ (ධාතු, උපසර්ග, ප්‍රත්‍ය, විභක්ති) සහ නිරුක්ති මූලාර්ථය මත පමණක් පදනම් වූ විද්‍යාත්මක/භාෂාමය විශ්ලේෂණයක් කරන්න.\n\nපහත සඳහන් කොටස් හරියටම ඇතුළත් කරමින් පිළිතුර ව්‍යුහගත කරන්න:\n\n1. වචනයෙන්-වචනය (Word-by-Word) සවිස්තර විග්‍රහ වගුව:\nපහත තීරු සහිත වගුවක් සාදන්න: අංකය | පාලි පදය | සාමාන්‍ය අර්ථය | ධාතුව / මූලය | ධාතු අර්ථය | උපසර්ගය / නිපාතය | ප්‍රත්‍යය (Suffix) | විභක්ති අවසානය (Case Ending) | රූප සිද්ධිය (සැදුම් ක්‍රමය) | ලිංගය, වචනය, විභක්තිය (කාරකය) | නිරවද්‍ය ව්‍යාකරණමය අර්ථය\n\n2. සන්ධි හා ව්‍යුත්පත්ති සටහන්:\nඑක් එක් ප්‍රධාන පදය සැදුණු ආකාරය ධාතු-ප්‍රත්‍ය අතින් පැහැදිලි කරන්න. (උදා: √භූ + අ + එ = භාවයෙ ලෙස)\n\n3. පියවරෙන් පියවර ව්‍යුත්පත්ති අනුපිළිවෙළ (Literal Breakdown):\nඑක් එක් පදයේ අර්ථය අනුපිළිවෙලට තනි තනිව ලියා දෙන්න.\n\n4. ඉතාම නිවරදි, වචනාර්ථානුකූල (Literal) භාෂාමය සිංහල පරිවර්තනය:\nමෙය කොටස් තුනක්ට බෙදන්න:\n- පියවර 1 – ව්‍යුත්පත්ති අනුපිළිවෙළ (මූලයන් ලෙස) : පද පෙළ ගැසීම පමණක් කරන්න.\n- පියවර 2 – ස්වභාවික සිංහල වාක්‍ය ගොඩනැගීම (ව්‍යාකරණමය වශයෙන් ගැලපීම)\n- පියවර 3 – අවසාන පිරිපහදු කළ, නිරවද්‍ය භාෂාමය පරිවර්තනය (වරහන් රහිත)\n\nපාලි පාඨය:\n${paliText}\n\nඔබගේ පිළිතුර JSON ආකෘතියෙන් පමණක් ලබා දෙන්න (අමතර පැහැදිලි කිරීම් හෝ Markdown කේතයක් නොමැතිව). JSON ආකෘතිය පහත පරිදි විය යුතුය:\n{\n  "pali_text": "මුල් පාලි පාඨය",\n  "word_analysis": [\n    {\n      "index": 1,\n      "pali_word": "පදය",\n      "common_meaning": "සාමාන්‍ය අර්ථය",\n      "root": "ධාතුව",\n      "root_meaning": "ධාතු අර්ථය",\n      "prefix": "උපසර්ගය / නිපාතය",\n      "suffix": "ප්‍රත්‍යය",\n      "case_ending": "විභක්ති අවසානය",\n      "formation": "රූප සිද්ධිය",\n      "gender_number_case": "ලිංගය, වචනය, විභක්තිය",\n      "grammatical_meaning": "නිරවද්‍ය ව්‍යාකරණමය අර්ථය"\n    }\n  ],\n  "sandhi_etymology": [\n    {\n      "word": "ප්‍රධාන පදය",\n      "explanation": "ධාතු-ප්‍රත්‍ය සහ සන්ධි පැහැදිලි කිරීම"\n    }\n  ],\n  "literal_breakdown": [\n    "පදය1 අර්ථය",\n    "පදය2 අර්ථය"\n  ],\n  "translation": {\n    "step_1_sequence": "පද පෙළ ගැසීම",\n    "step_2_natural": "ස්වභාවික වාක්‍ය ගොඩනැගීම",\n    "step_3_refined": "අවසාන පිරිපහදු කළ පරිවර්තනය"\n  },\n  "disclaimer": "මෙම විග්‍රහය ආගමික හෝ අධ්‍යාත්මික අර්ථකථනයක් නොවන අතර, පාලි භාෂාවේ ශුද්ධ ව්‍යාකරණ සහ නිරුක්ති මත පදනම් වූ භාෂාමය විශ්ලේෂණයක් පමණි.\n}';

function resetPromptTemplate() {
    const promptInput = document.getElementById('customPrompt');
    if (promptInput) {
        // Replace the placeholder with a generic text
        promptInput.value = DEFAULT_PROMPT_TEMPLATE.replace('${paliText}', '... [ඔබේ පාලි පාඨය මෙහි ඇතුළත් වේ] ...');
    }
}

// ============================================================
// 5. Gemini AI Import
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
        statusDiv.className = 'api-status error';
        return;
    }

    // Prepare the prompt with the user's input
    let finalPrompt = promptInput ? promptInput.value : DEFAULT_PROMPT_TEMPLATE;
    finalPrompt = finalPrompt.replace(/\$\{paliText\}/g, paliText); // FIXED: escaped regex

    statusDiv.innerHTML = '⏳ Gemini AI මගින් පාලි පාඨය විග්‍රහ කරමින් පවතී...';
    statusDiv.className = 'api-status';

    try {
        const selectedModel = modelSelect ? modelSelect.value : 'gemini-2.0-flash-lite';
        const client = getClient();
        if (!client) throw new Error('Supabase Client ලබා ගැනීමට නොහැක.');
        const { data: { user }, error: userError } = await client.auth.getUser();
        if (userError || !user) throw new Error('පරිශීලක හැඳුනුම්පත ලබා ගැනීමට නොහැකි විය. නැවත ලොග් වන්න.');
        const { data: { session } } = await client.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('ප්‍රවේශ ටෝකනය හමු නොවීය. නැවත ලොග් වන්න.');
        const SUPABASE_URL = client.supabaseUrl || 'https://jtzttfdxoidnypxqlfms.supabase.co';

        const response = await fetch(SUPABASE_URL + '/functions/v1/ai-import-sutta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                paliText: paliText,
                model: selectedModel,
                prompt: finalPrompt
            })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'දත්ත ආනයනය අසාර්ථක විය.');
        if (!result.data || typeof result.data !== 'object') throw new Error('Edge Function එකෙන් නිවැරදි දත්ත ලැබී නැත.');

        const analysisData = {
            pali_text: result.data.pali_text || '',
            word_analysis: result.data.word_analysis || [],
            sandhi_etymology: result.data.sandhi_etymology || [],
            literal_breakdown: result.data.literal_breakdown || [],
            translation: result.data.translation || {},
            disclaimer: result.data.disclaimer || '',
            user_id: user.id
        };

        const { error: insertError } = await client.from('sutta_analysis').insert([analysisData]);
        if (insertError) throw insertError;

        statusDiv.innerHTML = `✅ විග්‍රහය සාර්ථකයි! දත්ත "sutta_analysis" වගුවට ඇතුළත් කරන ලදී.`;
        statusDiv.className = 'api-status success';
        input.value = '';
        await loadSuttasTable();

    } catch (err) {
        console.error('Gemini API Error:', err);
        statusDiv.innerHTML = `❌ දෝෂයක්: ${err.message || err}`;
        statusDiv.className = 'api-status error';
    }
}

// ============================================================
// 6. Load Suttas Table
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
        const { data, error } = await client.from('suththra')
            .select('id, title, status')
            .order('id', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="loading-msg">කිසිදු සූත්‍රයක් ඇතුළත් කර නැත.</td></tr>';
            return;
        }
        const rowsHtml = data.map(sutta => {
            const statusDisplay = sutta.status === 'draft' ? 'කටු සටහන' : 'ප්‍රකාශිත';
            const statusClass = sutta.status === 'draft' ? 'status-badge status-badge-blocked' :
                'status-badge status-badge-active';
            return `
                        <tr>
                            <td><strong>${escapeHtml(sutta.id)}</strong></td>
                            <td>${escapeHtml(sutta.title)}</td>
                            <td><span class="${statusClass}">${statusDisplay}</span></td>
                            <td>
                                <a href="suththra.html?id=${encodeURIComponent(sutta.id)}" target="_blank" class="action-btn-view">
                                    <i class="fa-solid fa-eye"></i> බලන්න
                                </a>
                            </td>
                        </tr>
                    `;
        }).join('');
        tbody.innerHTML = rowsHtml;
    } catch (err) {
        console.error('Table load error:', err);
        tbody.innerHTML =
            `<tr><td colspan="4" class="loading-msg" style="color:#dc2626;">දත්ත ලබා ගැනීමේ දෝෂයකි: ${escapeHtml(err.message)}</td></tr>`;
    }
}

// ============================================================
// 7. Theme Toggle
// ============================================================
function toggleTheme() {
    const htmlEl = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    if (!themeIcon) return;
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
// 8. Initialization
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
    if (hasAccess) {
        await loadSuttasTable();
    }
});