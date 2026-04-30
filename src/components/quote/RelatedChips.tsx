import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface ChipItem {
  label: string;
  href: string;
  count?: number;
}

export default function RelatedChips({ title, items }: { title: string; items: ChipItem[] }) {
  if (!items.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold font-['Space_Grotesk']">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map(it => (
          <Link key={it.href} to={it.href}>
            <Badge variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer text-xs py-1.5 px-3">
              {it.label}
              {typeof it.count === "number" && <span className="ml-1.5 text-[10px] opacity-70">({it.count})</span>}
            </Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}
