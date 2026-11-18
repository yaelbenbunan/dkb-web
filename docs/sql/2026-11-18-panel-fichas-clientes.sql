-- Panel: ficha de cada cliente, clientes anclados en el menú y tareas por
-- proyecto (docs/superpowers/specs/2026-11-18-panel-espacios-design.md, fase 2).
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).
-- Es idempotente y va en una transacción. Solo AÑADE columnas: no borra ni
-- cambia nada de lo que ya existe. El código desplegado sin esta migración
-- funciona igual, pero sin anclar clientes, sin servicios en la ficha, sin
-- «Crear ficha de cliente» en las altas y sin tareas por proyecto (lo dice en
-- pantalla).

begin;

-- 1. Los clientes que cada persona ancla en su menú lateral.
alter table public.ventas_usuarias
  add column if not exists clientes_anclados uuid[] not null default '{}';

-- 2. Los servicios contratados por cada cliente (web, rrss, campanas_meta,
--    ventas_b2b…). De ellos salen las plantillas de tareas. La lista vive en el
--    código (src/lib/ventas/proyectos.ts): aquí solo se guardan las claves.
alter table public.ventas_marcas
  add column if not exists servicios text[] not null default '{}';

-- 3. El alta de la que salió la ficha del cliente. Un alta crea como mucho un
--    cliente; borrar el cliente deja el alta sin vincular, no la borra.
alter table public.alta_clientes
  add column if not exists marca_id uuid references public.ventas_marcas(id) on delete set null;
create unique index if not exists alta_clientes_marca_unica
  on public.alta_clientes (marca_id) where marca_id is not null;

-- 4. Tareas de proyecto: las que se añaden desde la plantilla de un servicio.
--    `proyecto` es la clave del servicio, `fase` el bloque dentro de la
--    plantilla y `orden` su posición. Las tareas sueltas los dejan en null.
alter table public.ventas_tareas
  add column if not exists proyecto text check (proyecto is null or char_length(proyecto) between 1 and 40),
  add column if not exists fase text check (fase is null or char_length(fase) between 1 and 60),
  add column if not exists orden integer;
create index if not exists ventas_tareas_proyecto_idx
  on public.ventas_tareas (marca_id, proyecto) where proyecto is not null;

commit;

-- Que la API de Supabase vea las columnas nuevas sin esperar.
notify pgrst, 'reload schema';

-- Comprobación (debe devolver 6 filas):
-- select table_name, column_name from information_schema.columns
--  where table_schema = 'public'
--    and (table_name, column_name) in (('ventas_usuarias','clientes_anclados'), ('ventas_marcas','servicios'),
--        ('alta_clientes','marca_id'), ('ventas_tareas','proyecto'), ('ventas_tareas','fase'), ('ventas_tareas','orden'));
