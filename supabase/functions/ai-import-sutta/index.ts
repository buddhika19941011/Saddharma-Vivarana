// supabase/functions/ai-import-sutta/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS හෙඩර්ස් (Front-end එකෙන් ඉල්ලීමට ඉඩ දීමට)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // 1. CORS පාලනය (Pre-flight request)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Body එකෙන් පාලි පාඨය ලබා ගන්න
    const { paliText } = await req.json();
    if (!paliText) {
      throw new Error('කරුණාකර පාලි පාඨය ඇතුළත් කරන්න.');
    }

    // 3. Gemini API අමතන්න (System Prompt + JSON output forcing)
    const systemPrompt = `ඔබ පාලි-සිංහල ධර්ම පරිවර්තන විශාරදයෙකි.
    පහත පාලි පාඨය පරිවර්තනය කර, පහත JSON ආකෘතියෙන් පමණක් පිළිතුරු සපයන්න.
    JSON හි කිසිදු markdown (\`\`\`json) භාවිතා නොකරන්න, කෙලින්ම JSON ලබා දෙන්න.
    
    ආකෘතිය:
    {
      "id": "slug_1",  // පාඨයෙන් ස්වයංක්‍රීයව සාදන ලද URL-friendly id
      "title": "සිංහල මාතෘකාව",
      "subtitle": "උප මාතෘකාව",
      "order_no": 1,
      "pitaka": "සූත්‍ර පිටකය",
      "nikaya": "ඛුද්දක නිකාය",
      "vagga": "සූත්‍ර නිපාතය",
      "speaker": "භාග්‍යවත් බුදුරජාණන් වහන්සේ",
      "category": "මෙත්ත සූත්‍ර",
      "status": "published",
      "passages": [
        { "pali": "පාලි ඡේදය 1", "sinhala": "සිංහල පරිවර්තනය 1" },
        { "pali": "පාලි ඡේදය 2", "sinhala": "සිංහල පරිවර්තනය 2" }
      ],
      "glossary": [
        { "word": "පාලි වචනය", "meaning": "සිංහල තේරුම" },
        { "word": "පාලි වචනය", "meaning": "සිංහල තේරුම" }
      ]
    }
    
    වැදගත්: passages තුළ ඡේද නිවැරදිව වෙන් කරන්න. glossary තුළ වැදගත් පාලි වචන 10-15 ක් පමණ ඇතුළත් කරන්න.`;

    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + Deno.env.get('GOOGLE_API_KEY'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Gemini හි system instruction සහ user prompt වෙන වෙනම ලබා දීම
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: paliText }] }],
          // ✅ වැදගත්: Gemini ට කියන්නේ JSON පමණක් පිට කරන ලෙස
          generationConfig: { response_mime_type: "application/json" }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API දෝෂය: ${geminiResponse.status} - ${errorText}`);
    }

    const aiData = await geminiResponse.json();
    // Gemini පිළිතුර ලබා ගන්නා ආකාරය
    const suttaJson = JSON.parse(aiData.candidates[0].content.parts[0].text);

    // 4. Supabase Client සෑදීම (Service Role Key භාවිතා කර RLS bypass කිරීම)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 5. දත්ත Database එකට ඇතුළත් කිරීම (Upsert)
    const { error } = await supabaseClient
      .from('suththra')
      .upsert([suttaJson], { onConflict: 'id' });

    if (error) throw error;

    // 6. සාර්ථක පිළිතුර
    return new Response(JSON.stringify({ success: true, message: 'සූත්‍රය සාර්ථකව ඇතුළත් කරන ලදී!', data: suttaJson }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});