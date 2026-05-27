(function () {
  async function getCurrentSession() {
    try {
      const client = window.supabaseClient;
      const { data, error } = await client.auth.getSession();
      if (error) return null;
      return data.session ?? null;
    } catch (e) {
      return null;
    }
  }

  async function getCurrentUser() {
    const session = await getCurrentSession();
    return session?.user ?? null;
  }

  function getDisplayName(user) {
    const metadataName = user?.user_metadata?.nome || user?.user_metadata?.name || user?.user_metadata?.full_name;
    if (metadataName) return metadataName;
    if (user?.email) return user.email.split('@')[0];
    return 'Usuário';
  }

  function renderUserName(user) {
    const el = document.getElementById('nome-usuario');
    if (el) el.textContent = getDisplayName(user);
  }

  async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = './login.html';
      return null;
    }
    renderUserName(user);
    return user;
  }

  async function logout() {
    try {
      const client = window.supabaseClient;
      await client.auth.signOut();
    } catch (e) {
      console.error('Erro ao sair:', e);
    } finally {
      window.location.href = './login.html';
    }
  }

  window.authHelpers = {
    getCurrentSession,
    getCurrentUser,
    requireAuth,
    logout,
    getDisplayName,
    renderUserName
  };
})();