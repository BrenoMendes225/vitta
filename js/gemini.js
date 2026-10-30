/* Integração com o Gemini: análise de refeições por foto/texto.
   A chave fica no aparelho (IndexedDB) e a chamada sai direto do navegador. */

import { state } from './store.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

const MEAL_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Alimento e quantidade estimada, ex: "arroz branco, 4 colheres"' },
          kcal: { type: 'INTEGER' },
          protein: { type: 'NUMBER' },
        },
        required: ['name', 'kcal', 'protein'],
      },
    },
    kcal: { type: 'INTEGER', description: 'Total de calorias da refeição' },
    protein: { type: 'NUMBER', description: 'Total de proteína em gramas' },
    carbs: { type: 'NUMBER', description: 'Total de carboidratos em gramas' },
    fat: { type: 'NUMBER', description: 'Total de gorduras em gramas' },
    confidence: { type: 'STRING', description: 'alta, média ou baixa' },
    comment: { type: 'STRING', description: 'Comentário curto, acolhedor e prático (máx. 220 caracteres)' },
  },
  required: ['items', 'kcal', 'protein', 'carbs', 'fat', 'confidence', 'comment'],
};

function mealPrompt(description) {
  return `Você é um assistente de nutrição que ajuda uma pessoa em acompanhamento de peso (possivelmente usando medicação que reduz o apetite).

Analise a refeição ${description ? 'descrita abaixo' : 'na foto'}.
${description ? `\nDescrição do usuário: "${description}"` : ''}

Regras:
- Estime porções típicas brasileiras quando não estiver claro. Na dúvida, arredonde para cima nas calorias.
- Liste os itens principais com quantidade estimada.
- Some os macronutrientes no total (proteína, carboidratos e gordura em gramas).
- Indique a confiança da estimativa: "alta", "média" ou "baixa".
- No comentário: seja breve (até 220 caracteres), acolhedor e prático. Destaque a proteína se estiver baixa. Nunca prescreva dietas, nunca indique metas calóricas abaixo de 1200 kcal e nunca faça diagnóstico. Não use tom de julgamento.`;
}

async function fileToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Redimensiona/comprime no próprio aparelho antes de enviar. */

async function callModel(model, key, body) {
  const res = await fetch(`${BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* resposta não-JSON */ }

  if (!res.ok) {
    const apiMsg = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(apiMsg);
    err.status = res.status;
    throw err;
  }
  return data;
}

function extractJSON(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const raw = parts.map((p) => p.text || '').join('').trim();
  if (!raw) throw new Error('A IA não retornou conteúdo. Tente novamente.');
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Resposta da IA em formato inesperado.');
  }
}

function humanError(err) {
  if (err?.status === 400) return 'Chave inválida ou requisição recusada pelo Google.';
  if (err?.status === 403) return 'A chave não tem permissão para este modelo.';
  if (err?.status === 404) return 'Modelo indisponível. Troque o modelo nos ajustes.';
  if (err?.status === 429) return 'Limite de uso atingido. Tente em alguns minutos.';
  if (!navigator.onLine) return 'Sem conexão com a internet.';
  return err?.message || 'Falha ao falar com a IA.';
}

/**
 * Analisa uma refeição. Retorna { items, kcal, protein, carbs, fat, confidence, comment }.
 */
export async function analyzeMeal({ text = '', imageBlob = null } = {}) {
  const key = state.settings.gemini?.key?.trim();
  if (!key) throw new Error('Configure a chave do Gemini nos ajustes.');
  if (!text && !imageBlob) throw new Error('Escreva ou envie uma foto da refeição.');

  const parts = [];
  if (imageBlob) {
    const dataUrl = await fileToDataURL(imageBlob);
    const base64 = dataUrl.split(',')[1];
    parts.push({ inline_data: { mime_type: imageBlob.type || 'image/jpeg', data: base64 } });
  }
  parts.push({ text: mealPrompt(text) });

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: MEAL_SCHEMA,
    },
    safetySettings: [],
  };

  const preferred = state.settings.gemini?.model?.trim();
  const models = [...new Set([preferred, ...FALLBACK_MODELS].filter(Boolean))];
  let lastErr = null;

  for (const model of models) {
    try {
      const data = await callModel(model, key, body);
      const parsed = extractJSON(data);
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        kcal: Math.round(Number(parsed.kcal) || 0),
        protein: Math.round(Number(parsed.protein) || 0),
        carbs: Math.round(Number(parsed.carbs) || 0),
        fat: Math.round(Number(parsed.fat) || 0),
        confidence: parsed.confidence || 'média',
        comment: parsed.comment || '',
        model,
      };
    } catch (err) {
      lastErr = err;
      // Só tenta o próximo modelo se o problema for o modelo em si.
      if (![400, 404].includes(err?.status)) break;
    }
  }
  throw new Error(humanError(lastErr));
}

export async function testKey() {
  const key = state.settings.gemini?.key?.trim();
  if (!key) throw new Error('Informe a chave primeiro.');
  const model = state.settings.gemini?.model?.trim() || FALLBACK_MODELS[0];
  try {
    const data = await callModel(model, key, {
      contents: [{ role: 'user', parts: [{ text: 'Responda apenas: ok' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 8 },
    });
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text).join('').trim();
    return text || 'ok';
  } catch (err) {
    throw new Error(humanError(err));
  }
}

/** Texto livre (usado no resumo semanal, fase 2). */
export async function generateText(prompt) {
  const key = state.settings.gemini?.key?.trim();
  if (!key) throw new Error('Configure a chave do Gemini nos ajustes.');
  const model = state.settings.gemini?.model?.trim() || FALLBACK_MODELS[0];
  try {
    const data = await callModel(model, key, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.65, maxOutputTokens: 700 },
    });
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text).join('').trim();
    if (!text) throw new Error('A IA não retornou texto.');
    return text;
  } catch (err) {
    throw new Error(humanError(err));
  }
}
