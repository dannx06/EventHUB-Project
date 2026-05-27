
let itensCache = [];
let usuarioAtual = null;

document.addEventListener('DOMContentLoaded', async () => {
  usuarioAtual = await window.authHelpers.requireAuth();
  if (!usuarioAtual) return;

  document.getElementById('btn-logout').addEventListener('click', window.authHelpers.logout);
  document.getElementById('item-form').addEventListener('submit', salvarItem);
  document.getElementById('cancelar-edicao').addEventListener('click', limparFormulario);
  document.getElementById('busca').addEventListener('input', renderizarTabela);

  await carregarItens();
});

async function carregarItens() {
  const client = window.supabaseClient;
  const tbody = document.getElementById('itens-body');

  const { data, error } = await client
    .from('itens')
    .select('*')
    .eq('user_id', usuarioAtual.id)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar itens:', error);
    tbody.innerHTML = `<tr><td colspan="8">${error.message}</td></tr>`;
    return;
  }

  itensCache = data || [];
  renderizarTabela();
}

function renderizarTabela() {
  const tbody = document.getElementById('itens-body');
  const termo = document.getElementById('busca').value.trim().toLowerCase();

  let lista = [...itensCache];

  if (termo) {
    lista = lista.filter(item =>
      item.nome.toLowerCase().includes(termo) ||
      (item.categoria || '').toLowerCase().includes(termo)
    );
  }

  tbody.innerHTML = '';

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="8">Nenhum item encontrado.</td></tr>`;
    return;
  }

  lista.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.id_item}</td>
      <td>${item.nome}</td>
      <td>${item.categoria}</td>
      <td>${item.quantidade_total}</td>
      <td>${item.quantidade_disponivel}</td>
      <td>${item.quantidade_minima}</td>
      <td>R$ ${Number(item.valor_locacao || 0).toFixed(2)}</td>
      <td class="actions-cell">
        <button class="action-btn edit-btn" onclick="editarItem(${item.id_item})">Editar</button>
        <button class="action-btn delete-btn" onclick="excluirItem(${item.id_item})">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function salvarItem(e) {
  e.preventDefault();

  const client = window.supabaseClient;
  const mensagem = document.getElementById('mensagem-item');
  mensagem.textContent = '';
  mensagem.style.color = '#d92d20';

  if (!usuarioAtual) {
    usuarioAtual = await window.authHelpers.requireAuth();
    if (!usuarioAtual) return;
  }

  const id = document.getElementById('id_item').value;

  const payload = {
    user_id: usuarioAtual.id,
    nome: document.getElementById('nome').value.trim(),
    categoria: document.getElementById('categoria').value.trim(),
    descricao: document.getElementById('descricao').value.trim(),
    quantidade_total: Number(document.getElementById('quantidade_total').value),
    quantidade_disponivel: Number(document.getElementById('quantidade_disponivel').value),
    quantidade_minima: Number(document.getElementById('quantidade_minima').value),
    estado: document.getElementById('estado').value.trim(),
    valor_locacao: Number(document.getElementById('valor_locacao').value)
  };

  if (!payload.nome || !payload.categoria || !payload.estado) {
    mensagem.textContent = 'Preencha nome, categoria e estado.';
    return;
  }

  if (
    payload.quantidade_total < 0 ||
    payload.quantidade_disponivel < 0 ||
    payload.quantidade_minima < 0 ||
    payload.valor_locacao < 0
  ) {
    mensagem.textContent = 'Os valores numéricos não podem ser negativos.';
    return;
  }

  if (payload.quantidade_disponivel > payload.quantidade_total) {
    mensagem.textContent = 'A quantidade disponível não pode ser maior que a quantidade total.';
    return;
  }

  let response;

  if (id) {
    response = await client
      .from('itens')
      .update(payload)
      .eq('id_item', Number(id))
      .eq('user_id', usuarioAtual.id)
      .select()
      .single();
  } else {
    response = await client
      .from('itens')
      .insert([payload])
      .select()
      .single();
  }

  if (response.error) {
    console.error('Erro ao salvar item:', response.error);
    mensagem.textContent = response.error.message || 'Erro ao salvar item.';
    return;
  }

  mensagem.style.color = '#15803d';
  mensagem.textContent = id
    ? 'Item atualizado com sucesso.'
    : 'Item cadastrado com sucesso.';

  limparFormulario();
  await carregarItens();
}

function editarItem(id) {
  const item = itensCache.find(i => Number(i.id_item) === Number(id));
  if (!item) return;

  document.getElementById('form-title').textContent = 'Editar Item';
  document.getElementById('id_item').value = item.id_item;
  document.getElementById('nome').value = item.nome;
  document.getElementById('categoria').value = item.categoria;
  document.getElementById('descricao').value = item.descricao || '';
  document.getElementById('quantidade_total').value = item.quantidade_total;
  document.getElementById('quantidade_disponivel').value = item.quantidade_disponivel;
  document.getElementById('quantidade_minima').value = item.quantidade_minima;
  document.getElementById('estado').value = item.estado;
  document.getElementById('valor_locacao').value = item.valor_locacao;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirItem(id) {
  const client = window.supabaseClient;
  const confirmar = confirm('Deseja realmente excluir este item?');
  if (!confirmar) return;

  const { error } = await client
    .from('itens')
    .delete()
    .eq('id_item', Number(id))
    .eq('user_id', usuarioAtual.id);

  if (error) {
    console.error('Erro ao excluir item:', error);
    alert(error.message || 'Erro ao excluir item.');
    return;
  }

  await carregarItens();
}

function limparFormulario() {
  document.getElementById('form-title').textContent = 'Novo Item';
  document.getElementById('item-form').reset();
  document.getElementById('id_item').value = '';
}

window.editarItem = editarItem;
window.excluirItem = excluirItem;
