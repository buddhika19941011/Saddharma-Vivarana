// ============================================================
// ගොනුව: js/supabase-config.js
// මෙය ප්‍රථමයෙන්ම Load විය යුතු අතර, Supabase Client එක Global ලෙස හඳුන්වා දෙයි.
// ============================================================

// ⚠️ ඔබගේ Supabase Project එකෙන් ලබාගත් URL සහ ANON KEY
const SUPABASE_URL = 'https://jtzttfdxoidnypxqlfms.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0enR0ZmR4b2lkbnlweHFsZm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NDc0MzgsImV4cCI6MjEwMTQyMzQzOH0.6Yfe2ohFoMl6k1SRKM-pjoObXEAy-HJAbpHDcHPvLE0';

// 🔥 වෙනස් කිරීම 1: 'supabase' වෙනුවට '_supabaseClient' ලෙස පුද්ගලික විචල්‍යයක් භාවිතා කරන්න
// (මෙය ගෝලීයව 'supabase' නමින් ගැටුමක් ඇති නොකරයි)
const _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. අනෙකුත් JS ගොනු (login.js, index.js, admin-panel.js) සඳහා Global ශ්‍රිතය
window.getAuthSupabaseClient = function () {
    return _supabaseClient;
};

// 3. අමතරව, සෘජුවම Global Variable එකක් ලෙස ද ලබා දීම (Backup සඳහා)
window.supabaseClient = _supabaseClient;

// 4. Console එකෙන් Test කිරීමට (Debugging)
console.log('✅ Supabase Client සාර්ථකව සම්බන්ධ විය!');