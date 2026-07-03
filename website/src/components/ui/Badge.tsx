import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "subtle" | "outline";
}

function Badge({ className, variant = "subtle", children, ...props }: BadgeProps) {
  const base = "inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase rounded-full px-3 py-1";

  const variants = {
    primary: "bg-brand-primary text-brand-bg-deep",
    subtle:  "bg-brand-primary/10 text-brand-primary border border-brand-primary/20",
    outline: "border border-brand-primary/40 text-brand-primary",
  };

  return (
    <span className={cn(base, variants[variant], className)} {...props}>
      {children}
    </span>
  );
}

export { Badge };
