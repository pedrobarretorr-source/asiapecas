import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: "website" | "product" | "article";
  lang?: "pt" | "en" | "es";
  noindex?: boolean;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const SITE_URL =
  import.meta.env.VITE_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:4173");
const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

export function SEO({ title, description, canonical, image, type = "website", lang = "pt", noindex = false, jsonLd }: SEOProps) {
  const fullTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;
  const desc = (description || "").slice(0, 160);
  const url = canonical?.startsWith("http") ? canonical : `${SITE_URL}${canonical || ""}`;
  const img = image || DEFAULT_IMAGE;

  const lds = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      <html lang={lang === "pt" ? "pt-BR" : lang} />
      <title>{fullTitle}</title>
      {desc && <meta name="description" content={desc} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta property="og:site_name" content="Ásia Peças & Máquinas" />
      <meta property="og:locale" content={lang === "pt" ? "pt_BR" : lang === "en" ? "en_US" : "es_ES"} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {desc && <meta name="twitter:description" content={desc} />}
      <meta name="twitter:image" content={img} />

      {/* hreflang */}
      <link rel="alternate" hrefLang="pt-BR" href={`${url}${url.includes("?") ? "&" : "?"}lang=pt`} />
      <link rel="alternate" hrefLang="en" href={`${url}${url.includes("?") ? "&" : "?"}lang=en`} />
      <link rel="alternate" hrefLang="es" href={`${url}${url.includes("?") ? "&" : "?"}lang=es`} />
      <link rel="alternate" hrefLang="x-default" href={url} />

      {lds.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Ásia Peças & Máquinas",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [],
    contactPoint: [{
      "@type": "ContactPoint",
      telephone: "+55-95-97400-9289",
      contactType: "sales",
      areaServed: ["BR", "Latam"],
      availableLanguage: ["Portuguese", "English", "Spanish"],
    }],
  };
}

export function productLd(part: { material: string; description: string; manufacturer?: string | null; stock: number; estimated_price?: number; image_url?: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: part.description,
    sku: part.material,
    brand: part.manufacturer ? { "@type": "Brand", name: part.manufacturer } : { "@type": "Brand", name: "XCMG" },
    image: part.image_url || DEFAULT_IMAGE,
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: part.estimated_price && part.estimated_price > 0 ? part.estimated_price : undefined,
      availability: part.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/cotacao/p/${encodeURIComponent(part.material)}`,
    },
  };
}

export function itemListLd(parts: { material: string; description: string; manufacturer?: string | null; stock: number; estimated_price?: number; image_url?: string | null }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: parts.slice(0, 30).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/cotacao/p/${encodeURIComponent(p.material)}`,
      item: productLd(p),
    })),
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : `${SITE_URL}${it.url}`,
    })),
  };
}
