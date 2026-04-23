'use client'

import { motion } from 'framer-motion'
import { 
  FileSpreadsheet, 
  FileImage, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  User,
  Shield,
  Zap,
  ArrowRight,
  ArrowDown,
  Layers,
  GitBranch,
  Printer,
  Clock,
  Users,
  Wrench,
  Eye,
  Database,
  Workflow
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// BEFORE/AFTER COMPARISON (Slide 2)
// ============================================================================

export function BeforeAfterComparison() {
  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Before */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-xl border border-red-500/30 bg-red-500/5 p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <span className="text-base font-semibold text-red-400 uppercase tracking-wider">Before</span>
        </div>
        <div className="space-y-4">
          {['Paper SWS', 'Manual tracking', 'Inconsistent order', 'No audit trail'].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-lg text-slate-400">
              <span className="w-2 h-2 rounded-full bg-red-500/50" />
              {item}
            </div>
          ))}
        </div>
      </motion.div>
      
      {/* After */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          <span className="text-base font-semibold text-emerald-400 uppercase tracking-wider">After</span>
        </div>
        <div className="space-y-4">
          {['Digital workflows', 'Badge tracking', 'Enforced sequence', 'Full traceability'].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-lg text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              {item}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================================
// INCONSISTENT WORKFLOW (Slide 3)
// ============================================================================

export function InconsistentWorkflowVisual() {
  const workers = ['Worker A', 'Worker B', 'Worker C']
  const steps = [
    ['Grounds', 'Jumpers', 'Relays', 'Cables'],
    ['Cables', 'Grounds', 'Jumpers', 'Relays'],
    ['Relays', 'Cables', 'Grounds', 'Jumpers'],
  ]
  
  return (
    <div className="space-y-5">
      {workers.map((worker, wi) => (
        <motion.div
          key={worker}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: wi * 0.15 }}
          className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-5"
        >
          <div className="text-sm text-slate-500 mb-3">{worker}</div>
          <div className="flex gap-3">
            {steps[wi].map((step, si) => (
              <div
                key={si}
                className={cn(
                  'flex-1 rounded px-4 py-3 text-sm text-center',
                  'bg-slate-700/50 text-slate-400'
                )}
              >
                {step}
              </div>
            ))}
          </div>
        </motion.div>
      ))}
      <div className="text-center text-base text-red-400 mt-5">
        Different order = inconsistent results
      </div>
    </div>
  )
}

// ============================================================================
// STEPPER WORKFLOW (Slide 4)
// ============================================================================

export function StepperWorkflowVisual() {
  const steps = [
    { label: 'Grounds', status: 'complete' },
    { label: 'Jumpers', status: 'complete' },
    { label: 'Relays', status: 'current' },
    { label: 'Small Wires', status: 'pending' },
    { label: 'Harness', status: 'pending' },
  ]
  
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-8">
      <div className="text-base font-semibold text-slate-400 uppercase tracking-wider mb-8">
        Enforced Sequence
      </div>
      <div className="space-y-4">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              'flex items-center gap-5 rounded-lg px-5 py-4 transition-all',
              step.status === 'complete' && 'bg-emerald-500/10 border border-emerald-500/30',
              step.status === 'current' && 'bg-amber-500/10 border border-amber-500/30',
              step.status === 'pending' && 'bg-slate-800/50 border border-slate-700/50 opacity-50'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-base font-bold',
              step.status === 'complete' && 'bg-emerald-500 text-white',
              step.status === 'current' && 'bg-amber-500 text-slate-900',
              step.status === 'pending' && 'bg-slate-700 text-slate-400'
            )}>
              {step.status === 'complete' ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
            </div>
            <span className={cn(
              'text-lg font-medium',
              step.status === 'complete' && 'text-emerald-400',
              step.status === 'current' && 'text-amber-400',
              step.status === 'pending' && 'text-slate-500'
            )}>
              {step.label}
            </span>
            {step.status === 'current' && (
              <span className="ml-auto text-sm text-amber-500 animate-pulse">In Progress</span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// PIPELINE DIAGRAM (Slide 5)
// ============================================================================

export function PipelineDiagramVisual() {
  return (
    <div className="space-y-5">
      {/* Inputs */}
      <div className="flex gap-4">
        {[
          { icon: FileSpreadsheet, label: 'Wire List' },
          { icon: FileImage, label: 'Layout PDF' },
          { icon: Database, label: 'SWS Rules' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex-1 rounded-lg border border-blue-500/30 bg-blue-500/10 p-5 text-center"
          >
            <item.icon className="h-8 w-8 mx-auto text-blue-400 mb-3" />
            <span className="text-base text-blue-300">{item.label}</span>
          </motion.div>
        ))}
      </div>
      
      <div className="flex justify-center">
        <ArrowDown className="h-7 w-7 text-slate-600" />
      </div>
      
      {/* Processing */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-8"
      >
        <div className="flex items-center justify-center gap-5">
          <Cpu className="h-10 w-10 text-amber-400" />
          <div>
            <div className="text-xl font-semibold text-amber-300">D380 Engine</div>
            <div className="text-base text-amber-400/70">Classify + Order + Generate</div>
          </div>
        </div>
      </motion.div>
      
      <div className="flex justify-center">
        <ArrowDown className="h-7 w-7 text-slate-600" />
      </div>
      
      {/* Outputs */}
      <div className="flex gap-4">
        {[
          { icon: Workflow, label: 'Guided Steps' },
          { icon: Printer, label: 'SWS PDF' },
          { icon: Clock, label: 'Audit Trail' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5 text-center"
          >
            <item.icon className="h-8 w-8 mx-auto text-emerald-400 mb-3" />
            <span className="text-base text-emerald-300">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// WIRING ORDER (Slide 6)
// ============================================================================

export function WiringOrderVisual() {
  const steps = [
    { num: 1, label: 'Grounds', color: 'emerald' },
    { num: 2, label: 'Jumpers', color: 'blue' },
    { num: 3, label: 'Relays / Timers', color: 'purple' },
    { num: 4, label: 'Small Wires', color: 'cyan' },
    { num: 5, label: 'Harness', color: 'amber' },
    { num: 6, label: 'Diodes', color: 'pink' },
    { num: 7, label: 'AC Wiring', color: 'orange' },
    { num: 8, label: 'Cables', color: 'red' },
  ]
  
  const colorClasses: Record<string, string> = {
    emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    blue: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    purple: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    cyan: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    pink: 'border-pink-500/40 bg-pink-500/10 text-pink-400',
    orange: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
    red: 'border-red-500/40 bg-red-500/10 text-red-400',
  }
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08 }}
          className={cn(
            'flex items-center gap-4 rounded-lg border p-4',
            colorClasses[step.color]
          )}
        >
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-base font-bold">
            {step.num}
          </div>
          <span className="text-lg font-medium">{step.label}</span>
        </motion.div>
      ))}
    </div>
  )
}

// ============================================================================
// DEPENDENCY GRAPH (Slide 7)
// ============================================================================

export function DependencyGraphVisual() {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-8">
      <div className="flex items-center gap-4 mb-8">
        <GitBranch className="h-6 w-6 text-amber-400" />
        <span className="text-base font-semibold text-slate-400 uppercase tracking-wider">
          Wire Classification
        </span>
      </div>
      
      <div className="space-y-5">
        {[
          { label: 'Ground Wire', confidence: 98, color: 'emerald' },
          { label: 'Jumper', confidence: 95, color: 'blue' },
          { label: 'Relay Coil', confidence: 92, color: 'purple' },
          { label: 'Signal Wire', confidence: 88, color: 'cyan' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '100%' }}
            transition={{ delay: i * 0.15, duration: 0.4 }}
            className="relative"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-base text-slate-300">{item.label}</span>
              <span className="text-sm text-slate-500">{item.confidence}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.confidence}%` }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                className={cn(
                  'h-full rounded-full',
                  item.color === 'emerald' && 'bg-emerald-500',
                  item.color === 'blue' && 'bg-blue-500',
                  item.color === 'purple' && 'bg-purple-500',
                  item.color === 'cyan' && 'bg-cyan-500'
                )}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// USER FLOW (Slide 8)
// ============================================================================

export function UserFlowVisual() {
  const steps = [
    { icon: Layers, label: 'Select Assignment' },
    { icon: Shield, label: 'Badge + PIN' },
    { icon: Zap, label: 'Start Task' },
    { icon: CheckCircle2, label: 'Follow Steps' },
    { icon: Eye, label: 'Validate' },
    { icon: Printer, label: 'Export SWS' },
  ]
  
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <step.icon className="h-6 w-6 text-amber-400" />
          </div>
          <span className="text-lg text-slate-300 font-medium">{step.label}</span>
          {i < steps.length - 1 && (
            <ArrowRight className="h-5 w-5 text-slate-600 ml-auto" />
          )}
        </motion.div>
      ))}
    </div>
  )
}

// ============================================================================
// BADGE PIN MODAL (Slide 9)
// ============================================================================

export function BadgePinModalVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-slate-700 bg-slate-900 p-8 shadow-2xl max-w-md mx-auto"
    >
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Shield className="h-10 w-10 text-amber-400" />
        </div>
      </div>
      
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-white">Authenticate</h3>
        <p className="text-base text-slate-400">Badge + PIN required</p>
      </div>
      
      <div className="space-y-5">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 flex items-center gap-4">
          <User className="h-5 w-5 text-slate-500" />
          <span className="text-lg text-slate-400">12345</span>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 flex items-center gap-4">
          <Lock className="h-5 w-5 text-slate-500" />
          <span className="text-lg text-slate-400">****</span>
        </div>
        <div className="rounded-lg bg-amber-500 text-slate-900 text-lg font-semibold py-4 text-center">
          Verify
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// ROLE CARDS (Slide 10)
// ============================================================================

export function RoleCardsVisual() {
  const roles = [
    { icon: Wrench, label: 'Assembler', color: 'blue', desc: 'Executes work' },
    { icon: Users, label: 'Lead', color: 'purple', desc: 'Supervises team' },
    { icon: Eye, label: 'QA', color: 'emerald', desc: 'Validates work' },
    { icon: Shield, label: 'Supervisor', color: 'amber', desc: 'Approves completion' },
  ]
  
  const colorClasses: Record<string, string> = {
    blue: 'border-blue-500/30 bg-blue-500/10',
    purple: 'border-purple-500/30 bg-purple-500/10',
    emerald: 'border-emerald-500/30 bg-emerald-500/10',
    amber: 'border-amber-500/30 bg-amber-500/10',
  }
  
  const iconColors: Record<string, string> = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
  }
  
  return (
    <div className="grid grid-cols-2 gap-5">
      {roles.map((role, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={cn('rounded-xl border p-6', colorClasses[role.color])}
        >
          <role.icon className={cn('h-10 w-10 mb-4', iconColors[role.color])} />
          <div className="text-lg font-semibold text-white">{role.label}</div>
          <div className="text-base text-slate-400">{role.desc}</div>
        </motion.div>
      ))}
    </div>
  )
}

// ============================================================================
// ARCHITECTURE LAYERS (Slide 11)
// ============================================================================

export function ArchitectureLayersVisual() {
  const layers = [
    { label: 'UI Layer', desc: 'React + Next.js', color: 'blue' },
    { label: 'Workflow Engine', desc: 'State + Rules', color: 'amber' },
    { label: 'Data Inputs', desc: 'Excel + PDF + Catalog', color: 'purple' },
    { label: 'Storage', desc: 'Local file system', color: 'slate' },
  ]
  
  return (
    <div className="space-y-4">
      {layers.map((layer, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15 }}
          className={cn(
            'rounded-lg border p-5 flex items-center justify-between',
            layer.color === 'blue' && 'border-blue-500/30 bg-blue-500/10',
            layer.color === 'amber' && 'border-amber-500/30 bg-amber-500/10',
            layer.color === 'purple' && 'border-purple-500/30 bg-purple-500/10',
            layer.color === 'slate' && 'border-slate-600/30 bg-slate-800/30'
          )}
        >
          <span className="text-lg font-medium text-white">{layer.label}</span>
          <span className="text-base text-slate-400">{layer.desc}</span>
        </motion.div>
      ))}
    </div>
  )
}

// ============================================================================
// ENFORCEMENT VISUAL (Slide 12)
// ============================================================================

export function EnforcementVisual() {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-8">
      <div className="flex items-center gap-4 mb-8">
        <Lock className="h-8 w-8 text-red-400" />
        <span className="text-xl font-semibold text-red-400">System Prevents</span>
      </div>
      
      <div className="space-y-5">
        {[
          'Skipping required steps',
          'Wrong execution order',
          'Incomplete validation',
          'Missing pull test',
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4 text-lg text-slate-300"
          >
            <AlertTriangle className="h-5 w-5 text-red-400" />
            {item}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// OUTPUT VISUAL (Slide 13)
// ============================================================================

export function OutputVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 flex items-center gap-3">
        <Printer className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-300">SWS Document</span>
      </div>
      
      {/* Preview */}
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center text-xs text-amber-400">
              {i}
            </div>
            <div className="h-2 rounded-full bg-slate-700 flex-1" />
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
        ))}
        
        <div className="border-t border-slate-700 pt-3 mt-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Completed: 3/30/2026</span>
            <span>Badge: 12345</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// METRIC CARDS (Slide 14)
// ============================================================================

export function BusinessValueVisual() {
  const metrics = [
    { label: 'Rework Reduction', value: '40%', color: 'emerald' },
    { label: 'Training Time', value: '-60%', color: 'blue' },
    { label: 'Traceability', value: '100%', color: 'amber' },
    { label: 'QA Coverage', value: '100%', color: 'purple' },
  ]
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((metric, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className={cn(
            'rounded-xl border p-5',
            metric.color === 'emerald' && 'border-emerald-500/30 bg-emerald-500/10',
            metric.color === 'blue' && 'border-blue-500/30 bg-blue-500/10',
            metric.color === 'amber' && 'border-amber-500/30 bg-amber-500/10',
            metric.color === 'purple' && 'border-purple-500/30 bg-purple-500/10'
          )}
        >
          <div className="text-xs text-slate-500 uppercase tracking-wider">{metric.label}</div>
          <div className={cn(
            'text-3xl font-bold mt-1',
            metric.color === 'emerald' && 'text-emerald-400',
            metric.color === 'blue' && 'text-blue-400',
            metric.color === 'amber' && 'text-amber-400',
            metric.color === 'purple' && 'text-purple-400'
          )}>
            {metric.value}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ============================================================================
// CLOSING STATEMENT (Slide 15)
// ============================================================================

export function ClosingStatementVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center"
    >
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/20 mb-6">
        <Zap className="h-10 w-10 text-amber-400" />
      </div>
      
      <h2 className="text-3xl font-bold text-white mb-4">
        Ready for Live Demo
      </h2>
      
      <p className="text-slate-400 text-lg">
        Press Enter to launch the system
      </p>
    </motion.div>
  )
}

// ============================================================================
// PER-BULLET VISUAL COMPONENTS
// ============================================================================

// SLIDE 2 - Problem vs Solution bullet visuals
export function ManualWorkflowVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-red-500/30 bg-red-500/5 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-red-400" />
        <span className="text-sm font-semibold text-red-400 uppercase">Manual Process</span>
      </div>
      <div className="space-y-3">
        <div className="h-10 bg-red-500/10 rounded border-l-4 border-red-500/50 animate-pulse" />
        <div className="h-10 bg-orange-500/10 rounded border-l-4 border-orange-500/50 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="h-10 bg-yellow-500/10 rounded border-l-4 border-yellow-500/50 animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
      <p className="text-xs text-red-400/70 mt-4 text-center">Inconsistent execution</p>
    </motion.div>
  )
}

export function NoOrderVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-orange-400" />
        <span className="text-sm font-semibold text-orange-400 uppercase">No Enforced Order</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {['3', '1', '5', '2', '4'].map((num, i) => (
          <motion.div
            key={i}
            initial={{ rotate: Math.random() * 20 - 10 }}
            animate={{ rotate: Math.random() * 20 - 10 }}
            className="w-12 h-12 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold"
          >
            {num}
          </motion.div>
        ))}
      </div>
      <p className="text-xs text-orange-400/70 mt-4 text-center">Random sequence = errors</p>
    </motion.div>
  )
}

export function NoTraceabilityVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-slate-600/30 bg-slate-800/30 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-5 w-5 text-slate-500 opacity-50" />
        <span className="text-sm font-semibold text-slate-500 uppercase">No Tracking</span>
      </div>
      <div className="space-y-2">
        {['Who?', 'When?', 'What?'].map((q, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-700/30 rounded">
            <span className="text-slate-400">{q}</span>
            <span className="text-red-400">?</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-4 text-center">Limited traceability</p>
    </motion.div>
  )
}

export function WorkflowTransformVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-4"
    >
      <div className="flex-1 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-center">
        <FileSpreadsheet className="h-8 w-8 text-blue-400 mx-auto mb-2" />
        <span className="text-xs text-blue-300">Documents</span>
      </div>
      <ArrowRight className="h-6 w-6 text-amber-400" />
      <div className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
        <Workflow className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
        <span className="text-xs text-emerald-300">Workflows</span>
      </div>
    </motion.div>
  )
}

export function GatedStepperVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Lock className="h-5 w-5 text-amber-400" />
        <span className="text-sm font-semibold text-amber-400 uppercase">Enforced SWS</span>
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((step) => (
          <div key={step} className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg",
            step === 1 ? "bg-emerald-500/20 border border-emerald-500/40" :
            step === 2 ? "bg-amber-500/20 border border-amber-500/40" :
            "bg-slate-700/30 border border-slate-600/40"
          )}>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
              step === 1 ? "bg-emerald-500 text-white" :
              step === 2 ? "bg-amber-500 text-slate-900" :
              "bg-slate-600 text-slate-400"
            )}>
              {step === 1 ? <CheckCircle2 className="h-3 w-3" /> : step}
            </div>
            <span className={cn(
              "text-sm",
              step === 1 ? "text-emerald-400" : step === 2 ? "text-amber-400" : "text-slate-500"
            )}>
              Step {step}
            </span>
            {step === 3 && <Lock className="h-3 w-3 text-slate-600 ml-auto" />}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function TraceabilityBadgeVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-emerald-400" />
        <span className="text-sm font-semibold text-emerald-400 uppercase">Badge + PIN</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-800 rounded-lg">
          <User className="h-4 w-4 text-slate-400" />
          <span className="text-slate-300 font-mono">12345</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-800 rounded-lg">
          <Lock className="h-4 w-4 text-slate-400" />
          <span className="text-slate-300 font-mono">****</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-800 rounded-lg">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-slate-300 font-mono text-xs">2026-03-30 14:32</span>
        </div>
      </div>
    </motion.div>
  )
}

export function StandardizedKanbanVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        <span className="text-sm font-semibold text-emerald-400 uppercase">Standardized</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['Todo', 'In Progress', 'Done'].map((col, ci) => (
          <div key={ci} className="space-y-2">
            <div className="text-xs text-slate-500 text-center">{col}</div>
            {[1, 2].map((card) => (
              <div key={card} className={cn(
                "h-8 rounded border",
                ci === 2 ? "bg-emerald-500/20 border-emerald-500/40" :
                ci === 1 ? "bg-amber-500/20 border-amber-500/40" :
                "bg-slate-700/30 border-slate-600/40"
              )} />
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function ReducedErrorsVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6"
    >
      <div className="text-center">
        <div className="text-4xl font-bold text-emerald-400 mb-2">-40%</div>
        <div className="text-sm text-slate-400">Rework Reduction</div>
        <div className="mt-4 h-3 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '60%' }}
            transition={{ duration: 1, delay: 0.3 }}
            className="h-full bg-emerald-500 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  )
}

export function AccountabilityPanelVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-5 w-5 text-blue-400" />
        <span className="text-sm font-semibold text-blue-400 uppercase">Audit Trail</span>
      </div>
      <div className="space-y-2 text-xs">
        {[
          { action: 'Started', time: '14:32:01', user: 'JSmith' },
          { action: 'Step 1 Complete', time: '14:35:22', user: 'JSmith' },
          { action: 'Validated', time: '14:38:45', user: 'MLead' },
        ].map((log, i) => (
          <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-slate-800/50 rounded">
            <span className="text-slate-400">{log.action}</span>
            <span className="text-slate-500 font-mono">{log.time}</span>
            <span className="text-blue-400">{log.user}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// Wiring order individual step visuals
export function WiringStepVisual({ step, label, color }: { step: number, label: string, color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    blue: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    purple: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    cyan: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    pink: 'border-pink-500/40 bg-pink-500/10 text-pink-400',
    orange: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
    red: 'border-red-500/40 bg-red-500/10 text-red-400',
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("rounded-xl border p-8 text-center", colorClasses[color])}
    >
      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {step}
      </div>
      <div className="text-xl font-semibold">{label}</div>
      <div className="text-xs text-slate-500 mt-2">Current Step</div>
    </motion.div>
  )
}

export function DirectionalRulesVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-6"
    >
      <div className="text-sm font-semibold text-blue-400 uppercase mb-4">Directional Rules</div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded">
          <ArrowRight className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-slate-300">Left to Right</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded">
          <ArrowDown className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-slate-300">Top to Bottom</span>
        </div>
      </div>
    </motion.div>
  )
}

export function ValidationRulesVisual() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6"
    >
      <div className="text-sm font-semibold text-amber-400 uppercase mb-4">Validation Required</div>
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded">
          <Wrench className="h-4 w-4 text-amber-400" />
          <span className="text-sm text-slate-300">Pull Test</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded">
          <Eye className="h-4 w-4 text-amber-400" />
          <span className="text-sm text-slate-300">Visual Inspection</span>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// CORE FLOW PER-BULLET VISUALS
// ============================================================================

export function InputWireListVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
        <FileSpreadsheet className="h-10 w-10 text-blue-400" />
      </div>
      <div className="text-xl font-semibold text-blue-400 mb-2">Wire List</div>
      <div className="text-sm text-slate-400">Excel spreadsheet with wire data</div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="px-2 py-1 bg-slate-800 rounded text-slate-500">Wire No.</div>
        <div className="px-2 py-1 bg-slate-800 rounded text-slate-500">From</div>
        <div className="px-2 py-1 bg-slate-800 rounded text-slate-500">To</div>
      </div>
    </motion.div>
  )
}

export function InputLayoutPdfVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
        <FileImage className="h-10 w-10 text-purple-400" />
      </div>
      <div className="text-xl font-semibold text-purple-400 mb-2">Layout PDF</div>
      <div className="text-sm text-slate-400">Panel layout drawings</div>
      <div className="mt-4 aspect-video bg-slate-800 rounded flex items-center justify-center">
        <div className="w-16 h-12 border-2 border-dashed border-purple-500/40 rounded" />
      </div>
    </motion.div>
  )
}

export function InputSwsRulesVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
        <GitBranch className="h-10 w-10 text-cyan-400" />
      </div>
      <div className="text-xl font-semibold text-cyan-400 mb-2">SWS Rules</div>
      <div className="text-sm text-slate-400">Work sequence definitions</div>
      <div className="mt-4 space-y-2 text-xs text-left">
        <div className="px-3 py-1.5 bg-slate-800 rounded text-slate-400">Grounds first</div>
        <div className="px-3 py-1.5 bg-slate-800 rounded text-slate-400">Left to Right</div>
        <div className="px-3 py-1.5 bg-slate-800 rounded text-slate-400">Pull test required</div>
      </div>
    </motion.div>
  )
}

export function SystemClassifiesVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8"
    >
      <div className="flex items-center gap-3 mb-4">
        <Cpu className="h-6 w-6 text-amber-400" />
        <div className="text-lg font-semibold text-amber-400">Classifies Wire Types</div>
      </div>
      <div className="space-y-2">
        {[
          { type: 'Ground', color: 'emerald' },
          { type: 'Jumper', color: 'blue' },
          { type: 'Relay', color: 'purple' },
          { type: 'Cable', color: 'red' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "px-3 py-2 rounded flex items-center gap-2",
              `bg-${item.color}-500/10 border border-${item.color}-500/30`
            )}
            style={{ 
              backgroundColor: `rgba(var(--color-${item.color}-500), 0.1)`,
              borderColor: `rgba(var(--color-${item.color}-500), 0.3)`
            }}
          >
            <span className={`w-2 h-2 rounded-full bg-${item.color}-400`} 
              style={{ backgroundColor: item.color === 'emerald' ? '#34d399' : item.color === 'blue' ? '#60a5fa' : item.color === 'purple' ? '#a78bfa' : '#f87171' }} 
            />
            <span className="text-sm text-slate-300">{item.type}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export function SystemOrdersVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8"
    >
      <div className="flex items-center gap-3 mb-4">
        <Cpu className="h-6 w-6 text-amber-400" />
        <div className="text-lg font-semibold text-amber-400">Orders Work Sequence</div>
      </div>
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((step, i) => (
          <div key={i} className="flex items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.15 }}
              className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold"
            >
              {step}
            </motion.div>
            {i < 3 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 32 }}
                transition={{ delay: i * 0.15 + 0.1 }}
                className="h-0.5 bg-amber-500/40"
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-slate-500 text-center">
        Sequential execution order
      </div>
    </motion.div>
  )
}

export function SystemGeneratesVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8"
    >
      <div className="flex items-center gap-3 mb-4">
        <Cpu className="h-6 w-6 text-amber-400" />
        <div className="text-lg font-semibold text-amber-400">Generates Steps</div>
      </div>
      <div className="space-y-2">
        {['Connect GND to TB1', 'Install Jumper J1', 'Wire Relay K1'].map((step, i) => (
          <motion.div
            key={i}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 rounded"
          >
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-medium">
              {i + 1}
            </span>
            <span className="text-sm text-slate-300">{step}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export function OutputGuidedVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <Workflow className="h-10 w-10 text-emerald-400" />
      </div>
      <div className="text-xl font-semibold text-emerald-400 mb-2">Guided Workflow</div>
      <div className="text-sm text-slate-400 mb-4">Step-by-step execution</div>
      <div className="flex justify-center gap-2">
        {[1, 2, 3].map((s, i) => (
          <div 
            key={i} 
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              i === 1 ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"
            )}
          >
            {i === 0 ? <CheckCircle2 className="h-4 w-4" /> : s}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function OutputAuditVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <Printer className="h-10 w-10 text-emerald-400" />
      </div>
      <div className="text-xl font-semibold text-emerald-400 mb-2">SWS + Audit Trail</div>
      <div className="text-sm text-slate-400 mb-4">Complete documentation</div>
      <div className="space-y-1.5 text-xs text-left">
        <div className="flex justify-between px-2 py-1 bg-slate-800 rounded">
          <span className="text-slate-500">Step 1</span>
          <span className="text-emerald-400">J. Smith - 14:32</span>
        </div>
        <div className="flex justify-between px-2 py-1 bg-slate-800 rounded">
          <span className="text-slate-500">Step 2</span>
          <span className="text-emerald-400">J. Smith - 14:35</span>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================================
// AUTH & ROLES PER-BULLET VISUALS
// ============================================================================

export function BadgeIdentityVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
        <User className="h-10 w-10 text-blue-400" />
      </div>
      <div className="text-xl font-semibold text-blue-400 mb-2">Badge = Identity</div>
      <div className="text-base text-slate-400 mb-4">Who you are</div>
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 flex items-center justify-center gap-4">
        <User className="h-6 w-6 text-blue-400" />
        <span className="text-2xl font-mono text-white">12345</span>
      </div>
    </motion.div>
  )
}

export function PinVerificationVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
        <Lock className="h-10 w-10 text-amber-400" />
      </div>
      <div className="text-xl font-semibold text-amber-400 mb-2">PIN = Verification</div>
      <div className="text-base text-slate-400 mb-4">Proof it&apos;s you</div>
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 flex items-center justify-center gap-4">
        <Lock className="h-6 w-6 text-amber-400" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((_, i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-amber-400" />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function TimestampSignatureVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <Clock className="h-10 w-10 text-emerald-400" />
      </div>
      <div className="text-xl font-semibold text-emerald-400 mb-2">Timestamp = Signature</div>
      <div className="text-base text-slate-400 mb-4">When you did it</div>
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-center">
        <div className="text-2xl font-mono text-emerald-400">2026-03-30</div>
        <div className="text-lg font-mono text-slate-400">14:32:45</div>
      </div>
    </motion.div>
  )
}

export function AssemblerRoleVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
        <Wrench className="h-10 w-10 text-blue-400" />
      </div>
      <div className="text-xl font-semibold text-blue-400 mb-2">Assembler</div>
      <div className="text-base text-slate-400 mb-4">Executes work</div>
      <div className="space-y-2 text-left">
        {['Follow guided steps', 'Complete validations', 'Record progress'].map((task, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-blue-400" />
            <span className="text-base text-slate-300">{task}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function LeadRoleVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
        <Users className="h-10 w-10 text-purple-400" />
      </div>
      <div className="text-xl font-semibold text-purple-400 mb-2">Lead</div>
      <div className="text-base text-slate-400 mb-4">Supervises team</div>
      <div className="space-y-2 text-left">
        {['Assign work', 'Monitor progress', 'Support team'].map((task, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-purple-400" />
            <span className="text-base text-slate-300">{task}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function QASupervisorRoleVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <Shield className="h-10 w-10 text-emerald-400" />
      </div>
      <div className="text-xl font-semibold text-emerald-400 mb-2">QA / Supervisor</div>
      <div className="text-base text-slate-400 mb-4">Validates + Approves</div>
      <div className="space-y-2 text-left">
        {['Review completed work', 'Validate quality', 'Approve completion'].map((task, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="text-base text-slate-300">{task}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ============================================================================
// ARCHITECTURE PER-BULLET VISUALS
// ============================================================================

export function UILayerVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
        <Layers className="h-10 w-10 text-blue-400" />
      </div>
      <div className="text-xl font-semibold text-blue-400 mb-2">UI Layer</div>
      <div className="text-base text-slate-400 mb-4">React + Next.js</div>
      <div className="grid grid-cols-2 gap-3">
        {['Components', 'Pages', 'Hooks', 'State'].map((item, i) => (
          <div key={i} className="px-4 py-2 bg-slate-800/50 rounded-lg text-base text-slate-300">
            {item}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function WorkflowEngineVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
        <Cpu className="h-10 w-10 text-amber-400" />
      </div>
      <div className="text-xl font-semibold text-amber-400 mb-2">Workflow Engine</div>
      <div className="text-base text-slate-400 mb-4">State + Rules</div>
      <div className="space-y-2">
        {['State Machine', 'Validation Rules', 'Sequence Logic'].map((item, i) => (
          <div key={i} className="px-4 py-2 bg-slate-800/50 rounded-lg text-base text-slate-300">
            {item}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function DataInputsVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
        <FileSpreadsheet className="h-10 w-10 text-purple-400" />
      </div>
      <div className="text-xl font-semibold text-purple-400 mb-2">Data Inputs</div>
      <div className="text-base text-slate-400 mb-4">Excel + PDF + Catalog</div>
      <div className="flex justify-center gap-4">
        <div className="px-4 py-3 bg-slate-800/50 rounded-lg">
          <FileSpreadsheet className="h-8 w-8 text-emerald-400 mx-auto mb-1" />
          <span className="text-sm text-slate-400">Excel</span>
        </div>
        <div className="px-4 py-3 bg-slate-800/50 rounded-lg">
          <FileImage className="h-8 w-8 text-red-400 mx-auto mb-1" />
          <span className="text-sm text-slate-400">PDF</span>
        </div>
      </div>
    </motion.div>
  )
}

export function LocalStorageVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-slate-600/30 bg-slate-800/30 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
        <Database className="h-10 w-10 text-slate-400" />
      </div>
      <div className="text-xl font-semibold text-slate-300 mb-2">Storage</div>
      <div className="text-base text-slate-400 mb-4">Local File System</div>
      <div className="space-y-2">
        {['Project files', 'Wire lists', 'Audit logs'].map((item, i) => (
          <div key={i} className="px-4 py-2 bg-slate-700/50 rounded-lg text-base text-slate-400">
            {item}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ============================================================================
// OUTPUT & VALUE PER-BULLET VISUALS
// ============================================================================

export function SwsPdfOutputVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
        <Printer className="h-10 w-10 text-blue-400" />
      </div>
      <div className="text-xl font-semibold text-blue-400 mb-2">SWS PDF</div>
      <div className="text-base text-slate-400 mb-4">Complete documentation</div>
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 mb-2 last:mb-0">
            <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-sm text-blue-400">
              {i}
            </div>
            <div className="h-2 rounded-full bg-slate-700 flex-1" />
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function AuditTrailOutputVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
        <Eye className="h-10 w-10 text-emerald-400" />
      </div>
      <div className="text-xl font-semibold text-emerald-400 mb-2">Complete Audit Trail</div>
      <div className="text-base text-slate-400 mb-4">Every action tracked</div>
      <div className="space-y-2 text-left">
        {[
          { action: 'Started', time: '14:32:01', user: 'JSmith' },
          { action: 'Completed', time: '14:35:22', user: 'JSmith' },
          { action: 'Validated', time: '14:38:45', user: 'MLead' },
        ].map((log, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded text-sm">
            <span className="text-slate-400">{log.action}</span>
            <span className="text-slate-500 font-mono">{log.time}</span>
            <span className="text-emerald-400">{log.user}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function ProgressTrackingVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
        <Workflow className="h-10 w-10 text-amber-400" />
      </div>
      <div className="text-xl font-semibold text-amber-400 mb-2">Progress Tracking</div>
      <div className="text-base text-slate-400 mb-4">Real-time status</div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Todo', count: 3, color: 'slate' },
          { label: 'In Progress', count: 1, color: 'amber' },
          { label: 'Done', count: 8, color: 'emerald' },
        ].map((col, i) => (
          <div key={i} className="text-center">
            <div className={cn(
              "text-2xl font-bold mb-1",
              col.color === 'slate' && 'text-slate-400',
              col.color === 'amber' && 'text-amber-400',
              col.color === 'emerald' && 'text-emerald-400'
            )}>
              {col.count}
            </div>
            <div className="text-sm text-slate-500">{col.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function LessReworkVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center"
    >
      <div className="text-5xl font-bold text-emerald-400 mb-2">-40%</div>
      <div className="text-xl font-semibold text-emerald-400 mb-2">Less Rework</div>
      <div className="text-base text-slate-400 mb-4">Fewer errors, first time right</div>
      <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '60%' }}
          transition={{ duration: 1, delay: 0.3 }}
          className="h-full bg-emerald-500 rounded-full"
        />
      </div>
      <div className="flex justify-between mt-2 text-sm text-slate-500">
        <span>Before</span>
        <span>After</span>
      </div>
    </motion.div>
  )
}

export function ConsistencyVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-8 text-center"
    >
      <div className="w-20 h-20 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="h-10 w-10 text-blue-400" />
      </div>
      <div className="text-xl font-semibold text-blue-400 mb-2">Consistency</div>
      <div className="text-base text-slate-400 mb-4">Same process, every time</div>
      <div className="flex justify-center gap-2">
        {['A', 'B', 'C'].map((worker, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-medium">
              {worker}
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
                <div key={s} className="w-2 h-2 rounded-full bg-blue-400" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function FasterTrainingVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-8 text-center"
    >
      <div className="text-5xl font-bold text-purple-400 mb-2">-60%</div>
      <div className="text-xl font-semibold text-purple-400 mb-2">Faster Training</div>
      <div className="text-base text-slate-400 mb-4">Guided steps reduce learning curve</div>
      <div className="flex items-end justify-center gap-4">
        <div className="text-center">
          <div className="w-12 h-24 bg-slate-700 rounded-t" />
          <span className="text-sm text-slate-500">Before</span>
        </div>
        <div className="text-center">
          <motion.div
            initial={{ height: 96 }}
            animate={{ height: 40 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="w-12 bg-purple-500 rounded-t"
          />
          <span className="text-sm text-slate-500">After</span>
        </div>
      </div>
    </motion.div>
  )
}

export function FullTraceabilityVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center"
    >
      <div className="text-5xl font-bold text-amber-400 mb-2">100%</div>
      <div className="text-xl font-semibold text-amber-400 mb-2">Full Traceability</div>
      <div className="text-base text-slate-400 mb-4">Know who did what, when</div>
      <div className="space-y-2">
        {['Badge ID', 'Timestamp', 'Action'].map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-amber-400" />
            <span className="text-base text-slate-300">{item}</span>
            <span className="ml-auto text-amber-400">Tracked</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
