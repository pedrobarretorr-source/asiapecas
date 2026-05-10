export type SourceId = "mercadolivre" | "lideranca" | "macromaq" | "extramaquinas";

export type NormalizedResult = {
  source: SourceId;
  rank: number;
  title?: string;
  price_brl?: number;
  url?: string;
  seller?: string;
  image_url?: string;
  in_stock?: boolean;
  error?: string;
};

export type ParserFn = (query: string, signal: AbortSignal) => Promise<NormalizedResult[]>;
