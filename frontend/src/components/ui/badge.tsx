import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "danger" | "info";

const variants: Record<Variant, string> = {
  default: "bg-slate-700 text-slate-300",
  success: "bg-green-900 text-green-300",
  warning: "bg-yellow-900 text-yellow-300",
  danger:  "bg-red-900 text-red-300",
  info:    "bg-blue-900 text-blue-300",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", variants[variant], className)}
      {...props}
    />
  );
}
