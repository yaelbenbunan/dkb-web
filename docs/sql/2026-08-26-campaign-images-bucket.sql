-- Bucket para las imágenes propias de los emails de campaña (/panel/campanas).
--
-- Es PÚBLICO a propósito: la imagen la descarga el cliente de correo del
-- destinatario, y Gmail además la cachea en su proxy. Una URL firmada que
-- caduca dejaría el email roto a los pocos días.
--
-- Ejecutar una vez en el SQL Editor de Supabase (proyecto wnboyesnlrbtwfmhcxmc).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-images',
  'campaign-images',
  true,
  5242880,                                   -- 5 MB, igual que el límite del servidor
  array['image/png','image/jpeg','image/gif','image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública (lo que necesita el cliente de correo). La escritura NO lleva
-- policy: solo entra por el servidor con la service_role, que se salta RLS.
drop policy if exists "campaign images son públicas" on storage.objects;
create policy "campaign images son públicas"
  on storage.objects for select
  using (bucket_id = 'campaign-images');
