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
      system_instruction: { 
        parts: [{ text: "ඔබ පාලි භාෂා විග්‍රහ විශාරදයෙකි. ලබා දෙන ප්‍රොම්ප්ට් එකට අනුකූලව JSON පමණක් පිට කරන්න. කිසිදු අමතර පාඨයක්, Markdown කේතයක් හෝ පැහැදිලි කිරීමක් ඇතුළත් නොකරන්න." }] 
      },
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { 
        response_mime_type: "application/json",
        temperature: 0.2 // නිරවද්‍යතාවය සඳහා අඩු උෂ්ණත්වය
      }
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
    if (!apiKey) throw new Error('GOOGLE_API_KEY සකසා නැත. කරුණාකර එය Deno සැකසුම් තුළ එක් කරන්න.');

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

    if (!aiData) throw new Error('සියලුම ආකෘති අසාර්ථක විය: ' + (lastError?.message || 'නොදන්නා දෝෂයක්'));

    // JSON පිරිසිදු කිරීම සහ parse කිරීම
    let jsonText = aiData.candidates[0].content.parts[0].text;
    // Markdown කේතය ඉවත් කරන්න
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let suttaJson;
    try {
      suttaJson = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON parse අසාර්ථකයි. පිරිසිදු කළ පෙළ:', jsonText);
      throw new Error('AI ප්‍රතිදානය නිවැරදි JSON ආකෘතියක් නොවේ. කරුණාකර ප්‍රොම්ප්ට් එක පරීක්ෂා කරන්න.');
    }

    // අවශ්‍ය නම්, මෙහි suththra වගුවට ඇතුළත් කිරීමට කේතයක් එකතු කළ හැක.
    // නමුත් ඔබේ නිර්මාණයට අනුව, එය api_admin.js එකේ සිදු කෙරේ.

    return new Response(JSON.stringify({ success: true, data: suttaJson }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Edge Function දෝෂය:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});