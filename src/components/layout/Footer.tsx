import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { NAV_ITEMS } from "@/lib/nav";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-200 bg-slate-50">
      <Container className="grid gap-8 py-12 md:grid-cols-3">
        <div>
          <Link href="/" className="text-lg font-bold text-[--color-accent]">
            dinkbit
          </Link>
          <p className="mt-2 text-sm text-slate-600">Agencia digital en España.</p>
        </div>
        <nav>
          <p className="text-sm font-semibold text-slate-900">Navegación</p>
          <ul className="mt-3 space-y-2">
            {NAV_ITEMS.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="text-sm text-slate-600 hover:text-slate-900">
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold text-slate-900">Contacto</p>
          <p className="mt-3 text-sm text-slate-600">hola@dinkbit.com</p>
        </div>
      </Container>
      <Container className="border-t border-slate-200 py-6 text-xs text-slate-500">
        © {new Date().getFullYear()} dinkbit. Todos los derechos reservados.
      </Container>
    </footer>
  );
}
