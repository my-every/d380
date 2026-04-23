"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface PitchProblemCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
  className?: string;
}

/**
 * Animated card for displaying problems/pain points.
 * Each card staggers in based on its index.
 */
export function PitchProblemCard({
  icon: Icon,
  title,
  description,
  index,
  className,
}: PitchProblemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: 0.2 + index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-destructive/30 bg-destructive/5 p-6",
        "hover:border-destructive/50 hover:bg-destructive/10 transition-colors duration-300",
        className
      )}
    >
      {/* Gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}
