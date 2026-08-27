import { leadsCsvTemplate } from "@/lib/leads-csv";

// Plantilla de ejemplo para la importación masiva de leads. Vive dentro de
// /panel para que la proteja el mismo proxy de sesión que el resto del CRM.
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(leadsCsvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-leads-dinkbit.csv"',
      "Cache-Control": "no-store",
    },
  });
}
