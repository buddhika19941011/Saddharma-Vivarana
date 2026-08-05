/**
 * ============================================================
 * සද්ධර්ම විවරණ - පිවිසුම් පිටුවේ (login.html) තර්කනය
 * ගොනුව: js/login.js
 * 
 * මෙම ගොනුව මගින් පරිශීලක පිවිසීම, ලියාපදිංචිය, 
 * Google/Facebook/Apple සමාජ ජාල ඔස්සේ පිවිසීම, 
 * මුරපද දෘශ්‍යතාව වෙනස් කිරීම, තේමාව මාරු කිරීම ආදිය හසුරුවයි.
 * ============================================================
 */

// ============================================================
// 1. Supabase Client ලබා ගැනීම
// ============================================================

/**
 * Supabase Client එක ලබා ගැනීම සඳහා උපකාරක ශ්‍රිතය
 * auth.js හි ඇති getAuthSupabaseClient ශ්‍රිතය භාවිතා කරයි.
 * @returns {object|null} Supabase Client එක හෝ නොමැති නම් null
 */
function getClient() {
    if (typeof window.getAuthSupabaseClient === 'function') {
        return window.getAuthSupabaseClient();
    }
    console.error('getAuthSupabaseClient ශ්‍රිතය නොමැත. auth.js නිවැරදිව load වී ඇත්දැයි පරීක්ෂා කරන්න.');
    return null;
}

// ============================================================
// 2. පරිශීලක සත්‍යාපන තත්ත්වය පරීක්ෂා කිරීම
// ============================================================

/**
 * වත්මන් පරිශීලක සත්‍යාපන තත්ත්වය පරීක්ෂා කර UI යාවත්කාලීන කරයි.
 * මෙය පිටුව පූරණය වූ විට සහ auth state වෙනස් වන සෑම විටම ක්‍රියාත්මක වේ.
 */
async function checkAuthState() {
    const client = getClient();
    if (!client) return;

    try {
        // වත්මන් සැසිය (session) ලබා ගැනීම
        const { data: { session }, error } = await client.auth.getSession();
        if (error) throw error;

        // UI යාවත්කාලීන කිරීම
        updateAuthUI(session);

        // Auth state වෙනස්වීම් සඳහා සවන් දීම
        client.auth.onAuthStateChange((event, session) => {
            updateAuthUI(session);
        });
    } catch (err) {
        console.error('Auth State Error:', err.message);
    }
}

// ============================================================
// 3. සත්‍යාපන UI යාවත්කාලීන කිරීම
// ============================================================

/**
 * පරිශීලක සත්‍යාපන තත්ත්වය අනුව ශීර්ෂකයේ අන්තර්ගතය යාවත්කාලීන කරයි.
 * @param {object|null} session - Supabase සැසි වස්තුව හෝ null
 */
function updateAuthUI(session) {
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;

    // පැරණි අන්තර්ගතය හිස් කරන්න
    authContainer.innerHTML = '';

    if (session) {
        // ===== පරිශීලකයා ලොග් වී ඇත =====
        const userMeta = session.user.user_metadata || {};
        const userName = userMeta.full_name || session.user.email.split('@')[0] || 'පරිශීලකයා';
        const userEmail = session.user.email || '';

        // පරිශීලක තොරතුරු සහිත badge එක
        const badge = document.createElement('div');
        badge.className = 'user-badge';
        badge.innerHTML = `
            <i class="fa-solid fa-user"></i>
            <span>තෙරුවන් සරණයි, ${userName}!</span>
            <small style="font-weight:400;opacity:0.7;font-size:0.6rem;">${userEmail}</small>
        `;

        // පිටවීමේ බොත්තම
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn-logout';
        logoutBtn.type = 'button';
        logoutBtn.onclick = handleLogout;
        logoutBtn.innerHTML = `
            <i class="fa-solid fa-right-from-bracket"></i> ඉවත් වන්න
        `;

        // ඒවා එකට එකතු කිරීම
        const wrapper = document.createElement('div');
        wrapper.className = 'auth-wrapper';  // ✅ නව ක්ලාස් එක
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '0.5rem';
        wrapper.appendChild(badge);
        wrapper.appendChild(logoutBtn);
        authContainer.appendChild(wrapper);

    } else {
        // ===== පරිශීලකයා ලොග් වී නැත =====
        // Google පිවිසුම් බොත්තම
        const googleBtn = document.createElement('button');
        googleBtn.type = 'button';
        googleBtn.className = 'btn-google';
        googleBtn.onclick = loginWithGoogle;
        googleBtn.innerHTML = `
            <i class="fa-brands fa-google"></i>
            <span class="btn-label">Google මඟින් ලොග් වන්න</span>
        `;

        // පිවිසුම් සබැඳිය (login tab එක පෙන්වීමට)
        const loginLink = document.createElement('a');
        loginLink.href = '#';
        loginLink.className = 'btn-login';
        loginLink.onclick = (e) => {
            e.preventDefault();
            showLoginView();
        };
        loginLink.innerHTML = `
            <i class="fa-solid fa-user"></i>
            <span>පිවිසුම</span>
        `;

        // ඒවා එකට එකතු කිරීම
        const wrapper = document.createElement('div');
        wrapper.className = 'header-controls';
        wrapper.style.gap = '0.5rem';
        wrapper.appendChild(googleBtn);
        wrapper.appendChild(loginLink);
        authContainer.appendChild(wrapper);
    }
}

// ============================================================
// 4. සමාජ ජාල ඔස්සේ පිවිසීම (Social Login)
// ============================================================

/**
 * සමාජ ජාල සපයන්නෙකු (Google, Facebook, Apple) ඔස්සේ පිවිසීම
 * @param {string} provider - සපයන්නාගේ නම ('google', 'facebook', 'apple')
 */
window.handleSocialLogin = async function (provider) {
    const client = getClient();
    if (!client) return;

    try {
        const { error } = await client.auth.signInWithOAuth({
            provider: provider,
            options: {
                // redirectTo: window.location.origin + '/index.html'  // ✅ වෙනස් කිරීම: පිටුව සරල කිරීම
                redirectTo: window.location.origin  // මෙය වඩාත් නම්‍යශීලී වේ
            }
        });
        if (error) throw error;
    } catch (err) {
        console.error(err);
        showAlert('ප්‍රවේශ වීම අසාර්ථකයි. නැවත උත්සාහ කරන්න.', 'error');
    }
};

/**
 * Google ගිණුම ඔස්සේ පිවිසීම
 */
window.loginWithGoogle = function () {
    window.handleSocialLogin('google');
};

// ============================================================
// 5. ඊමේල් / මුරපදය මගින් පිවිසීම
// ============================================================

/**
 * ඊමේල් සහ මුරපදය භාවිතයෙන් පිවිසීම හසුරුවයි
 * @param {Event} event - Form submit event එක
 */
window.handleLoginSubmit = async function (event) {
    if (event) event.preventDefault();

    const client = getClient();
    if (!client) {
        return showAlert('පද්ධතිය හා සම්බන්ධ වීමට නොහැකි විය. කරුණාකර පිටුව Refresh කරන්න.', 'error');
    }

    const emailInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    // Client-side වලංගුකරණය (Validation)
    if (!email || !email.includes('@')) {
        return showAlert('කරුණාකර නිවැරදි ඊමේල් ලිපිනයක් ඇතුළත් කරන්න.', 'error');
    }
    if (!password) {
        return showAlert('කරුණාකර මුරපදය ඇතුළත් කරන්න.', 'error');
    }

    showAlert('ඔබව පද්ධතියට සම්බන්ධ කරමින් පවතී...', 'info');

    try {
        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        showAlert('සාර්ථකව ප්‍රවේශ විය! ප්‍රධාන පිටුවට යොමු කෙරේ...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (err) {
        console.warn('Login Attempt Failed:', err.message);

        if (err.message.includes('Email not confirmed')) {
            showAlert('ඔබගේ ඊමේල් ලිපිනය තහවුරු කර නොමැත. කරුණාකර ඔබගේ Email Inbox එක පරීක්ෂා කර තහවුරු කිරීමේ ලින්ක් එක Click කරන්න.', 'warning');
        } else if (err.message.includes('Invalid login credentials')) {
            showAlert('ඇතුළත් කළ ඊමේල් ලිපිනය හෝ මුරපදය වැරදියි.', 'error');
        } else {
            showAlert('ප්‍රවේශ වීම අසාර්ථකයි: ' + err.message, 'error');
        }
    }
};

// ============================================================
// 6. ලියාපදිංචි වීම (Registration)
// ============================================================

/**
 * ලියාපදිංචි පෝරමය හසුරුවයි
 * @param {Event} event - Form submit event එක
 */
window.handleRegisterSubmit = async function (event) {
    if (event) event.preventDefault();

    const client = getClient();
    if (!client) return;

    const fullNameInput = document.getElementById('regFullName');
    const emailInput = document.getElementById('regEmail');
    const passwordInput = document.getElementById('registerPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const agreeTermsInput = document.getElementById('agreeTerms');

    // Client-side වලංගුකරණය
    if (!agreeTermsInput || !agreeTermsInput.checked) {
        return showAlert('කරුණාකර භාවිත නියමයන්ට එකඟ වන්න.', 'error');
    }
    if (passwordInput.value !== confirmPasswordInput.value) {
        return showAlert('ඔබ ඇතුළත් කළ මුරපදයන් දෙක සමාන නොවේ.', 'error');
    }
    if (passwordInput.value.length < 6) {
        return showAlert('මුරපදය සඳහා අවම වශයෙන් අකුරු/ඉලක්කම් 6ක් අවශ්‍යයි.', 'error');
    }
    if (!fullNameInput.value.trim()) {
        return showAlert('කරුණාකර සම්පූර්ණ නම ඇතුළත් කරන්න.', 'error');
    }

    showAlert('ගිණුම නිර්මාණය කරමින් පවතී...', 'info');

    try {
        const { data, error } = await client.auth.signUp({
            email: emailInput.value.trim(),
            password: passwordInput.value,
            options: {
                data: { full_name: fullNameInput.value.trim() }
            }
        });

        if (error) throw error;

        // ✅ වෙනස් කිරීම: syncUserProfile සැමවිටම කැඳවන්න (data.user තිබේ නම්)
        if (data.user) {
            await syncUserProfile(data.user);

            if (data.session) {
                // ගිණුම ස්වයංක්‍රීයව තහවුරු වී ඇත (විද්‍යුත් තැපෑල අවශ්‍ය නොවේ)
                showAlert('ලියාපදිංචි වීම සාර්ථකයි! ප්‍රධාන පිටුවට යොමු කෙරේ...', 'success');
                setTimeout(() => window.location.href = 'index.html', 1500);
            } else {
                // ගිණුම තහවුරු කිරීමට ඊමේල් යවා ඇත
                showAlert('සාර්ථකයි! කරුණාකර ඔබගේ ඊමේල් ලිපිනය පරීක්ෂා කර ගිණුම තහවුරු කරන්න.', 'success');
                if (event.target) event.target.reset();
                // තත්පර 3කට පසු පිවිසුම් ටැබයට මාරු වන්න
                setTimeout(() => window.showLoginView(), 3000);
            }
        } else {
            // data.user නොමැති විට (දුර්ලභ අවස්ථාවක්)
            showAlert('ගිණුම නිර්මාණය විය, නමුත් තොරතුරු ලබා ගැනීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.', 'warning');
        }
    } catch (err) {
        showAlert('ලියාපදිංචි වීම අසාර්ථකයි: ' + err.message, 'error');
    }
};

// ============================================================
// 7. පිටවීම (Logout)
// ============================================================

/**
 * පරිශීලකයා පද්ධතියෙන් ඉවත් කරයි
 */
window.handleLogout = async function () {
    const client = getClient();
    if (!client) return;

    try {
        const { error } = await client.auth.signOut();
        if (error) throw error;
        // පිටුව නැවත පූරණය කරන්න
        window.location.reload();
    } catch (err) {
        console.error('Logout Error:', err.message);
    }
};

// ============================================================
// 8. පැතිකඩ සමමුහුර්ත කිරීම (Profile Sync)
// ============================================================

/**
 * පරිශීලක පැතිකඩ Supabase 'profiles' වගුවට සුරකියි
 * @param {object} user - Supabase පරිශීලක වස්තුව
 */
async function syncUserProfile(user) {
    const client = getClient();
    if (!client || !user || !user.id) return;

    const meta = user.user_metadata || {};
    const fullName = meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : '');

    const profilePayload = {
        id: user.id,
        email: user.email,
        full_name: fullName,
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await client
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' });

        if (error) console.error('Database Sync Error:', error.message);
    } catch (err) {
        console.error('Unexpected Profile Sync Error:', err);
    }
}

// ============================================================
// 9. ටැබ් මාරු කිරීම් (Tab Switchers)
// ============================================================

/**
 * පිවිසුම් ටැබය පෙන්වයි
 */
window.showLoginView = function () {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) loginForm.classList.remove('hidden');
    if (registerForm) registerForm.classList.add('hidden');

    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    if (tabLogin && tabRegister) {
        tabLogin.className = 'tab-btn active';
        tabRegister.className = 'tab-btn';
    }

    const alertBox = document.getElementById('authAlert');
    if (alertBox) alertBox.classList.add('hidden');
};

/**
 * ලියාපදිංචි ටැබය පෙන්වයි
 */
window.showRegisterView = function () {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');

    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    if (tabLogin && tabRegister) {
        tabRegister.className = 'tab-btn active';
        tabLogin.className = 'tab-btn';
    }

    const alertBox = document.getElementById('authAlert');
    if (alertBox) alertBox.classList.add('hidden');
};

// ============================================================
// 10. පණිවිඩ දැනුම්දීම් (Alert Messages)
// ============================================================

/**
 * පරිශීලකයාට පණිවිඩයක් පෙන්වයි
 * @param {string} message - පෙන්විය යුතු පණිවිඩය
 * @param {string} type - පණිවිඩ වර්ගය ('error', 'success', 'warning', 'info')
 */
function showAlert(message, type = 'info') {
    const alertBox = document.getElementById('authAlert');
    if (!alertBox) {
        console.log(`[Alert - ${type}]: ${message}`);
        return;
    }

    // Classes reset කිරීම
    alertBox.className = 'alert-box';
    alertBox.classList.remove('hidden', 'alert-error', 'alert-success', 'alert-info', 'alert-warning');

    // වර්ගය අනුව class එක එකතු කිරීම
    const typeMap = {
        error: 'alert-error',
        success: 'alert-success',
        warning: 'alert-warning',
        info: 'alert-info'
    };
    alertBox.classList.add(typeMap[type] || 'alert-info');

    // ✅ වෙනස් කිරීම: XSS ආරක්ෂාව සඳහා textContent භාවිතා කරන්න
    alertBox.textContent = message;
}

// ============================================================
// 11. මුරපද දෘශ්‍යතාව මාරු කිරීම (Password Toggle)
// ============================================================

/**
 * මුරපද ක්ෂේත්‍ර සඳහා 'පෙන්වන්න/සඟවන්න' හැකියාව සක්‍රිය කරයි
 */
function setupPasswordToggles() {
    const toggles = [
        { iconId: 'toggleLoginPassword', inputId: 'loginPassword' },
        { iconId: 'toggleRegisterPassword', inputId: 'registerPassword' },
        { iconId: 'toggleConfirmPassword', inputId: 'confirmPassword' }
    ];

    toggles.forEach(toggle => {
        const toggleBtn = document.getElementById(toggle.iconId);
        const inputField = document.getElementById(toggle.inputId);

        if (toggleBtn && inputField) {
            toggleBtn.addEventListener('click', function (e) {
                e.preventDefault();

                // ✅ වෙනස් කිරීම: icon එක සොයා ගැනීමට පෙර පැවැත්ම පරීක්ෂා කරන්න
                const icon = this.querySelector('i');
                if (!icon) return;

                if (inputField.type === 'password') {
                    inputField.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    inputField.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        }
    });
}

// ============================================================
// 12. තේමාව මාරු කිරීම (Theme Toggle)
// ============================================================

/**
 * අඳුරු / ආලෝක තේමාව මාරු කරයි
 * තේමාව localStorage එකේ සුරකින අතර ඊළඟ පිටු පූරණයේදී මතක තබා ගනී
 */
window.toggleTheme = function () {
    const html = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    if (!themeIcon) return;

    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        themeIcon.className = 'fa-solid fa-sun';
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        themeIcon.className = 'fa-solid fa-moon';
        localStorage.setItem('theme', 'dark');
    }
};

// ============================================================
// 13. ආරම්භ කිරීම (Initialization)
// ============================================================

/**
 * පිටුව පූරණය වූ විට ක්‍රියාත්මක වන ආරම්භක කාර්යයන්
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. සුරකින ලද තේමාව පරීක්ෂා කරන්න
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    }

    // 2. පරිශීලක සත්‍යාපන තත්ත්වය පරීක්ෂා කරන්න
    checkAuthState();

    // 3. මුරපද දෘශ්‍යතා පාලන සක්‍රිය කරන්න
    setupPasswordToggles();
});