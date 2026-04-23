'use client'

/**
 * Build Up Execution Page
 * 
 * Interactive execution page for BUILD_UP stage:
 * - Session header with assignment info
 * - Section stepper/accordion
 * - Step checklist with completion tracking
 * - Shift and member tracking
 * - Progress indicators
 */

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, 
  Play, 
  CheckCircle2, 
  Circle, 
  Loader2, 
  User,
  Clock,
  AlertCircle,
  Pause,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useProjectContext } from '@/contexts/project-context'
import { useBuildUpExecution } from '@/hooks/use-build-up-execution'
import { BuildUpSectionAccordion } from '@/components/build-up/build-up-section-accordion'
import { ShiftBadgeModal } from '@/components/build-up/shift-badge-modal'
import { BuildUpSessionHeader } from '@/components/build-up/build-up-session-header'
import { BuildUpExportButton } from '@/components/build-up/build-up-export-button'
import { BuildUpPrintView } from '@/components/build-up/build-up-print-view'
import type { WorkShift } from '@/types/d380-build-up-execution'

export default function BuildUpExecutionPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.projectId as string
  const assignmentSlug = params.assignmentSlug as string
  
  // Print mode detection
  const isPrintMode = searchParams.get('print') === 'true'
  const printRef = useRef<HTMLDivElement>(null)
  
  // Auto-trigger print dialog when in print mode
  useEffect(() => {
    if (isPrintMode) {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isPrintMode])
  
  const { currentProject, assignmentMappings } = useProjectContext()
  
  // Build Up execution state
  const {
    session,
    isLoading,
    error,
    progress,
    startSession,
    resumeExistingSession,
    startSectionExecution,
    toggleStep,
    switchActiveMember,
    getSection,
    getSectionProgressInfo,
    getActiveMemberForSection,
  } = useBuildUpExecution(projectId, assignmentSlug)
  
  // Modal states
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [pendingSectionId, setPendingSectionId] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<'start' | 'section' | 'switch'>('start')
  
  // Find the assignment
  const assignment = useMemo(() => {
    return assignmentMappings.find(a => a.sheetSlug === assignmentSlug)
  }, [assignmentMappings, assignmentSlug])
  
  // Handle starting a new session
  const handleStartSession = () => {
    setModalMode('start')
    setShowBadgeModal(true)
  }
  
  // Handle starting a section
  const handleStartSection = (sectionId: string) => {
    setPendingSectionId(sectionId)
    setModalMode('section')
    setShowBadgeModal(true)
  }
  
  // Handle switching member
  const handleSwitchMember = (sectionId: string) => {
    setPendingSectionId(sectionId)
    setModalMode('switch')
    setShowBadgeModal(true)
  }
  
  // Handle badge modal submission
  const handleBadgeSubmit = (
    badgeId: string,
    name: string,
    shift: WorkShift
  ) => {
    if (modalMode === 'start' && assignment) {
      startSession(assignment.selectedSwsType, { badgeId, name })
    } else if (modalMode === 'section' && pendingSectionId) {
      startSectionExecution(pendingSectionId, { badgeId, name, shift })
    } else if (modalMode === 'switch' && pendingSectionId) {
      switchActiveMember(pendingSectionId, { badgeId, name, shift })
    }
    
    setShowBadgeModal(false)
    setPendingSectionId(null)
  }
  
  // Handle step toggle
  const handleStepToggle = (sectionId: string, stepId: string) => {
    // Get current active member for the section
    const section = getSection(sectionId)
    if (!section) return
    
    const activeMember = getActiveMemberForSection(section)
    if (!activeMember) {
      // Need to start section first
      handleStartSection(sectionId)
      return
    }
    
    toggleStep(sectionId, stepId, {
      badgeId: activeMember.badgeId,
      name: activeMember.name,
    })
  }
  
  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </main>
    )
  }
  
  // Project/assignment not found
  if (!currentProject || !assignment) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Not Found</h2>
          <p className="text-muted-foreground mb-4">Assignment could not be found</p>
          <Link href="/projects">
            <Button>Back to Projects</Button>
          </Link>
        </div>
      </main>
    )
  }
  
  const backUrl = `/projects/${projectId}/assignments/${assignmentSlug}`
  
  // Print mode: render the printable worksheet
  if (isPrintMode) {
    return (
      <div ref={printRef} className="print:block">
        <BuildUpPrintView
          assignmentName={assignment.sheetName}
          swsType={assignment.selectedSwsType}
          projectName={currentProject.name}
          pdNumber={currentProject.pdNumber}
          session={session}
          mode={session ? 'with_execution' : 'blank'}
        />
      </div>
    )
  }
  
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href={backUrl}>
              <Button variant="ghost" size="icon" className="shrink-0">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">
                Build Up: {assignment.sheetName}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {assignment.selectedSwsType}
                </Badge>
                {session && (
                  <>
                    <span>-</span>
                    <span>{progress.percentage}% complete</span>
                  </>
                )}
              </div>
            </div>
            {/* Print Button */}
            <BuildUpExportButton
              assignmentName={assignment.sheetName}
              swsType={assignment.selectedSwsType}
              projectName={currentProject.name}
              session={session}
            />
          </div>
        </div>
      </div>
      
      <div className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* No session - Start or Resume */}
        {!session && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4">
                <Play className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Start Build Up Execution</CardTitle>
              <p className="text-muted-foreground">
                Begin the build up process for this assignment
              </p>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button size="lg" onClick={handleStartSession}>
                <Play className="h-4 w-4 mr-2" />
                Start New Session
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Active session */}
        {session && (
          <>
            {/* Session Header */}
            <BuildUpSessionHeader
              session={session}
              progress={progress}
              assignmentName={assignment.sheetName}
              onResume={resumeExistingSession}
            />
            
            {/* Progress Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overall Progress</span>
                    <span className="font-medium">
                      {progress.completedSteps} / {progress.totalSteps} steps
                    </span>
                  </div>
                  <Progress value={progress.percentage} className="h-2" />
                </div>
              </CardContent>
            </Card>
            
            {/* Section Accordion */}
            <div className="space-y-3">
              {session.sections.map((section) => {
                const sectionProgress = getSectionProgressInfo(section)
                const activeMember = getActiveMemberForSection(section)
                
                return (
                  <BuildUpSectionAccordion
                    key={section.id}
                    section={section}
                    isCurrentSection={section.id === session.currentSectionId}
                    progress={sectionProgress}
                    activeMember={activeMember}
                    onStartSection={() => handleStartSection(section.id)}
                    onSwitchMember={() => handleSwitchMember(section.id)}
                    onToggleStep={(stepId) => handleStepToggle(section.id, stepId)}
                  />
                )
              })}
            </div>
            
            {/* Completion Card */}
            {session.status === 'completed' && (
              <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-green-500 p-2">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-700 dark:text-green-300">
                        Build Up Complete
                      </h3>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        All sections have been completed. Ready to progress to the next stage.
                      </p>
                    </div>
                    <Button onClick={() => router.push(backUrl)}>
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
        
        {/* Error display */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Badge/Shift Modal */}
      <ShiftBadgeModal
        open={showBadgeModal}
        onClose={() => {
          setShowBadgeModal(false)
          setPendingSectionId(null)
        }}
        onSubmit={handleBadgeSubmit}
        title={
          modalMode === 'start' 
            ? 'Start Build Up Session'
            : modalMode === 'switch'
            ? 'Switch Member'
            : 'Start Section'
        }
        description={
          modalMode === 'start'
            ? 'Enter your badge to begin the build up process'
            : modalMode === 'switch'
            ? 'Enter the new member badge and shift'
            : 'Enter your badge and shift to work on this section'
        }
        requireShift={modalMode !== 'start'}
      />
    </main>
  )
}
