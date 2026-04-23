"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface CompareItem {
  text: string;
}

interface PitchCompareColumnsProps {
  beforeTitle: string;
  afterTitle: string;
  beforeItems: CompareItem[];
  afterItems: CompareItem[];
  className?: string;
}

/**
 * Two-column comparison layout for Before/After or Old/New.
 * Left column shows problems (with X icons), right shows solutions (with checkmarks).
 */
export function PitchCompareColumns({
  beforeTitle,
  afterTitle,
  beforeItems,
  afterItems,
  className,
}: PitchCompareColumnsProps) {
  return (
    <div className={cn("grid md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl", className)}>
      {/* Before Column */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 pb-2 border-b border-red-500/30">
          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-red-500" />
          </div>
          <h3 className="font-semibold text-red-400">{beforeTitle}</h3>
        </div>
        <ul className="space-y-3">
          {beforeItems.map((item, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
              className="flex items-start gap-3 text-sm text-muted-foreground"
            >
              <X className="w-4 h-4 text-red-500/70 flex-shrink-0 mt-0.5" />
              <span>{item.text}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* After Column */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 pb-2 border-b border-green-500/30">
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-green-500" />
          </div>
          <h3 className="font-semibold text-green-400">{afterTitle}</h3>
        </div>
        <ul className="space-y-3">
          {afterItems.map((item, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
              className="flex items-start gap-3 text-sm text-foreground"
            >
              <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>{item.text}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
