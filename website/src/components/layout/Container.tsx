import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

/**
 * Responsive content container with max-width constraints.
 * Used as the standard wrapper for all page sections.
 */
function Container({ className, size = "lg", children, ...props }: ContainerProps) {
  const sizes = {
    sm:   "max-w-2xl",
    md:   "max-w-4xl",
    lg:   "max-w-6xl",
    xl:   "max-w-7xl",
    full: "max-w-full",
  };

  return (
    <div
      className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", sizes[size], className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "article" | "aside";
  spacing?: "sm" | "md" | "lg" | "xl";
}

/**
 * Standard page section with consistent vertical spacing.
 */
function Section({ className, as: Tag = "section", spacing = "lg", children, ...props }: SectionProps) {
  const spacings = {
    sm: "py-12 sm:py-16",
    md: "py-16 sm:py-24",
    lg: "py-20 sm:py-32",
    xl: "py-24 sm:py-40",
  };

  return (
    <Tag className={cn(spacings[spacing], className)} {...props}>
      {children}
    </Tag>
  );
}

export { Container, Section };
