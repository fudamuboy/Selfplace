import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "glass" | "solid" | "bordered";
  hover?: boolean;
}

function Card({ className, variant = "glass", hover = false, children, ...props }: CardProps) {
  const base = "rounded-3xl transition-all duration-300";

  const variants = {
    glass:
      "bg-brand-card border border-brand-card-border backdrop-blur-sm",
    solid:
      "bg-white/[0.03] border border-white/5",
    bordered:
      "border border-brand-primary/20 bg-brand-primary/5",
  };

  const hoverStyles = hover
    ? "hover:shadow-card-hover hover:border-brand-primary/30 hover:-translate-y-1 cursor-pointer"
    : "shadow-card";

  return (
    <div
      className={cn(base, variants[variant], hoverStyles, className)}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 pb-0", className)} {...props}>
      {children}
    </div>
  );
}

function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 pt-0", className)} {...props}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardContent, CardFooter };
