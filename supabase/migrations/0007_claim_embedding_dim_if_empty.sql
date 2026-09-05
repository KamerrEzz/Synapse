-- Claim embedding dim from the actual model output. If the workspace has no
-- stored vectors yet, allow replacing a dim that was claimed by a failed run.

create or replace function public.claim_workspace_embedding_dim(p_workspace_id uuid, p_dim int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dim int;
  v_has_vectors boolean;
begin
  if auth.uid() is null or not public.is_workspace_member(p_workspace_id) then
    raise exception 'Sin acceso';
  end if;
  if p_dim is null or p_dim < 8 or p_dim > 16000 then
    raise exception 'Dimensión inválida';
  end if;

  select w.embedding_dim into v_dim
  from public.workspaces w
  where w.id = p_workspace_id
  for update;

  if not found then
    raise exception 'Workspace no encontrado';
  end if;

  if v_dim is null then
    update public.workspaces
    set embedding_dim = p_dim
    where id = p_workspace_id;
    return p_dim;
  end if;

  if v_dim = p_dim then
    return v_dim;
  end if;

  select exists (
    select 1
    from public.knowledge_chunks c
    where c.workspace_id = p_workspace_id
      and c.embedding is not null
  ) into v_has_vectors;

  if not v_has_vectors then
    update public.workspaces
    set embedding_dim = p_dim
    where id = p_workspace_id;
    return p_dim;
  end if;

  raise exception 'Este workspace ya indexó con vectores de % dimensiones. Usa el mismo modelo de embeddings o borra lo indexado.', v_dim;
end;
$$;
