import { redirect } from "next/navigation";

export default async function MarcaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/panel/ventas/${slug}/leads`);
}
