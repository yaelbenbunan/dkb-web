import { redirect } from "next/navigation";

/** El agenda viejo se retiró con la unificación del CRM: ahora está en /panel/ventas. */
export default function Page() {
  redirect("/panel/ventas/dinkbit/tareas");
}
