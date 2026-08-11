// supabase/functions/ai-import-sutta/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS හෙඩර්ස්
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { paliText } = await req.json();
    if (!paliText) {
      throw new Error('කරුණාකර පාලි පාඨය ඇතුළත් කරන්න.');
    }

    // System Prompt – සූත්‍ර දත්ත ව්‍යුහයට ගැලපේ
    const systemPrompt = `ඔබ පාලි-සිංහල ධර්ම පරිවර්තන විශාරදයෙකි.
පහත පාලි පාඨය සිංහලට පරිවර්තනය කර, සූත්‍රයක් ලෙස ව්‍යුහගත කරන්න.
පහත JSON ආකෘතියෙන් පමණක් පිළිතුරු සපයන්න (Markdown \`\`\`json භාවිත නොකරන්න):

{
  "id": "slug_1", // පාඨයෙන් ගන්නා ලද URL-friendly ID, උදා: karaniya_metta
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
    { "word": "පාලි වචනය", "meaning": "සිංහල තේරුම" }
  ]
}`;

   const geminiResponse = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + Deno.env.get('GOOGLE_API_KEY'),
    {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: paliText }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API දෝෂය: ${geminiResponse.status} - ${errorText}`);
    }

    const aiData = await geminiResponse.json();
    const suttaJson = JSON.parse(aiData.candidates[0].content.parts[0].text);

    // Supabase Client (Service Role Key සමඟ)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // දත්ත `suththra` වගුවට ඇතුළත් කිරීම
    const { error } = await supabaseClient
      .from('suththra')
      .upsert([suttaJson], { onConflict: 'id' });

    if (error) throw error;

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