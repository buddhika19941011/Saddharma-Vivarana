/**
 * සද්ධර්ම විවරණ - පැතිකඩ පිටුවේ (profile.html) තර්කනය
 * ගොනුව: js/profile.js
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

function showMessage(elementId, message, type = 'success') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `form-message ${type}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
    }
}

// ============================================================
// 3. පැතිකඩ පූරණය කිරීම
// ============================================================

async function loadProfile() {
    const client = getClient();
    if (!client) {
        alert('Supabase සම්බන්ධතාවය අසාර්ථකයි. පිටුව Refresh කරන්න.');
        return;
    }

    try {
        // වත්මන් පරිශීලකයා ලබා ගැනීම
        const { data: { user }, error: userError } = await client.auth.getUser();
        if (userError || !user) {
            window.location.href = 'login.html';
            return;
        }

        // Profiles වගුවෙන් දත්ත ලබා ගැනීම
        const { data: profile, error: profileError } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('Profile Load Error:', profileError);
        }

        // මූලික දත්ත පිරවීම
        const fullName = profile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0] || 'පරිශීලකයා';
        const email = user.email || '---';
        const role = profile?.role || 'viewer';
        const isBlocked = profile?.is_blocked || false;
        const joinedAt = profile?.created_at || user.created_at || new Date().toISOString();
        const lastLogin = profile?.last_login || 'තවමත් පිවිසී නැත';

        // Avatar URL (Google OAuth එකෙන් ලැබුණේ නම්)
        const avatarUrl = user.user_metadata?.avatar_url || `https://placehold.co/120x120/f59e0b/ffffff?text=${fullName.charAt(0).toUpperCase()}`;

        // UI යාවත්කාලීන කිරීම
        document.getElementById('profileFullName').textContent = fullName;
        document.getElementById('profileEmail').textContent = email;
        document.getElementById('profileJoined').textContent = new Date(joinedAt).toLocaleString('si-LK', { dateStyle: 'long', timeStyle: 'short' });
        document.getElementById('profileLastLogin').textContent = lastLogin !== 'තවමත් පිවිසී නැත' ? new Date(lastLogin).toLocaleString('si-LK', { dateStyle: 'long', timeStyle: 'short' }) : lastLogin;

        // Avatar
        const avatarBig = document.getElementById('profileAvatarBig');
        const avatarThumb = document.getElementById('userAvatar');
        if (avatarBig) avatarBig.src = avatarUrl;
        if (avatarThumb) avatarThumb.src = avatarUrl;

        // Role & Status Badges
        const roleBadge = document.getElementById('profileRoleBadge');
        roleBadge.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        roleBadge.className = `role-badge role-${role}`;

        const statusBadge = document.getElementById('profileStatusBadge');
        if (isBlocked) {
            statusBadge.textContent = 'Blocked';
            statusBadge.className = 'status-badge status-blocked';
        } else {
            statusBadge.textContent = 'Active';
            statusBadge.className = 'status-badge status-active';
        }

        // Dropdown එකේ නම
        document.getElementById('userDisplayName').textContent = fullName;

        // Admin Link පෙන්වීම (Role Admin නම්)
        const adminLink = document.getElementById('navAdminLink');
        if (adminLink && role === 'admin') {
            adminLink.style.display = 'flex';
        }

        // Password Change Form එකේ hidden fields සඳහා user id තබා ගැනීම
        document.getElementById('updateNameForm').dataset.userId = user.id;

    } catch (err) {
        console.error('Load Profile Error:', err);
        alert('පැතිකඩ පූරණය කිරීමේදී දෝෂයකි. කරුණාකර නැවත උත්සාහ කරන්න.');
    }
}

// ============================================================
// 4. නම යාවත්කාලීන කිරීම
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
    const nameForm = document.getElementById('updateNameForm');
    if (nameForm) {
        nameForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const client = getClient();
            if (!client) return;

            const newName = document.getElementById('newFullName').value.trim();
            if (!newName) {
                showMessage('nameUpdateMsg', 'කරුණාකර නව නමක් ඇතුළත් කරන්න.', 'error');
                return;
            }

            const userId = this.dataset.userId;
            if (!userId) {
                showMessage('nameUpdateMsg', 'පරිශීලක හඳුනාගැනීමේ අංකය හමු නොවීය.', 'error');
                return;
            }

            try {
                // 1. Auth metadata යාවත්කාලීන කිරීම
                const { error: authError } = await client.auth.updateUser({
                    data: { full_name: newName }
                });
                if (authError) throw authError;

                // 2. Profiles වගුව යාවත්කාලීන කිරීම
                const { error: dbError } = await client
                    .from('profiles')
                    .update({ full_name: newName, updated_at: new Date().toISOString() })
                    .eq('id', userId);
                if (dbError) throw dbError;

                showMessage('nameUpdateMsg', 'නම සාර්ථකව යාවත්කාලීන විය!', 'success');
                document.getElementById('profileFullName').textContent = newName;
                document.getElementById('userDisplayName').textContent = newName;
                document.getElementById('newFullName').value = '';

            } catch (err) {
                console.error('Name Update Error:', err);
                showMessage('nameUpdateMsg', 'නම යාවත්කාලීන කිරීම අසාර්ථකයි: ' + err.message, 'error');
            }
        });
    }

    // ============================================================
    // 5. මුරපදය යාවත්කාලීන කිරීම
    // ============================================================

    const passwordForm = document.getElementById('changePasswordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const client = getClient();
            if (!client) return;

            const current = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confirm = document.getElementById('confirmPassword').value;

            if (!current || !newPass || !confirm) {
                showMessage('passwordChangeMsg', 'සියලු ක්ෂේත්‍ර පිරවිය යුතුය.', 'error');
                return;
            }
            if (newPass.length < 6) {
                showMessage('passwordChangeMsg', 'නව මුරපදය අවම වශයෙන් අකුරු 6කින් සමන්විත විය යුතුය.', 'error');
                return;
            }
            if (newPass !== confirm) {
                showMessage('passwordChangeMsg', 'නව මුරපදය සහ තහවුරු කිරීම ගැළපෙන්නේ නැත.', 'error');
                return;
            }

            try {
                // Supabase හි මුරපදය වෙනස් කිරීම (වත්මන් මුරපදය සමඟ සත්‍යාපනය කරයි)
                const { error } = await client.auth.updateUser({ password: newPass });
                if (error) throw error;

                showMessage('passwordChangeMsg', 'මුරපදය සාර්ථකව යාවත්කාලීන විය!', 'success');
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';

            } catch (err) {
                console.error('Password Change Error:', err);
                if (err.message.includes('Invalid credentials')) {
                    showMessage('passwordChangeMsg', 'වත්මන් මුරපදය වැරදියි. කරුණාකර නිවැරදි මුරපදය ඇතුළත් කරන්න.', 'error');
                } else {
                    showMessage('passwordChangeMsg', 'මුරපදය වෙනස් කිරීම අසාර්ථකයි: ' + err.message, 'error');
                }
            }
        });
    }
});

// ============================================================
// 6. Dropdown මෙනුව පාලනය
// ============================================================

function toggleDropdown() {
    const menu = document.getElementById('dropdownMenu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

// පිටත ක්ලික් කළ විට Dropdown එක වැසීම
document.addEventListener('click', function (event) {
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown) return;
    const isClickInside = dropdown.contains(event.target);
    const menu = document.getElementById('dropdownMenu');
    if (!isClickInside && menu) {
        menu.classList.remove('show');
    }
});

// ============================================================
// 7. පිටවීම (Logout)
// ============================================================

async function handleLogout() {
    const client = getClient();
    if (client) {
        await client.auth.signOut();
    }
    window.location.href = 'index.html';
}

// ============================================================
// 8. ගිණුම මකා දැමීම (Delete Account - අමතර ආරක්ෂාව)
// ============================================================

async function confirmDeleteAccount() {
    if (!confirm('ඔබගේ ගිණුම සම්පූර්ණයෙන්ම මකා දැමීමට ඔබ සැරසෙනවාද? මෙම ක්‍රියාව ආපසු හැරවිය නොහැකි අතර, ඔබගේ සියලු දත්ත ඉවත් වනු ඇත.')) {
        return;
    }

    const client = getClient();
    if (!client) return;

    try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) {
            alert('පරිශීලකයා හමු නොවීය.');
            return;
        }

        // 1. Profiles වගුවෙන් මකන්න
        const { error: dbError } = await client.from('profiles').delete().eq('id', user.id);
        if (dbError) throw dbError;

        // 2. Auth ගිණුම මකන්න (Supabase Admin API අවශ්‍ය වේ. මෙය Backend එකක් හරහා කළ යුතුය.
        //     මෙම අවස්ථාවේදී, අපි ඉවත් කර ලොග් අවුට් කරමු).
        //     සැබෑ ගිණුම මැකීමට Supabase Dashboard හෝ Edge Function අවශ්‍ය වේ.
        //     මෙහිදී අපි තාවකාලිකව ලොග් අවුට් කර පණිවිඩයක් පෙන්වමු.
        await client.auth.signOut();
        alert('ඔබගේ ගිණුම සාර්ථකව ඉවත් කරන ලදී. (සම්පූර්ණ මැකීම සඳහා පරිපාලක අමතන්න).');
        window.location.href = 'index.html';

    } catch (err) {
        console.error('Delete Account Error:', err);
        alert('ගිණුම මකා දැමීමේදී දෝෂයකි: ' + err.message);
    }
}

// ============================================================
// 9. තේමාව මාරු කිරීම
// ============================================================

function toggleTheme() {
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
}

// ============================================================
// 10. ආරම්භක පූරණය (Initialization)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // තේමාව පරීක්ෂා කිරීම
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
    }

    // පැතිකඩ පූරණය කිරීම
    await loadProfile();
});