'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Upload, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export interface SlideBullet {
  text: string
  indent?: number
  highlight?: boolean
  /** Visual component to show when this bullet is active */
  visual?: ReactNode
  /** If true, show upload placeholder instead of visual */
  uploadPlaceholder?: string
}

export interface SlideGroup {
  label?: string
  bullets: SlideBullet[]
}

export interface SlideData {
  id: string
  title: string
  subtitle?: string
  groups: SlideGroup[]
  /** Default visual when no bullet-specific visual is active */
  visual?: ReactNode
  /** Visuals mapped to each bullet index (0-based across all groups) */
  bulletVisuals?: (ReactNode | null)[]
  /** Upload placeholders for bullets that need custom images */
  bulletUploadPlaceholders?: (string | null)[]
  fullScreenVisual?: boolean
  finalAction?: 'navigate' | 'none'
  navigateTo?: string
}

interface PresentationEngineProps {
  slides: SlideData[]
  onComplete?: () => void
}

// ============================================================================
// UPLOAD PLACEHOLDER COMPONENT
// ============================================================================

export function UploadPlaceholder({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full min-h-[300px] rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/30 p-8"
    >
      <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
        <Upload className="h-8 w-8 text-slate-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-400 mb-1">Upload reference image</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
        <ImageIcon className="h-3 w-3" />
        <span>PNG, JPG, or SVG</span>
      </div>
    </motion.div>
  )
}

// ============================================================================
// PRESENTATION SHELL WITH PERSISTENT CHROME
// ============================================================================

export function PresentationShell({ children }: { children: ReactNode }) {
  const [cursorVisible, setCursorVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Hide cursor after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout
    
    const resetCursor = () => {
      setCursorVisible(true)
      clearTimeout(timeout)
      timeout = setTimeout(() => setCursorVisible(false), 3000)
    }
    
    window.addEventListener('mousemove', resetCursor)
    resetCursor()
    
    return () => {
      window.removeEventListener('mousemove', resetCursor)
      clearTimeout(timeout)
    }
  }, [])
  
  // Try to enter fullscreen on mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen()
          setIsFullscreen(true)
        }
      } catch {
        // Fullscreen not supported or denied
      }
    }
    
    // Small delay to allow user interaction first
    const timeout = setTimeout(enterFullscreen, 500)
    return () => clearTimeout(timeout)
  }, [])
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])
  
  return (
    <div 
      className={cn(
        'fixed inset-0 bg-slate-950 overflow-hidden',
        !cursorVisible && 'cursor-none'
      )}
    >
      {/* ============================================================= */}
      {/* PERSISTENT CHROME - D380 Logo Top Center */}
      {/* ============================================================= */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-center">
        <img
          src="/D380Logo.svg"
          alt="D380"
          className="h-10 opacity-90"
        />
      </div>
      
      {/* ============================================================= */}
      {/* PERSISTENT CHROME - Solar Turbines Bottom Left */}
      {/* ============================================================= */}
      <div className="absolute bottom-0 left-0 z-50 p-6">
        <img
          src="/SolarTurbines-Dark.svg"
          alt="Solar Turbines"
          className="h-7 opacity-70"
        />
      </div>
      
      {/* ============================================================= */}
      {/* PERSISTENT CHROME - Caterpillar Confidential Footer */}
      {/* ============================================================= */}
      <div className="absolute bottom-0 left-0 right-0 z-40 flex justify-center pb-4">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-900/30 border border-emerald-600/30">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-emerald-400 tracking-wide">
            Caterpillar: Confidential Green
          </span>
        </div>
      </div>
      
      {/* Main content */}
      <div className="h-full w-full flex items-center justify-center px-16 py-24">
        {children}
      </div>
      
      {/* Fullscreen hint */}
      {!isFullscreen && (
        <div className="absolute top-6 right-6 text-xs text-slate-600">
          Press F11 for fullscreen
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SLIDE RENDERER WITH PER-BULLET VISUALS
// ============================================================================

interface SlideRendererProps {
  slide: SlideData
  visibleBulletCount: number
  activeBulletIndex: number
  isActive: boolean
}

export function SlideRenderer({ slide, visibleBulletCount, activeBulletIndex, isActive }: SlideRendererProps) {
  // Calculate total bullets across all groups
  let bulletIndex = 0
  
  // Determine which visual to show based on active bullet
  // The active bullet is the last visible one (visibleBulletCount - 1)
  const getActiveVisual = (): ReactNode => {
    const activeBullet = visibleBulletCount > 0 ? visibleBulletCount - 1 : -1
    
    // Check if there's a bullet-specific visual
    if (activeBullet >= 0 && slide.bulletVisuals && slide.bulletVisuals[activeBullet]) {
      return slide.bulletVisuals[activeBullet]
    }
    
    // Check if there's a bullet-specific upload placeholder
    if (activeBullet >= 0 && slide.bulletUploadPlaceholders && slide.bulletUploadPlaceholders[activeBullet]) {
      return <UploadPlaceholder label={slide.bulletUploadPlaceholders[activeBullet]!} />
    }
    
    // Check if the bullet itself has a visual or upload placeholder
    if (activeBullet >= 0) {
      let currentIndex = 0
      for (const group of slide.groups) {
        for (const bullet of group.bullets) {
          if (currentIndex === activeBullet) {
            if (bullet.visual) return bullet.visual
            if (bullet.uploadPlaceholder) return <UploadPlaceholder label={bullet.uploadPlaceholder} />
          }
          currentIndex++
        }
      }
    }
    
    // Fall back to default visual
    return slide.visual
  }
  
  const activeVisual = getActiveVisual()
  
  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-7xl mx-auto flex gap-12 items-center"
        >
          {/* Text Content */}
          <div className={cn(
            'flex-1 min-w-0',
            slide.fullScreenVisual ? 'max-w-lg' : ''
          )}>
            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight"
            >
              {slide.title}
            </motion.h1>
            
            {/* Subtitle */}
            {slide.subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl text-slate-400 mb-10"
              >
                {slide.subtitle}
              </motion.p>
            )}
            
            {/* Bullet Groups */}
            <div className="space-y-6">
              {slide.groups.map((group, groupIndex) => {
                // Track the starting index for this group
                const groupStartIndex = bulletIndex
                
                return (
                  <div key={groupIndex}>
                    {group.label && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: visibleBulletCount > groupStartIndex ? 1 : 0 }}
                        className="text-base font-semibold text-amber-500 uppercase tracking-wider mb-4"
                      >
                        {group.label}
                      </motion.div>
                    )}
                    
                    <div className="space-y-4">
                      {group.bullets.map((bullet, bIndex) => {
                        const currentIndex = bulletIndex++
                        const isVisible = currentIndex < visibleBulletCount
                        // Fix: active bullet is the one that was just revealed (visibleBulletCount - 1)
                        const isActiveBullet = isVisible && currentIndex === visibleBulletCount - 1
                        
                        return (
                          <motion.div
                            key={bIndex}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ 
                              opacity: isVisible ? 1 : 0,
                              x: isVisible ? 0 : -20
                            }}
                            transition={{ duration: 0.3 }}
                            className={cn(
                              'flex items-start gap-3 rounded-lg px-4 py-3 -mx-4 transition-colors',
                              bullet.indent && 'ml-6',
                              isActiveBullet && 'bg-amber-500/10'
                            )}
                          >
                            <span className={cn(
                              'mt-2.5 w-2.5 h-2.5 rounded-full shrink-0 transition-colors',
                              isActiveBullet ? 'bg-amber-400' : bullet.highlight ? 'bg-amber-500' : 'bg-slate-600'
                            )} />
                            <span className={cn(
                              'text-xl leading-relaxed transition-colors',
                              isActiveBullet ? 'text-white font-medium' : bullet.highlight ? 'text-white font-medium' : 'text-slate-300'
                            )}>
                              {bullet.text}
                            </span>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Visual Component - Changes per bullet */}
          {activeVisual && (
            <motion.div
              key={`visual-${activeBulletIndex}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'shrink-0 flex items-center justify-center',
                slide.fullScreenVisual ? 'flex-1' : 'w-[500px]'
              )}
            >
              {activeVisual}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// PRESENTATION ENGINE (STATE CONTROLLER)
// ============================================================================

export function PresentationEngine({ slides, onComplete }: PresentationEngineProps) {
  const router = useRouter()
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [currentBulletIndex, setCurrentBulletIndex] = useState(0)
  
  const currentSlide = slides[currentSlideIndex]
  
  // Count total bullets in current slide
  const totalBullets = currentSlide?.groups.reduce(
    (sum, group) => sum + group.bullets.length, 
    0
  ) || 0
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      
      // If we have more bullets to show
      if (currentBulletIndex < totalBullets) {
        setCurrentBulletIndex(prev => prev + 1)
      } 
      // Move to next slide
      else if (currentSlideIndex < slides.length - 1) {
        setCurrentSlideIndex(prev => prev + 1)
        setCurrentBulletIndex(0)
      }
      // Final slide - check for navigation
      else if (currentSlide?.finalAction === 'navigate' && currentSlide?.navigateTo) {
        router.push(currentSlide.navigateTo)
      } else {
        onComplete?.()
      }
    }
    
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      
      // Go back one bullet
      if (currentBulletIndex > 0) {
        setCurrentBulletIndex(prev => prev - 1)
      }
      // Go to previous slide
      else if (currentSlideIndex > 0) {
        const prevSlide = slides[currentSlideIndex - 1]
        const prevTotalBullets = prevSlide?.groups.reduce(
          (sum, group) => sum + group.bullets.length, 
          0
        ) || 0
        setCurrentSlideIndex(prev => prev - 1)
        setCurrentBulletIndex(prevTotalBullets)
      }
    }
    
    // Jump between slides with up/down
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (currentSlideIndex > 0) {
        setCurrentSlideIndex(prev => prev - 1)
        setCurrentBulletIndex(0)
      }
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (currentSlideIndex < slides.length - 1) {
        setCurrentSlideIndex(prev => prev + 1)
        setCurrentBulletIndex(0)
      }
    }
    
    // Escape to exit
    if (e.key === 'Escape') {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      }
    }
  }, [currentSlideIndex, currentBulletIndex, totalBullets, slides, currentSlide, router, onComplete])
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  return (
    <PresentationShell>
      {/* Progress dots */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 z-30">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentSlideIndex(index)
              setCurrentBulletIndex(0)
            }}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              index === currentSlideIndex 
                ? 'bg-amber-500 w-6' 
                : index < currentSlideIndex
                  ? 'bg-slate-600'
                  : 'bg-slate-800'
            )}
          />
        ))}
      </div>
      
      {/* Slide number */}
      <div className="absolute bottom-6 right-6 text-sm text-slate-600 font-mono z-30">
        {currentSlideIndex + 1} / {slides.length}
      </div>
      
      {/* Navigation hints */}
      <div className="absolute bottom-6 left-32 text-xs text-slate-700 space-x-4 z-30">
        <span>Arrow keys to navigate</span>
        <span>Enter to advance</span>
      </div>
      
      {/* Current slide */}
      <SlideRenderer
        slide={currentSlide}
        visibleBulletCount={currentBulletIndex}
        activeBulletIndex={currentBulletIndex}
        isActive={true}
      />
    </PresentationShell>
  )
}
