import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import logoAsia from "@/assets/LOGO-ATUALIZADO.png";
import { type Lang } from "@/components/quote/translations";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const CONTACT_HREF = "/#contato";

const LANG_OPTIONS: { lang: Lang; nativeName: string }[] = [
  { lang: "pt", nativeName: "Português" },
  { lang: "en", nativeName: "English" },
  { lang: "es", nativeName: "Español" },
];

const NAV_ITEMS: Record<Lang, { href: string; label: string }[]> = {
  pt: [
    { href: "/", label: "Home" },
    { href: "/#empresa", label: "Quem somos" },
    { href: "/cotacao", label: "Catálogo" },
    { href: CONTACT_HREF, label: "Cotação" },
  ],
  en: [
    { href: "/", label: "Home" },
    { href: "/#empresa", label: "About us" },
    { href: "/cotacao", label: "Catalog" },
    { href: CONTACT_HREF, label: "Quote" },
  ],
  es: [
    { href: "/", label: "Home" },
    { href: "/#empresa", label: "Quiénes somos" },
    { href: "/cotacao", label: "Catálogo" },
    { href: CONTACT_HREF, label: "Cotización" },
  ],
};

function HeaderNavLink({
  href,
  label,
  className,
  onClick,
}: {
  href: string;
  label: string;
  className: string;
  onClick?: () => void;
}) {
  if (href.includes("#")) {
    return (
      <a href={href} onClick={onClick} className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link to={href} onClick={onClick} className={className}>
      {label}
    </Link>
  );
}

function FlagIcon({ lang }: { lang: Lang }) {
  return (
    <span className="inline-flex h-4 w-6 shrink-0 overflow-hidden rounded-[3px] border border-white/20 shadow-sm" aria-hidden="true">
      {lang === "pt" ? (
        <svg viewBox="0 0 24 16" className="h-full w-full">
          <rect width="24" height="16" fill="#159447" />
          <path d="M12 2.1 21 8l-9 5.9L3 8z" fill="#F8D247" />
          <circle cx="12" cy="8" r="3.3" fill="#253D8F" />
          <path d="M8.8 7.35c2.15-.35 4.35.05 6.35 1.15" stroke="#fff" strokeWidth="0.9" fill="none" />
        </svg>
      ) : lang === "en" ? (
        <svg viewBox="0 0 24 16" className="h-full w-full">
          <rect width="24" height="16" fill="#B22234" />
          {[1, 3, 5, 7, 9, 11, 13].map((y) => (
            <rect key={y} y={y} width="24" height="1.15" fill="#fff" />
          ))}
          <rect width="10.4" height="8.6" fill="#3C3B6E" />
          {[2, 5, 8].map((x) =>
            [2, 4.7, 7.4].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.45" fill="#fff" />),
          )}
        </svg>
      ) : (
        <svg viewBox="0 0 24 16" className="h-full w-full">
          <rect width="24" height="16" fill="#C60B1E" />
          <rect y="4" width="24" height="8" fill="#FFC400" />
          <rect x="6" y="6.1" width="2.4" height="3.8" rx="0.4" fill="#C60B1E" />
          <circle cx="7.2" cy="5.8" r="0.8" fill="#F7D117" />
        </svg>
      )}
    </span>
  );
}

function LanguageDropdown({
  lang,
  onSelect,
  mobile = false,
}: {
  lang: Lang;
  onSelect: (lang: Lang) => void;
  mobile?: boolean;
}) {
  const current = LANG_OPTIONS.find((item) => item.lang === lang) ?? LANG_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Idioma: ${current.nativeName}`}
          className={
            mobile
              ? "flex w-full items-center justify-between rounded-lg border border-secondary-foreground/15 bg-secondary-foreground/8 px-3 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary-foreground/14"
              : "flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/4 px-3 text-white transition-colors hover:bg-white/8"
          }
        >
          <span className="flex items-center gap-2">
            <FlagIcon lang={current.lang} />
            {mobile && <span>{current.nativeName}</span>}
          </span>
          <ChevronDown className={mobile ? "h-4 w-4 opacity-70" : "h-3.5 w-3.5 opacity-70"} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={mobile ? "start" : "end"} className={mobile ? "w-[220px]" : "w-44"}>
        {LANG_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.lang}
            onClick={() => onSelect(option.lang)}
            className={`flex items-center gap-3 rounded-md px-3 py-2 ${
              option.lang === lang ? "bg-accent text-accent-foreground" : ""
            }`}
          >
            <FlagIcon lang={option.lang} />
            <span>{option.nativeName}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface PublicHeaderProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onOpenB2B?: () => void;
  whatsappUrl?: string;
}

export default function PublicHeader({ lang, onLangChange }: PublicHeaderProps) {
  const navItems = NAV_ITEMS[lang];
  const contactLabel = lang === "en" ? "Contact" : lang === "es" ? "Contacto" : "Contato";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(5,5,5,0.94)] text-white backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-3 py-1.5 md:px-6 md:py-2">
        <div className="flex items-center gap-2 md:gap-5">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="relative -my-1 flex h-11 w-[4.5rem] shrink-0 overflow-visible sm:h-14 sm:w-24 md:-my-3 md:h-28 md:w-48 lg:w-56">
              <img
                src={logoAsia}
                alt="Ásia Peças e Máquinas"
                className="h-full w-full object-contain object-center"
                loading="eager"
                decoding="async"
              />
            </span>
            <span className="hidden min-w-0 md:block">
              <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-primary md:text-xs">
                Peças e Máquinas
              </span>
            </span>
          </Link>

          <nav className="flex min-w-0 flex-1 items-center overflow-x-auto rounded-full border border-white/10 bg-white/6 px-1.5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-3 md:py-2">
            {navItems.map((item) => (
              <HeaderNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                className="whitespace-nowrap rounded-full px-2.5 py-1.5 text-[0.65rem] font-medium text-white/74 transition-colors hover:bg-white/8 hover:text-white md:px-4 md:py-2 md:text-sm"
              />
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageDropdown lang={lang} onSelect={onLangChange} />
            <a
              href={CONTACT_HREF}
              className="hidden rounded-full bg-primary px-3 py-2 text-[0.65rem] font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:inline-flex md:px-4 md:text-xs"
            >
              {contactLabel}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
