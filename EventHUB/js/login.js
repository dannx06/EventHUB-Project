const client = window.supabaseClient;

document.addEventListener('DOMContentLoaded', async () => {
  const session = await window.authHelpers.getCurrentSession();
  if (session) {
    window.location.href = './home.html';
    return;
  }

  configurarTabs();
  document.getElementById('login-form').addEventListener('submit', fazerLogin);
  document.getElementById('cadastro-form').addEventListener('submit', fazerCadastro);
});

function configurarTabs() {
  const tabs = document.querySelectorAll('[data-auth-tab]');
  const loginForm = document.getElementById('login-form');
  const cadastroForm = document.getElementById('cadastro-form');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(item => item.classList.remove('active'));
      tab.classList.add('active');

      const tipo = tab.dataset.authTab;
      loginForm.classList.toggle('hidden', tipo !== 'login');
      cadastroForm.classList.toggle('hidden', tipo !== 'cadastro');

      document.getElementById('mensagem').textContent = '';
      document.getElementById('mensagem-cadastro').textContent = '';
    });
  });
}


async function fazerLogin(e) {
  e.preventDefault();

  const mensagem = document.getElementById('mensagem');
  mensagem.textContent = '';
  mensagem.className = 'message';

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value.trim();

  if (!email || !senha) {
    mostrarMensagem(mensagem, 'Preencha e-mail e senha.', 'erro');
    return;
  }

  const { error } = await client.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    mostrarMensagem(mensagem, traduzirErroAuth(error.message), 'erro');
    return;
  }

  mostrarMensagem(mensagem, 'Login realizado com sucesso.', 'sucesso');

  setTimeout(() => {
    window.location.href = './home.html';
  }, 400);
}

async function fazerCadastro(e) {
  e.preventDefault();

  const mensagem = document.getElementById('mensagem-cadastro');
  mensagem.textContent = '';
  mensagem.className = 'message';

  const nome = document.getElementById('cadastro-nome').value.trim();
  const email = document.getElementById('cadastro-email').value.trim();
  const senha = document.getElementById('cadastro-senha').value.trim();

  if (!nome || !email || !senha) {
    mostrarMensagem(mensagem, 'Preencha todos os campos.', 'erro');
    return;
  }

  if (senha.length < 6) {
    mostrarMensagem(mensagem, 'A senha precisa ter pelo menos 6 caracteres.', 'erro');
    return;
  }

  const { data, error } = await client.auth.signUp({
    email,
    password: senha,
    options: {
      data: {
        nome
      }
    }
  });

  if (error) {
    mostrarMensagem(mensagem, traduzirErroAuth(error.message), 'erro');
    return;
  }

  if (data?.user && data?.session) {
    await client.from('perfis').upsert({
      id: data.user.id,
      nome,
      tipo: 'cliente'
    });

    mostrarMensagem(mensagem, 'Conta criada com sucesso. Redirecionando...', 'sucesso');

    setTimeout(() => {
      window.location.href = './home.html';
    }, 700);

    return;
  }

  mostrarMensagem(
    mensagem,
    'Conta criada. Se o Supabase pedir confirmação, confirme seu e-mail antes de entrar.',
    'sucesso'
  );
}

function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.classList.toggle('success-message', tipo === 'sucesso');
  elemento.classList.toggle('error-message', tipo === 'erro');
}

function traduzirErroAuth(mensagem) {
  const texto = String(mensagem || '').toLowerCase();

  if (texto.includes('invalid login credentials')) {
    return 'E-mail ou senha inválidos.';
  }

  if (texto.includes('already registered') || texto.includes('already been registered')) {
    return 'Este e-mail já está cadastrado.';
  }

  if (texto.includes('password')) {
    return 'Senha inválida. Use pelo menos 6 caracteres.';
  }

  if (texto.includes('email')) {
    return 'Verifique o e-mail informado.';
  }

  return mensagem || 'Ocorreu um erro. Tente novamente.';
}
