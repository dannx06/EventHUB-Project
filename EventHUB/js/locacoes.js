
const { requireAuth, logout, getDisplayName } = window.authHelpers;

let locacoesCache = [];
let itensCache = [];
let clientesCache = [];
let locacaoItensCache = [];
let usuarioAtual = null;
let clienteAtual = null;

function formatarData(data) {
  if (!data) return '-';
  const [ano, mes, dia] = String(data).split('-');
  return `${dia}/${mes}/${ano}`;
}

function mostrarMensagemLocacao(texto, tipo = 'erro') {
  const mensagem = document.getElementById('mensagem-locacao');
  if (!mensagem) return;
  mensagem.textContent = texto || '';
  mensagem.style.color = tipo === 'sucesso' ? '#15803d' : '#d92d20';
}

document.addEventListener('DOMContentLoaded', async () => {
  usuarioAtual = await requireAuth();
  if (!usuarioAtual) return;

  document.getElementById('btn-logout').addEventListener('click', logout);
  document.getElementById('locacao-form').addEventListener('submit', salvarLocacao);
  document.getElementById('cancelar-locacao').addEventListener('click', limparFormulario);

  clienteAtual = await garantirClienteLogado(usuarioAtual);
  if (!clienteAtual) return;

  const hoje = new Date().toISOString().split('T')[0];
  const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  document.getElementById('data_retirada').value = hoje;
  document.getElementById('data_prevista_devolucao').value = amanha;
  document.getElementById('status').value = 'Retirada';

  await carregarDadosDaPagina();
});

async function carregarDadosDaPagina() {
  await carregarItens();
  await carregarLocacoes();
}

async function garantirClienteLogado(user) {
  const client = window.supabaseClient;
  const nome = getDisplayName(user);
  const email = user.email || '';

  document.getElementById('cliente-logado-nome').textContent = nome;
  document.getElementById('cliente-logado-email').textContent = email;
  document.getElementById('cliente_locacao_nome').value = nome;

  const { data: existente, error: erroBusca } = await client
    .from('clientes')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (erroBusca) {
    console.error('Erro ao buscar cliente:', erroBusca);
    mostrarMensagemLocacao('Erro ao carregar o cliente logado.');
    return null;
  }

  if (existente) {
    document.getElementById('id_cliente').value = existente.id_cliente;
    return existente;
  }

  const { data: novoCliente, error: erroInsert } = await client
    .from('clientes')
    .insert([{ user_id: user.id, nome, email }])
    .select('*')
    .single();

  if (erroInsert) {
    console.error('Erro ao criar cliente:', erroInsert);
    mostrarMensagemLocacao('Erro ao criar cliente automático.');
    return null;
  }

  document.getElementById('id_cliente').value = novoCliente.id_cliente;
  return novoCliente;
}

async function carregarItens() {
  const { data, error } = await window.supabaseClient
    .from('itens')
    .select('*')
    .eq('user_id', usuarioAtual.id)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar itens:', error);
    mostrarMensagemLocacao('Erro ao carregar itens: ' + error.message);
    return;
  }

  itensCache = data || [];

  const select = document.getElementById('item_locacao');
  select.innerHTML = '<option value="">Selecione o item</option>';

  itensCache.forEach(item => {
    const disponivel = Number(item.quantidade_disponivel || 0);
    const minimo = Number(item.quantidade_minima || 0);
    const option = document.createElement('option');
    option.value = item.id_item;
    option.textContent = `${item.nome} | Disponível: ${disponivel} | Mínimo: ${minimo}`;
    select.appendChild(option);
  });
}

async function carregarLocacoes() {
  const client = window.supabaseClient;

  const [locacoesResp, locacaoItensResp, clientesResp] = await Promise.all([
    client.from('locacoes').select('*').eq('user_id', usuarioAtual.id).order('id_locacao', { ascending: false }),
    client.from('locacao_itens').select('*').eq('user_id', usuarioAtual.id),
    client.from('clientes').select('*').eq('user_id', usuarioAtual.id)
  ]);

  if (locacoesResp.error || locacaoItensResp.error || clientesResp.error) {
    const erro = locacoesResp.error || locacaoItensResp.error || clientesResp.error;
    console.error('Erro ao carregar locações:', erro);
    document.getElementById('locacoes-body').innerHTML =
      `<tr><td colspan="11">${erro.message}</td></tr>`;
    return;
  }

  locacoesCache = locacoesResp.data || [];
  locacaoItensCache = locacaoItensResp.data || [];
  clientesCache = clientesResp.data || [];

  renderizarLocacoes();
}

function montarLocacaoCompleta(loc) {
  const itemRel = locacaoItensCache.find(rel => Number(rel.id_locacao) === Number(loc.id_locacao));
  const item = itemRel ? itensCache.find(i => Number(i.id_item) === Number(itemRel.id_item)) : null;
  const cliente = clientesCache.find(c => Number(c.id_cliente) === Number(loc.id_cliente));

  const disponivel = item ? Number(item.quantidade_disponivel || 0) : null;
  const minimo = item ? Number(item.quantidade_minima || 0) : null;
  const estoqueBaixo = item ? disponivel < minimo : false;

  return {
    ...loc,
    clienteNome: cliente?.nome || getDisplayName(usuarioAtual),
    itemRel,
    itemNome: item?.nome || '-',
    quantidade: itemRel?.quantidade || '-',
    disponivel,
    minimo,
    estoqueStatus: item ? (estoqueBaixo ? 'Estoque baixo' : 'Normal') : '-',
    estoqueClasse: item ? (estoqueBaixo ? 'status-alerta' : 'status-ok') : ''
  };
}

function renderizarLocacoes() {
  const tbody = document.getElementById('locacoes-body');
  tbody.innerHTML = '';

  if (!locacoesCache.length) {
    tbody.innerHTML = `<tr><td colspan="11">Nenhuma locação cadastrada.</td></tr>`;
    return;
  }

  locacoesCache.forEach(locOriginal => {
    const loc = montarLocacaoCompleta(locOriginal);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${loc.id_locacao}</td>
      <td>${loc.clienteNome}</td>
      <td>${loc.itemNome}</td>
      <td>${loc.quantidade}</td>
      <td>${loc.disponivel ?? '-'}</td>
      <td>${loc.minimo ?? '-'}</td>
      <td class="${loc.estoqueClasse}">${loc.estoqueStatus}</td>
      <td>${formatarData(loc.data_retirada)}</td>
      <td>${formatarData(loc.data_prevista_devolucao)}</td>
      <td><span class="status-badge">${loc.status}</span></td>
      <td class="actions-cell">
        <button class="action-btn edit-btn" onclick="editarLocacao(${loc.id_locacao})">Editar</button>
        <button class="action-btn delete-btn" onclick="excluirLocacao(${loc.id_locacao})">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function obterItemAtualizado(idItem) {
  const { data } = await window.supabaseClient
    .from('itens')
    .select('*')
    .eq('id_item', Number(idItem))
    .eq('user_id', usuarioAtual.id)
    .single();

  return data || null;
}

function mensagemEstoqueAtualizado(item) {
  if (!item) return '';

  const disponivel = Number(item.quantidade_disponivel || 0);
  const minimo = Number(item.quantidade_minima || 0);
  const status = disponivel < minimo ? 'ESTOQUE BAIXO' : 'NORMAL';

  return ` Estoque atual: disponível ${disponivel}, mínimo ${minimo}, status ${status}.`;
}

async function salvarLocacao(e) {
  e.preventDefault();

  mostrarMensagemLocacao('');

  const idLocacao = document.getElementById('id_locacao').value;
  const idCliente = Number(document.getElementById('id_cliente').value || clienteAtual?.id_cliente);
  const dataRetirada = document.getElementById('data_retirada').value;
  const dataPrevista = document.getElementById('data_prevista_devolucao').value;
  const status = document.getElementById('status').value;
  const itemLocacao = Number(document.getElementById('item_locacao').value);
  const quantidadeLocacao = Number(document.getElementById('quantidade_locacao').value);
  const observacoes = document.getElementById('observacoes').value.trim();

  if (!idCliente || !dataRetirada || !dataPrevista || !status || !itemLocacao || !quantidadeLocacao) {
    mostrarMensagemLocacao('Preencha todos os campos obrigatórios.');
    return;
  }

  if (quantidadeLocacao <= 0) {
    mostrarMensagemLocacao('A quantidade deve ser maior que zero.');
    return;
  }

  const itemEscolhido = itensCache.find(item => Number(item.id_item) === itemLocacao);
  if (['Agendada', 'Retirada'].includes(status) && itemEscolhido && quantidadeLocacao > Number(itemEscolhido.quantidade_disponivel)) {
    mostrarMensagemLocacao(`Estoque insuficiente para "${itemEscolhido.nome}". Disponível: ${itemEscolhido.quantidade_disponivel}, solicitado: ${quantidadeLocacao}.`);
    return;
  }

  try {
    let resposta;

    if (idLocacao) {
      resposta = await window.supabaseClient.rpc('atualizar_locacao_com_item', {
        p_id_locacao: Number(idLocacao),
        p_id_cliente: idCliente,
        p_data_retirada: dataRetirada,
        p_data_prevista_devolucao: dataPrevista,
        p_status: status,
        p_observacoes: observacoes,
        p_id_item: itemLocacao,
        p_quantidade: quantidadeLocacao
      });
    } else {
      resposta = await window.supabaseClient.rpc('criar_locacao_com_item', {
        p_id_cliente: idCliente,
        p_data_retirada: dataRetirada,
        p_data_prevista_devolucao: dataPrevista,
        p_status: status,
        p_observacoes: observacoes,
        p_id_item: itemLocacao,
        p_quantidade: quantidadeLocacao
      });
    }

    if (resposta.error) {
      throw resposta.error;
    }

    await carregarItens();
    const itemAtualizado = await obterItemAtualizado(itemLocacao);

    mostrarMensagemLocacao(
      (idLocacao ? 'Locação atualizada com sucesso.' : 'Locação cadastrada com sucesso.') +
      ' O estoque e o histórico de movimentações foram atualizados automaticamente.' +
      mensagemEstoqueAtualizado(itemAtualizado),
      'sucesso'
    );

    limparFormulario(false);
    await carregarLocacoes();
  } catch (error) {
    console.error('Erro ao salvar locação:', error);
    mostrarMensagemLocacao(error.message || 'Erro ao salvar locação.');
  }
}

function editarLocacao(id) {
  const locOriginal = locacoesCache.find(l => Number(l.id_locacao) === Number(id));
  if (!locOriginal) return;

  const loc = montarLocacaoCompleta(locOriginal);

  document.getElementById('locacao-title').textContent = 'Editar locação';
  document.getElementById('id_locacao').value = loc.id_locacao;
  document.getElementById('id_cliente').value = clienteAtual?.id_cliente || loc.id_cliente;
  document.getElementById('cliente_locacao_nome').value = loc.clienteNome;
  document.getElementById('data_retirada').value = loc.data_retirada;
  document.getElementById('data_prevista_devolucao').value = loc.data_prevista_devolucao;
  document.getElementById('status').value = loc.status;
  document.getElementById('observacoes').value = loc.observacoes || '';

  if (loc.itemRel) {
    document.getElementById('item_locacao').value = loc.itemRel.id_item;
    document.getElementById('quantidade_locacao').value = loc.itemRel.quantidade;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function excluirLocacao(id) {
  if (!confirm('Deseja realmente excluir esta locação? O estoque será devolvido automaticamente se necessário.')) return;

  try {
    const { error } = await window.supabaseClient.rpc('excluir_locacao_com_estoque', {
      p_id_locacao: Number(id)
    });

    if (error) throw error;

    await carregarDadosDaPagina();
  } catch (error) {
    console.error('Erro ao excluir locação:', error);
    alert(error.message || 'Erro ao excluir locação.');
  }
}

function limparFormulario(limparMensagem = true) {
  document.getElementById('locacao-title').textContent = 'Nova locação';
  document.getElementById('locacao-form').reset();
  document.getElementById('id_locacao').value = '';
  document.getElementById('id_cliente').value = clienteAtual?.id_cliente || '';
  document.getElementById('cliente_locacao_nome').value = getDisplayName(usuarioAtual);
  document.getElementById('status').value = 'Retirada';

  const hoje = new Date().toISOString().split('T')[0];
  const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  document.getElementById('data_retirada').value = hoje;
  document.getElementById('data_prevista_devolucao').value = amanha;

  if (limparMensagem) {
    document.getElementById('mensagem-locacao').textContent = '';
  }
}

window.editarLocacao = editarLocacao;
window.excluirLocacao = excluirLocacao;
