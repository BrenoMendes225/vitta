/* Tela de apresentação inicial */
import { go } from '../router.js';
import { icon } from '../icons.js';

export default function onboardingScreen(view) {
  view.innerHTML = `
    <div class="onboarding">
      <header class="page-head">
        <h1>Vitta</h1>
        <p class="subhead">Constância, não perfeição.</p>
      </header>

      <div class="onboarding-steps">
        <section class="card hero">
          <div class="soft-emoji">⚖️</div>
          <h2>Peso & Medidas</h2>
          <p>Acompanhe evolução semanal com gráficos simples e sem cobrança.</p>
        </section>

        <section class="card hero">
          <div class="soft-emoji">🍽️</div>
          <h2>Diário alimentar com IA</h2>
          <p>Descreva ou fotografe a refeição e o Gemini estima macros em segundos.</p>
        </section>

        <section class="card hero">
          <div class="soft-emoji">💧</div>
          <h2>Água, proteína e sintomas</h2>
          <p>Metas diárias, registro rápido e insights suaves.</p>
        </section>

        <section class="card hero">
          <div class="soft-emoji">💉</div>
          <h2>Aplicações e treino</h2>
          <p>Controle de ciclos, rodízio de local e presença no treino.</p>
        </section>
      </div>

      <div class="onboarding-actions">
        <button class="btn btn-primary btn-block" data-next>Começar</button>
        <p class="tiny muted center" style="margin-top:12px">Seus dados ficam no seu aparelho. Login opcional com Supabase para sincronizar entre dispositivos.</p>
      </div>
    </div>
  `;

  view.querySelector('[data-next]').addEventListener('click', () => {
    // marca que já viu onboarding
    localStorage.setItem('vitta_onboarded', '1');
    go('login');
  });
}
