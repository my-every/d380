"use client";

/**
 * Assignment Card Controls
 * 
 * Toolbar widget for the project detail page that lets users:
 * - Switch between compact / standard / detailed density
 * - Toggle individual card sections on/off
 * 
 * State is lifted to the parent page via props.
 */

import {
  LayoutGrid,
  LayoutList,
  LayoutDashboard,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type AssignmentCardDensity,
  type AssignmentCardSection,
  type AssignmentCardVisibility,
  DENSITY_DEFAULTS,
  ALL_SECTIONS,
} from "./assignment-card";

// ============================================================================
// Types
// ============================================================================

interface AssignmentCardControlsProps {
  density: AssignmentCardDensity;
  onDensityChange: (d: AssignmentCardDensity) => void;
  visibleSections: AssignmentCardVisibility;
  onVisibleSectionsChange: (s: AssignmentCardVisibility) => void;
}

// ============================================================================
// Density Toggle
// ============================================================================

const DENSITY_OPTIONS: { value: AssignmentCardDensity; icon: React.ReactNode; label: string }[] = [
  { value: "compact",  icon: <LayoutList className="h-4 w-4" />,      label: "Compact" },
  { value: "standard", icon: <LayoutGrid className="h-4 w-4" />,      label: "Standard" },
  { value: "detailed", icon: <LayoutDashboard className="h-4 w-4" />, label: "Detailed" },
];

// ============================================================================
// Component
// ============================================================================

export function AssignmentCardControls({
  density,
  onDensityChange,
  visibleSections,
  onVisibleSectionsChange,
}: AssignmentCardControlsProps) {
  const toggleSection = (key: AssignmentCardSection) => {
    const next = new Set(visibleSections);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onVisibleSectionsChange(next);
  };

  const handleDensityChange = (d: AssignmentCardDensity) => {
    onDensityChange(d);
    // Reset sections to density defaults when switching
    onVisibleSectionsChange(new Set(DENSITY_DEFAULTS[d]));
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Density toggle buttons */}
      <div className="flex items-center rounded-lg border border-border/50 bg-background p-0.5">
        {DENSITY_OPTIONS.map(opt => (
          <Button
            key={opt.value}
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 rounded-md transition-colors",
              density === opt.value
                ? "bg-muted text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => handleDensityChange(opt.value)}
            title={opt.label}
          >
            {opt.icon}
          </Button>
        ))}
      </div>

      {/* Section toggles popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Toggle card sections"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-3">
          <p className="text-xs font-medium text-foreground mb-3">Card Sections</p>
          <div className="space-y-2.5">
            {ALL_SECTIONS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label
                  htmlFor={`section-${key}`}
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  {label}
                </Label>
                <Switch
                  id={`section-${key}`}
                  checked={visibleSections.has(key)}
                  onCheckedChange={() => toggleSection(key)}
                  className="scale-75 origin-right"
                />
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
