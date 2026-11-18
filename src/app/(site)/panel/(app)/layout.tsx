import { requireUsuaria } from "@/lib/ventas/auth";
import { VentasShell } from "../_componentes/VentasShell";

export const metadata = {
  title: "Panel — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function VentasLayout({ children }: { children: React.ReactNode }) {
  const usuaria = await requireUsuaria();
  return <VentasShell usuaria={usuaria}>{children}</VentasShell>;
}
