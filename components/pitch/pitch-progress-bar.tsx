"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PitchProgressBarProps {
  progress: number;
  currentSlide: number;
  totalSlides: number;
  className?: string;
}

/**
 * Progress bar and slide counter for the pitch presentation.
 * Shows a thin animated progress bar at the top and slide numbers.
 */
export function PitchProgressBar({
  progress,
  currentSlide,
  totalSlides,
  className,
}: PitchProgressBarProps) {
  return (
    <div className={cn("fixed top-0 left-0 right-0 z-50", className)}>
      {/* Progress bar */}
      <div className="h-1 bg-muted/30">
        <motion.div
          className="h-full bg-yellow-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Slide counter */}
      <div className="absolute top-3 right-4 text-xs text-muted-foreground font-mono">
        {currentSlide + 1} / {totalSlides}
      </div>
    </div>
  );
}
