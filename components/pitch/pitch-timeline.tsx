"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  year: string;
  title: string;
  description: string;
}

interface PitchTimelineProps {
  items: TimelineItem[];
  className?: string;
}

/**
 * Animated vertical timeline component for the Background slide.
 * Each item staggers in with a connecting line animation.
 */
export function PitchTimeline({ items, className }: PitchTimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Vertical line */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: "100%" }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className="absolute left-4 top-0 w-0.5 bg-gradient-to-b from-yellow-500/80 via-yellow-500/50 to-transparent"
      />

      <div className="space-y-8">
        {items.map((item, index) => (
          <motion.div
            key={item.year}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.3 + index * 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative pl-12"
          >
            {/* Timeline dot */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 0.3,
                delay: 0.4 + index * 0.15,
                type: "spring",
                stiffness: 300,
              }}
              className="absolute left-2 top-1.5 h-5 w-5 rounded-full bg-yellow-500 border-4 border-background"
            />

            <div className="space-y-1">
              <span className="text-sm font-mono text-yellow-500/80">{item.year}</span>
              <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
