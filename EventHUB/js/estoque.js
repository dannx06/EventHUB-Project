
let estoqueCache = [];
let historicoCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.authHelpers.requireAuth();
  if (!user) return;
  window.__eventhubUser = user;

  document.getElementById('btn-logout').addEventListener('click', window.authHelpers.logout);
  document.getElementById('movimentacao-form').addEventListener('submit', registrarMovimentacao);

  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('data_movimentacao').value = hoje;

  await carregarPaginaEstoque();
});

async function carregarPaginaEstoque() {
  await carregarItensEstoque();
  await carregarHistoricoMovimentacoes();
}

async function carregarItensEstoque() {
  const client = window.supabaseClient;

  const { data, error } = await client
    .from('itens')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error(error);
    document.getElementById('estoque-body').innerHTML =
      `<tr><td colspan="5">${error.message}</td></tr>`;
    return;
  }

  estoqueCache = bubbleSortPorNome(data || []);
  preencherSelectItens();
  renderizarEstoque();
  renderizarResumoEstoque();
}

async function carregarHistoricoMovimentacoes() {
  const client = window.supabaseClient;

  // Busca simples e robusta. O nome do item é montado pelo JavaScript usando estoqueCache.
  // Assim a tela não quebra caso o relacionamento do Supabase esteja com cache antigo.
  const { data, error } = await client
    .from('movimentacoes')
    .select('*')
    .order('criado_em', { ascending: false });

  if (error) {
    console.error(error);
    const tbody = document.getElementById('historico-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8">${error.message}</td></tr>`;
    return;
  }

  historicoCache = data || [];
  renderizarResumoEstoque();
  renderizarHistorico();
}

function bubbleSortPorNome(lista) {
  const arr = [...lista];

  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = 0; j < arr.length - 1 - i; j++) {
      if ((arr[j].nome || '').localeCompare(arr[j + 1].nome || '') > 0) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }

  return arr;
}

function preencherSelectItens() {
  const select = document.getElementById('id_item_mov');
  select.innerHTML = '<option value="">Selecione um item</option>';

  estoqueCache.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id_item;
    option.textContent = `${item.nome} (Disponível: ${item.quantidade_disponivel})`;
    select.appendChild(option);
  });
}

function renderizarResumoEstoque() {
  const entradas = historicoCache
    .filter(mov => mov.tipo === 'entrada' || mov.tipo === 'devolucao')
    .reduce((total, mov) => total + Number(mov.quantidade || 0), 0);

  const saidas = historicoCache
    .filter(mov => mov.tipo === 'saida' || mov.tipo === 'retirada')
    .reduce((total, mov) => total + Number(mov.quantidade || 0), 0);

  const normal = estoqueCache.filter(item =>
    Number(item.quantidade_disponivel) >= Number(item.quantidade_minima)
  ).length;

  const minimo = estoqueCache.filter(item =>
    Number(item.quantidade_disponivel) < Number(item.quantidade_minima)
  ).length;

  const entradasEl = document.getElementById('total-entradas');
  const saidasEl = document.getElementById('total-saidas');
  const normalEl = document.getElementById('total-normal');
  const minimoEl = document.getElementById('total-minimo-estoque');

  if (entradasEl) entradasEl.textContent = entradas;
  if (saidasEl) saidasEl.textContent = saidas;
  if (normalEl) normalEl.textContent = normal;
  if (minimoEl) minimoEl.textContent = minimo;
}

function renderizarEstoque() {
  const tbody = document.getElementById('estoque-body');
  tbody.innerHTML = '';

  if (!estoqueCache.length) {
    tbody.innerHTML = `<tr><td colspan="6">Nenhum item encontrado.</td></tr>`;
    return;
  }

  estoqueCache.forEach(item => {
    const abaixoMinimo = Number(item.quantidade_disponivel) < Number(item.quantidade_minima);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.categoria || ''}</td>
      <td>${item.quantidade_total}</td>
      <td>${item.quantidade_disponivel}</td>
      <td>${item.quantidade_minima}</td>
      <td class="${abaixoMinimo ? 'status-alerta' : 'status-ok'}">
        ${abaixoMinimo ? 'Estoque baixo' : 'Normal'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderizarHistorico() {
  const tbody = document.getElementById('historico-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!historicoCache.length) {
    tbody.innerHTML = `<tr><td colspan="8">Nenhuma movimentação registrada.</td></tr>`;
    return;
  }

  historicoCache.forEach(mov => {
    const item = estoqueCache.find(i => Number(i.id_item) === Number(mov.id_item));
    const classeTipo = ['entrada', 'devolucao'].includes(mov.tipo) ? 'badge-ok' : 'badge-alert';
    const responsavel = mov.responsavel || window.authHelpers.getDisplayName(window.__eventhubUser || null) || '-';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatarData(mov.data_movimentacao)}</td>
      <td>${item?.nome || '-'}</td>
      <td><span class="badge-status ${classeTipo}">${formatarTipo(mov.tipo)}</span></td>
      <td>${mov.quantidade}</td>
      <td>${item?.quantidade_disponivel ?? '-'}</td>
      <td>${item?.quantidade_minima ?? '-'}</td>
      <td>${responsavel}</td>
      <td>${mov.observacao || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function formatarData(data) {
  if (!data) return '-';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarTipo(tipo) {
  const nomes = {
    entrada: 'Entrada',
    saida: 'Saída',
    retirada: 'Retirada',
    devolucao: 'Devolução'
  };

  return nomes[tipo] || tipo;
}

async function registrarMovimentacao(e) {
  e.preventDefault();

  const client = window.supabaseClient;
  const mensagem = document.getElementById('mensagem-mov');
  mensagem.textContent = '';
  mensagem.style.color = '#d92d20';

  const idItem = Number(document.getElementById('id_item_mov').value);
  const tipo = document.getElementById('tipo').value;

  if (!['entrada', 'saida'].includes(tipo)) {
    mensagem.textContent = 'Na movimentação manual use apenas Entrada ou Saída.';
    return;
  }
  const quantidade = Number(document.getElementById('quantidade_mov').value);
  const dataMovimentacao = document.getElementById('data_movimentacao').value;
  const responsavel = document.getElementById('responsavel').value.trim();
  const observacao = document.getElementById('observacao').value.trim();

  if (!idItem || !tipo || !quantidade || !dataMovimentacao) {
    mensagem.textContent = 'Preencha todos os campos obrigatórios.';
    return;
  }

  if (quantidade <= 0) {
    mensagem.textContent = 'A quantidade deve ser maior que zero.';
    return;
  }

  try {
    const { error } = await client.rpc('registrar_movimentacao', {
      p_id_item: idItem,
      p_tipo: tipo,
      p_quantidade: quantidade,
      p_data_movimentacao: dataMovimentacao,
      p_responsavel: responsavel || window.authHelpers.getDisplayName(await window.authHelpers.getCurrentUser()),
      p_observacao: observacao || 'Movimentação manual'
    });

    if (error) throw error;

    mensagem.style.color = '#15803d';
    mensagem.textContent = 'Movimentação registrada e estoque atualizado com sucesso.';

    document.getElementById('movimentacao-form').reset();
    document.getElementById('data_movimentacao').value = new Date().toISOString().split('T')[0];

    await carregarPaginaEstoque();

    const itemAtualizado = estoqueCache.find(i => Number(i.id_item) === idItem);

    if (
      itemAtualizado &&
      Number(itemAtualizado.quantidade_disponivel) < Number(itemAtualizado.quantidade_minima)
    ) {
      alert(`Atenção: o item "${itemAtualizado.nome}" está abaixo do estoque mínimo.`);
    }
  } catch (error) {
    console.error(error);
    mensagem.textContent = error.message || 'Erro ao registrar movimentação.';
  }
}
