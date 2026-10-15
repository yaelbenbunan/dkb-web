-- Unificación del CRM, proyecto 1: estructura. Los leads de /panel (imagina_leads)
-- pasan a ventas (marca dinkbit). Ejecutar una vez en el SQL Editor de Supabase
-- (proyecto wnboyesnlrbtwfmhcxmc) ANTES de desplegar el código. Idempotente.

alter table public.ventas_leads drop constraint if exists ventas_leads_fase_check;
alter table public.ventas_leads add constraint ventas_leads_fase_check check (fase in (
  'nuevo', 'contactado', 'volver_a_llamar', 'interesado', 'muestras', 'propuesta', 'cliente',
  'perdido', 'no_interesa', 'ilocalizable', 'fuera_de_perfil'
));

alter table public.ventas_leads drop constraint if exists ventas_leads_origen_check;
alter table public.ventas_leads add constraint ventas_leads_origen_check
  check (origen in ('lista', 'anuncio', 'manual', 'web'));

alter table public.ventas_leads
  add column if not exists id_externo text,
  add column if not exists ids_externos text[] not null default '{}',
  add column if not exists canal text,
  add column if not exists campana text,
  add column if not exists etiquetas text[] not null default '{}',
  add column if not exists consentimiento boolean,
  add column if not exists email_estado text,
  add column if not exists email_mensaje_id text,
  add column if not exists email_actualizado_at timestamptz,
  add column if not exists archivado boolean not null default false,
  add column if not exists extra jsonb not null default '{}';

create unique index if not exists ventas_leads_id_externo_uq
  on public.ventas_leads (marca_id, id_externo) where id_externo is not null;
create index if not exists ventas_leads_ids_externos_idx on public.ventas_leads using gin (ids_externos);
create index if not exists ventas_leads_email_mensaje_idx on public.ventas_leads (email_mensaje_id) where email_mensaje_id is not null;

-- Alta de un lead con todos los campos; devuelve su id (null si choca con otro
-- por email, teléfono o id_externo: el código lo busca y lo completa).
create or replace function public.ventas_crear_lead(p_marca_id uuid, p_lead jsonb)
returns uuid language plpgsql as $$
declare
  v_prefijo text;
  v_codigo text;
  v_id uuid;
begin
  select upper(left(replace(slug, '-', ''), 3)) into v_prefijo from public.ventas_marcas where id = p_marca_id;
  if v_prefijo is null then raise exception 'marca_no_existe'; end if;
  loop
    v_codigo := v_prefijo || '-' || public.ventas_codigo_aleatorio();
    exit when not exists (select 1 from public.ventas_leads where marca_id = p_marca_id and codigo_cliente = v_codigo);
  end loop;
  insert into public.ventas_leads (
    marca_id, negocio, tipo_negocio, contacto, telefono, email, web, origen, origen_detalle, fase,
    asignada_a, proximo_seguimiento, codigo_cliente, id_externo, canal, campana, etiquetas,
    consentimiento, extra, created_at
  ) values (
    p_marca_id,
    p_lead->>'negocio',
    nullif(p_lead->>'tipo_negocio', ''),
    nullif(p_lead->>'contacto', ''),
    nullif(p_lead->>'telefono', ''),
    nullif(p_lead->>'email', ''),
    nullif(p_lead->>'web', ''),
    p_lead->>'origen',
    nullif(p_lead->>'origen_detalle', ''),
    coalesce(nullif(p_lead->>'fase', ''), 'nuevo'),
    nullif(p_lead->>'asignada_a', '')::uuid,
    nullif(p_lead->>'proximo_seguimiento', '')::date,
    v_codigo,
    nullif(p_lead->>'id_externo', ''),
    nullif(p_lead->>'canal', ''),
    nullif(p_lead->>'campana', ''),
    coalesce(array(select jsonb_array_elements_text(p_lead->'etiquetas')), '{}'),
    (p_lead->>'consentimiento')::boolean,
    coalesce(p_lead->'extra', '{}'::jsonb),
    coalesce(nullif(p_lead->>'created_at', '')::timestamptz, now())
  )
  on conflict do nothing
  returning id into v_id;
  if v_id is not null then
    insert into public.ventas_actividad (lead_id, marca_id, usuaria_id, tipo, datos)
    values (v_id, p_marca_id, null, 'lead_creado',
      jsonb_build_object('origen', p_lead->>'origen', 'origen_detalle', p_lead->>'origen_detalle', 'canal', p_lead->>'canal'));
  end if;
  return v_id;
end $$;
revoke all on function public.ventas_crear_lead(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.ventas_crear_lead(uuid, jsonb) to service_role;

notify pgrst, 'reload schema';

-- Comprobación (debe devolver 8):
-- select count(*) from information_schema.columns where table_name = 'ventas_leads'
--   and column_name in ('id_externo','canal','campana','etiquetas','consentimiento','email_estado','archivado','extra');
