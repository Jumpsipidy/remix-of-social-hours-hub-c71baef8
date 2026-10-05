import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden data-skeleton="" className={cn("sv-skeleton rounded-md", className)} {...props} />;
}

export { Skeleton };
