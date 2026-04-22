'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, List, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SlideConfig {
  id: string
  title: string
  subtitle?: string
  section?: string
}

interface ArchitectureSlideShellProps {
  slides: SlideConfig[]
  currentIndex: number
  onNavigate: (index: number) => void
  children: ReactNode
  showOutline?: boolean
  onToggleOutline?: () => void
}

export function ArchitectureSlideShell({
  slides,
  currentIndex,
  onNavigate,
  children,
  showOutline = false,
  onToggleOutline,
}: ArchitectureSlideShellProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const currentSlide = slides[currentIndex]
  const progress = ((currentIndex + 1) / slides.length) * 100
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        if (currentIndex < slides.length - 1) {
          onNavigate(currentIndex + 1)
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (currentIndex > 0) {
          onNavigate(currentIndex - 1)
        }
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      } else if (e.key === 'f') {
        setIsFullscreen(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, slides.length, onNavigate, isFullscreen])
  
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1)
    }
  }, [currentIndex, onNavigate])
  
  const goToNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      onNavigate(currentIndex + 1)
    }
  }, [currentIndex, slides.length, onNavigate])
  
  return (
    <div className={cn(
      "flex flex-col bg-slate-950 text-white",
      isFullscreen ? "fixed inset-0 z-50" : "min-h-screen"
    )}>
      {/* Fixed Header with Solar Turbines Logo */}
      <header className="flex-none h-16 border-b border-slate-800/60 bg-slate-950/95 backdrop-blur-sm px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src="/SolarTurbines-Dark.svg" 
            alt="Solar Turbines" 
            className="h-8 w-auto"
          />
          <div className="h-6 w-px bg-slate-700" />
          <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            D380 Architecture Review
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleOutline}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <List className="h-4 w-4 mr-2" />
            Outline
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(prev => !prev)}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Slide Outline Sidebar */}
        <AnimatePresence>
          {showOutline && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-none border-r border-slate-800/60 bg-slate-900/50 overflow-y-auto"
            >
              <div className="p-4 space-y-1">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
                  Slides
                </h3>
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => onNavigate(index)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                      index === currentIndex
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <span className="text-xs text-slate-500 mr-2">{index + 1}.</span>
                    {slide.title}
                  </button>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
        
        {/* Slide Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Slide Title Bar */}
          <div className="flex-none px-10 py-5 border-b border-slate-800/40">
            {currentSlide?.section && (
              <span className="text-xs font-medium text-amber-500 uppercase tracking-wider">
                {currentSlide.section}
              </span>
            )}
            <h1 className="text-2xl font-bold text-white mt-1">
              {currentSlide?.title}
            </h1>
            {currentSlide?.subtitle && (
              <p className="text-sm text-slate-400 mt-1">
                {currentSlide.subtitle}
              </p>
            )}
          </div>
          
          {/* Slide Body */}
          <div className="flex-1 overflow-y-auto px-10 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      
      {/* Footer Navigation */}
      <footer className="flex-none h-14 border-t border-slate-800/60 bg-slate-950/95 px-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        <div className="flex items-center gap-4">
          {/* Progress Bar */}
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          {/* Slide Counter */}
          <span className="text-sm text-slate-500 tabular-nums">
            {currentIndex + 1} / {slides.length}
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNext}
          disabled={currentIndex === slides.length - 1}
          className="text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </footer>
    </div>
  )
}
