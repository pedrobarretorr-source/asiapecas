import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import logoAsia from "@/assets/LOGO-ATUALIZADO.png";
import { type Lang } from "@/components/quote/translations";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
              ? "flex w-full items-center justify-between rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              : "flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-white transition-colors hover:bg-white/10"
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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[rgba(5,5,5,0.94)] text-white backdrop-blur-xl">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 sm:h-[72px] lg:gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Ásia Peças e Máquinas">
            <img
              src={logoAsia}
              alt="Ásia Peças e Máquinas"
              className="block h-9 w-auto sm:h-10 md:h-11 lg:h-12"
              loading="eager"
              decoding="async"
            />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.24em] text-primary xl:inline-block">
              Peças e Máquinas
            </span>
          </Link>

          <nav className="hidden h-11 items-center rounded-full border border-white/10 bg-white/5 px-2 lg:flex">
            {navItems.map((item) => (
              <HeaderNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                className="flex h-9 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              />
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <LanguageDropdown lang={lang} onSelect={onLangChange} />
            </div>
            <a
              href={CONTACT_HREF}
              className="hidden h-10 items-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:inline-flex md:text-sm"
            >
              {contactLabel}
            </a>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Abrir menu"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[88vw] max-w-sm border-l border-white/10 bg-[rgba(5,5,5,0.98)] p-0 text-white"
              >
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <img src={logoAsia} alt="Ásia Peças e Máquinas" className="h-9 w-auto" />
                  <button
                    type="button"
                    aria-label="Fechar menu"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 transition-colors hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <nav className="flex flex-col gap-1 px-4 py-5">
                  {navItems.map((item) => (
                    <HeaderNavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-3 text-base font-medium text-white/85 transition-colors hover:bg-white/8 hover:text-white"
                    />
                  ))}
                </nav>

                <div className="mt-auto flex flex-col gap-3 border-t border-white/10 px-4 py-5">
                  <LanguageDropdown lang={lang} onSelect={onLangChange} mobile />
                  <a
                    href={CONTACT_HREF}
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    {contactLabel}
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
