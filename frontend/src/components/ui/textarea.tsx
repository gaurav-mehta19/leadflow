import type { ComponentProps } from "react";

import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/cn";

function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldClasses,
        "field-sizing-content min-h-20 resize-none py-2.5 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
