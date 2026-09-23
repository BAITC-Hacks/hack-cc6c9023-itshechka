import { AudioLines } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ href = "/", compact = false, inverse = false }: { href?: string; compact?: boolean; inverse?: boolean }) {
  return <Link href={href} className={cn("product-brand", compact && "product-brand--compact", inverse && "product-brand--inverse")} aria-label="HATTAMA AI">
    <span className="product-brand__mark"><AudioLines size={compact ? 18 : 21} aria-hidden="true" /></span>
    <span className="product-brand__name"><strong>HATTAMA</strong><small>AI meeting intelligence</small></span>
  </Link>;
}
