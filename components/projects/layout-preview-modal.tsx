"use client";

/**
 * Custom Modal component for viewing layout page previews.
 * 
 * Features:
 * - Custom portal-based modal (no shadcn Dialog)
 * - Framer Motion animations throughout
 * - Drag to pan when zoomed
 * - Scroll wheel zoom
 * - Pinch-to-zoom on touch devices
 * - 90vw responsive width
 * - Thumbnail navigation strip
 * - Keyboard navigation
 * - Print support
 */

import React, { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Printer, ZoomIn, ZoomOut, Grid3X3, Minimize2, RotateCcw, Move } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LayoutPagePreview, LayoutHighlightRegion } from "@/lib/layout-matching";

interface LayoutPreviewModalProps {
  pages: LayoutPagePreview[];
  initialPageNumber?: number;
  matchedSheetName?: string;
  isOpen: boolean;
  onClose: () => void;
  highlightRegions?: LayoutHighlightRegion[];
}

/**
 * Print a layout page image.
 */
function printLayoutPage(page: LayoutPagePreview, sheetName?: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to print the layout.");
    return;
  }

  const title = sheetName || page.title || `Page ${page.pageNumber}`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Layout - ${title}</title>
        <style>
          @page { size: landscape; margin: 0.5in; }
          body { margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; }
          .header { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; margin-bottom: 10px; display: flex; justify-content: space-between; width: 100%; }
          .title { font-weight: 600; }
          .page-number { color: #666; }
          img { max-width: 100%; max-height: 90vh; object-fit: contain; }
        </style>
      </head>
      <body>
        <div class="header">
          <span class="title">${title}</span>
          <span class="page-number">Page ${page.pageNumber}</span>
        </div>
        <img src="${page.imageUrl}" alt="${title}" />
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// Animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", damping: 28, stiffness: 350, mass: 0.8 }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.15 }
  },
};

const imageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 30 },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  }),
};

// Zoom constraints
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;
const WHEEL_ZOOM_SENSITIVITY = 0.002;

export function LayoutPreviewModal({
  pages,
  initialPageNumber,
  matchedSheetName,
  isOpen,
  onClose,
  highlightRegions = [],
}: LayoutPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [direction, setDirection] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);

  // For smooth drag
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Find initial page index
  useEffect(() => {
    if (initialPageNumber && pages.length > 0) {
      const index = pages.findIndex(p => p.pageNumber === initialPageNumber);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [initialPageNumber, pages]);

  // Reset zoom and position when page changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    dragX.set(0);
    dragY.set(0);
  }, [currentIndex, dragX, dragY]);

  // Scroll thumbnail into view
  useEffect(() => {
    if (showThumbnails && thumbnailsRef.current) {
      const activeThumb = thumbnailsRef.current.querySelector(`[data-index="${currentIndex}"]`);
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [currentIndex, showThumbnails]);

  const currentPage = pages[currentIndex];
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < pages.length - 1;

  const goToPrevious = useCallback(() => {
    if (canGoPrevious) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    }
  }, [canGoPrevious]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }
  }, [canGoNext]);

  const goToPage = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  const handlePrint = useCallback(() => {
    if (currentPage) {
      printLayoutPage(currentPage, matchedSheetName);
    }
  }, [currentPage, matchedSheetName]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const newZoom = Math.max(prev - ZOOM_STEP, MIN_ZOOM);
      if (newZoom <= 1) {
        setPosition({ x: 0, y: 0 });
        dragX.set(0);
        dragY.set(0);
      }
      return newZoom;
    });
  }, [dragX, dragY]);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    dragX.set(0);
    dragY.set(0);
  }, [dragX, dragY]);

  // Wheel zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const delta = -e.deltaY * WHEEL_ZOOM_SENSITIVITY;
    setZoom(prev => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta * prev));

      // Reset position if zooming out to 1 or below
      if (newZoom <= 1) {
        setPosition({ x: 0, y: 0 });
        dragX.set(0);
        dragY.set(0);
      }

      return newZoom;
    });
  }, [dragX, dragY]);

  // Touch handlers for pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = distance;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      const scale = distance / lastTouchDistance.current;
      lastTouchDistance.current = distance;

      setZoom(prev => {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * scale));
        if (newZoom <= 1) {
          setPosition({ x: 0, y: 0 });
          dragX.set(0);
          dragY.set(0);
        }
        return newZoom;
      });
    }
  }, [dragX, dragY]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
  }, []);

  // Drag handlers
  const handleDragStart = useCallback(() => {
    if (zoom > 1) {
      setIsDragging(true);
    }
  }, [zoom]);

  const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (zoom > 1) {
      setPosition(prev => ({
        x: prev.x + info.delta.x,
        y: prev.y + info.delta.y,
      }));
    }
  }, [zoom]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "Escape":
          onClose();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case "0":
          handleResetZoom();
          break;
        case "t":
          setShowThumbnails(prev => !prev);
          break;
        case "p":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            handlePrint();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, goToPrevious, goToNext, onClose, handleZoomIn, handleZoomOut, handleResetZoom, handlePrint]);

  // Click outside to close
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!mounted || !currentPage) {
    return null;
  }

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleOverlayClick}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleOverlayClick}
          >
            <motion.div
              className="relative w-[90vw] h-[90vh] bg-background rounded-xl shadow-2xl overflow-hidden flex flex-col"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              aria-describedby="modal-description"
            >
              {/* Header */}
              <header className="flex-shrink-0 px-4 md:px-6 py-3 md:py-4 border-b bg-background flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <h2 id="modal-title" className="text-base md:text-lg font-semibold truncate text-foreground">
                    {matchedSheetName || currentPage.title || "Layout Preview"}
                  </h2>
                  <p id="modal-description" className="sr-only">
                    Layout drawing page {currentPage.pageNumber} of {pages.length}
                  </p>
                  <motion.span
                    key={currentPage.pageNumber}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground shrink-0"
                  >
                    Page {currentPage.pageNumber}
                  </motion.span>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 md:gap-2 shrink-0">
                  {/* Zoom controls */}
                  <div className="hidden sm:flex items-center gap-0.5 border rounded-lg bg-muted/50 p-0.5">
                    <motion.button
                      className="p-1.5 md:p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      onClick={handleZoomOut}
                      disabled={zoom <= MIN_ZOOM}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ZoomOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </motion.button>
                    <motion.button
                      className="px-2 md:px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-w-[3rem] md:min-w-[3.5rem]"
                      onClick={handleResetZoom}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {Math.round(zoom * 100)}%
                    </motion.button>
                    <motion.button
                      className="p-1.5 md:p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      onClick={handleZoomIn}
                      disabled={zoom >= MAX_ZOOM}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ZoomIn className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </motion.button>
                  </div>

                  {/* Reset zoom button */}
                  {zoom !== 1 && (
                    <motion.button
                      className="p-1.5 md:p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      onClick={handleResetZoom}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Reset zoom (0)"
                    >
                      <RotateCcw className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </motion.button>
                  )}

                  {/* Thumbnails toggle */}
                  {pages.length > 1 && (
                    <motion.button
                      className={cn(
                        "p-1.5 md:p-2 rounded-md transition-colors",
                        showThumbnails
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      onClick={() => setShowThumbnails(!showThumbnails)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Toggle thumbnails (T)"
                    >
                      {showThumbnails ? (
                        <Minimize2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      ) : (
                        <Grid3X3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      )}
                    </motion.button>
                  )}

                  {/* Print button */}
                  <motion.button
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    onClick={handlePrint}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Printer className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="hidden md:inline">Print</span>
                  </motion.button>

                  {/* Close button */}
                  <motion.button
                    className="p-1.5 md:p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    onClick={onClose}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Close (Esc)"
                  >
                    <X className="h-4 w-4 md:h-5 md:w-5" />
                  </motion.button>
                </div>
              </header>

              {/* Image container */}
              <div
                ref={containerRef}
                className={cn(
                  "flex-1 overflow-hidden bg-gradient-to-b from-muted/10 via-muted/20 to-muted/30 relative select-none",
                  zoom > 1 ? "cursor-grab" : "cursor-default",
                  isDragging && "cursor-grabbing"
                )}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Zoom indicator */}
                {zoom > 1 && (
                  <motion.div
                    className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm shadow-lg border text-xs font-medium text-muted-foreground"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Move className="h-3 w-3" />
                    Drag to pan
                  </motion.div>
                )}

                {/* Navigation arrows */}
                {pages.length > 1 && (
                  <>
                    <motion.button
                      className={cn(
                        "absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10",
                        "h-10 w-10 md:h-12 md:w-12 rounded-full",
                        "bg-background/90 backdrop-blur-sm border shadow-lg",
                        "flex items-center justify-center",
                        "text-foreground hover:bg-background",
                        "disabled:opacity-30 disabled:cursor-not-allowed",
                        "transition-all"
                      )}
                      onClick={goToPrevious}
                      disabled={!canGoPrevious}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.1, x: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                    </motion.button>

                    <motion.button
                      className={cn(
                        "absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10",
                        "h-10 w-10 md:h-12 md:w-12 rounded-full",
                        "bg-background/90 backdrop-blur-sm border shadow-lg",
                        "flex items-center justify-center",
                        "text-foreground hover:bg-background",
                        "disabled:opacity-30 disabled:cursor-not-allowed",
                        "transition-all"
                      )}
                      onClick={goToNext}
                      disabled={!canGoNext}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.1, x: 2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                    </motion.button>
                  </>
                )}

                {/* Main image with animation */}
                <div
                  ref={imageContainerRef}
                  className="h-full w-full flex items-center justify-center p-4 md:p-8"
                >
                  <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                      key={currentIndex}
                      custom={direction}
                      variants={imageVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="relative"
                      style={{
                        scale: zoom,
                        x: position.x,
                        y: position.y,
                      }}
                      drag={zoom > 1}
                      dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
                      dragElastic={0.1}
                      onDragStart={handleDragStart}
                      onDrag={handleDrag}
                      onDragEnd={handleDragEnd}
                    >
                      <motion.div
                        className="relative rounded-lg overflow-hidden shadow-2xl ring-1 ring-black/10"
                        whileHover={zoom === 1 ? { boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.3)" } : undefined}
                        transition={{ duration: 0.3 }}
                      >
                        <Image
                          src={currentPage.imageUrl}
                          alt={`Layout page ${currentPage.pageNumber}`}
                          width={currentPage.width || 1200}
                          height={currentPage.height || 900}
                          className="max-w-full max-h-[calc(90vh-14rem)] w-auto h-auto object-contain pointer-events-none"
                          unoptimized
                          priority
                          draggable={false}
                        />

                        {/* Highlight regions overlay */}
                        {highlightRegions.map((region) => (
                          <motion.div
                            key={region.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                              "absolute border-2 rounded pointer-events-none",
                              region.style === "primary" && "border-primary bg-primary/10",
                              region.style === "secondary" && "border-blue-500 bg-blue-500/10",
                              region.style === "warning" && "border-yellow-500 bg-yellow-500/10",
                              !region.style && "border-primary bg-primary/10"
                            )}
                            style={{
                              left: `${region.x}%`,
                              top: `${region.y}%`,
                              width: `${region.width}%`,
                              height: `${region.height}%`,
                            }}
                          >
                            {region.label && (
                              <span className="absolute -top-6 left-0 text-xs font-medium bg-background px-1.5 py-0.5 rounded shadow-sm">
                                {region.label}
                              </span>
                            )}
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Thumbnail strip */}
              <AnimatePresence>
                {showThumbnails && pages.length > 1 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t bg-muted/20 overflow-hidden"
                  >
                    <div
                      ref={thumbnailsRef}
                      className="flex gap-2 p-3 overflow-x-auto"
                      style={{ scrollbarWidth: "thin" }}
                    >
                      {pages.map((page, idx) => (
                        <motion.button
                          key={page.pageNumber}
                          data-index={idx}
                          onClick={() => goToPage(idx)}
                          className={cn(
                            "relative flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                            idx === currentIndex
                              ? "border-primary ring-2 ring-primary/20 scale-105"
                              : "border-transparent hover:border-muted-foreground/30 opacity-70 hover:opacity-100"
                          )}
                          whileHover={{ scale: idx === currentIndex ? 1.05 : 1.08 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Image
                            src={page.imageUrl}
                            alt={`Page ${page.pageNumber}`}
                            width={80}
                            height={60}
                            className="w-20 h-14 object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                            <span className="text-[10px] text-white font-medium">
                              {page.pageNumber}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer with pagination */}
              {pages.length > 1 && (
                <footer className="flex-shrink-0 px-4 md:px-6 py-3 border-t bg-background flex items-center justify-between">
                  <motion.button
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium",
                      "text-foreground hover:bg-muted transition-colors",
                      "disabled:opacity-40 disabled:cursor-not-allowed"
                    )}
                    onClick={goToPrevious}
                    disabled={!canGoPrevious}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </motion.button>

                  <div className="flex items-center gap-3">
                    <motion.span
                      className="text-sm font-medium text-foreground"
                      key={currentIndex}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {currentIndex + 1} of {pages.length}
                    </motion.span>

                    {/* Progress bar */}
                    <div className="hidden sm:block w-24 md:w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentIndex + 1) / pages.length) * 100}%` }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    </div>
                  </div>

                  <motion.button
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium",
                      "text-foreground hover:bg-muted transition-colors",
                      "disabled:opacity-40 disabled:cursor-not-allowed"
                    )}
                    onClick={goToNext}
                    disabled={!canGoNext}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </footer>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
