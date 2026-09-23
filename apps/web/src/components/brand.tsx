import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ href = "/", compact = false, inverse = false }: { href?: string; compact?: boolean; inverse?: boolean }) {
  return <Link href={href} className={cn("product-brand", compact && "product-brand--compact", inverse && "product-brand--inverse")} aria-label="HATTAMA AI">
    <span className="product-brand__mark"><Image src="/hattama-logo.jpg" alt="" width={1280} height={853} unoptimized /></span>
    <span className="product-brand__name"><strong>HATTAMA <em>AI</em></strong><small>TURN TALKS INTO ACTION</small></span>
  </Link>;
}
