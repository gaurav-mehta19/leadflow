import { cva, type VariantProps } from "class-variance-authority";

import { avatarTone, initials } from "@/lib/avatar";
import { cn } from "@/lib/cn";

const avatarVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none",
  {
    variants: {
      size: {
        default: "size-9 text-xs",
        lg: "size-12 text-sm",
      },
    },
    defaultVariants: { size: "default" },
  },
);

type LeadAvatarProps = VariantProps<typeof avatarVariants> & { name: string; className?: string };

export function LeadAvatar({ name, size, className }: LeadAvatarProps) {
  return (
    <span aria-hidden className={cn(avatarVariants({ size }), avatarTone(name), className)}>
      {initials(name)}
    </span>
  );
}
