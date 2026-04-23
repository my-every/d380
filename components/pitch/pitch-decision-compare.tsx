"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface CompareItem {
  text: string;
}

interface PitchDecisionCompareProps {
  beforeTitle: string;
  afterTitle: string;
  beforeItems: CompareItem[];
  afterItems: CompareItem[];
  className?: string;
}

/**
 * Side-by-side comparison component for Before/After or Problem/Solution views.
 * Each column animates in with staggered list items.
 */
export function PitchDecisionCompare({
  beforeTitle,
  afterTitle,
  beforeItems,
  afterItems,
  className,
}: PitchDecisionCompareProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl", className)}>
      {/* Before / Problem Column */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center">
            <X className="h-4 w-4 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-destructive">{beforeTitle}</h3>
        </div>
        <div className="space-y-3 pl-10">
          {beforeItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.08 }}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <span className="text-destructive/60 mt-0.5">-</span>
              <span>{item.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* After / Solution Column */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="h-4 w-4 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-green-500">{afterTitle}</h3>
        </div>
        <div className="space-y-3 pl-10">
          {afterItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + index * 0.08 }}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <Check className="h-4 w-4 text-green-500/60 mt-0.5 flex-shrink-0" />
              <span>{item.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
