import { requireUsuaria } from "@/lib/ventas/auth";
import { VentasShell } from "../_componentes/VentasShell";

export const metadata = {
  title: "Ventas B2B — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function VentasLayout({ children }: { children: React.ReactNode }) {
  const usuaria = await requireUsuaria();
  return <VentasShell usuaria={usuaria}>{children}</VentasShell>;
}
