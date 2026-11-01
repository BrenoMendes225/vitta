/* Tela de login / cadastro com Supabase */
import { supabase } from '../supabase.js';
import { go, refresh } from '../router.js';
import { field, toast } from '../ui.js';
import { icon } from '../icons.js';
import { state } from '../store.js';

export default async function loginScreen(view) {
  // esconde FAB e tabbar nesta tela
  document.querySelector('.fab') && (document.querySelector('.fab').style.display = 'none');
  document.querySelector('.nav') && (document.querySelector('.nav').style.display = 'none');
  let mode = localStorage.getItem('vitta_login_mode') || 'login';

  const render = () => {
    view.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-card card hero">
          <div class="auth-brand">
            <div class="auth-logo">${icon('activity', 28, 2)}</div>
            <h1>Vitta</h1>
          </div>
          <p class="subhead">Entre ou crie sua conta para sincronizar seus dados com segurança.</p>

          <form id="auth-form" class="stack-sm">
            ${field({ label: 'E-mail', name: 'email', type: 'text', inputmode: 'email', required: true, autocomplete: 'email' })}
            ${field({ label: 'Senha', name: 'password', type: 'password', required: true, autocomplete: 'current-password', minlength: 6 })}
            <button class="btn btn-primary btn-block" type="submit" style="margin-top:8px">
              ${mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          <div class="auth-switch">
            ${mode === 'login'
              ? `<button class="link" data-switch>Não tem conta? Cadastre-se</button>`
              : `<button class="link" data-switch>Já tem conta? Entrar</button>`}
          </div>

        </div>
      </div>
    `;

    view.querySelector('[data-switch]').addEventListener('click', () => {
      mode = mode === 'login' ? 'signup' : 'login';
      localStorage.setItem('vitta_login_mode', mode);
      render();
    });

    view.querySelector('#auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const email = form.email.value.trim();
      const password = form.password.value;

      try {
        if (mode === 'login') {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
        }
        toast('Sucesso! Redirecionando...');
        setTimeout(() => go(!state.settings.onboarded ? 'bemvindo' : 'hoje'), 600);
      } catch (err) {
        toast(err.message || 'Erro ao autenticar');
      }
    });
  };

  render();
}
