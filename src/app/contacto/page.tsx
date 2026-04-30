import { Container } from "@/components/ui/Container";
import { ContactForm } from "@/components/contacto/ContactForm";

export const metadata = {
  title: "Contacto — dinkbit",
  description: "Cuéntanos tu proyecto. Te respondemos en menos de 24 horas.",
};

export default function ContactoPage() {
  return (
    <Container className="py-24" size="narrow">
      <h1 className="text-4xl font-bold tracking-tight">Hablemos</h1>
      <p className="mt-4 text-slate-600">
        Te respondemos en menos de 24 horas.
      </p>
      <div className="mt-10">
        <ContactForm />
      </div>
    </Container>
  );
}
