import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FAQItem { q: string; a: string }

interface CategoryFAQProps {
  title?: string;
  items: FAQItem[];
}

export default function CategoryFAQ({ title = "Perguntas frequentes", items }: CategoryFAQProps) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold font-['Space_Grotesk']">{title}</h2>
      <Accordion type="single" collapsible className="bg-card rounded-lg border">
        {items.map((it, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="px-4">
            <AccordionTrigger className="text-sm text-left">{it.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{it.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function faqLd(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(it => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}
