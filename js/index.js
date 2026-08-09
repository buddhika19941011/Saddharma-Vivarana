// ============================================================
// සද්ධර්ම විවරණ – INDEX.HTML පමණක් සඳහා JavaScript
// ගොනුව: js/index.js
// ============================================================

// ==========================================
// 1. UI & Search Functions
// ==========================================

/**
 * සෙවුම් තීරුව මගින් සූත්‍ර පෙරීම
 */
function filterIndex() {
    const searchInput = document.getElementById('searchIndex');
    if (!searchInput) return;

    const query = searchInput.value.trim().toLowerCase();
    const suttaLinks = document.querySelectorAll('.sutta-link');

    suttaLinks.forEach(link => {
        const text = link.textContent.toLowerCase();
        if (text.includes(query)) {
            link.style.display = 'flex';
        } else {
            link.style.display = 'none';
        }
    });
}

/**
 * තේමාව (අඳුරු/ආලෝක) මාරු කිරීම
 */
function toggleTheme() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    if (!themeIcon) return;

    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        themeIcon.className = 'fa-solid fa-sun';
    } else {
        html.classList.add('dark');
        themeIcon.className = 'fa-solid fa-moon';
    }
}

// ==========================================
// 2. Authentication Functions
// ==========================================

/**
 * Google මගින් පිවිසීම
 */
window.loginWithGoogle = async function () {
    const client = typeof window.getAuthSupabaseClient === 'function' ? window.getAuthSupabaseClient() : null;
    if (!client) {
        alert('Supabase සම්බන්ධතාවය තහවුරු කරගත නොහැකි විය. කරුණාකර පිටුව Refresh කරන්න.');
        return;
    }

    const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + '/index.html'
        }
    });

    if (error) {
        console.error('Login Error:', error.message);
        alert('ලොග් වීමේ දෝෂයක් සිදු විය: ' + error.message);
    }
};

/**
 * පිටවීම (Logout)
 */
window.logout = async function () {
    const client = typeof window.getAuthSupabaseClient === 'function' ? window.getAuthSupabaseClient() : null;
    if (client) {
        await client.auth.signOut();
        window.location.reload();
    }
};

/**
 * පරිශීලක සත්‍යාපන තත්ත්වය පරීක්ෂා කර UI යාවත්කාලීන කිරීම
 */
async function checkAuthState() {
    const client = typeof window.getAuthSupabaseClient === 'function' ? window.getAuthSupabaseClient() : null;
    if (!client) return;

    try {
        const { data: { user } } = await client.auth.getUser();
        const authContainer = document.getElementById('authContainer');

        if (user && authContainer) {
            const name = user.user_metadata?.full_name || user.email.split('@')[0] || 'පරිශීලකයා';
            const avatar = user.user_metadata?.avatar_url || 'https://placehold.co/40x40';

            authContainer.innerHTML = `
                <div class="user-badge" style="gap:0.5rem;">
                    <img src="${avatar}" alt="Profile" style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(245,158,11,0.3);" />
                    <span style="font-size:0.7rem;font-weight:700;">${escapeHTML(name)}</span>
                    <button onclick="logout()" style="background:none;border:none;color:#dc2626;font-size:0.8rem;cursor:pointer;" title="ලොග් අවුට් වන්න">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            `;
        }
    } catch (err) {
        console.error("Auth check failed:", err.message);
    }
}

// ==========================================
// 3. Database & Data Fetching
// ==========================================

/**
 * HTML තුළට ඇතුළත් කිරීමට පෙර පෙළ ආරක්ෂිත කිරීම (XSS වැළැක්වීම)
 */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Supabase වෙතින් සූත්‍ර ලබාගෙන පිටක, නිකාය, වග්ග අනුව පෙන්වීම
 */
async function loadSuttasFromDatabase() {
    const accordion = document.getElementById('pitakaAccordion');
    if (!accordion) return;

    const client = typeof window.getAuthSupabaseClient === 'function' ? window.getAuthSupabaseClient() : null;
    if (!client) {
        accordion.innerHTML = `<p class="loading-msg">Supabase සේවාව සම්බන්ධ කර ගැනීමට නොහැකි විය.</p>`;
        return;
    }

    try {
        // ✅ වෙනස් කිරීම: ප්‍රකාශිත (published) සූත්‍ර පමණක් ලබා ගැනීමට පෙරීම
        const { data: suttas, error } = await client
            .from('suththra')
            .select('id, title, pitaka, nikaya, vagga, order_no')
            .eq('status', 'published')
            .order('order_no', { ascending: true });

        if (error) throw error;

        if (!suttas || suttas.length === 0) {
            accordion.innerHTML = `<p class="loading-msg">තවමත් දත්ත සමුදායට සූත්‍ර ඇතුළත් කර නොමැත.</p>`;
            return;
        }

        // දත්ත ව්‍යුහගත කිරීම: pitaka -> nikaya -> vagga -> sutta[]
        const structuredData = {};
        suttas.forEach(sutta => {
            const pitaka = sutta.pitaka || 'සූත්‍ර පිටකය';
            const nikaya = sutta.nikaya || 'වෙනත් නිකාය';
            const vagga = sutta.vagga || 'වෙනත් වග්ගය';

            if (!structuredData[pitaka]) structuredData[pitaka] = {};
            if (!structuredData[pitaka][nikaya]) structuredData[pitaka][nikaya] = {};
            if (!structuredData[pitaka][nikaya][vagga]) structuredData[pitaka][nikaya][vagga] = [];

            structuredData[pitaka][nikaya][vagga].push(sutta);
        });

        let htmlContent = '';

        for (const [pitakaName, nikayas] of Object.entries(structuredData)) {
            htmlContent += `
                <div class="card" style="margin-bottom:1.5rem;">
                    <div class="card-header" style="border-bottom-color:var(--card-border);">
                        <h3 class="card-title" style="font-size:1.1rem;">
                            <i class="fa-solid fa-book-open"></i> ${escapeHTML(pitakaName)}
                        </h3>
                        <span style="font-size:0.65rem;color:var(--text-muted);">ධර්ම දේශනා එකතුව</span>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:1.25rem;">
            `;

            for (const [nikayaName, vaggas] of Object.entries(nikayas)) {
                htmlContent += `
                    <div style="border:1px dashed var(--card-border);border-radius:1rem;padding:1rem;background:var(--input-bg);">
                        <h4 style="font-family:'Abhaya Libre',serif;font-weight:700;font-size:0.9rem;color:var(--text-primary);display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
                            <i class="fa-solid fa-folder-open" style="color:#d97706;"></i> ${escapeHTML(nikayaName)}
                        </h4>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                `;

                for (const [vaggaName, suttaList] of Object.entries(vaggas)) {
                    htmlContent += `
                        <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:0.75rem;padding:0.75rem;box-shadow:var(--shadow);">
                            <h5 style="font-size:0.65rem;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:0.25rem;margin-bottom:0.5rem;">
                                <i class="fa-solid fa-tags" style="font-size:0.6rem;"></i> ${escapeHTML(vaggaName)}
                            </h5>
                            <div style="display:flex;flex-direction:column;gap:0.4rem;">
                    `;

                    suttaList.forEach(sutta => {
                        htmlContent += `
                            <a href="suththra.html?id=${encodeURIComponent(sutta.id)}" class="sutta-link" style="display:flex;align-items:center;justify-content:space-between;padding:0.4rem 0.6rem;border-radius:0.5rem;border:1px solid var(--card-border);background:var(--input-bg);transition:all 0.2s;text-decoration:none;color:var(--text-primary);">
                                <span style="display:flex;align-items:center;gap:0.5rem;font-size:0.75rem;font-weight:600;">
                                    <span style="display:inline-block;width:1.2rem;height:1.2rem;border-radius:50%;background:rgba(16,185,129,0.12);color:#059669;text-align:center;line-height:1.2rem;font-size:0.6rem;">☸</span>
                                    ${escapeHTML(sutta.title)}
                                </span>
                                <i class="fa-solid fa-chevron-right" style="font-size:0.6rem;color:var(--text-muted);transition:transform 0.2s;"></i>
                            </a>
                        `;
                    });

                    htmlContent += `
                            </div>
                        </div>
                    `;
                }

                htmlContent += `
                        </div>
                    </div>
                `;
            }

            htmlContent += `
                    </div>
                </div>
            `;
        }

        accordion.innerHTML = htmlContent;

    } catch (err) {
        console.error('දත්ත පූරණය කිරීමේ දෝෂයක්:', err);
        accordion.innerHTML = `<p class="loading-msg" style="color:#dc2626;">දත්ත සමුදායෙන් සූත්‍ර පූරණය කිරීමේදී දෝෂයක් සිදු විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.</p>`;
    }
}

// ==========================================
// 4. Auth Listener & Profile Sync
// ==========================================

/**
 * සත්‍යාපන තත්ත්වය වෙනස්වීම් සවන්දීම සහ පැතිකඩ යාවත්කාලීන කිරීම
 */
function setupAuthListener() {
    const client = typeof window.getAuthSupabaseClient === 'function' ? window.getAuthSupabaseClient() : null;
    if (!client) return;

    client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            console.log('පරිශීලකයා ප්‍රවේශ විය:', session.user.email);
            await updateUserProfile(session.user);
            checkAuthState(); // UI update කිරීම
        }
        if (event === 'SIGNED_OUT') {
            checkAuthState();
        }
    });
}

/**
 * පරිශීලක පැතිකඩ Supabase වෙත සුරැකීම / යාවත්කාලීන කිරීම
 */
async function updateUserProfile(user) {
    const client = typeof window.getAuthSupabaseClient === 'function' ? window.getAuthSupabaseClient() : null;
    if (!client) return;

    const profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { error } = await client
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

    if (error) {
        console.error('Database එක Update කිරීමේදී දෝෂයක් සිදු විය:', error.message);
    } else {
        console.log('පරිශීලක දත්ත Database එකෙහි සාර්ථකව Update විය.');
    }
}

// ==========================================
// 5. Initialization
// ==========================================

/**
 * පිටුව පූරණය වූ විට ක්‍රියාත්මක වන ආරම්භක කාර්යයන්
 */
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    loadSuttasFromDatabase();
    setupAuthListener();
});