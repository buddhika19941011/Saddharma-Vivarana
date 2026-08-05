/**
 * සද්ධර්ම විවරණ - Login පිටුව සඳහා පමණක් වන Authentication Logic
 * ගොනුව: js/login.js
 * 
 * මෙය auth.js හි සමාන කාර්යයන් ඇතුළත් වේ, නමුත් login.html සඳහා පමණක් විශේෂිත වේ.
 * auth.js වෙනුවට මෙය භාවිතා කළ හැක.
 */

// ============================================================
// 1. Supabase Client ලබා ගැනීම (auth.js හි ඇති global function භාවිතා කරයි)
// ============================================================

/**
 * Supabase Client ලබා ගැනීම සඳහා උපකාරක ශ්‍රිතය
 * auth.js හි ඇති getAuthSupabaseClient භාවිතා කරයි
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

async function checkAuthState() {
    const client = getClient();
    if (!client) return;

    try {
        const { data: { session }, error } = await client.auth.getSession();
        if (error) throw error;

        updateAuthUI(session);

        // State වෙනස්වීම් සවන් දීම
        client.auth.onAuthStateChange((event, session) => {
            updateAuthUI(session);
        });
    } catch (err) {
        console.error('Auth State Error:', err.message);
    }
}

// ============================================================
// 3. Authentication UI යාවත්කාලීන කිරීම (Login පිටුව සඳහා)
// ============================================================

function updateAuthUI(session) {
    const authContainer = document.getElementById('authContainer');
    if (!authContainer) return;

    // පැරණි අන්තර්ගතය හිස් කරන්න
    authContainer.innerHTML = '';

    if (session) {
        // පරිශීලකයා ලොග් වී ඇත – පිටවීමේ බොත්තම පෙන්වන්න
        const userMeta = session.user.user_metadata || {};
        const userName = userMeta.full_name || session.user.email.split('@')[0];

        const badge = document.createElement('div');
        badge.className = 'user-badge';
        badge.innerHTML = `
            <i class="fa-solid fa-user"></i>
            <span>තෙරුවන් සරණයි, ${userName}!</span>
        `;

        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn-logout';
        logoutBtn.type = 'button';
        logoutBtn.onclick = handleLogout;
        logoutBtn.innerHTML = `
            <i class="fa-solid fa-right-from-bracket"></i> ඉවත් වන්න
        `;

        const wrapper = document.createElement('div');
        wrapper.className = 'header-controls';
        wrapper.style.gap = '0.5rem';
        wrapper.appendChild(badge);
        wrapper.appendChild(logoutBtn);
        authContainer.appendChild(wrapper);

    } else {
        // පරිශීලකයා ලොග් වී නැත – Google සහ පිවිසුම් බොත්තම් පෙන්වන්න
        const googleBtn = document.createElement('button');
        googleBtn.type = 'button';
        googleBtn.className = 'btn-google';
        googleBtn.onclick = loginWithGoogle;
        googleBtn.innerHTML = `
            <i class="fa-brands fa-google"></i>
            <span class="btn-label">Google මඟින් ලොග් වන්න</span>
        `;

        const loginLink = document.createElement('a');
        loginLink.href = '#'; // login page එකේම ඉන්න නිසා
        loginLink.className = 'btn-login';
        loginLink.onclick = (e) => {
            e.preventDefault();
            showLoginView();
        };
        loginLink.innerHTML = `
            <i class="fa-solid fa-user"></i>
            <span>පිවිසුම</span>
        `;

        const wrapper = document.createElement('div');
        wrapper.className = 'header-controls';
        wrapper.style.gap = '0.5rem';
        wrapper.appendChild(googleBtn);
        wrapper.appendChild(loginLink);
        authContainer.appendChild(wrapper);
    }
}

// ============================================================
// 4. Social Login ශ්‍රිත
// ============================================================

window.handleSocialLogin = async function (provider) {
    const client = getClient();
    if (!client) return;

    try {
        // login.html සිට index.html වෙත redirect කිරීම
        const { error } = await client.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.origin + '/index.html'
            }
        });
        if (error) throw error;
    } catch (err) {
        console.error(err);
        showAlert('ප්‍රවේශ වීම අසාර්ථකයි. නැවත උත්සාහ කරන්න.', 'error');
    }
};

window.loginWithGoogle = function () {
    window.handleSocialLogin('google');
};

// ============================================================
// 5. ඊමේල්/මුරපදය මගින් පිවිසීම
// ============================================================

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

    // Client-side Validation
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
// 6. ලියාපදිංචි වීම
// ============================================================

window.handleRegisterSubmit = async function (event) {
    if (event) event.preventDefault();

    const client = getClient();
    if (!client) return;

    const fullNameInput = document.getElementById('regFullName');
    const emailInput = document.getElementById('regEmail');
    const passwordInput = document.getElementById('registerPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const agreeTermsInput = document.getElementById('agreeTerms');

    if (!agreeTermsInput || !agreeTermsInput.checked) {
        return showAlert('කරුණාකර භාවිත නියමයන්ට එකඟ වන්න.', 'error');
    }
    if (passwordInput.value !== confirmPasswordInput.value) {
        return showAlert('ඔබ ඇතුළත් කළ මුරපදයන් දෙක සමාන නොවේ.', 'error');
    }
    if (passwordInput.value.length < 6) {
        return showAlert('මුරපදය සඳහා අවම වශයෙන් අකුරු/ඉලක්කම් 6ක් අවශ්‍යයි.', 'error');
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

        if (data.user && data.session) {
            await syncUserProfile(data.user);
            showAlert('ලියාපදිංචි වීම සාර්ථකයි! ප්‍රධාන පිටුවට යොමු කෙරේ...', 'success');
            setTimeout(() => window.location.href = 'index.html', 1500);
        } else if (data.user) {
            showAlert('සාර්ථකයි! කරුණාකර ඔබගේ ඊමේල් ලිපිනය පරීක්ෂා කර ගිණුම තහවුරු කරන්න.', 'success');
            if (event.target) event.target.reset();
            setTimeout(() => window.showLoginView(), 3000);
        }
    } catch (err) {
        showAlert('ලියාපදිංචි වීම අසාර්ථකයි: ' + err.message, 'error');
    }
};

// ============================================================
// 7. පිටවීම (Logout)
// ============================================================

window.handleLogout = async function () {
    const client = getClient();
    if (!client) return;

    try {
        const { error } = await client.auth.signOut();
        if (error) throw error;
        window.location.reload();
    } catch (err) {
        console.error('Logout Error:', err.message);
    }
};

// ============================================================
// 8. පැතිකඩ සමමුහුර්ත කිරීම (Profile Sync)
// ============================================================

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
// 9. Tab Switchers (ප්‍රවේශ වීම / ලියාපදිංචි වීම)
// ============================================================

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
// 10. Alert පණිවිඩ පෙන්වීම
// ============================================================

function showAlert(message, type) {
    const alertBox = document.getElementById('authAlert');
    if (!alertBox) {
        console.log(`[Alert - ${type}]: ${message}`);
        return;
    }

    // Classes reset කිරීම
    alertBox.className = 'alert-box';
    alertBox.classList.remove('hidden', 'alert-error', 'alert-success', 'alert-info', 'alert-warning');

    if (type === 'error') {
        alertBox.classList.add('alert-error');
    } else if (type === 'success') {
        alertBox.classList.add('alert-success');
    } else if (type === 'warning') {
        alertBox.classList.add('alert-warning');
    } else {
        alertBox.classList.add('alert-info');
    }

    alertBox.innerHTML = message;
}

// ============================================================
// 11. මුරපද දෘශ්‍යතාව මාරු කිරීම (Password Toggle)
// ============================================================

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
                if (inputField.type === 'password') {
                    inputField.type = 'text';
                    this.querySelector('i').classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    inputField.type = 'password';
                    this.querySelector('i').classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        }
    });
}

// ============================================================
// 12. තේමාව මාරු කිරීම (Theme Toggle)
// ============================================================

window.toggleTheme = function () {
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
};

// ============================================================
// 13. Initialization – පිටුව පූරණය වූ විට
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupPasswordToggles();
});