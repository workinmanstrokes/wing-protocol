import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary:
    "bg-accent text-accent-fg hover:bg-fg active:scale-[0.98] disabled:opacity-40",
  secondary:
    "bg-elevated text-fg border border-border hover:border-border-strong active:scale-[0.98] disabled:opacity-40",
  ghost: "bg-transparent text-fg hover:bg-elevated disabled:opacity-40",
  danger: "bg-danger text-fg hover:opacity-90 active:scale-[0.98]",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 font-display text-base font-semibold tracking-wide transition-[opacity,transform,background-color,border-color] duration-150",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
