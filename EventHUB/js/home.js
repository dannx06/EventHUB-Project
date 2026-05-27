document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.authHelpers.requireAuth();
  if (!user) return;

  const nomeUsuario = document.getElementById('nome-usuario');
  if (nomeUsuario) {
    nomeUsuario.textContent = window.authHelpers.getDisplayName(user);
  }

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', window.authHelpers.logout);
  }

  await carregarResumoDashboard();
});

async function carregarResumoDashboard() {
  const client = window.supabaseClient;

  const totalItensEl = document.getElementById('total-itens');
  const totalLocacoesEl = document.getElementById('total-locacoes');
  const totalMinimoEl = document.getElementById('total-minimo');

  try {
    // 1) Buscar itens
    const { data: itens, error: itensError } = await client
      .from('itens')
      .select('id_item, quantidade_disponivel, quantidade_minima');

    if (itensError) {
      console.error('Erro ao buscar itens:', itensError);
      return;
    }

    // 2) Buscar locações
    const { data: locacoes, error: locacoesError } = await client
      .from('locacoes')
      .select('id_locacao, status');

    if (locacoesError) {
      console.error('Erro ao buscar locações:', locacoesError);
      return;
    }

    // 3) Calcular totais
    const totalItens = itens ? itens.length : 0;

    const totalLocacoesAtivas = (locacoes || []).filter(loc =>
      ['Agendada', 'Retirada'].includes(loc.status)
    ).length;

    const totalAbaixoMinimo = (itens || []).filter(item =>
      Number(item.quantidade_disponivel) < Number(item.quantidade_minima)
    ).length;

    // 4) Atualizar tela
    if (totalItensEl) totalItensEl.textContent = totalItens;
    if (totalLocacoesEl) totalLocacoesEl.textContent = totalLocacoesAtivas;
    if (totalMinimoEl) totalMinimoEl.textContent = totalAbaixoMinimo;

    console.log('Resumo dashboard:', {
      totalItens,
      totalLocacoesAtivas,
      totalAbaixoMinimo
    });

  } catch (erro) {
    console.error('Erro no dashboard:', erro);
  }
}