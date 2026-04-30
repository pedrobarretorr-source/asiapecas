import { type Lang } from "./translations";

type Partner = { name: string; logo: string; className?: string };

const PARTNERS: Partner[] = [
  { name: "XCMG", logo: "/parceiros/icone xcmg.svg", className: "max-w-[132px] md:max-w-[172px]" },
  { name: "Cummins", logo: "/parceiros/ICONE CUMMINS.svg", className: "max-w-[144px] md:max-w-[188px]" },
  { name: "Fleetguard", logo: "/parceiros/ICONE FLEET.svg", className: "max-w-[154px] md:max-w-[204px]" },
  { name: "Carraro", logo: "/parceiros/ICONE CARRARO.svg", className: "max-w-[146px] md:max-w-[196px]" },
];

const LOOP = [...PARTNERS, ...PARTNERS];

export default function PartnersStrip({ lang }: { lang: Lang }) {
  const label =
    lang === "en"
      ? "Brands we work with"
      : lang === "es"
        ? "Marcas con las que trabajamos"
        : "Marcas com as quais trabalhamos";

  return (
    <section className="relative overflow-hidden border-y border-black/10 bg-white text-black">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--primary)/0.55)] to-transparent" />
      <div className="public-shell-wide py-12 md:py-14">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.32em] text-black/45">
          {label}
        </p>

        <div
          className="relative mt-10 overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          }}
        >
          <div className="ap-partners-marquee flex w-max items-center whitespace-nowrap will-change-transform">
            {LOOP.map((brand, i) => (
              <div
                key={`${brand.name}-${i}`}
                aria-hidden={i >= PARTNERS.length}
                className="flex h-16 shrink-0 items-center justify-center bg-white px-6 md:h-20 md:px-10"
              >
                <img
                  src={brand.logo}
                  alt={i < PARTNERS.length ? brand.name : ""}
                  loading="lazy"
                  draggable={false}
                  className={`h-full w-auto bg-white object-contain opacity-70 grayscale [filter:brightness(1.08)_contrast(1.08)] transition duration-300 hover:opacity-100 hover:grayscale-0 hover:[filter:brightness(1.04)_contrast(1.12)] select-none ${brand.className ?? ""}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
