import "server-only";
import { notFound } from "next/navigation";
import { getMarcaPorSlug, type Marca } from "@/lib/ventas/db";

export async function cargarMarca(slug: string): Promise<Marca> {
  const marca = await getMarcaPorSlug(slug);
  if (!marca) notFound();
  return marca;
}
