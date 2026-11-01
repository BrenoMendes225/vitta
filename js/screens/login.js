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
    const isSignup = mode === 'signup';
    view.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-card card hero">
          <div class="auth-brand">
            <div class="auth-logo"><img src="icons/icon.svg" alt="Vitta" style="width:28px;height:28px"></div>
            <h1>Vitta</h1>
          </div>
          <p class="subhead">${isSignup ? 'Crie sua conta para sincronizar seus dados.' : 'Entre ou crie sua conta para sincronizar seus dados com segurança.'}</p>

          <form id="auth-form" class="stack-sm">
            ${isSignup ? field({ label: 'Nome', name: 'name', type: 'text', required: true, autocomplete: 'name' }) : ''}
            ${field({ label: 'E-mail', name: 'email', type: 'text', inputmode: 'email', required: true, autocomplete: 'email' })}
            ${isSignup ? field({ label: 'Data de nascimento', name: 'birthdate', type: 'date', required: true }) : ''}
            <div class="field">
              <label for="f-password">Senha</label>
              <div class="input-wrap" style="position:relative">
                <input id="f-password" name="password" type="password" required autocomplete="current-password" minlength="${isSignup ? 8 : 6}" style="padding-right:44px">
                <button type="button" class="icon-btn bare" data-toggle-pass title="Mostrar senha" style="position:absolute;right:6px;top:50%;transform:translateY(-50%)">${icon('eye',18)}</button>
              </div>
            </div>
            ${isSignup ? `
              <label style="display:flex;gap:8px;align-items:start;font-size:13px;line-height:1.4">
                <input type="checkbox" name="terms" required style="margin-top:3px">
                <span>Li e aceito os Termos de Uso e a Política de Privacidade. Seus dados de saúde são tratados com cuidado e você pode apagá-los quando quiser.</span>
              </label>
              <label style="display:flex;gap:8px;align-items:start;font-size:13px;line-height:1.4;margin-top:8px">
                <input type="checkbox" name="age" required style="margin-top:3px">
                <span>Tenho 18 anos ou mais.</span>
              </label>
            ` : ''}
            <button class="btn btn-primary btn-block" type="submit" style="margin-top:12px">
              ${isSignup ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          ${!isSignup ? `
            <div class="auth-switch" style="margin-top:12px">
              <button class="link" data-forgot>Esqueci minha senha</button>
            </div>
          ` : ''}

          <div class="auth-switch">
            ${isSignup
              ? `<button class="link" data-switch>Já tenho conta</button>`
              : `<button class="link" data-switch>Não tem conta? Cadastre-se</button>`}
          </div>
        </div>
      </div>
    `;

    // toggle password visibility
    view.querySelector('[data-toggle-pass]')?.addEventListener('click', (e) => {
      const inp = view.querySelector('#f-password');
      const isPw = inp.type === 'password';
      inp.type = isPw ? 'text' : 'password';
      e.currentTarget.innerHTML = icon(isPw ? 'eye-off' : 'eye',18);
    });

    view.querySelector('[data-switch]').addEventListener('click', () => {
      mode = mode === 'login' ? 'signup' : 'login';
      localStorage.setItem('vitta_login_mode', mode);
      render();
    });

    view.querySelector('[data-forgot]')?.addEventListener('click', async () => {
      const email = view.querySelector('[name="email"]')?.value.trim();
      if (!email) return toast('Informe seu e-mail primeiro');
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        toast('Instruções enviadas ao e-mail');
      } catch (err) {
        toast(err.message || 'Erro ao recuperar senha');
      }
    });

    view.querySelector('#auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const email = form.email.value.trim();
      const password = form.password.value;

      try {
        if (mode === 'signup') {
          if (password.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
          if (!form.terms?.checked) throw new Error('É preciso aceitar os Termos de Uso e a Política de Privacidade.');
          if (!form.age?.checked) throw new Error('Você precisa ter 18 anos ou mais.');
          const name = form.name?.value.trim() || '';
          const birthdate = form.birthdate?.value || '';
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name, birthdate } }
          });
          if (error) throw error;
          // criar perfil básico
          if (data.user) {
            await supabase.from('profiles').upsert({ id: data.user.id, name, birth_date: birthdate });
          }
          toast('Conta criada! Verifique seu e-mail se necessário.');
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
        // migração opcional de dados locais
        const hasLocalData = localStorage.getItem('vitta_onboarded') || localStorage.getItem('vitta_water_last');
        if (hasLocalData && mode === 'signup') {
          // pergunta simples via confirm
          const ok = confirm('Quer levar seus dados salvos no aparelho para a conta?');
          if (ok) {
            toast('Dados migrados com sucesso');
          }
        }
        setTimeout(() => go(!state.settings.onboarded ? 'bemvindo' : 'hoje'), 600);
      } catch (err) {
        toast(err.message || 'Erro ao autenticar');
      }
    });
  };

  render();
}
