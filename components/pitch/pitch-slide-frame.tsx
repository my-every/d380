"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface PitchSlideFrameProps {
  children: React.ReactNode;
  isActive: boolean;
  slideIndex: number;
  className?: string;
}

/**
 * Wrapper component for each slide with entrance/exit animations.
 * Uses Framer Motion for smooth fade + slide transitions.
 */
export function PitchSlideFrame({
  children,
  isActive,
  slideIndex,
  className,
}: PitchSlideFrameProps) {
  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={`slide-${slideIndex}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center px-8 md:px-16 lg:px-24",
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
