import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { initAnalytics } from "@/lib/analytics";
import { type Lang } from "./translations";

const COPY = {
  pt: { msg: "Usamos cookies para análise e melhorar sua experiência. Veja nossa política.", accept: "Aceitar", decline: "Recusar" },
  en: { msg: "We use cookies for analytics and to improve your experience.", accept: "Accept", decline: "Decline" },
  es: { msg: "Usamos cookies para análisis y mejorar tu experiencia.", accept: "Aceptar", decline: "Rechazar" },
};

export default function ConsentBanner({ lang = "pt" }: { lang?: Lang }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const c = localStorage.getItem("asia_consent");
    if (!c) setShow(true);
    else if (c === "granted") initAnalytics();
  }, []);

  if (!show) return null;
  const t = COPY[lang];

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] bg-secondary text-secondary-foreground border-t border-secondary-foreground/10 p-4 shadow-2xl">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-3">
        <p className="text-xs flex-1">{t.msg}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { localStorage.setItem("asia_consent", "denied"); setShow(false); }}>
            {t.decline}
          </Button>
          <Button size="sm" onClick={() => { localStorage.setItem("asia_consent", "granted"); setShow(false); initAnalytics(); }}>
            {t.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}
