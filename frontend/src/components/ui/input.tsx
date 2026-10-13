import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

const fieldClasses =
  "border-input bg-surface text-foreground placeholder:text-muted-foreground w-full min-w-0 rounded-lg border px-3 text-base shadow-xs transition-[border-color,box-shadow] duration-150 ease-out outline-none focus-visible:border-ring focus-visible:ring-ring/25 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/20 sm:text-sm";

function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(fieldClasses, "h-10 sm:h-9", className)}
      {...props}
    />
  );
}

export { fieldClasses, Input };
