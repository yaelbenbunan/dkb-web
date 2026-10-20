-- Ventas B2B: rol «agente» (solo Conversaciones de una marca).
-- Lo usa, por ejemplo, el revisor de Meta del App Review.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Es idempotente y va en una transacción. El código ya desplegado sigue
-- funcionando con esta migración aplicada: solo amplía los valores permitidos.

begin;

alter table public.ventas_usuarias drop constraint if exists ventas_usuarias_rol_check;
alter table public.ventas_usuarias
  add constraint ventas_usuarias_rol_check check (rol in ('admin', 'comercial', 'cliente', 'agente'));

-- Cliente y agente van ligadas a una marca; admin y comercial, a ninguna.
alter table public.ventas_usuarias drop constraint if exists ventas_usuarias_marca_de_cliente;
alter table public.ventas_usuarias
  add constraint ventas_usuarias_marca_de_cliente check ((rol in ('cliente', 'agente')) = (marca_id is not null));

commit;

-- Comprobación: debe devolver las dos restricciones con 'agente' dentro.
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.ventas_usuarias'::regclass
  and conname in ('ventas_usuarias_rol_check', 'ventas_usuarias_marca_de_cliente');
