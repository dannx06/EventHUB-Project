
-- =========================================================
-- EVENTHUB - SQL LIMPO PARA NOVOS USUÁRIOS
-- Execute este SQL em um projeto NOVO do Supabase.
-- =========================================================

-- =========================================================
-- TABELAS
-- =========================================================

create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  telefone text,
  tipo text not null default 'cliente',
  criado_em timestamptz default now()
);

create table public.clientes (
  id_cliente bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  telefone text,
  endereco text,
  criado_em timestamptz default now()
);

create table public.itens (
  id_item bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  nome text not null,
  categoria text not null,
  descricao text,

  estado text default 'Disponível',

  quantidade_total integer not null default 0,
  quantidade_disponivel integer not null default 0,
  quantidade_minima integer not null default 0,

  valor_locacao numeric(10,2) default 0,

  criado_em timestamptz default now()
);

create table public.movimentacoes (
  id_movimentacao bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  id_item bigint not null references public.itens(id_item) on delete cascade,

  tipo text not null,
  quantidade integer not null,

  data_movimentacao date default current_date,

  responsavel text,
  observacao text,

  criado_em timestamptz default now()
);

create table public.locacoes (
  id_locacao bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  id_cliente bigint not null references public.clientes(id_cliente),

  data_retirada date not null,
  data_prevista_devolucao date not null,

  status text default 'Retirada',
  observacoes text,

  criado_em timestamptz default now()
);

create table public.locacao_itens (
  id_locacao_item bigint generated always as identity primary key,

  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  id_locacao bigint not null references public.locacoes(id_locacao) on delete cascade,
  id_item bigint not null references public.itens(id_item),

  quantidade integer not null,

  criado_em timestamptz default now()
);

-- =========================================================
-- RLS
-- =========================================================

alter table public.perfis enable row level security;
alter table public.clientes enable row level security;
alter table public.itens enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.locacoes enable row level security;
alter table public.locacao_itens enable row level security;

create policy "perfis_policy"
on public.perfis
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "clientes_policy"
on public.clientes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "itens_policy"
on public.itens
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "movimentacoes_policy"
on public.movimentacoes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "locacoes_policy"
on public.locacoes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "locacao_itens_policy"
on public.locacao_itens
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =========================================================
-- PERFIL AUTOMÁTICO
-- =========================================================

create or replace function public.criar_perfil_automatico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  insert into public.perfis (
    id,
    nome,
    email
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'nome',
      split_part(new.email, '@', 1)
    ),
    new.email
  );

  insert into public.clientes (
    user_id,
    nome,
    email
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'nome',
      split_part(new.email, '@', 1)
    ),
    new.email
  );

  return new;

end;
$$;

create trigger criar_perfil_trigger
after insert on auth.users
for each row
execute function public.criar_perfil_automatico();

-- =========================================================
-- FUNÇÃO PARA REGISTRAR MOVIMENTAÇÃO
-- =========================================================

create or replace function public.registrar_movimentacao(
  p_id_item bigint,
  p_tipo text,
  p_quantidade integer,
  p_data date,
  p_responsavel text,
  p_observacao text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare

  v_item record;

begin

  select *
  into v_item
  from public.itens
  where id_item = p_id_item
  and user_id = auth.uid();

  if not found then
    raise exception 'Item não encontrado.';
  end if;

  if p_tipo = 'entrada' then

    update public.itens
    set
      quantidade_total = quantidade_total + p_quantidade,
      quantidade_disponivel = quantidade_disponivel + p_quantidade
    where id_item = p_id_item;

  elsif p_tipo = 'saida' then

    if v_item.quantidade_disponivel < p_quantidade then
      raise exception 'Estoque insuficiente.';
    end if;

    update public.itens
    set quantidade_disponivel =
      quantidade_disponivel - p_quantidade
    where id_item = p_id_item;

  end if;

  insert into public.movimentacoes (
    user_id,
    id_item,
    tipo,
    quantidade,
    data_movimentacao,
    responsavel,
    observacao
  )
  values (
    auth.uid(),
    p_id_item,
    p_tipo,
    p_quantidade,
    p_data,
    p_responsavel,
    p_observacao
  );

end;
$$;

grant execute on function public.registrar_movimentacao(
  bigint,
  text,
  integer,
  date,
  text,
  text
) to authenticated;

-- =========================================================
-- FUNÇÃO PARA CRIAR LOCAÇÃO
-- =========================================================

create or replace function public.criar_locacao_com_item(
  p_id_cliente bigint,
  p_data_retirada date,
  p_data_prevista date,
  p_status text,
  p_observacoes text,
  p_id_item bigint,
  p_quantidade integer
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare

  v_item record;
  v_locacao bigint;
  v_cliente text;

begin

  select *
  into v_item
  from public.itens
  where id_item = p_id_item
  and user_id = auth.uid();

  if not found then
    raise exception 'Item não encontrado.';
  end if;

  if v_item.quantidade_disponivel < p_quantidade then
    raise exception
    'Estoque insuficiente para "%". Disponível: %, solicitado: %',
    v_item.nome,
    v_item.quantidade_disponivel,
    p_quantidade;
  end if;

  insert into public.locacoes (
    user_id,
    id_cliente,
    data_retirada,
    data_prevista_devolucao,
    status,
    observacoes
  )
  values (
    auth.uid(),
    p_id_cliente,
    p_data_retirada,
    p_data_prevista,
    p_status,
    p_observacoes
  )
  returning id_locacao into v_locacao;

  insert into public.locacao_itens (
    user_id,
    id_locacao,
    id_item,
    quantidade
  )
  values (
    auth.uid(),
    v_locacao,
    p_id_item,
    p_quantidade
  );

  update public.itens
  set quantidade_disponivel =
    quantidade_disponivel - p_quantidade
  where id_item = p_id_item;

  select nome
  into v_cliente
  from public.clientes
  where id_cliente = p_id_cliente;

  insert into public.movimentacoes (
    user_id,
    id_item,
    tipo,
    quantidade,
    data_movimentacao,
    responsavel,
    observacao
  )
  values (
    auth.uid(),
    p_id_item,
    'retirada',
    p_quantidade,
    p_data_retirada,
    v_cliente,
    'Saída automática gerada pela locação #' || v_locacao
  );

  return v_locacao;

end;
$$;

grant execute on function public.criar_locacao_com_item(
  bigint,
  date,
  date,
  text,
  text,
  bigint,
  integer
) to authenticated;

-- =========================================================
-- FUNÇÃO PARA EXCLUIR LOCAÇÃO
-- =========================================================

create or replace function public.excluir_locacao_com_estoque(
  p_id_locacao bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare

  r record;

begin

  for r in
    select li.*, i.nome
    from public.locacao_itens li
    join public.itens i
      on i.id_item = li.id_item
    where li.id_locacao = p_id_locacao
  loop

    update public.itens
    set quantidade_disponivel =
      quantidade_disponivel + r.quantidade
    where id_item = r.id_item;

    insert into public.movimentacoes (
      user_id,
      id_item,
      tipo,
      quantidade,
      data_movimentacao,
      responsavel,
      observacao
    )
    values (
      auth.uid(),
      r.id_item,
      'devolucao',
      r.quantidade,
      current_date,
      'Sistema',
      'Devolução automática da locação #' || p_id_locacao
    );

  end loop;

  delete from public.locacoes
  where id_locacao = p_id_locacao;

end;
$$;

grant execute on function public.excluir_locacao_com_estoque(bigint)
to authenticated;

-- =========================================================
-- FIM
-- =========================================================
