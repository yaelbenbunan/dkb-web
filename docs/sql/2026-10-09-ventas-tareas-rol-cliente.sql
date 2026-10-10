-- Ventas B2B: rol «cliente», hora de seguimiento, tareas, última nota y borrado
-- de leads. Spec: docs/superpowers/specs/2026-10-09-ventas-tareas-rol-cliente-design.md
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc)
-- y comprobar que ha ido bien ANTES de integrar la rama en main, no solo antes
-- de desplegar: el código nuevo NO funciona sin esta migración («Mi día», el
-- tablero, las tareas, el alta de usuarias y registrar actividad fallarían).
-- Es idempotente, y va en una transacción: o se aplica entera o no se aplica.
-- El parámetro nuevo de ventas_registrar_actividad tiene default, así que el
-- código antiguo sigue funcionando con la migración ya aplicada.

begin;

-- 1. Rol «cliente» ligado a una marca --------------------------------------
alter table public.ventas_usuarias drop constraint if exists ventas_usuarias_rol_check;
alter table public.ventas_usuarias
  add constraint ventas_usuarias_rol_check check (rol in ('admin', 'comercial', 'cliente'));

alter table public.ventas_usuarias
  add column if not exists marca_id uuid references public.ventas_marcas(id) on delete restrict;

alter table public.ventas_usuarias drop constraint if exists ventas_usuarias_marca_de_cliente;
alter table public.ventas_usuarias
  add constraint ventas_usuarias_marca_de_cliente check ((rol = 'cliente') = (marca_id is not null));

-- 2. Hora del próximo seguimiento ------------------------------------------
alter table public.ventas_leads add column if not exists proximo_seguimiento_hora time;

alter table public.ventas_leads drop constraint if exists ventas_leads_hora_con_fecha;
alter table public.ventas_leads
  add constraint ventas_leads_hora_con_fecha
  check (proximo_seguimiento_hora is null or proximo_seguimiento is not null);

-- La firma antigua (8 parámetros) se quita para que no haya dos candidatas.
drop function if exists public.ventas_registrar_actividad(uuid, uuid, text, text, text, text, boolean, date);

create or replace function public.ventas_registrar_actividad(
  p_lead_id uuid,
  p_usuaria_id uuid,
  p_tipo text,
  p_resultado text,
  p_nota text,
  p_fase_nueva text,
  p_cambiar_seguimiento boolean,
  p_proximo_seguimiento date,
  p_proximo_seguimiento_hora time default null
) returns text
language plpgsql as $$
declare
  v_lead public.ventas_leads%rowtype;
  v_hora time := case when p_proximo_seguimiento is null then null else p_proximo_seguimiento_hora end;
begin
  select * into v_lead from public.ventas_leads where id = p_lead_id for update;
  if not found then
    raise exception 'lead_no_existe';
  end if;

  if p_tipo <> 'cambio_fase' then
    insert into public.ventas_actividad (lead_id, marca_id, usuaria_id, tipo, resultado, nota, datos)
    values (
      p_lead_id, v_lead.marca_id, p_usuaria_id, p_tipo, p_resultado, nullif(btrim(p_nota), ''),
      case when p_cambiar_seguimiento
        then jsonb_build_object(
          'proximo_seguimiento', p_proximo_seguimiento,
          'proximo_seguimiento_hora', to_char(v_hora, 'HH24:MI'))
        else '{}'::jsonb end
    );
  end if;

  if p_fase_nueva is not null and p_fase_nueva <> v_lead.fase then
    insert into public.ventas_actividad (lead_id, marca_id, usuaria_id, tipo, nota, datos)
    values (
      p_lead_id, v_lead.marca_id, p_usuaria_id, 'cambio_fase',
      case when p_tipo = 'cambio_fase' then nullif(btrim(p_nota), '') end,
      jsonb_build_object('fase_anterior', v_lead.fase, 'fase_nueva', p_fase_nueva)
    );
  end if;

  update public.ventas_leads set
    fase = coalesce(p_fase_nueva, fase),
    proximo_seguimiento = case when p_cambiar_seguimiento then p_proximo_seguimiento else proximo_seguimiento end,
    proximo_seguimiento_hora = case when p_cambiar_seguimiento then v_hora else proximo_seguimiento_hora end,
    updated_at = now()
  where id = p_lead_id;

  return coalesce(p_fase_nueva, v_lead.fase);
end $$;

revoke execute on function public.ventas_registrar_actividad(uuid, uuid, text, text, text, text, boolean, date, time) from public, anon, authenticated;
grant execute on function public.ventas_registrar_actividad(uuid, uuid, text, text, text, text, boolean, date, time) to service_role;

-- 3. Tareas manuales --------------------------------------------------------
create table if not exists public.ventas_tareas (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.ventas_marcas(id) on delete cascade,
  lead_id uuid references public.ventas_leads(id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  vence date,
  vence_hora time,
  asignada_a uuid references public.ventas_usuarias(id),
  creada_por uuid references public.ventas_usuarias(id),
  hecha_at timestamptz,
  hecha_por uuid references public.ventas_usuarias(id),
  created_at timestamptz not null default now(),
  check (vence_hora is null or vence is not null)
);
create index if not exists ventas_tareas_marca_idx on public.ventas_tareas (marca_id, hecha_at);
create index if not exists ventas_tareas_asignada_idx on public.ventas_tareas (asignada_a, vence);
alter table public.ventas_tareas enable row level security;

-- 4. Última nota de cada lead de una marca ---------------------------------
create or replace function public.ventas_ultimas_notas(p_marca_id uuid)
returns table (lead_id uuid, nota text, created_at timestamptz)
language sql stable as $$
  select distinct on (a.lead_id) a.lead_id, a.nota, a.created_at
  from public.ventas_actividad a
  where a.marca_id = p_marca_id and a.nota is not null
  order by a.lead_id, a.created_at desc
$$;
revoke execute on function public.ventas_ultimas_notas(uuid) from public, anon, authenticated;
grant execute on function public.ventas_ultimas_notas(uuid) to service_role;

-- 5. Borrado definitivo de leads -------------------------------------------
-- El historial sigue siendo de solo inserción. La única puerta para borrarlo
-- es ventas_eliminar_leads, que levanta una marca válida solo en su transacción.
create or replace function public.ventas_actividad_inmutable() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' and current_setting('ventas.borrando_lead', true) = 'on' then
    return old;
  end if;
  raise exception 'ventas_actividad es de solo inserción: el historial no se edita ni se borra';
end $$;

create or replace function public.ventas_eliminar_leads(p_marca_id uuid, p_lead_ids uuid[])
returns integer
language plpgsql as $$
declare
  v_ids uuid[];
  v_borrados integer;
begin
  select coalesce(array_agg(id), '{}') into v_ids
  from public.ventas_leads
  where marca_id = p_marca_id and id = any(p_lead_ids);
  if cardinality(v_ids) = 0 then
    return 0;
  end if;

  perform set_config('ventas.borrando_lead', 'on', true);
  delete from public.ventas_conversaciones where lead_id = any(v_ids);
  delete from public.ventas_tareas where lead_id = any(v_ids);
  delete from public.ventas_actividad where lead_id = any(v_ids);
  delete from public.ventas_leads where id = any(v_ids);
  get diagnostics v_borrados = row_count;
  perform set_config('ventas.borrando_lead', 'off', true);
  return v_borrados;
end $$;
revoke execute on function public.ventas_eliminar_leads(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.ventas_eliminar_leads(uuid, uuid[]) to service_role;

-- PostgREST cachea las firmas de las funciones y aquí se ha hecho drop de una
-- (ventas_registrar_actividad): sin recargar, seguiría buscando la antigua.
notify pgrst, 'reload schema';

commit;
