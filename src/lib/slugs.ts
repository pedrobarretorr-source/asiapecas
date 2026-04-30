import { PART_CATEGORIES, type PartCategoryOption } from "@/components/quote/part-categories";

export function slugify(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function categorySlug(category: string): string {
  return slugify(category);
}

export function modelSlug(model: string): string {
  return slugify(model);
}

export function findCategoryBySlug(slug: string): PartCategoryOption | undefined {
  const target = slug.toLowerCase();
  return PART_CATEGORIES.find(c => slugify(c.key) === target);
}

export function categoryFromSlug(slug: string): string | null {
  const found = findCategoryBySlug(slug);
  return found ? found.key : null;
}
