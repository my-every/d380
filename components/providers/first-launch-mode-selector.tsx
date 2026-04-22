'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Building2, BriefcaseBusiness, Wrench, ArrowLeft, ArrowRight, Sparkles, FolderOpen } from 'lucide-react'

import { useAppRuntime } from '@/components/providers/app-runtime-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { AppLaunchMode } from '@/lib/runtime/app-mode-types'
import type { UserRole } from '@/types/d380-user-session'

type LaunchStepId = 'WELCOME' | 'MODE' | 'DEPARTMENT_SETUP' | 'REVIEW' | 'CONFIRM'

interface LaunchStep {
  id: LaunchStepId
  title: string
  summary: string
}

function getSteps(mode: AppLaunchMode): LaunchStep[] {
  const baseSteps: LaunchStep[] = [
    {
      id: 'WELCOME',
      title: 'Choose your workspace style',
      summary: 'Set how this app should boot and guide your team from the first screen.',
    },
    {
      id: 'MODE',
      title: 'Pick launch mode',
      summary: 'Select one of three operation modes. You can tune this later in settings.',
    },
  ]

  if (mode === 'DEPARTMENT') {
    baseSteps.push({
      id: 'DEPARTMENT_SETUP',
      title: 'Department setup',
      summary: 'Set the Share folder and initialize badge/PIN user files for department startup.',
    })
  }

  baseSteps.push(
    {
      id: 'REVIEW',
      title: 'Review behavior',
      summary: 'Confirm the startup behavior this mode enables.',
    },
    {
      id: 'CONFIRM',
      title: 'Apply and continue',
      summary: 'Save the launch mode and continue into D380.',
    },
  )

  return baseSteps
}

const MODE_OPTIONS: {
  mode: AppLaunchMode
  title: string
  description: string
  notes: string[]
  icon: typeof Building2
}[] = [
  {
    mode: 'DEPARTMENT',
    title: 'Department Mode',
    description: 'Best for production teams running shift handoff and role-based startup each day.',
    notes: [
      'Opens with startup workflow and shift context.',
      'Optimized for team operations and handoff visibility.',
      'Keeps role/session flow front and center.',
    ],
    icon: Building2,
  },
  {
    mode: 'WORKSPACE',
    title: 'Workspace Mode',
    description: 'Best for workspace-level setup where environment and project prep come first.',
    notes: [
      'Prioritizes workspace readiness and project setup.',
      'Ideal for local admin and operations leads.',
      'Supports structured prep before execution.',
    ],
    icon: BriefcaseBusiness,
  },
  {
    mode: 'STANDALONE_TOOL',
    title: 'Standalone Tool',
    description: 'Best for quick utility work where you need direct access without team ceremony.',
    notes: [
      'Fast path into tools and project utilities.',
      'Great for focused one-off operations.',
      'Minimal startup ceremony for rapid tasks.',
    ],
    icon: Wrench,
  },
]

function stepIllustration(step: LaunchStepId, mode: AppLaunchMode) {
  if (step === 'WELCOME') {
    return {
      title: 'Illustration Placeholder 01',
      subtitle: 'Intro scene',
      hint: 'Replace with a welcoming hero illustration.',
      gradient: 'from-cyan-400/25 via-sky-500/10 to-transparent',
    }
  }

  if (step === 'MODE') {
    return {
      title: 'Illustration Placeholder 02',
      subtitle: 'Mode selection scene',
      hint: 'Replace with a visual showing three launch options.',
      gradient: 'from-emerald-400/25 via-teal-500/10 to-transparent',
    }
  }

  if (step === 'DEPARTMENT_SETUP') {
    return {
      title: 'Illustration Placeholder 03',
      subtitle: 'Department credential scaffold scene',
      hint: 'Replace with folder and user-roster setup illustration.',
      gradient: 'from-violet-400/25 via-fuchsia-500/10 to-transparent',
    }
  }

  if (step === 'REVIEW') {
    return {
      title: 'Illustration Placeholder 04',
      subtitle: `${mode.replace(/_/g, ' ')} behavior scene`,
      hint: 'Replace with an illustration previewing this selected mode.',
      gradient: 'from-amber-400/25 via-orange-500/10 to-transparent',
    }
  }

  return {
    title: 'Illustration Placeholder 05',
    subtitle: 'Ready state scene',
    hint: 'Replace with a completion illustration before entering app.',
    gradient: 'from-rose-400/25 via-red-500/10 to-transparent',
  }
}

type DepartmentSetupSource = 'import-existing' | 'create-new'

const DEPARTMENT_ROLES: UserRole[] = [
  'DEVELOPER',
  'MANAGER',
  'SUPERVISOR',
  'TEAM_LEAD',
  'QA',
  'BRANDER',
  'ASSEMBLER',
]

function getDefaultRouteForMode(mode: AppLaunchMode): string {
  if (mode === 'WORKSPACE') {
    return '/projects/upload'
  }

  return '/projects'
}


export function FirstLaunchModeSelector({ allowRevisit = false }: { allowRevisit?: boolean }) {
  const {
    appMode,
    hasCompletedFirstLaunch,
    isAppModeLoading,
    setAppMode,
    isElectron,
    chooseWorkspaceRoot,
    isSelectingWorkspace,
  } = useAppRuntime()
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [selectedMode, setSelectedMode] = useState<AppLaunchMode>(appMode)
  const [isSaving, setIsSaving] = useState(false)
  const [setupSource, setSetupSource] = useState<DepartmentSetupSource>('import-existing')
  const [shareDirectory, setShareDirectory] = useState('')
  const [seedBadge, setSeedBadge] = useState('')
  const [seedLegalName, setSeedLegalName] = useState('')
  const [seedPreferredName, setSeedPreferredName] = useState('')
  const [seedPin, setSeedPin] = useState('')
  const [seedRole, setSeedRole] = useState<UserRole>('DEVELOPER')
  const [seedShift, setSeedShift] = useState<'1' | '2'>('1')
  const [setupError, setSetupError] = useState<string | null>(null)
  const [setupSuccessMessage, setSetupSuccessMessage] = useState<string | null>(null)

  const steps = useMemo(() => getSteps(selectedMode), [selectedMode])
  const step = steps[Math.min(stepIndex, steps.length - 1)]
  const activeMode = useMemo(
    () => MODE_OPTIONS.find(option => option.mode === selectedMode) ?? MODE_OPTIONS[0],
    [selectedMode],
  )
  const illustration = stepIllustration(step.id, selectedMode)

  useEffect(() => {
    setSelectedMode(appMode)
  }, [appMode])

  useEffect(() => {
    if (stepIndex > steps.length - 1) {
      setStepIndex(Math.max(steps.length - 1, 0))
    }
  }, [stepIndex, steps.length])

  useEffect(() => {
    if (hasCompletedFirstLaunch && !allowRevisit) {
      return
    }

    const loadShareDirectory = async () => {
      try {
        const response = await fetch('/api/runtime/share-directory', { cache: 'no-store' })
        if (!response.ok) {
          return
        }

        const payload = await response.json() as { shareDirectory?: string }
        if (payload.shareDirectory) {
          setShareDirectory(payload.shareDirectory)
        }
      } catch {
        // optional context only
      }
    }

    void loadShareDirectory()
  }, [allowRevisit, hasCompletedFirstLaunch])

  if (isAppModeLoading || (hasCompletedFirstLaunch && !allowRevisit)) {
    return null
  }

  const canGoBack = stepIndex > 0

  const isDepartmentSetupValid =
    shareDirectory.trim().length > 0
    && (setupSource === 'import-existing'
      || (/^\d+$/.test(seedBadge) && /^\d{4}$/.test(seedPin) && seedLegalName.trim().length > 1))

  const canGoNext =
    (step.id !== 'MODE' || Boolean(selectedMode))
    && (step.id !== 'DEPARTMENT_SETUP' || isDepartmentSetupValid)

  const nextStep = () => {
    if (!canGoNext) return
    setStepIndex(current => Math.min(current + 1, steps.length - 1))
  }

  const previousStep = () => {
    if (!canGoBack) return
    setStepIndex(current => Math.max(current - 1, 0))
  }

  const browseForFolder = async () => {
    if (!isElectron) {
      return
    }

    const selected = await chooseWorkspaceRoot()
    if (selected) {
      setShareDirectory(selected)
    }
  }

  const runDepartmentSetup = async () => {
    setSetupError(null)
    setSetupSuccessMessage(null)

    const payload = {
      shareDirectory: shareDirectory.trim(),
      source: setupSource,
      seedUser: setupSource === 'create-new'
        ? {
            badge: seedBadge.trim(),
            legalName: seedLegalName.trim(),
            preferredName: seedPreferredName.trim() || undefined,
            role: seedRole,
            shift: seedShift,
            pin: seedPin,
          }
        : undefined,
    }

    const response = await fetch('/api/runtime/department-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Department setup failed' }))
      throw new Error(typeof body.error === 'string' ? body.error : 'Department setup failed')
    }

    const result = await response.json() as {
      usersDiscovered: number
      createdSettings: number
      createdProfiles: number
    }

    setSetupSuccessMessage(
      `Department setup complete: ${result.usersDiscovered} users, ${result.createdSettings} settings files, ${result.createdProfiles} profiles.`,
    )
  }

  const applyMode = async () => {
    setIsSaving(true)
    setSetupError(null)

    try {
      if (selectedMode === 'DEPARTMENT') {
        await runDepartmentSetup()
      }

      await setAppMode(selectedMode)
      router.replace(getDefaultRouteForMode(selectedMode))
      router.refresh()
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'Failed to apply mode setup.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='fixed inset-0 z-100 bg-background/85 backdrop-blur-lg'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(56,189,248,0.2),transparent_40%),radial-gradient(circle_at_90%_15%,rgba(52,211,153,0.2),transparent_40%),radial-gradient(circle_at_60%_100%,rgba(251,191,36,0.14),transparent_35%)]' />
      <div className='relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-8'>
        <Card className='w-full overflow-hidden border-border/60 bg-card/95 shadow-2xl'>
          <CardHeader className='space-y-4 border-b border-border/70 pb-5'>
            <div className='flex items-center justify-between gap-4'>
              <div>
                <p className='text-xs uppercase tracking-[0.3em] text-muted-foreground'>First Launch Setup</p>
                <CardTitle className='mt-2 text-2xl sm:text-3xl'>Launch Configuration Wizard</CardTitle>
                <CardDescription className='mt-2 max-w-2xl text-sm'>
                  A quick guided setup to choose how D380 should start on this machine.
                </CardDescription>
              </div>
              <div className='hidden rounded-full border border-border/70 bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground sm:flex sm:items-center sm:gap-2'>
                <Sparkles className='size-4' />
                Step {stepIndex + 1} of {steps.length}
              </div>
            </div>

            <div className={cn('grid gap-2', steps.length === 5 ? 'grid-cols-5' : 'grid-cols-4')}>
              {steps.map((item, index) => (
                <div key={item.id} className='space-y-1'>
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-colors',
                      index <= stepIndex ? 'bg-primary' : 'bg-muted',
                    )}
                  />
                  <p className='text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-xs'>
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className='grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.25fr_0.75fr] lg:gap-8 lg:p-8'>
            <div>
              <AnimatePresence mode='wait'>
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 18, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -14, scale: 0.985 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 22, mass: 0.85 }}
                  className='space-y-4'
                >
                  <div>
                    <h2 className='text-xl font-semibold text-foreground sm:text-2xl'>{step.title}</h2>
                    <p className='mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base'>{step.summary}</p>
                  </div>

                  {step.id === 'WELCOME' ? (
                    <div className='rounded-2xl border border-border/70 bg-muted/35 p-5'>
                      <p className='text-sm text-foreground/85'>
                        This setup runs once, then saves your preferred launch behavior. You can revisit it later from runtime settings.
                      </p>
                    </div>
                  ) : null}

                  {step.id === 'MODE' ? (
                    <div className='grid gap-3 sm:grid-cols-3'>
                      {MODE_OPTIONS.map(option => {
                        const Icon = option.icon
                        const isSelected = selectedMode === option.mode

                        return (
                          <button
                            key={option.mode}
                            type='button'
                            onClick={() => setSelectedMode(option.mode)}
                            className={cn(
                              'rounded-2xl border p-4 text-left transition-all',
                              isSelected
                                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                                : 'border-border/70 bg-card hover:border-primary/60 hover:bg-muted/40',
                            )}
                          >
                            <Icon className='size-5 text-primary' />
                            <div className='mt-3 font-semibold text-foreground'>{option.title}</div>
                            <p className='mt-1 text-xs text-muted-foreground'>{option.description}</p>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}

                  {step.id === 'DEPARTMENT_SETUP' ? (
                    <div className='grid gap-4'>
                      <div className='rounded-2xl border border-border/70 bg-muted/35 p-4'>
                        <Label htmlFor='department-share-directory'>Share folder path</Label>
                        <div className='mt-2 flex flex-col gap-2 sm:flex-row'>
                          <Input
                            id='department-share-directory'
                            value={shareDirectory}
                            onChange={event => setShareDirectory(event.target.value)}
                            placeholder='/absolute/path/to/Share'
                          />
                          {isElectron ? (
                            <Button
                              type='button'
                              variant='outline'
                              onClick={() => void browseForFolder()}
                              disabled={isSelectingWorkspace}
                            >
                              <FolderOpen className='mr-2 size-4' />
                              {isSelectingWorkspace ? 'Choosing...' : 'Browse'}
                            </Button>
                          ) : null}
                        </div>
                        <p className='mt-2 text-xs text-muted-foreground'>
                          This folder stores users.csv, hashed badge credentials, per-user settings, and profile files.
                        </p>
                      </div>

                      <div className='rounded-2xl border border-border/70 bg-card p-4'>
                        <p className='text-sm font-medium text-foreground'>User roster source</p>
                        <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                          <button
                            type='button'
                            onClick={() => setSetupSource('import-existing')}
                            className={cn(
                              'rounded-xl border p-3 text-left text-sm transition-colors',
                              setupSource === 'import-existing'
                                ? 'border-primary bg-primary/10'
                                : 'border-border/70 hover:border-primary/60',
                            )}
                          >
                            Import existing users.csv
                          </button>
                          <button
                            type='button'
                            onClick={() => setSetupSource('create-new')}
                            className={cn(
                              'rounded-xl border p-3 text-left text-sm transition-colors',
                              setupSource === 'create-new'
                                ? 'border-primary bg-primary/10'
                                : 'border-border/70 hover:border-primary/60',
                            )}
                          >
                            Create new user roster
                          </button>
                        </div>
                      </div>

                      {setupSource === 'create-new' ? (
                        <div className='rounded-2xl border border-border/70 bg-card p-4'>
                          <p className='text-sm font-medium text-foreground'>Initial admin user</p>
                          <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                            <div>
                              <Label htmlFor='seed-badge'>Badge</Label>
                              <Input id='seed-badge' value={seedBadge} onChange={event => setSeedBadge(event.target.value)} placeholder='1001' />
                            </div>
                            <div>
                              <Label htmlFor='seed-pin'>PIN</Label>
                              <Input id='seed-pin' value={seedPin} onChange={event => setSeedPin(event.target.value)} placeholder='0000' maxLength={4} />
                            </div>
                            <div>
                              <Label htmlFor='seed-legal-name'>Legal name</Label>
                              <Input id='seed-legal-name' value={seedLegalName} onChange={event => setSeedLegalName(event.target.value)} placeholder='Alex Rivera' />
                            </div>
                            <div>
                              <Label htmlFor='seed-preferred-name'>Preferred name</Label>
                              <Input id='seed-preferred-name' value={seedPreferredName} onChange={event => setSeedPreferredName(event.target.value)} placeholder='Alex' />
                            </div>
                            <div>
                              <Label htmlFor='seed-role'>Role</Label>
                              <select
                                id='seed-role'
                                value={seedRole}
                                onChange={event => setSeedRole(event.target.value as UserRole)}
                                className='h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm'
                              >
                                {DEPARTMENT_ROLES.map(role => (
                                  <option key={role} value={role}>{role}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label htmlFor='seed-shift'>Shift</Label>
                              <select
                                id='seed-shift'
                                value={seedShift}
                                onChange={event => setSeedShift(event.target.value as '1' | '2')}
                                className='h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm'
                              >
                                <option value='1'>1st shift</option>
                                <option value='2'>2nd shift</option>
                              </select>
                            </div>
                          </div>
                          <p className='mt-2 text-xs text-muted-foreground'>
                            This user becomes the first login for the badge/PIN system and gets department default permissions.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {step.id === 'REVIEW' ? (
                    <div className='rounded-2xl border border-border/70 bg-muted/35 p-5'>
                      <div className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>Selected mode</div>
                      <div className='mt-2 text-lg font-semibold text-foreground'>{activeMode.title}</div>
                      <p className='mt-2 text-sm text-muted-foreground'>{activeMode.description}</p>
                      <ul className='mt-4 grid gap-2 text-sm text-foreground/85'>
                        {activeMode.notes.map(note => (
                          <li key={note}>- {note}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {step.id === 'CONFIRM' ? (
                    <div className='rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5'>
                      <div className='text-sm text-foreground/85'>
                        You are ready to continue with <span className='font-semibold text-foreground'>{activeMode.title}</span>.
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>

            <AnimatePresence mode='wait'>
              <motion.aside
                key={`${step.id}-illustration`}
                initial={{ opacity: 0, x: 20, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -12, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 240, damping: 24, mass: 0.9 }}
                className='rounded-2xl border border-border/70 bg-card'
              >
                <div className={cn('h-36 rounded-t-2xl bg-linear-to-br', illustration.gradient)} />
                <div className='space-y-2 p-4'>
                  <p className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>Dynamic Illustration Slot</p>
                  <h3 className='text-base font-semibold text-foreground'>{illustration.title}</h3>
                  <p className='text-sm text-muted-foreground'>{illustration.subtitle}</p>
                  <div className='rounded-lg border border-dashed border-border/80 bg-muted/35 p-3 text-xs text-muted-foreground'>
                    {illustration.hint}
                  </div>
                </div>
              </motion.aside>
            </AnimatePresence>
          </CardContent>

          <div className='flex items-center justify-between border-t border-border/70 px-4 py-4 sm:px-6 lg:px-8'>
            <Button type='button' variant='ghost' onClick={previousStep} disabled={!canGoBack || isSaving}>
              <ArrowLeft className='mr-2 size-4' />
              Back
            </Button>

            {step.id === 'CONFIRM' ? (
              <Button type='button' onClick={() => void applyMode()} disabled={isSaving}>
                {isSaving ? 'Applying mode...' : 'Apply and enter D380'}
              </Button>
            ) : (
              <Button type='button' onClick={nextStep} disabled={!canGoNext || isSaving}>
                Next
                <ArrowRight className='ml-2 size-4' />
              </Button>
            )}
          </div>

          {setupSuccessMessage ? (
            <div className='border-t border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 sm:px-6 lg:px-8 dark:text-emerald-300'>
              {setupSuccessMessage}
            </div>
          ) : null}

          {setupError ? (
            <div className='border-t border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 sm:px-6 lg:px-8 dark:text-red-300'>
              {setupError}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
