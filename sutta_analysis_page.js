/* =========================================================
   Suththra Analysis Page - JavaScript Logic
   -------------------------------------------------------
   HOW TO USE:
   1. Keep USE_SAMPLE_DATA = true to see demo data.
   2. To connect Supabase:
      - Set USE_SAMPLE_DATA = false
      - Replace SUPABASE_URL and SUPABASE_ANON_KEY with your keys
      - Table must be named sutta_analysis
   ========================================================= */

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const USE_SAMPLE_DATA = true;

let supabaseClient = null;

/* ===== Sample Data (Demo) ===== */
const SAMPLE_RECORD = {
  id: 'sample-1',
  pali_text:
    'කරණීයමෙත්තකුසලෙන යං තං සන්තං පදං අභිසමෙච්ච, සක්කො උජූ ච සූජූ ච සුවචො චස්ස මුදු අනතිමානී.',
  sutta_id: 'Snp 1.8',
  title: 'කරණීය මෙත්ත සූත්‍රය',
  subtitle: 'මෙත්තා භාවනා පිළිබඳ අනුශාසනාව',
  meta_title: 'කරණීය මෙත්ත සූත්‍රය - Snp 1.8 - පාලි විග්‍රහය',
  meta_subtitle: 'මෙත්තා සූත්‍රයේ වචනාර්ථ හා ව්‍යාකරණ විශ්ලේෂණය',
  speaker: 'භගවා',
  pitaka: 'සුත්ත පිටක',
  nikaya: 'ඛුද්දක නිකාය',
  vagga: 'සුත්ත නිපාත',
  category: 'මෙත්ත',
  word_analysis: [
    {
      index: 1,
      pali_word: 'කරණීයමෙත්තකුසලෙන',
      common_meaning: 'කළයුතු මෙත්තාවෙහි දක්ෂ තැනැත්තා විසින්',
      root: '√කර් (කරණීය) + මිත්‍ර (මෙත්ත) + √කුශ් (කුසල)',
      root_meaning: 'කිරීම, මිතුරුකම, දක්ෂ වීම',
      prefix: 'නැත',
      suffix: 'අනීය, අ, අල, එන',
      case_ending: 'එන (උපාධිකරණය / කරණ කාරකය)',
      formation: 'කරණීය + මෙත්ත + කුසල + එන (සමාසය හා විභක්තිය)',
      gender_number_case: 'පුල්ලිංග, ඒකවචන, කරණ කාරකය',
      grammatical_meaning: 'යමෙක් ඒ කළයුතු මෙත්තාවෙහි දක්ෂ වේද ඔහු විසින්'
    },
    {
      index: 2,
      pali_word: 'යං',
      common_meaning: 'යම්',
      root: 'ය (සර්වනාම ප්‍රකෘතිය)',
      root_meaning: 'යම්',
      prefix: 'නැත',
      suffix: 'ං',
      case_ending: 'ං (දෝෂ කාරකය / කර්ම විභක්තිය)',
      formation: 'ය + ං',
      gender_number_case: 'නපුංසක, ඒකවචන, කර්ම කාරකය',
      grammatical_meaning: 'යම් තත්ත්වයක්'
    },
    {
      index: 3,
      pali_word: 'තං',
      common_meaning: 'ඒ',
      root: 'ත (සර්වනාම ප්‍රකෘතිය)',
      root_meaning: 'ඒ',
      prefix: 'නැත',
      suffix: 'ං',
      case_ending: 'ං (දෝෂ කාරකය / කර්ම විභක්තිය)',
      formation: 'ත + ං',
      gender_number_case: 'නපුංසක, ඒකවචන, කර්ම කාරකය',
      grammatical_meaning: 'ඒ (ප්‍රසිද්ධ) තත්ත්වය'
    },
    {
      index: 4,
      pali_word: 'සන්තං',
      common_meaning: 'ශාන්ත වූ, සන්සුන් වූ',
      root: '√සම් (සන්සිඳීම)',
      root_meaning: 'සන්සිඳීම, සමාදානය',
      prefix: 'නැත',
      suffix: 'ත (කෘදන්ත) + ං',
      case_ending: 'ං (දෝෂ කාරකය)',
      formation: 'සම් + ත + ං',
      gender_number_case: 'නපුංසක, ඒකවචන, කර්ම කාරකය',
      grammatical_meaning: 'ශාන්ත වූ, සන්සිඳුණු'
    },
    {
      index: 5,
      pali_word: 'පදං',
      common_meaning: 'තත්ත්වය, පදය, පියවර',
      root: '√පද් (ගමන් කිරීම, යෑම)',
      root_meaning: 'ගමන් කිරීම',
      prefix: 'නැත',
      suffix: 'අ (නාමකරණ) + ං',
      case_ending: 'ං (දෝෂ කාරකය)',
      formation: 'පද් + අ + ං',
      gender_number_case: 'නපුංසක, ඒකවචන, කර්ම කාරකය',
      grammatical_meaning: 'පැමිණිය යුතු හෝ ගමනාන්ත ස්වභාවය'
    },
    {
      index: 6,
      pali_word: 'අභිසමෙච්ච',
      common_meaning: 'මනාකොට අවබෝධ කොට, පැමිණ',
      root: '√ඉ (යෑම)',
      root_meaning: 'යෑම',
      prefix: 'අභි + සම්',
      suffix: 'ය (කෘදන්ත / ගෙරුන්ඩ්)',
      case_ending: 'නැත (අව්‍යය)',
      formation: 'අභි + සම් + ඉ + ය (සන්ධියෙන් \'අභිසමෙච්ච\')',
      gender_number_case: 'අව්‍යය (ක්‍රියා නිපාතය)',
      grammatical_meaning: 'පූර්ණ වශයෙන් අවබෝධ කිරීමෙන් පසුව'
    },
    {
      index: 7,
      pali_word: 'සක්කො',
      common_meaning: 'සමර්ථ, හැකියාව ඇති',
      root: '√සක් (හැකි වීම)',
      root_meaning: 'හැකි වීම, ශක්තිය',
      prefix: 'නැත',
      suffix: 'ත (කෘදන්ත) + ඔ',
      case_ending: 'ඔ (ප්‍රථමා විභක්තිය / කර්තෘ)',
      formation: 'සක් + ත + ඔ',
      gender_number_case: 'පුල්ලිංග, ඒකවචන, කර්තෘ කාරකය',
      grammatical_meaning: 'සමර්ථ වූ (හෙතෙම)'
    },
    {
      index: 8,
      pali_word: 'උජූ',
      common_meaning: 'ඍජු, කෙළින්, අවංක',
      root: 'උජු (ඍජු යන නාම විශේෂණ ප්‍රකෘතිය)',
      root_meaning: 'කෙළින් බව',
      prefix: 'නැත',
      suffix: 'ඌ (ප්‍රථමා ඒකවචන පුල්ලිංග)',
      case_ending: 'ඌ',
      formation: 'උජු (මූලික ප්‍රකෘතිය) + ඌ',
      gender_number_case: 'පුල්ලිංග, ඒකවචන, කර්තෘ',
      grammatical_meaning: 'ඍජු වූ, අවංක වූ'
    },
    {
      index: 9,
      pali_word: 'ච',
      common_meaning: 'ද, තවද',
      root: 'නැත (නිපාතය)',
      root_meaning: 'නැත',
      prefix: 'නැත',
      suffix: 'නැත',
      case_ending: 'නැත (අව්‍යය)',
      formation: 'ච (සම්බන්ධක නිපාතය)',
      gender_number_case: 'අව්‍යය',
      grammatical_meaning: 'සමුච්චයාර්ථයෙන් \'ද\' යන්න'
    },
    {
      index: 10,
      pali_word: 'සූජූ',
      common_meaning: 'ඉතා ඍජු, යහපත් ඍජු බව ඇති',
      root: 'උජු',
      root_meaning: 'කෙළින් බව',
      prefix: 'සු (යහපත්, ඉතා)',
      suffix: 'ඌ (ප්‍රථමා ඒකවචන පුල්ලිංග)',
      case_ending: 'ඌ',
      formation: 'සු + උජූ',
      gender_number_case: 'පුල්ලිංග, ඒකවචන, කර්තෘ',
      grammatical_meaning: 'ඉතා ඍජු වූ, යහපත් ලෙස කෙළින් වූ'
    },
    {
      index: 11,
      pali_word: 'ච',
      common_meaning: 'ද, තවද',
      root: 'නැත (නිපාතය)',
      root_meaning: 'නැත',
      prefix: 'නැත',
      suffix: 'නැත',
      case_ending: 'නැත (අව්‍යය)',
      formation: 'ච',
      gender_number_case: 'අව්‍යය',
      grammatical_meaning: 'සමුච්චයාර්ථයෙන් \'ද\' යන්න'
    },
    {
      index: 12,
      pali_word: 'සුවචො',
      common_meaning: 'කියැමට පහසු, හිතවාදී, මෘදු වචන ඇති',
      root: '√වච් (කීම, වචනය)',
      root_meaning: 'කීම, කථනය',
      prefix: 'සු (යහපත්, පහසු)',
      suffix: 'අ (නාමකරණ) + ඔ (ප්‍රථමා ඒකවචන)',
      case_ending: 'ඔ',
      formation: 'සු + වච් + අ + ඔ (වචස් > වචො යන ස්වරූපය)',
      gender_number_case: 'පුල්ලිංග, ඒකවචන, කර්තෘ',
      grammatical_meaning: 'හොඳින් කථා කළ හැකි, උපදෙස් පිළිගැනීමට පහසු වූ'
    },
    {
      index: 13,
      pali_word: 'චස්ස',
      common_meaning: 'තවද ඔහු විය යුතු',
      root: '√අස් (වීම)',
      root_meaning: 'වීම, පැවැත්ම',
      prefix: 'ච (නිපාතය) + නැත',
      suffix: 'ස්ස (විධි ආඛ්‍යාත ප්‍රත්‍යය - 3.ඒ. විධි)',
      case_ending: 'නැත (ආඛ්‍යාතය)',
      formation: 'ච + අස් + ස්ස (සන්ධියෙන් \'චස්ස\')',
      gender_number_case: 'අව්‍යය (ච) + පුල්ලිංග ඒකවචන 3.ඒ. විධි ආඛ්‍යාතය',
      grammatical_meaning: 'තවද (ඔහු) විය යුත්තේ ය'
    },
    {
      index: 14,
      pali_word: 'මුදු',
      common_meaning: 'මෘදු, සිනිඳු, නිහතමානී ගුණ ඇති',
      root: '√මෘද් (මෘදු වීම)',
      root_meaning: 'මෘදු බව, සිනිඳු බව',
      prefix: 'නැත',
      suffix: 'උ (ප්‍රථමා ඒකවචන පුල්ලිංග)',
      case_ending: 'උ',
      formation: 'මෘද් + උ',
      gender_number_case: 'පුල්ලිංග, ඒකවචන, කර්තෘ',
      grammatical_meaning: 'මෘදු වූ, කරුණාවන්ත ගති ඇති'
    },
    {
      index: 15,
      pali_word: 'අනතිමානී',
      common_meaning: 'අධික මානයෙන් තොර, නිහතමානී',
      root: '√මන් (සිතීම, මානය)',
      root_meaning: 'මානය, අහංකාරය, ගර්වය',
      prefix: 'අන (නැති) + අති (ඉක්මවූ)',
      suffix: 'ඊ (ඉන් යුත් යන අර්ථයෙන් ප්‍රථමා ඒකවචන)',
      case_ending: 'ඊ',
      formation: 'අන + අති + මාන + ඊ (සන්ධියෙන් \'අනතිමානී\')',
      gender_number_case: 'පුල්ලිංග, ඒකවචන, කර්තෘ',
      grammatical_meaning: 'අධික ගර්වයෙන් තොර වූ, නිහතමානී වූ'
    }
  ],
  sandhi_etymology: [
    {
      word: 'කරණීයමෙත්තකුසලෙන',
      explanation: '√කර් (කිරීම) + අනීය (කෘදන්ත ප්‍රත්‍යය - යෝග්‍යතාව / කර්තව්‍ය) = කරණීය \'කළ යුතු\'; මෙත්ත = මිත්‍ර (මිතුරු) යන්නෙන් ව්‍යුත්පන්න, \'මෛත්‍රී, ලාලිත්‍යය\'; √කුශ් (දක්ෂ වීම) + අල (නාමකරණ) = කුසල \'දක්ෂ\'; මෙම තුන එකතු කොට කරණීයමෙත්තකුසල යන සමාසය වේ; ඉන්පසු උපාධිකරණ එන ප්‍රත්‍යය යෙදී \'එන\' අවසානය සිදුවේ.'
    },
    {
      word: 'යං / තං',
      explanation: 'ය (සාපේක්ෂ සර්වනාම ධාතු) + ං = යං; ත (ප්‍රදර්ශක සර්වනාම ධාතු) + ං = තං. යං-තං සහසම්බන්ධයෙන් \'යම්-ඒ\' යන අර්ථය ලැබේ.'
    },
    {
      word: 'සන්තං',
      explanation: '√සම් (සන්සිඳීම, නිවීම) + ත (අතීත / කර්ම කෘදන්ත ප්‍රත්‍යය) + ං = සන්තං; \'සන්සිඳුණු, ශාන්ත\' යන අර්ථය.'
    },
    {
      word: 'පදං',
      explanation: '√පද් (යෑම, පියවර තැබීම) + අ (නාමකරණ) + ං = පදං; \'පියවර, ස්ථානය, තත්ත්වය\' යන අර්ථය.'
    },
    {
      word: 'අභිසමෙච්ච',
      explanation: 'අභි (උපසර්ගය - අභිමුඛව) + සම් (උපසර්ගය - එක්ව) + √ඉ (යෑම) + ය (ක්‍රියා නිපාත / ගෙරුන්ඩ් ප්‍රත්‍යය); සන්ධි නීති අනුව \'අභිසමෙච්ච\' සිදු වේ. \'මනාකොට පැමිණ / අවබෝධ කොට\' යන්නයි.'
    },
    {
      word: 'සක්කො',
      explanation: '√සක් (හැකි වීම, ශක්තිමත් වීම) + ත (කෘදන්ත) + ඔ = සක්කො; \'සමර්ථ, හැකියාව ඇති\' යන්නයි.'
    },
    {
      word: 'උජූ / සූජූ',
      explanation: 'උජූ = \'කෙළින්, ඍජු\' යන ප්‍රකෘතිය; සූජූ = සු (යහපත්, ඉතා යන උපසර්ගය) + උජූ; \'ඉතා ඍජු\' යන්නයි.'
    },
    {
      word: 'සුවචො',
      explanation: 'සු (පහසු, යහපත්) + √වච් (කීම, වචනය) + අ (නාමකරණ) + ඔ (ප්‍රථමා විභක්තිය); \'හොඳින් කථා කළ හැකි, උපදෙස් පිළිගැනීමට පහසු\' යන අර්ථය.'
    },
    {
      word: 'චස්ස',
      explanation: 'ච (සමුච්චයාර්ථ නිපාතය) + අස් (√අස් - වීම) + ස්ස (විධි ආඛ්‍යාත 3.ඒ. ප්‍රත්‍යය); සන්ධියෙන් \'චස්ස\' වේ. \'තවද (ඔහු) විය යුතුය\' යන්නයි.'
    },
    {
      word: 'මුදු',
      explanation: '√මෘද් (මෘදු වීම) + උ (ප්‍රථමා ඒකවචන පුල්ලිංග); \'මෘදු, සිනිඳු\' යන අර්ථය.'
    },
    {
      word: 'අනතිමානී',
      explanation: 'අන (නැති යන උපසර්ගය) + අති (ඉක්මවූ, අධික යන උපසර්ගය) + මාන (√මන් + අ - මානය, ගර්වය) + ඊ (ප්‍රථමා ඒකවචන, \'ඉන් යුත්\' යන අර්ථය); \'අධික ගර්වයෙන් තොර\' යන්නයි.'
    }
  ],
  literal_breakdown: [
    'කළයුතු මෙත්තාවෙහි දක්ෂ තැනැත්තා විසින්',
    'යම්',
    'ඒ',
    'ශාන්ත',
    'තත්ත්වය',
    'මනාකොට අවබෝධ කොට',
    'සමර්ථ',
    'ඍජු',
    'ද',
    'ඉතා ඍජු',
    'ද',
    'කියැමට පහසු',
    'තවද ඔහු විය යුතු',
    'මෘදු',
    'අධික මානයෙන් තොර'
  ],
  translation: {
    step_1_sequence:
      'කළයුතු මෙත්තාවෙහි දක්ෂ තැනැත්තා විසින් යම් ඒ ශාන්ත තත්ත්වය මනාකොට අවබෝධ කොට, සමර්ථ ඍජු ද ඉතා ඍජු ද කියැමට පහසු ද තවද ඔහු විය යුතු මෘදු අධික මානයෙන් තොර.',
    step_2_natural:
      'යමෙක් ඒ කළයුතු මෙත්තාවෙහි දක්ෂ වූයේ ද, ඔහු ඒ ශාන්ත තත්ත්වය මනාකොට අවබෝධ කොට, සමර්ථ විය යුතු ය, ඍජු ද, ඉතා ඍජු ද, කියැමට පහසු ද විය යුතු ය, තවද (ඔහු) මෘදු හා අධික මානයෙන් තොර විය යුතු ය.',
    step_3_refined:
      'කළයුතු මෙත්තාවෙහි දක්ෂ වූ තැනැත්තා ඒ ශාන්ත පදය මනාකොට අවබෝධ කොට, සමර්ථ විය යුතුය; ඍජු ද, ඉතා ඍජු ද, පහසුවෙන් උපදෙස් පිළිගත හැකි ද, මෘදු ද, අධික ගර්වයෙන් තොර ද විය යුතුය.'
  },
  disclaimer:
    'මෙම විග්‍රහය ආගමික හෝ අධ්‍යාත්මික අර්ථකථනයක් නොවන අතර, පාලි භාෂාවේ ශුද්ධ ව්‍යාකරණ සහ නිරුක්ති මත පදනම් වූ භාෂාමය විශ්ලේෂණයක් පමණි.'
};

const SAMPLE_RECORDS = [SAMPLE_RECORD];

/* ===== Utility Functions ===== */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    return '&#039;';
  });
}

function showLoading() {
  hideAllStates();
  document.getElementById('loading').classList.remove('hidden');
}

function showError(msg) {
  hideAllStates();
  const errorEl = document.getElementById('error');
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}

function hideAllStates() {
  ['loading', 'error', 'listView', 'detailView'].forEach((id) =>
    document.getElementById(id).classList.add('hidden')
  );
}

/* ===== Theme ===== */
function initTheme() {
  const saved = localStorage.getItem('suththra-theme') || 'light';
  setTheme(saved);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('suththra-theme', theme);
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

/* ===== Supabase Setup ===== */
function setupSupabase() {
  if (USE_SAMPLE_DATA) return true;

  if (!window.supabase) {
    showError('Supabase JS library load නොවීය.');
    return false;
  }
  if (
    SUPABASE_URL.startsWith('YOUR_') ||
    SUPABASE_ANON_KEY.startsWith('YOUR_')
  ) {
    showError(
      'Supabase credentials configure කරන්න script.js එකේ (SUPABASE_URL, SUPABASE_ANON_KEY). නැතහොත් USE_SAMPLE_DATA = true කරන්න.'
    );
    return false;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return true;
}

/* ===== Routing ===== */
async function route() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  const backBtn = document.getElementById('backBtn');
  if (id) {
    backBtn.classList.remove('hidden');
    await loadDetail(id);
  } else {
    backBtn.classList.add('hidden');
    await loadList();
  }
}

/* ===== List View ===== */
async function loadList() {
  showLoading();
  try {
    if (USE_SAMPLE_DATA) {
      renderList(SAMPLE_RECORDS);
      return;
    }
    const { data, error } = await supabaseClient
      .from('sutta_analysis')
      .select('id, sutta_id, title, subtitle, category, nikaya, vagga, pitaka')
      .order('created_at', { ascending: false });

    if (error) throw error;
    renderList(data || []);
  } catch (e) {
    showError('දත්ත ලබා ගැනීමේ දෝෂය: ' + e.message);
  }
}

function renderList(records) {
  const listView = document.getElementById('listView');
  const container = document.getElementById('listContainer');
  container.innerHTML = '';

  if (!records.length) {
    container.innerHTML =
      '<div class="empty">සූත්‍ර විග්‍රහ කිසිවක් හමු නොවීය.</div>';
  } else {
    records.forEach((r) => {
      const a = document.createElement('a');
      a.className = 'list-card';
      a.href = `?id=${encodeURIComponent(r.id)}`;

      const badges = [];
      if (r.sutta_id) badges.push(`<span class="badge badge-id">${esc(r.sutta_id)}</span>`);
      if (r.pitaka) badges.push(`<span class="badge badge-pitaka">${esc(r.pitaka)}</span>`);
      if (r.nikaya) badges.push(`<span class="badge badge-nikaya">${esc(r.nikaya)}</span>`);

      const meta = [r.nikaya, r.vagga, r.category].filter(Boolean).join(' • ');

      a.innerHTML = `
        <div class="list-card-top">${badges.join('')}</div>
        <h2>${esc(r.title || r.sutta_id || 'සූත්‍රය')}</h2>
        ${r.subtitle ? `<p class="subtitle">${esc(r.subtitle)}</p>` : ''}
        ${meta ? `<div class="meta">${esc(meta)}</div>` : ''}
      `;
      container.appendChild(a);
    });
  }

  listView.classList.remove('hidden');
  document.getElementById('loading').classList.add('hidden');
}

/* ===== Detail View ===== */
async function loadDetail(id) {
  showLoading();
  try {
    let record = null;

    if (USE_SAMPLE_DATA) {
      record = SAMPLE_RECORDS.find((r) => r.id === id);
    } else {
      const { data, error } = await supabaseClient
        .from('sutta_analysis')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      record = data;
    }

    if (!record) throw new Error('සූත්‍රය හමු නොවීය');
    renderDetail(record);
  } catch (e) {
    showError('දත්ත ලබා ගැනීමේ දෝෂය: ' + e.message);
  }
}

function renderDetail(record) {
  document.title = record.meta_title || record.title || 'සූත්‍ර විග්‍රහය';

  const detailView = document.getElementById('detailView');
  const content = document.getElementById('detailContent');

  const badges = [];
  if (record.sutta_id) badges.push(`<span class="badge badge-id">${esc(record.sutta_id)}</span>`);
  if (record.pitaka) badges.push(`<span class="badge badge-pitaka">${esc(record.pitaka)}</span>`);
  if (record.nikaya) badges.push(`<span class="badge badge-nikaya">${esc(record.nikaya)}</span>`);

  content.innerHTML = `
    <div class="detail-header">
      <div class="badges">${badges.join('')}</div>
      <h1>${esc(record.title || '')}</h1>
      ${record.subtitle ? `<p class="detail-subtitle">${esc(record.subtitle)}</p>` : ''}
      ${metaChips(record)}
    </div>

    ${
      record.pali_text
        ? `<div class="pali-box">
            <div class="section-label">පාලි පාඨය</div>
            <p class="pali-text">${esc(record.pali_text)}</p>
          </div>`
        : ''
    }

    ${
      record.disclaimer
        ? `<div class="disclaimer"><strong>විස්තරය:</strong> ${esc(record.disclaimer)}</div>`
        : ''
    }

    ${translationSection(record.translation)}
    ${wordAnalysisSection(record.word_analysis)}
    ${sandhiSection(record.sandhi_etymology)}
    ${literalSection(record.literal_breakdown)}
    ${
      record.user_prompt
        ? `<div class="user-prompt-section">
            <h2>පරිශීලක ප්‍රශ්නය</h2>
            <p>${esc(record.user_prompt)}</p>
          </div>`
        : ''
    }
  `;

  detailView.classList.remove('hidden');
  document.getElementById('loading').classList.add('hidden');
}

function metaChips(record) {
  const fields = [
    ['කථකයා', record.speaker],
    ['වග්ගය', record.vagga],
    ['ප්‍රවර්ගය', record.category]
  ];
  const available = fields.filter((f) => f[1]);
  if (!available.length) return '';
  return `<div class="meta-chips">${available
    .map(
      ([label, value]) =>
        `<span class="chip"><span class="chip-label">${label}:</span> ${esc(value)}</span>`
    )
    .join('')}</div>`;
}

function translationSection(translation) {
  if (!translation) return '';
  const steps = [
    { label: 'පියවර 1 — අනුක්‍රමිකය', text: translation.step_1_sequence },
    { label: 'පියවර 2 — ස්වාභාවිකය', text: translation.step_2_natural },
    { label: 'පියවර 3 — පිරිපහදු කළ', text: translation.step_3_refined }
  ];

  const cards = steps
    .map(
      (step, i) => `
        <div class="step-card">
          <div class="step-num">${i + 1}</div>
          <div class="step-body">
            <h3>${esc(step.label)}</h3>
            <p>${esc(step.text)}</p>
          </div>
        </div>`
    )
    .join('');

  return `<section class="section"><h2>පරිවර්තන පියවර</h2><div class="translation-steps">${cards}</div></section>`;
}

function wordAnalysisSection(words) {
  if (!Array.isArray(words) || words.length === 0) return '';
  return `<section class="section"><h2>වචනාර්ථ හා ව්‍යාකරණ විශ්ලේෂණය</h2>${wordTable(words)}</section>`;
}

function wordTable(words) {
  const headers = [
    '#',
    'පාලි වචනය',
    'සාමාන්‍ය අර්ථය',
    'ධාතු / ප්‍රකෘතිය',
    'ධාතු අර්ථය',
    'උපසර්ග',
    'ප්‍රත්‍යය',
    'විභක්ති',
    'සෑදීම',
    'ලිංග / වචන / කාරක',
    'ව්‍යාකරණ අර්ථය'
  ];

  const rows = words
    .map(
      (w) => `
      <tr>
        <td>${esc(w.index ?? '')}</td>
        <td class="pali-word-cell">${esc(w.pali_word)}</td>
        <td>${esc(w.common_meaning)}</td>
        <td>${esc(w.root)}</td>
        <td>${esc(w.root_meaning)}</td>
        <td>${esc(w.prefix)}</td>
        <td>${esc(w.suffix)}</td>
        <td>${esc(w.case_ending)}</td>
        <td>${esc(w.formation)}</td>
        <td>${esc(w.gender_number_case)}</td>
        <td>${esc(w.grammatical_meaning)}</td>
      </tr>`
    )
    .join('');

  return `
    <div class="table-wrap">
      <table class="word-table">
        <thead>
          <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function sandhiSection(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `
    <section class="section">
      <h2>සන්ධි හා නිරුක්ති විග්‍රහය</h2>
      <div class="sandhi-grid">
        ${items
          .map(
            (s) => `
          <div class="sandhi-card">
            <h3 class="sandhi-word">${esc(s.word)}</h3>
            <p class="sandhi-explanation">${esc(s.explanation)}</p>
          </div>`
          )
          .join('')}
      </div>
    </section>`;
}

function literalSection(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return `
    <section class="section">
      <h2>පද අනුපිළිවෙල</h2>
      <ol class="literal-list">
        ${items.map((item) => `<li>${esc(item)}</li>`).join('')}
      </ol>
    </section>`;
}

/* ===== Events & Init ===== */
function bindEvents() {
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = window.location.pathname;
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  bindEvents();

  if (!USE_SAMPLE_DATA && !setupSupabase()) {
    // Error already shown by setupSupabase
    return;
  }

  await route();
});