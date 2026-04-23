"use client";

/**
 * Layout preview component for wire list detail pages.
 * 
 * Displays the matched layout page preview above/beside the wire list table.
 * Clicking opens the full layout preview modal.
 */

import { useState } from "react";
import Image from "next/image";
import { FileImage, Eye, ZoomIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LayoutPagePreview, SheetLayoutMatch } from "@/lib/layout-matching";
import { LayoutPreviewModal } from "@/components/projects/layout-preview-modal";

interface WireListLayoutPreviewProps {
  page: LayoutPagePreview;
  match: SheetLayoutMatch;
  sheetName: string;
  allPages?: LayoutPagePreview[];
  className?: string;
}

export function WireListLayoutPreview({
  page,
  match,
  sheetName,
  allPages,
  className = "",
}: WireListLayoutPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Use all pages if provided, otherwise just the matched page
  const modalPages = allPages && allPages.length > 0 ? allPages : [page];
  
  // Early return if page or imageUrl is missing
  if (!page || !page.imageUrl) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <FileImage className="h-8 w-8" />
            <span className="text-sm">Layout preview unavailable</span>
            <span className="text-xs text-muted-foreground/70">
              Please re-upload the layout PDF
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (imageError) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <FileImage className="h-8 w-8" />
            <span className="text-sm">Failed to load layout preview</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className={`overflow-hidden  pt-0 pb-6 ${className}`}>
        <div 
          className="relative cursor-pointer group"
          onClick={() => setIsModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsModalOpen(true);
            }
          }}
        >
          {/* Preview Image - 0 top padding, 4 bottom */}
          <div className="relative h-48 bg-muted pb-4">
            <Image
              src={page.imageUrl}
              alt={`Layout for ${sheetName}`}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              onError={() => setImageError(true)}
              unoptimized
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            
            {/* Hover overlay */}
            <div 
              className="
                absolute inset-0 flex items-center justify-center bg-black/30 
                opacity-0 group-hover:opacity-100 transition-opacity duration-200
              "
            >
              <div className="flex items-center gap-2 text-white bg-black/50 px-4 py-2 rounded-full">
                <ZoomIn className="h-5 w-5" />
                <span className="text-sm font-medium">View Full Size</span>
              </div>
            </div>
          </div>
          
          {/* Info Bar */}
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileImage className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{page.title || `Page ${page.pageNumber}`}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Page {page.pageNumber}
              </Badge>
              {match.confidence === "high" && (
                <Badge variant="default" className="text-xs">Matched</Badge>
              )}
              {match.confidence === "medium" && (
                <Badge variant="secondary" className="text-xs">Likely</Badge>
              )}
            </div>
          </CardContent>
        </div>
        
        {/* Alternative matches hint */}
        {match.alternativeMatches && match.alternativeMatches.length > 0 && (
          <div className="px-3 pb-3 pt-0">
            <p className="text-xs text-muted-foreground">
              {match.alternativeMatches.length} alternative page{match.alternativeMatches.length !== 1 ? "s" : ""} available
            </p>
          </div>
        )}
      </Card>
      
      {/* Layout Preview Modal */}
      <LayoutPreviewModal
        pages={modalPages}
        initialPageNumber={page.pageNumber}
        matchedSheetName={sheetName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

/**
 * Compact inline layout preview button.
 */
export function WireListLayoutPreviewButton({
  page,
  sheetName,
  allPages,
}: {
  page: LayoutPagePreview;
  sheetName: string;
  allPages?: LayoutPagePreview[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalPages = allPages && allPages.length > 0 ? allPages : [page];
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="gap-2"
      >
        <Eye className="h-4 w-4" />
        View Layout
        <Badge variant="secondary" className="text-xs ml-1">
          Page {page.pageNumber}
        </Badge>
      </Button>
      
      <LayoutPreviewModal
        pages={modalPages}
        initialPageNumber={page.pageNumber}
        matchedSheetName={sheetName}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

/**
 * Placeholder when no layout is available.
 */
export function WireListLayoutPlaceholder({
  className = "",
}: {
  className?: string;
}) {
  return (
    <Card className={`bg-muted/30 border-dashed ${className}`}>
      <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
        <div className="flex flex-col items-center gap-2 text-center">
          <FileImage className="h-6 w-6" />
          <span className="text-xs">No layout preview available</span>
          <span className="text-xs text-muted-foreground/70">
            Upload a layout PDF to see the matched drawing
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
