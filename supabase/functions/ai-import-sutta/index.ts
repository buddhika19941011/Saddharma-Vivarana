// supabase/functions/ai-import-sutta/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback ආකෘති
const FALLBACK_MODELS = ['gemini-2.0-flash-lite', 'gemini-2.5-flash', 'gemini-1.5-flash'];

async function callGemini(modelName: string, promptText: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: "ඔබ පාලි භාෂා විග්‍රහ විශාරදයෙකි. ලබා දෙන ප්‍රොම්ප්ට් එකට අනුකූලව JSON පමණක් පිට කරන්න." }] },
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { response_mime_type: "application/json" }
    })
  });

  if (!response.ok) {
    if (response.status === 404) throw new Error('MODEL_NOT_FOUND');
    const errorText = await response.text();
    throw new Error(`Gemini API දෝෂය: ${response.status} - ${errorText}`);
  }
  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Body එකෙන් පාලි පෙළ, ආකෘතිය සහ ප්‍රොම්ප්ට් එක ලබා ගන්න
    const { paliText, model: requestedModel, prompt } = await req.json();
    
    if (!paliText) throw new Error('කරුණාකර පාලි පාඨය ඇතුළත් කරන්න.');
    if (!prompt) throw new Error('ප්‍රොම්ප්ට් එක අවශ්‍ය වේ.');

    const apiKey = Deno.env.get('GOOGLE_API_KEY') ?? '';
    const modelsToTry = [requestedModel || 'gemini-2.0-flash-lite', ...FALLBACK_MODELS];

    let lastError = null;
    let aiData = null;

    for (const model of modelsToTry) {
      try {
        aiData = await callGemini(model, prompt, apiKey);
        break;
      } catch (err) {
        lastError = err;
        if (err.message !== 'MODEL_NOT_FOUND') throw err;
        console.warn(`⚠️ ${model} ආකෘතිය සොයාගත නොහැක. ඊළඟ ආකෘතියට මාරු වේ...`);
      }
    }

    if (!aiData) throw new Error('සියලුම ආකෘති අසාර්ථක විය: ' + lastError.message);

    // JSON පිරිසිදු කිරීම
    let jsonText = aiData.candidates[0].content.parts[0].text;
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    const suttaJson = JSON.parse(jsonText);

    // (විකල්ප) සූත්‍ර දත්ත suththra වගුවට අවශ්‍ය නම්
    // const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // await supabaseClient.from('suththra').upsert([{...}]);

    return new Response(JSON.stringify({ success: true, data: suttaJson }), {
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