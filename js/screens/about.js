/* Sobre o app, privacidade e limites. */

import { APP } from '../store.js';
import { icon } from '../icons.js';
import { back } from '../router.js';

export default async function aboutScreen(view) {
  view.innerHTML = `
    <header class="page-head">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="icon-btn bare" data-back aria-label="Voltar">${icon('left', 20)}</button>
        <div>
          <p class="eyebrow">App</p>
          <h1>Sobre</h1>
        </div>
      </div>
    </header>

    <div class="stack">
      <section class="card">
        <div class="row start" style="gap:12px">
          <span style="width:44px;height:44px;border-radius:14px;background:var(--p);color:#fff;display:grid;place-items:center;flex:none;box-shadow:0 4px 16px color-mix(in srgb, var(--p) 50%, transparent)">
            ${icon('activity', 24, 2)}
          </span>
          <div>
            <p class="strong" style="margin:0;font-size:17px">${APP.name}</p>
            <p class="small muted" style="margin:2px 0 0">versão ${APP.version} · ${APP.tagline}</p>
          </div>
        </div>
        <p class="small" style="margin:14px 0 0;line-height:1.55;color:var(--text-2)">
          Um app pessoal para acompanhar peso, medidas, alimentação, aplicações e treino —
          feito para mostrar tendência, não para cobrar perfeição.
        </p>
      </section>

      <section class="card">
        <p class="card-title">${icon('lock', 16)} Privacidade</p>
        <ul class="small muted" style="margin:0;padding-left:18px;line-height:1.7">
          <li>Todos os registros e fotos ficam no armazenamento do seu aparelho (IndexedDB).</li>
          <li>Não há servidor, login ou conta. Ninguém além de você acessa os dados.</li>
          <li>A única saída de dados é a foto/texto da refeição enviada ao Google Gemini, quando você toca em "Analisar com IA".</li>
          <li>Ao apagar os dados do Safari, os registros vão junto. Exporte um backup de vez em quando.</li>
        </ul>
      </section>

      <section class="card">
        <p class="card-title">${icon('alert', 16)} Limites importantes</p>
        <p class="small" style="margin:0;line-height:1.6;color:var(--text-2)">
          Este app não faz diagnóstico, não prescreve dieta nem substitui médico ou nutricionista.
          As estimativas de calorias e proteína são aproximadas e podem errar bastante.
          Sintomas intensos, vômitos persistentes, dor forte ou desidratação pedem avaliação médica.
        </p>
      </section>

      <section class="card">
        <p class="card-title">${icon('info', 16)} Detalhes técnicos</p>
        <ul class="small muted" style="margin:0;padding-left:18px;line-height:1.7">
          <li>PWA instalável: funciona em tela cheia e offline depois do primeiro acesso.</li>
          <li>Análise de refeições com Gemini (modelo configurável nos ajustes).</li>
          <li>Fotos comprimidas no aparelho antes de guardar ou enviar.</li>
          <li>Notificações programadas não estão disponíveis na versão web do iPhone.</li>
        </ul>
      </section>

      <p class="disclaimer center">Feito para uso pessoal · ${new Date().getFullYear()}</p>
    </div>`;

  view.querySelector('[data-back]')?.addEventListener('click', () => back('mais'));
}