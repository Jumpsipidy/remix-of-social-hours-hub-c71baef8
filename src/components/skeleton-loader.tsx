import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "rect" | "circle" | "text";
}

export function SkeletonLoader({ className, variant = "rect" }: SkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ 
        duration: 1.5, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
      className={cn(
        "bg-white/5 backdrop-blur-sm relative overflow-hidden",
        variant === "circle" ? "rounded-full" : "rounded-2xl",
        className
      )}
    >
      <motion.div
        animate={{ 
          x: ["-100%", "100%"] 
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
      />
    </motion.div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <SkeletonLoader className="h-10 w-48" />
        <SkeletonLoader className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SkeletonLoader className="h-32 w-full" />
        <SkeletonLoader className="h-32 w-full" />
        <SkeletonLoader className="h-32 w-full" />
      </div>
      <div className="space-y-4">
        <SkeletonLoader className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4">
          <SkeletonLoader className="h-20 w-full" />
          <SkeletonLoader className="h-20 w-full" />
          <SkeletonLoader className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}
