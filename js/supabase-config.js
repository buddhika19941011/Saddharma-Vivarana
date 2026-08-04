// ============================================================
// ගොනුව: js/supabase-config.js
// මෙය ප්‍රථමයෙන්ම Load විය යුතු අතර, Supabase Client එක Global ලෙස හඳුන්වා දෙයි.
// ============================================================

// ⚠️ වැදගත්: පහත URL සහ KEY ඔබගේ Supabase Project එකෙන් ලබාගත යුතුය.
// මෙමගින් "anon (public)" key එක භාවිතා කරන්න. (secret key එක නොවේ!)
const SUPABASE_URL = 'https://jtzttfdxoidnypxqlfms.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0enR0ZmR4b2lkbnlweHFsZm1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NDc0MzgsImV4cCI6MjEwMTQyMzQzOH0.6Yfe2ohFoMl6k1SRKM-pjoObXEAy-HJAbpHDcHPvLE0'; // ඔබගේ anon key එක

// 1. Supabase Client එක Initialise කිරීම
// (ඉහතින් HTML එකේ load කර ඇති CDN එක මගින් window.supabase ලැබේ)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. අනෙකුත් JS ගොනු (login.js, index.js) සඳහා Global ශ්‍රිතය හඳුන්වා දීම
window.getAuthSupabaseClient = function () {
    return supabase;
};

// 3. අමතරව, සෘජුවම Global Variable එකක් ලෙස ද ලබා දීම (Backup සඳහා)
window.supabaseClient = supabase;

// 4. Console එකෙන් Test කිරීමට (Debugging)
console.log('✅ Supabase Client සාර්ථකව සම්බන්ධ විය!');