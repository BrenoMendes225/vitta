/* Boas-vindas / primeira configuração. */

import { saveSettings, APP, state } from '../store.js';
import { icon } from '../icons.js';
import { field, str, num, toast } from '../ui.js';
import * as db from '../supabase-db.js';
import { todayISO } from '../date.js';
import { go } from '../router.js';
import { supabase } from '../supabase.js';

export default async function welcomeScreen(view) {
  const { data: { user } } = await supabase.auth.getUser();
  const prefillName = user?.user_metadata?.name || '';
  view.innerHTML = `
    <div style="padding:26px 4px 18px;text-align:center">
      <div style="width:64px;height:64px;margin:0 auto 14px;border-radius:20px;background:var(--p);color:#fff;display:grid;place-items:center;box-shadow:0 8px 24px var(--p-50);overflow:hidden">
        <img src="icons/vitta-logo.svg" alt="Vitta logo" style="width:40px;height:40px">
      </div>
      <h1 style="margin:0;font-size:29px;letter-spacing:-.03em">${APP.name}</h1>
      <p class="subhead" style="margin-top:6px">Menos planilha, mais constância.<br>Peso, medidas, comida e aplicações num só lugar.</p>
    </div>

    <form id="welcome-form" class="stack" novalidate>
      <section class="card">
        <p class="card-title">${icon('user', 16)} Sobre você</p>
        <div class="form-grid">
          ${field({ label: 'Nome', name: 'name', placeholder: 'como quer ser chamado', span2: true, value: prefillName })}
          ${field({ label: 'Peso atual (kg)', name: 'startWeight', inputmode: 'decimal', placeholder: '82,4' })}
          ${field({ label: 'Meta (kg)', name: 'goalWeight', inputmode: 'decimal', placeholder: '72' })}
          ${field({ label: 'Altura (cm)', name: 'height', inputmode: 'numeric', placeholder: '175', span2: true })}
        </div>
      </section>

      <section class="card">
        <p class="card-title">${icon('syringe', 16)} Tratamento <span class="tiny muted" style="font-weight:500">(opcional)</span></p>
        <div class="form-grid">
          ${field({ label: 'Medicamento', name: 'injName', placeholder: 'ex.: Wegovy', span2: true })}
          ${field({ label: 'Dose', name: 'injDose', placeholder: '0,5', inputmode: 'decimal' })}
          ${field({ label: 'A cada (dias)', name: 'injInterval', inputmode: 'numeric', value: 7 })}
          ${field({ label: 'Última aplicação', name: 'injStart', type: 'date', span2: true })}
        </div>
      </section>

      <section class="card">
        <p class="card-title">${icon('sparkles', 16)} Análise de refeições</p>
        <p class="small muted" style="margin:0 0 12px">
          Cole sua chave do Gemini para estimar calorias e proteína por foto. Dá para configurar depois.
        </p>
        ${field({ label: 'Chave da API', name: 'geminiKey', type: 'password', placeholder: 'AIza…', autocomplete: 'new-password' })}
      </section>

      <button class="btn btn-primary btn-block" type="submit" style="min-height:52px">Começar</button>

      <p class="disclaimer center">
        Seus dados ficam neste aparelho. Nada é enviado para servidores nossos.<br>
        ${APP.name} não substitui médico ou nutricionista.
      </p>
      <button type="button" class="link center" data-skip style="margin-top:12px">Pular por enquanto</button>
    </form>`;

  const form = view.querySelector('#welcome-form');

  const markOnboardingDone = async (nameOverride, heightOverride) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const name = nameOverride ?? state.settings.name ?? '';
    const height = heightOverride ?? state.settings.height ?? null;
    const birth_date = state.settings.birthDate || null;
    await supabase.from('profiles').upsert({
      id: user.id,
      name: name || null,
      height: height ?? null,
      birth_date,
      onboarding_concluido: true,
      onboarding_concluido_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  };

  const finish = async ({ skip = false } = {}) => {
    if (skip) {
      await saveSettings({ onboarded: true });
      await markOnboardingDone();
      go('hoje');
      return;
    }
    const startWeight = num(form, 'startWeight');
    await saveSettings({
      onboarded: true,
      name: str(form, 'name'),
      startWeight,
      goalWeight: num(form, 'goalWeight'),
      height: num(form, 'height'),
      injection: {
        name: str(form, 'injName'),
        dose: str(form, 'injDose'),
        intervalDays: num(form, 'injInterval', 7),
        startDate: str(form, 'injStart'),
      },
      gemini: { key: str(form, 'geminiKey') },
    });
    await markOnboardingDone(str(form, 'name') || state.settings.name, num(form, 'height') || state.settings.height);

    if (startWeight) {
      const existing = (await db.byDate('weights', todayISO()))[0];
      await db.put('weights', {
        ...(existing || {}),
        date: todayISO(),
        kg: startWeight,
        note: 'Primeiro registro',
        createdAt: new Date().toISOString(),
      });
    }

    toast('Tudo pronto. Bem-vindo!');
    go('hoje');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await finish();
  });

  view.querySelector('[data-skip]')?.addEventListener('click', async () => {
    if (confirm('Pular o cadastro inicial? Você pode completar depois em Ajustes.')) {
      await finish({ skip: true });
    }
  });
}