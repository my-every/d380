'use client'

import { motion } from 'framer-motion'
import { 
  FileSpreadsheet, 
  FileImage, 
  Database, 
  Layers,
  GitBranch,
  Workflow,
  Printer,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Circle,
  Cpu,
  Box,
  Zap,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ImplementationStatus } from './slide-components'

// ============================================================================
// ARCHITECTURE FLOW DIAGRAM
// ============================================================================

interface FlowNodeProps {
  title: string
  description?: string
  icon: React.ReactNode
  status: ImplementationStatus
  delay?: number
}

function FlowNode({ title, description, icon, status, delay = 0 }: FlowNodeProps) {
  const statusColors = {
    complete: 'border-emerald-500/40 bg-emerald-500/10',
    partial: 'border-amber-500/40 bg-amber-500/10',
    planned: 'border-blue-500/40 bg-blue-500/10',
    gap: 'border-red-500/40 bg-red-500/10',
  }
  
  const statusDots = {
    complete: 'bg-emerald-500',
    partial: 'bg-amber-500',
    planned: 'bg-blue-500',
    gap: 'bg-red-500',
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        'relative rounded-xl border p-4 transition-all hover:scale-[1.02]',
        statusColors[status]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-slate-800/50 text-slate-300">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white truncate">{title}</h4>
            <span className={cn('w-2 h-2 rounded-full', statusDots[status])} />
          </div>
          {description && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{description}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function FlowArrow({ direction = 'down' }: { direction?: 'down' | 'right' }) {
  return (
    <div className={cn(
      'flex items-center justify-center',
      direction === 'down' ? 'py-2' : 'px-3'
    )}>
      {direction === 'down' ? (
        <ArrowDown className="h-5 w-5 text-slate-600" />
      ) : (
        <ArrowRight className="h-5 w-5 text-slate-600" />
      )}
    </div>
  )
}

export function ArchitectureFlowDiagram() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Column 1: Ingestion */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
          Data Ingestion
        </div>
        <FlowNode
          title="Workbook Upload"
          description="Excel file processing"
          icon={<FileSpreadsheet className="h-5 w-5" />}
          status="complete"
          delay={0}
        />
        <FlowArrow />
        <FlowNode
          title="Layout PDF"
          description="Drawing extraction"
          icon={<FileImage className="h-5 w-5" />}
          status="partial"
          delay={0.1}
        />
        <FlowArrow />
        <FlowNode
          title="Reference Sheets"
          description="Blue labels, part numbers"
          icon={<Database className="h-5 w-5" />}
          status="complete"
          delay={0.2}
        />
      </div>
      
      {/* Column 2: Processing */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
          Processing
        </div>
        <FlowNode
          title="Sheet Classification"
          description="Operational vs Reference"
          icon={<Layers className="h-5 w-5" />}
          status="complete"
          delay={0.15}
        />
        <FlowArrow />
        <FlowNode
          title="SWS Detection"
          description="Type inference engine"
          icon={<Cpu className="h-5 w-5" />}
          status="complete"
          delay={0.25}
        />
        <FlowArrow />
        <FlowNode
          title="Dependency Graph"
          description="Assignment relationships"
          icon={<GitBranch className="h-5 w-5" />}
          status="complete"
          delay={0.35}
        />
      </div>
      
      {/* Column 3: Output */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
          Output
        </div>
        <FlowNode
          title="Stage Execution"
          description="Build-Up, Wiring, Test"
          icon={<Workflow className="h-5 w-5" />}
          status="partial"
          delay={0.3}
        />
        <FlowArrow />
        <FlowNode
          title="Estimating Engine"
          description="BOM & material calc"
          icon={<Box className="h-5 w-5" />}
          status="gap"
          delay={0.4}
        />
        <FlowArrow />
        <FlowNode
          title="Print / Export"
          description="SWS packets, reports"
          icon={<Printer className="h-5 w-5" />}
          status="partial"
          delay={0.5}
        />
      </div>
    </div>
  )
}

// ============================================================================
// STAGE LIFECYCLE DIAGRAM
// ============================================================================

interface StageNodeProps {
  stage: string
  label: string
  isActive?: boolean
  isGate?: boolean
  gateLabel?: string
}

function StageNode({ stage, label, isActive, isGate, gateLabel }: StageNodeProps) {
  return (
    <div className="relative">
      {isGate && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-medium whitespace-nowrap">
          {gateLabel}
        </div>
      )}
      <div className={cn(
        'px-3 py-2 rounded-lg border text-center text-xs font-medium transition-all',
        isActive 
          ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
          : isGate
          ? 'border-orange-500/30 bg-orange-500/10 text-orange-300'
          : 'border-slate-700/50 bg-slate-800/30 text-slate-300'
      )}>
        {label}
      </div>
    </div>
  )
}

export function StageLifecycleDiagram() {
  const buildUpStages = ['READY_TO_LAY', 'BUILD_UP', 'READY_TO_WIRE']
  const wiringStages = ['WIRING', 'READY_FOR_VISUAL', 'READY_TO_HANG']
  const crossWireStages = ['CROSS_WIRE']
  const testStages = ['READY_TO_TEST', 'TEST_1ST_PASS', 'PWR_CHECK', 'READY_FOR_BIQ', 'FINISHED_BIQ']
  
  const formatStage = (stage: string) => stage.replace(/_/g, ' ')
  
  return (
    <div className="space-y-8">
      {/* Build-Up Flow */}
      <div>
        <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">
          Build-Up Flow
        </div>
        <div className="flex items-center gap-2">
          {buildUpStages.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <StageNode stage={stage} label={formatStage(stage)} />
              {i < buildUpStages.length - 1 && (
                <ArrowRight className="h-4 w-4 text-slate-600" />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Wiring Flow */}
      <div>
        <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
          Wiring Flow
        </div>
        <div className="flex items-center gap-2">
          {wiringStages.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <StageNode stage={stage} label={formatStage(stage)} />
              {i < wiringStages.length - 1 && (
                <ArrowRight className="h-4 w-4 text-slate-600" />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Cross-Wire Gate */}
      <div>
        <div className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-3">
          Cross-Wire Gate
        </div>
        <div className="flex items-center gap-4">
          <StageNode 
            stage="CROSS_WIRE" 
            label="CROSS WIRE" 
            isGate 
            gateLabel="50% panels at READY_TO_HANG"
          />
          <div className="text-xs text-slate-500">
            Unlocks when panel progress threshold met
          </div>
        </div>
      </div>
      
      {/* Test Flow */}
      <div>
        <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
          Test Flow
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {testStages.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2">
              <StageNode 
                stage={stage} 
                label={formatStage(stage)}
                isActive={stage === 'FINISHED_BIQ'}
              />
              {i < testStages.length - 1 && (
                <ArrowRight className="h-4 w-4 text-slate-600" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SWS TYPE CARDS
// ============================================================================

interface SwsTypeCardProps {
  id: string
  label: string
  description: string
  color: string
  examples?: string[]
}

export function SwsTypeCard({ id, label, description, color, examples }: SwsTypeCardProps) {
  const colorClasses: Record<string, string> = {
    slate: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
    cyan: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    indigo: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
    teal: 'border-teal-500/40 bg-teal-500/10 text-teal-300',
    orange: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-4',
        colorClasses[color] || colorClasses.slate
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono bg-slate-800/50 px-2 py-0.5 rounded">{id}</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
      {examples && examples.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {examples.map(ex => (
            <span key={ex} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-500">
              {ex}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export function SwsTypeGrid() {
  const types = [
    { id: 'BLANK', label: 'Basic/Blank', description: 'Prox, Media, Terminal Strip, Marshalling, NTB panels', color: 'slate', examples: ['Prox Panel', 'HMI-S'] },
    { id: 'RAIL', label: 'Rail', description: 'Rail assembly build', color: 'cyan', examples: ['Side Rail', 'EDIO Rail'] },
    { id: 'BOX', label: 'Box', description: 'Box/enclosure build with doors', color: 'amber', examples: ['JB74', 'Console'] },
    { id: 'PANEL', label: 'Panel', description: 'Standard panel with Panel Number + wires', color: 'indigo', examples: ['PNL A', 'Control Panel'] },
    { id: 'COMPONENT', label: 'Component', description: 'Component assembly build', color: 'teal', examples: ['Component Build'] },
    { id: 'UNDECIDED', label: 'Team Lead Decides', description: 'Insufficient data for auto-classification', color: 'orange', examples: [] },
  ]
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {types.map(type => (
        <SwsTypeCard key={type.id} {...type} />
      ))}
    </div>
  )
}

// ============================================================================
// ESTIMATING FLOW DIAGRAM
// ============================================================================

export function EstimatingFlowDiagram() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Inputs */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Inputs
        </div>
        <div className="space-y-2">
          {[
            { label: 'Wire List Rows', status: 'complete' as ImplementationStatus },
            { label: 'Layout Rail Data', status: 'partial' as ImplementationStatus },
            { label: 'Panduct Paths', status: 'partial' as ImplementationStatus },
            { label: 'Device IDs', status: 'complete' as ImplementationStatus },
            { label: 'Part Number Refs', status: 'complete' as ImplementationStatus },
          ].map(item => (
            <div 
              key={item.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700/30"
            >
              {item.status === 'complete' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              {item.status === 'partial' && <Circle className="h-3.5 w-3.5 text-amber-400" />}
              {item.status === 'gap' && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
              <span className="text-sm text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Calculations */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Calculations
        </div>
        <div className="space-y-2">
          {[
            { label: 'Wire Length Est.', status: 'complete' as ImplementationStatus },
            { label: 'Rail Cut List', status: 'partial' as ImplementationStatus },
            { label: 'Panduct Cut List', status: 'partial' as ImplementationStatus },
            { label: 'Hardware Counts', status: 'gap' as ImplementationStatus },
            { label: 'Device Quantities', status: 'gap' as ImplementationStatus },
          ].map(item => (
            <div 
              key={item.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700/30"
            >
              {item.status === 'complete' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              {item.status === 'partial' && <Circle className="h-3.5 w-3.5 text-amber-400" />}
              {item.status === 'gap' && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
              <span className="text-sm text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Outputs */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Outputs
        </div>
        <div className="space-y-2">
          {[
            { label: 'Bill of Materials', status: 'gap' as ImplementationStatus },
            { label: 'Instruction Cards', status: 'gap' as ImplementationStatus },
            { label: 'Material Staging', status: 'gap' as ImplementationStatus },
            { label: 'Labor Estimate', status: 'gap' as ImplementationStatus },
          ].map(item => (
            <div 
              key={item.label}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700/30"
            >
              {item.status === 'complete' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              {item.status === 'partial' && <Circle className="h-3.5 w-3.5 text-amber-400" />}
              {item.status === 'gap' && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
              <span className="text-sm text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// DEPENDENCY GRAPH VISUAL
// ============================================================================

export function DependencyGraphVisual() {
  const nodes = [
    { id: 'PNL-A', label: 'Panel A', stage: 'READY_TO_HANG', x: 0, y: 0 },
    { id: 'PNL-B', label: 'Panel B', stage: 'WIRING', x: 1, y: 0 },
    { id: 'PNL-C', label: 'Panel C', stage: 'BUILD_UP', x: 2, y: 0 },
    { id: 'RAIL-L', label: 'Left Rail', stage: 'READY_TO_WIRE', x: 0, y: 1 },
    { id: 'RAIL-R', label: 'Right Rail', stage: 'BUILD_UP', x: 2, y: 1 },
    { id: 'CROSS', label: 'Cross Wire', stage: 'BLOCKED', x: 1, y: 2 },
  ]
  
  const stageColors: Record<string, string> = {
    'READY_TO_HANG': 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300',
    'WIRING': 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300',
    'BUILD_UP': 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300',
    'READY_TO_WIRE': 'border-blue-500/50 bg-blue-500/20 text-blue-300',
    'BLOCKED': 'border-red-500/50 bg-red-500/20 text-red-300',
  }
  
  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-6 text-xs">
        <span className="text-slate-500">Stage:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-400">Ready to Hang</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-slate-400">Wiring</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-500" />
          <span className="text-slate-400">Build-Up</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-slate-400">Blocked</span>
        </span>
      </div>
      
      {/* Graph */}
      <div className="grid grid-cols-3 gap-4">
        {nodes.slice(0, 3).map(node => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: node.x * 0.1 }}
            className={cn(
              'rounded-xl border p-4 text-center',
              stageColors[node.stage]
            )}
          >
            <div className="text-sm font-semibold">{node.label}</div>
            <div className="text-xs opacity-70 mt-1">{node.stage.replace(/_/g, ' ')}</div>
          </motion.div>
        ))}
      </div>
      
      {/* Connections indicator */}
      <div className="flex justify-center py-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ArrowDown className="h-4 w-4" />
          <span>Dependencies flow to</span>
          <ArrowDown className="h-4 w-4" />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {nodes.slice(3, 5).map((node, i) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className={cn(
              'rounded-xl border p-4 text-center',
              stageColors[node.stage],
              i === 0 && 'col-start-1',
              i === 1 && 'col-start-3'
            )}
          >
            <div className="text-sm font-semibold">{node.label}</div>
            <div className="text-xs opacity-70 mt-1">{node.stage.replace(/_/g, ' ')}</div>
          </motion.div>
        ))}
      </div>
      
      {/* Cross-wire blocked */}
      <div className="flex justify-center py-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ArrowDown className="h-4 w-4" />
          <span>Cross-wire gate</span>
          <ArrowDown className="h-4 w-4" />
        </div>
      </div>
      
      <div className="flex justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className={cn(
            'rounded-xl border p-4 text-center max-w-xs',
            stageColors['BLOCKED']
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-semibold">Cross Wire</span>
          </div>
          <div className="text-xs opacity-70 mt-1">
            Blocked: 33% panels at READY_TO_HANG (need 50%)
          </div>
        </motion.div>
      </div>
    </div>
  )
}
