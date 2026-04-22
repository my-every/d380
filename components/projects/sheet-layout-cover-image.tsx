"use client";

/**
 * Cover image component for sheet cards showing matched layout page preview.
 * 
 * Features:
 * - Displays layout page preview as card cover
 * - Shows page number badge
 * - Shows match confidence indicator
 * - Clickable to open preview modal
 */

import { useState } from "react";
import Image from "next/image";
import { FileImage, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LayoutPagePreview, MatchConfidence } from "@/lib/layout-matching";

interface SheetLayoutCoverImageProps {
  page: LayoutPagePreview;
  confidence: MatchConfidence;
  sheetName: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Get badge variant based on match confidence.
 */
function getConfidenceBadgeVariant(confidence: MatchConfidence): "default" | "secondary" | "outline" {
  switch (confidence) {
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
    case "unmatched":
    default:
      return "outline";
  }
}

/**
 * Get confidence label.
 */
function getConfidenceLabel(confidence: MatchConfidence): string {
  switch (confidence) {
    case "high":
      return "Matched";
    case "medium":
      return "Likely";
    case "low":
      return "Maybe";
    case "unmatched":
    default:
      return "";
  }
}

export function SheetLayoutCoverImage({
  page,
  confidence,
  sheetName,
  onClick,
  className = "",
}: SheetLayoutCoverImageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const handleClick = () => {
    onClick?.();
  };
  
  // If image failed to load, show placeholder
  if (imageError) {
    return (
      <div 
        className={`
          relative flex items-center justify-center bg-muted h-32
          ${className}
        `}
      >
        <FileImage className="h-8 w-8 text-muted-foreground/50" />
      </div>
    );
  }
  
  return (
    <div
      className={`
        relative overflow-hidden cursor-pointer group
        ${className}
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`View layout for ${sheetName}`}
    >
      {/* Cover Image */}
      <div className="relative h-32 w-full bg-muted">
        <Image
          src={page.imageUrl}
          alt={`Layout preview for ${sheetName}`}
          fill
          className="object-cover object-top transition-transform duration-200 group-hover:scale-105"
          onError={() => setImageError(true)}
          unoptimized // Using blob URLs which don't need optimization
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Hover overlay */}
        <div 
          className={`
            absolute inset-0 flex items-center justify-center bg-black/40 
            transition-opacity duration-200
            ${isHovered ? "opacity-100" : "opacity-0"}
          `}
        >
          <div className="flex items-center gap-2 text-white">
            <Eye className="h-5 w-5" />
            <span className="text-sm font-medium">View Layout</span>
          </div>
        </div>
      </div>
      
      {/* Page number badge - top right */}
      <Badge 
        variant="secondary" 
        className="absolute top-2 right-2 text-xs bg-background/80 backdrop-blur-sm"
      >
        Page {page.pageNumber}
      </Badge>
      
      {/* Confidence badge - bottom left */}
      {confidence !== "unmatched" && (
        <Badge 
          variant={getConfidenceBadgeVariant(confidence)}
          className="absolute bottom-2 left-2 text-xs"
        >
          {getConfidenceLabel(confidence)}
        </Badge>
      )}
      
      {/* Page title - bottom center (overlaid on gradient) */}
      {page.title && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 max-w-[80%]">
          <span className="text-xs text-white/90 font-medium truncate block text-center">
            {page.title}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Placeholder component when no layout is matched.
 */
export function SheetLayoutPlaceholder({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div 
      className={`
        flex items-center justify-center bg-muted/50 h-24 border-b
        ${className}
      `}
    >
      <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
        <FileImage className="h-6 w-6" />
        <span className="text-xs">No layout</span>
      </div>
    </div>
  );
}
