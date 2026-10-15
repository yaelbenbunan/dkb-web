-- Unificación del CRM, proyecto 1: DATOS. Copia los leads del /panel viejo
-- (imagina_leads) a /panel/ventas, marca dinkbit.
--
-- Ejecutar en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc)
-- DESPUÉS de:
--   1. docs/sql/2026-10-15-crm-unificacion-estructura.sql
--   2. desplegar el código de la unificación
--
-- Es re-ejecutable: un lead ya migrado (su id viejo ya está en id_externo o
-- ids_externos) se salta. imagina_leads no se toca.
--
-- La traducción de cada fila replica src/lib/ventas/migracion-panel.ts (probada
-- en src/lib/__tests__/ventas-migracion-panel.test.ts). Las tablas de estado →
-- fase y de responsables están copiadas de src/lib/ventas/dominio.ts
-- (ESTADO_PANEL_A_FASE y RESPONSABLES_PANEL): si cambian allí, cambian aquí.
--
-- Un lead archivado en el panel viejo llega sin fecha de seguimiento: nadie lo
-- trabaja, así que no debe salir en «Mi día» ni en el correo de la mañana.
--
-- Al terminar imprime (pestaña «Messages» / avisos) los recuentos.

do $$
declare
  v_marca uuid;
  r record;
  v_existente public.ventas_leads%rowtype;
  v_id uuid;
  v_fase text;
  v_email_resp text;
  v_asignada uuid;
  v_etiquetas text[];
  v_extra jsonb;
  v_negocio text;
  v_leidos int := 0;
  v_creados int := 0;
  v_fusionados int := 0;
  v_saltados int := 0;
  v_errores int := 0;
  v_fila record;
begin
  select id into v_marca from public.ventas_marcas where slug = 'dinkbit';
  if v_marca is null then
    raise exception 'No existe la marca dinkbit en ventas_marcas';
  end if;

  create temporary table _fase (estado text primary key, fase text not null) on commit drop;
  insert into _fase values
    ('nuevo', 'nuevo'), ('contactado', 'contactado'), ('seguimiento', 'volver_a_llamar'),
    ('kit-digital', 'interesado'), ('propuesta', 'propuesta'), ('ganado', 'cliente'),
    ('cliente-kit-digital', 'cliente'), ('perdido', 'perdido'), ('ilocalizable', 'ilocalizable');

  create temporary table _resp (texto text primary key, email text not null) on commit drop;
  insert into _resp values
    ('yael', 'yael.benbunan@dinkbit.com'), ('paula g', 'paula.garcia@dinkbit.com'),
    ('paula l', 'paula.lopez@dinkbit.com'), ('alicia', 'alicia.ruiz@dinkbit.com');

  create temporary table _asignacion (account_manager text, asignado boolean) on commit drop;

  for r in select * from public.imagina_leads order by created_at loop
    v_leidos := v_leidos + 1;
    begin
      v_extra := jsonb_strip_nulls(jsonb_build_object(
        'sector', nullif(btrim(r.sector), ''), 'business_type', nullif(btrim(r.business_type), ''),
        'template', nullif(btrim(r.template), ''), 'style', nullif(btrim(r.style), ''),
        'palette', nullif(btrim(r.palette), ''), 'value_prop', nullif(btrim(r.value_prop), ''),
        'pdf_path', nullif(btrim(r.pdf_path), ''), 'review_rating', nullif(btrim(r.review_rating), ''),
        'review_comment', nullif(btrim(r.review_comment), '')
      ));

      -- Ya migrado: no se duplica (re-ejecutable). Solo se completa lo que le
      -- falte: p. ej. el PDF de un preview que se guardó en la tabla vieja por
      -- el respaldo después de que el lead ya estuviera en ventas.
      update public.ventas_leads set
        extra = v_extra || extra,
        email_estado = case when r.email_status in ('bounced', 'complained') then r.email_status else coalesce(email_estado, r.email_status) end,
        email_mensaje_id = coalesce(email_mensaje_id, r.email_message_id),
        consentimiento = case when r.consent is false and r.email_status = 'complained' then false else consentimiento end
      where marca_id = v_marca and (id_externo = r.id or r.id = any(ids_externos));
      if found then
        v_saltados := v_saltados + 1;
        continue;
      end if;

      v_fase := coalesce((select fase from _fase where estado = r.status), 'nuevo');
      v_email_resp := (select email from _resp where texto = lower(regexp_replace(btrim(coalesce(r.account_manager, '')), '\s+', ' ', 'g')));
      v_asignada := (select id from public.ventas_usuarias where activa and lower(email) = v_email_resp);
      if nullif(btrim(coalesce(r.account_manager, '')), '') is not null then
        insert into _asignacion values (r.account_manager, v_asignada is not null);
      end if;
      v_etiquetas := case when r.status in ('kit-digital', 'cliente-kit-digital') then array['kit-digital'] else '{}'::text[] end;

      -- ¿Ya está en dinkbit por email o teléfono (p. ej. llegó por WhatsApp)?
      select * into v_existente from public.ventas_leads
      where marca_id = v_marca and (
        (public.ventas_norm_email(r.email) is not null and email_norm = public.ventas_norm_email(r.email))
        or (public.ventas_norm_telefono(r.phone) is not null and telefono_norm = public.ventas_norm_telefono(r.phone))
      )
      limit 1;

      if found then
        update public.ventas_leads set
          contacto = coalesce(contacto, nullif(btrim(r.name), '')),
          telefono = coalesce(telefono, nullif(btrim(r.phone), '')),
          email = coalesce(email, nullif(btrim(r.email), '')),
          web = coalesce(web, nullif(btrim(r.current_website), '')),
          canal = coalesce(canal, nullif(btrim(r.channel), '')),
          campana = coalesce(campana, nullif(btrim(r.campaign), '')),
          etiquetas = (select coalesce(array_agg(distinct e), '{}') from unnest(etiquetas || v_etiquetas) e),
          ids_externos = ids_externos || r.id,
          consentimiento = case
            when r.email_status = 'complained' then false
            when r.consent is true then true
            else consentimiento end,
          -- Un rebote o una queja registrados en el panel viejo no se pierden al fusionar.
          email_estado = case when r.email_status in ('bounced', 'complained') then r.email_status else coalesce(email_estado, r.email_status) end,
          email_mensaje_id = coalesce(email_mensaje_id, r.email_message_id),
          asignada_a = coalesce(asignada_a, v_asignada),
          proximo_seguimiento = coalesce(proximo_seguimiento, case when r.archived then null else r.followup_at end),
          extra = v_extra || extra
        where id = v_existente.id;
        v_id := v_existente.id;
        v_fusionados := v_fusionados + 1;
      else
        v_negocio := coalesce(nullif(btrim(r.business_name), ''), nullif(btrim(r.name), ''), nullif(btrim(r.email), ''), '(sin nombre) ' || r.id);
        v_id := public.ventas_crear_lead(v_marca, jsonb_build_object(
          'negocio', v_negocio,
          'contacto', nullif(btrim(r.name), ''),
          'telefono', nullif(btrim(r.phone), ''),
          'email', nullif(btrim(r.email), ''),
          'web', nullif(btrim(r.current_website), ''),
          'origen', 'web',
          'origen_detalle', nullif(btrim(r.campaign), ''),
          'fase', v_fase,
          'asignada_a', v_asignada,
          'proximo_seguimiento', case when r.archived then null else r.followup_at end,
          'id_externo', r.id,
          'canal', nullif(btrim(r.channel), ''),
          'campana', nullif(btrim(r.campaign), ''),
          'etiquetas', to_jsonb(v_etiquetas),
          'consentimiento', r.consent,
          'extra', v_extra,
          'created_at', r.created_at
        ));
        if v_id is null then
          raise exception 'ventas_crear_lead devolvió null (choque inesperado)';
        end if;
        update public.ventas_leads set
          email_estado = r.email_status,
          email_mensaje_id = r.email_message_id,
          email_actualizado_at = r.email_updated_at,
          archivado = coalesce(r.archived, false)
        where id = v_id;
        v_creados := v_creados + 1;
      end if;

      -- Notas y seguimiento en texto libre → historial.
      if nullif(btrim(r.notes), '') is not null then
        insert into public.ventas_actividad (lead_id, marca_id, usuaria_id, tipo, nota)
        values (v_id, v_marca, null, 'nota', 'Notas de /panel: ' || btrim(r.notes));
      end if;
      if nullif(btrim(r.followup), '') is not null then
        insert into public.ventas_actividad (lead_id, marca_id, usuaria_id, tipo, nota)
        values (v_id, v_marca, null, 'nota', 'Seguimiento: ' || btrim(r.followup));
      end if;
    exception when others then
      v_errores := v_errores + 1;
      raise notice 'Error con el lead % (%): %', r.id, coalesce(r.email, r.phone, r.name), sqlerrm;
    end;
  end loop;

  raise notice 'Leídos: % · creados: % · fusionados con uno existente: % · ya migrados (saltados): % · errores: %',
    v_leidos, v_creados, v_fusionados, v_saltados, v_errores;
  for v_fila in
    select account_manager, count(*) filter (where asignado) as asignados, count(*) filter (where not asignado) as sin_asignar
    from _asignacion group by account_manager order by account_manager
  loop
    raise notice 'Responsable «%»: % asignados, % sin asignar', v_fila.account_manager, v_fila.asignados, v_fila.sin_asignar;
  end loop;
end $$;

-- Comprobación: leads de dinkbit por fase.
select l.fase, count(*) as leads
from public.ventas_leads l join public.ventas_marcas m on m.id = l.marca_id
where m.slug = 'dinkbit'
group by l.fase order by count(*) desc;
