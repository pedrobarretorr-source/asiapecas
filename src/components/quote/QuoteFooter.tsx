import { Mail, Phone, MapPin, UserCog } from "lucide-react";
import { Link } from "react-router-dom";
import { type Lang, tr } from "./translations";
import asiaLogo from "@/assets/LOGO-ATUALIZADO.png";
import { routes } from "@/lib/routes";

export default function QuoteFooter({ lang }: { lang: Lang }) {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="public-shell py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img src={asiaLogo} alt="Ásia Peças & Máquinas" className="h-8 w-auto rounded-lg" />
              <span className="font-bold text-lg font-['Space_Grotesk']">Ásia Peças & Máquinas</span>
            </div>
            <p className="text-sm text-secondary-foreground/70">{tr("footer.about", lang)}</p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-primary">{tr("footer.segments", lang)}</h4>
            <ul className="space-y-1.5 text-sm text-secondary-foreground/70">
              <li>{tr("footer.mining", lang)}</li>
              <li>{tr("footer.construction", lang)}</li>
              <li>{tr("footer.drilling", lang)}</li>
              <li>{tr("footer.crane", lang)}</li>
              <li>{tr("footer.eTruck", lang)}</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-primary">{tr("footer.contact", lang)}</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> contato@asiapecas.com.br</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> (95) 9 7400-9289</li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Brasil | Venezuela | Guiana</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-primary">{tr("footer.internalArea", lang)}</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li>
                <Link 
                  to={routes.login} 
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <UserCog className="h-4 w-4 text-primary" />
                  {tr("footer.collaboratorArea", lang)}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/10 mt-8 pt-6 text-center text-xs text-secondary-foreground/50">
          © {new Date().getFullYear()} Ásia Peças & Máquinas — {tr("footer.rights", lang)}
        </div>
      </div>
    </footer>
  );
}
