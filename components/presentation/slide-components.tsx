'use client'

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  ArrowRight,
  Layers,
  Box,
  FileSpreadsheet,
  Workflow,
  Printer,
  Database,
  Cpu,
  GitBranch
} from 'lucide-react'

// ============================================================================
// STATUS BADGES
// ============================================================================

export type ImplementationStatus = 'complete' | 'partial' | 'planned' | 'gap'

interface StatusBadgeProps {
  status: ImplementationStatus
  label?: string
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const configs = {
    complete: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: CheckCircle2,
      defaultLabel: 'Implemented',
    },
    partial: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: Circle,
      defaultLabel: 'Partial',
    },
    planned: {
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      icon: Circle,
      defaultLabel: 'Planned',
    },
    gap: {
      bg: 'bg-red-500/15',
      text: 'text-red-400',
      border: 'border-red-500/30',
      icon: AlertTriangle,
      defaultLabel: 'Gap',
    },
  }
  
  const config = configs[status]
  const Icon = config.icon
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
      config.bg, config.text, config.border
    )}>
      <Icon className="h-3 w-3" />
      {label || config.defaultLabel}
    </span>
  )
}

// ============================================================================
// METRIC CARDS
// ============================================================================

interface MetricCardProps {
  label: string
  value: string | number
  detail?: string
  tone?: 'neutral' | 'positive' | 'warning' | 'accent'
}

export function MetricCard({ label, value, detail, tone = 'neutral' }: MetricCardProps) {
  const toneClasses = {
    neutral: 'border-slate-700/50 bg-slate-800/30',
    positive: 'border-emerald-500/30 bg-emerald-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    accent: 'border-amber-500/30 bg-amber-500/10',
  }
  
  return (
    <div className={cn(
      'rounded-xl border p-5 transition-colors',
      toneClasses[tone]
    )}>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
        {label}
      </div>
      <div className="text-3xl font-bold text-white mt-1">
        {value}
      </div>
      {detail && (
        <div className="text-sm text-slate-400 mt-1">
          {detail}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COMPONENT INVENTORY CARD
// ============================================================================

interface ComponentCardProps {
  name: string
  path: string
  description: string
  status: ImplementationStatus
  dependencies?: string[]
  features?: string[]
}

export function ComponentCard({ 
  name, 
  path, 
  description, 
  status,
  dependencies,
  features 
}: ComponentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-4 hover:bg-slate-800/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">{name}</h4>
          <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{path}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="text-sm text-slate-400 mt-2 line-clamp-2">{description}</p>
      
      {features && features.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {features.map(feature => (
            <span 
              key={feature}
              className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300"
            >
              {feature}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ============================================================================
// ARCHITECTURE LAYER CARD
// ============================================================================

interface ArchitectureLayerProps {
  title: string
  description: string
  icon: ReactNode
  children?: ReactNode
  accent?: boolean
}

export function ArchitectureLayer({ 
  title, 
  description, 
  icon,
  children,
  accent = false
}: ArchitectureLayerProps) {
  return (
    <div className={cn(
      'rounded-2xl border p-5',
      accent 
        ? 'border-amber-500/40 bg-amber-500/5' 
        : 'border-slate-700/50 bg-slate-800/20'
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          'p-2 rounded-lg',
          accent ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'
        )}>
          {icon}
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// ============================================================================
// PIPELINE FLOW DIAGRAM
// ============================================================================

interface PipelineStageProps {
  title: string
  items: string[]
  status: ImplementationStatus
  isLast?: boolean
}

export function PipelineStage({ title, items, status, isLast = false }: PipelineStageProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          <StatusBadge status={status} />
        </div>
        <ul className="space-y-1">
          {items.map(item => (
            <li key={item} className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      {!isLast && (
        <div className="flex-none flex items-center justify-center w-8 h-full">
          <ArrowRight className="h-5 w-5 text-slate-600" />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// GAP MATRIX
// ============================================================================

interface GapMatrixItem {
  category: string
  items: {
    name: string
    status: ImplementationStatus
    notes?: string
  }[]
}

interface GapMatrixProps {
  data: GapMatrixItem[]
}

export function GapMatrix({ data }: GapMatrixProps) {
  return (
    <div className="space-y-4">
      {data.map(category => (
        <div key={category.category}>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {category.category}
          </h4>
          <div className="grid gap-2">
            {category.items.map(item => (
              <div 
                key={item.name}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-slate-800/30 border border-slate-700/30"
              >
                <div className="flex-1">
                  <span className="text-sm text-white">{item.name}</span>
                  {item.notes && (
                    <span className="text-xs text-slate-500 ml-2">- {item.notes}</span>
                  )}
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// ROADMAP TIMELINE
// ============================================================================

interface RoadmapPhase {
  phase: string
  title: string
  items: string[]
  status: ImplementationStatus
}

interface RoadmapTimelineProps {
  phases: RoadmapPhase[]
}

export function RoadmapTimeline({ phases }: RoadmapTimelineProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-amber-500 via-slate-600 to-slate-700" />
      
      <div className="space-y-6">
        {phases.map((phase, index) => (
          <motion.div
            key={phase.phase}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative flex gap-6"
          >
            {/* Timeline dot */}
            <div className={cn(
              'relative z-10 flex-none w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold',
              phase.status === 'complete' 
                ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40'
                : phase.status === 'partial'
                ? 'bg-amber-500/20 text-amber-400 border-2 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-2 border-slate-700'
            )}>
              {phase.phase}
            </div>
            
            {/* Phase content */}
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-base font-semibold text-white">{phase.title}</h4>
                <StatusBadge status={phase.status} />
              </div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                {phase.items.map(item => (
                  <li key={item} className="text-sm text-slate-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// KEY POINTS LIST
// ============================================================================

interface KeyPointsProps {
  points: string[]
  variant?: 'default' | 'accent'
}

export function KeyPoints({ points, variant = 'default' }: KeyPointsProps) {
  return (
    <ul className="space-y-3">
      {points.map((point, index) => (
        <motion.li
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-start gap-3"
        >
          <span className={cn(
            'flex-none w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5',
            variant === 'accent' 
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-slate-700/50 text-slate-400'
          )}>
            {index + 1}
          </span>
          <span className="text-slate-300 leading-relaxed">{point}</span>
        </motion.li>
      ))}
    </ul>
  )
}

// ============================================================================
// SOURCE INPUT CARDS
// ============================================================================

const sourceIcons = {
  workbook: FileSpreadsheet,
  layout: Layers,
  reference: Database,
  catalog: Box,
}

interface SourceInputCardProps {
  type: keyof typeof sourceIcons
  title: string
  description: string
  fileTypes: string[]
  status: ImplementationStatus
}

export function SourceInputCard({ type, title, description, fileTypes, status }: SourceInputCardProps) {
  const Icon = sourceIcons[type]
  
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-5">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-slate-700/30">
          <Icon className="h-6 w-6 text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-base font-semibold text-white">{title}</h4>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-slate-400 mt-1">{description}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {fileTypes.map(ft => (
              <span 
                key={ft}
                className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 font-mono"
              >
                {ft}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// FLOW CONNECTOR
// ============================================================================

interface FlowConnectorProps {
  direction?: 'horizontal' | 'vertical'
}

export function FlowConnector({ direction = 'horizontal' }: FlowConnectorProps) {
  if (direction === 'vertical') {
    return (
      <div className="flex justify-center py-2">
        <div className="w-px h-8 bg-gradient-to-b from-slate-600 to-slate-700" />
      </div>
    )
  }
  
  return (
    <div className="flex items-center justify-center px-2">
      <ArrowRight className="h-5 w-5 text-slate-600" />
    </div>
  )
}
