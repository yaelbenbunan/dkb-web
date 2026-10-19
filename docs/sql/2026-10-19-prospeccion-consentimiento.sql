-- Prospección: consentimiento obtenido por teléfono.
-- Spec: docs/superpowers/specs/2026-10-19-prospeccion-consentimiento-design.md
--
-- LSSI art. 21: solo se escribe por email a quien lo ha pedido o autorizado.
-- Se llama, y si en la llamada aceptan recibir información se registra aquí
-- cuándo, quién lo registró y una nota. Sin estas columnas el panel funciona,
-- pero nadie tiene consentimiento y no se envía ningún correo.
--
-- Idempotente. Proyecto Supabase wnboyesnlrbtwfmhcxmc, SQL Editor.

alter table public.prospects
  add column if not exists consentimiento_at timestamptz,
  add column if not exists consentimiento_por uuid references public.ventas_usuarias(id) on delete set null,
  add column if not exists consentimiento_nota text,
  add column if not exists consentimiento_retirado_at timestamptz;

comment on column public.prospects.consentimiento_at is
  'Cuándo aceptó (por teléfono) recibir información por email. Null = no ha aceptado.';
comment on column public.prospects.consentimiento_por is
  'Usuaria de ventas que registró el consentimiento.';
comment on column public.prospects.consentimiento_nota is
  'Nota libre sobre cómo se obtuvo (p. ej. «llamada con la recepcionista»).';
comment on column public.prospects.consentimiento_retirado_at is
  'Cuándo dijo que ya no quiere recibir información. Con valor, el consentimiento no vale.';

-- PostgREST: que vea las columnas nuevas sin esperar.
notify pgrst, 'reload schema';

-- Comprobación: deben salir las cuatro columnas.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'prospects' and column_name like 'consentimiento%'
order by column_name;
