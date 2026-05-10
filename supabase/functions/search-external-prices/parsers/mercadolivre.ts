import type { NormalizedResult, ParserFn } from "./types.ts";

export const searchMercadoLivre: ParserFn = async (query, signal) => {
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url, {
    signal,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AsiaPecas/1.0)" },
  });
  if (!res.ok) {
    return [{ source: "mercadolivre", rank: 0, error: `http_${res.status}` }];
  }
  const json = await res.json() as { results?: Array<{
    title: string; price: number; permalink: string; thumbnail: string;
    seller?: { nickname?: string }; available_quantity?: number;
  }> };
  const items = json.results || [];
  if (items.length === 0) {
    return [{ source: "mercadolivre", rank: 0, error: "no_results" }];
  }
  return items.slice(0, 5).map<NormalizedResult>((it, i) => ({
    source: "mercadolivre",
    rank: i,
    title: it.title,
    price_brl: typeof it.price === "number" ? it.price : undefined,
    url: it.permalink,
    seller: it.seller?.nickname,
    image_url: it.thumbnail,
    in_stock: (it.available_quantity ?? 0) > 0,
  }));
};
