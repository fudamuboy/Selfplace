import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  /** When true, renders children directly (used when wrapping a Link). Prop is NOT forwarded to DOM. */
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      // Destructure asChild so it is never forwarded to the DOM
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      asChild: _asChild,
      children,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg-deep disabled:opacity-50 disabled:pointer-events-none select-none";

    const variants = {
      primary:
        "bg-cta-gradient text-brand-bg-deep shadow-glow-sm hover:shadow-glow-md hover:scale-[1.03] active:scale-[0.98]",
      secondary:
        "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 backdrop-blur-sm",
      ghost: "text-brand-text-secondary hover:text-white hover:bg-white/5",
      outline:
        "border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-brand-bg-deep",
    };

    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-11 px-6 text-base",
      lg: "h-14 px-8 text-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
