/* Tela de apresentação inicial */
import { go } from '../router.js';
import { icon } from '../icons.js';

const STEPS = [
  { emoji: '⚖️', title: 'Peso & Medidas', desc: 'Acompanhe evolução semanal com gráficos simples e sem cobrança.' },
  { emoji: '🍽️', title: 'Diário alimentar com IA', desc: 'Descreva ou fotografe a refeição e o Gemini estima macros em segundos.' },
  { emoji: '💧', title: 'Água, proteína e sintomas', desc: 'Metas diárias, registro rápido e insights suaves.' },
  { emoji: '💉', title: 'Aplicações e treino', desc: 'Controle de ciclos, rodízio de local e presença no treino.' },
];

export default function onboardingScreen(view) {
  document.querySelector('.fab') && (document.querySelector('.fab').style.display = 'none');
  document.querySelector('.nav') && (document.querySelector('.nav').style.display = 'none');
  let index = 0;

  const render = () => {
    const step = STEPS[index];
    view.innerHTML = `
      <div class="onboarding">
        <header class="page-head">
          <h1>Vitta</h1>
          <p class="subhead">Constância, não perfeição.</p>
        </header>

        <div class="onboarding-stepper">
          <section class="card hero onboarding-card">
            <div class="soft-emoji">${step.emoji}</div>
            <h2>${step.title}</h2>
            <p>${step.desc}</p>
          </section>

          <div class="onboarding-dots">
            ${STEPS.map((_, i) => `<span class="dot${i === index ? ' on' : ''}"></span>`).join('')}
          </div>
        </div>

        <div class="onboarding-actions">
          <div class="row" style="gap:10px">
            <button class="btn btn-soft" data-prev ${index === 0 ? 'disabled' : ''}>${icon('left',16)} Voltar</button>
            <button class="btn btn-primary" data-next style="flex:1">
              ${index === STEPS.length - 1 ? 'Começar' : 'Continuar'} ${icon('right',16)}
            </button>
          </div>
          <p class="tiny muted center" style="margin-top:12px">Seus dados ficam sincronizados com sua conta.</p>
        </div>
      </div>
    `;

    view.querySelector('[data-prev]')?.addEventListener('click', () => {
      if (index > 0) { index--; render(); }
    });
    view.querySelector('[data-next]').addEventListener('click', () => {
      if (index < STEPS.length - 1) {
        index++;
        render();
      } else {
        go('login');
      }
    });
  };

  render();
}
