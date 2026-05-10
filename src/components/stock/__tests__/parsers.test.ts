import { describe, it, expect } from "vitest";
import { extractPriceBRL } from "@/lib/extract-price";

describe("extractPriceBRL", () => {
  it("parseia R$ 1.234,56", () => {
    expect(extractPriceBRL("Preço: R$ 1.234,56")).toBe(1234.56);
  });
  it("parseia R$1234,56 sem espaço", () => {
    expect(extractPriceBRL("R$1234,56")).toBe(1234.56);
  });
  it("parseia inteiro sem decimais", () => {
    expect(extractPriceBRL("R$ 1234")).toBe(1234);
  });
  it("retorna undefined sem match", () => {
    expect(extractPriceBRL("Consulte preço")).toBeUndefined();
  });
  it("ignora segundo R$ no texto", () => {
    expect(extractPriceBRL("De R$ 100,00 por R$ 80,00")).toBe(100);
  });
});
