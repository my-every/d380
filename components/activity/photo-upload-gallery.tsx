'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarIcon, ImagePlus, ChevronLeft, ChevronRight, Search, Tag, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface PhotoGalleryItem {
    id: string
    url: string
    name?: string
    uploadedAt: string
    tags: string[]
}

interface PhotoUploadGalleryProps {
    images: PhotoGalleryItem[]
    onChange: (images: PhotoGalleryItem[]) => void
    className?: string
    maxPreviewCards?: number
    allowUpload?: boolean
}

const MODAL_SPRING = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 28,
    mass: 0.82,
}

function GalleryDateField({
    label,
    value,
    onChange,
}: {
    label: string
    value?: Date
    onChange: (value: Date | undefined) => void
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                        'h-9 w-full justify-start text-left text-xs font-normal',
                        !value && 'text-muted-foreground',
                    )}
                >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {value ? format(value, 'MMM d, yyyy') : label}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={onChange}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}

export function PhotoUploadGallery({
    images,
    onChange,
    className,
    maxPreviewCards = 4,
    allowUpload = true,
}: PhotoUploadGalleryProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [tagInput, setTagInput] = useState('')
    const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
    const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null)

    const availableTags = useMemo(
        () => Array.from(new Set(images.flatMap((img) => img.tags))).sort((a, b) => a.localeCompare(b)),
        [images],
    )

    const filteredImages = useMemo(() => {
        const fromDate = dateFrom ? new Date(dateFrom) : null
        const toDate = dateTo ? new Date(dateTo) : null
        if (fromDate) {
            fromDate.setHours(0, 0, 0, 0)
        }
        if (toDate) {
            toDate.setHours(23, 59, 59, 999)
        }
        const search = searchTerm.trim().toLowerCase()

        return images.filter((img) => {
            const uploadedAt = new Date(img.uploadedAt)
            if (fromDate && uploadedAt < fromDate) return false
            if (toDate && uploadedAt > toDate) return false
            if (activeTagFilter && !img.tags.some((tag) => tag.toLowerCase() === activeTagFilter.toLowerCase())) return false
            if (search) {
                const haystack = [img.name, ...img.tags, format(new Date(img.uploadedAt), 'MMM d yyyy')]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                if (!haystack.includes(search)) return false
            }
            return true
        })
    }, [images, dateFrom, dateTo, searchTerm, activeTagFilter])

    const previewImages = useMemo(() => images.slice(0, maxPreviewCards), [images, maxPreviewCards])
    const overflowCount = Math.max(0, images.length - maxPreviewCards)

    const selectedIndex = useMemo(
        () => filteredImages.findIndex((img) => img.id === selectedId),
        [filteredImages, selectedId],
    )

    const selectedImage = selectedIndex >= 0 ? filteredImages[selectedIndex] : filteredImages[0]

    useEffect(() => {
        if (!isOpen) return

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false)
            }
            if (event.key === 'ArrowLeft') {
                moveSelection('prev')
            }
            if (event.key === 'ArrowRight') {
                moveSelection('next')
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, filteredImages, selectedId])

    const updateImage = (imageId: string, updater: (current: PhotoGalleryItem) => PhotoGalleryItem) => {
        onChange(images.map((img) => (img.id === imageId ? updater(img) : img)))
    }

    const handleOpenModal = (imageId: string) => {
        setSelectedId(imageId)
        setIsOpen(true)
    }

    const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? [])
        if (files.length === 0) return

        const uploaded = files.map((file) => ({
            id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            url: URL.createObjectURL(file),
            name: file.name,
            uploadedAt: new Date().toISOString(),
            tags: [],
        }))

        onChange([...uploaded, ...images])
        event.target.value = ''
    }

    const addTag = () => {
        if (!selectedImage) return
        const nextTag = tagInput.trim()
        if (!nextTag) return

        updateImage(selectedImage.id, (current) => {
            if (current.tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
                return current
            }
            return { ...current, tags: [...current.tags, nextTag] }
        })

        setTagInput('')
    }

    const removeTag = (imageId: string, tagToRemove: string) => {
        updateImage(imageId, (current) => ({
            ...current,
            tags: current.tags.filter((tag) => tag !== tagToRemove),
        }))
    }

    const moveSelection = (direction: 'next' | 'prev') => {
        if (!selectedImage || filteredImages.length <= 1) return
        const current = filteredImages.findIndex((img) => img.id === selectedImage.id)
        const nextIndex =
            direction === 'next'
                ? (current + 1) % filteredImages.length
                : (current - 1 + filteredImages.length) % filteredImages.length
        setSelectedId(filteredImages[nextIndex].id)
    }

    const clearFilters = () => {
        setSearchTerm('')
        setDateFrom(undefined)
        setDateTo(undefined)
        setActiveTagFilter(null)
    }

    return (
        <div className={cn('space-y-2', className)} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium text-muted-foreground">Photos</div>
                {allowUpload && (
                    <>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFilesSelected}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 px-2 text-[11px]"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImagePlus className="h-3.5 w-3.5" />
                            Upload
                        </Button>
                    </>
                )}
            </div>

            {images.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                    No photos uploaded yet.
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {previewImages.map((img, index) => {
                        const isOverflowCard = overflowCount > 0 && index === maxPreviewCards - 1

                        return (
                            <button
                                key={img.id}
                                type="button"
                                onClick={() => handleOpenModal(img.id)}
                                className="group relative overflow-hidden rounded-lg border border-border/70 bg-muted/30"
                            >
                                <img src={img.url} alt={img.name ?? 'Uploaded photo'} className="h-20 w-full object-cover sm:h-24" />
                                {isOverflowCard && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                                        +{overflowCount}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.button
                            type="button"
                            aria-label="Close photo gallery"
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsOpen(false)}
                        />

                        <div className="fixed inset-0 z-50 p-2 sm:p-4">
                            <div className="pointer-events-none flex h-full items-center justify-center">
                                <motion.div
                                    className="pointer-events-auto flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl"
                                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 18, scale: 0.97 }}
                                    transition={MODAL_SPRING}
                                >
                                    <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
                                        <div>
                                            <div className="text-sm font-semibold sm:text-base">Photo Gallery</div>
                                            <div className="text-xs text-muted-foreground">
                                                {filteredImages.length} of {images.length} image{images.length === 1 ? '' : 's'} visible
                                            </div>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                                        <div className="flex w-full min-h-0 flex-col border-b bg-muted/15 p-3 lg:w-[24rem] lg:border-b-0 lg:border-r lg:p-4">
                                            <div className="space-y-3">
                                                <div className="relative">
                                                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        placeholder="Search by name or tag"
                                                        className="h-9 pl-9 text-sm"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    <GalleryDateField label="From date" value={dateFrom} onChange={setDateFrom} />
                                                    <GalleryDateField label="To date" value={dateTo} onChange={setDateTo} />
                                                </div>

                                                {availableTags.length > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                            Tags
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {availableTags.map((tag) => {
                                                                const isActive = activeTagFilter === tag
                                                                return (
                                                                    <button
                                                                        key={tag}
                                                                        type="button"
                                                                        onClick={() => setActiveTagFilter(isActive ? null : tag)}
                                                                        className={cn(
                                                                            'rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors',
                                                                            isActive
                                                                                ? 'border-primary bg-primary/10 text-primary'
                                                                                : 'border-border bg-background text-muted-foreground hover:border-border/90 hover:text-foreground',
                                                                        )}
                                                                    >
                                                                        {tag}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between gap-2 rounded-2xl border bg-background/80 px-3 py-2">
                                                    <div>
                                                        <div className="text-xs font-medium text-foreground">Gallery Filters</div>
                                                        <div className="text-[11px] text-muted-foreground">Search, tag, or narrow by upload date</div>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={clearFilters}>
                                                        Reset
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                                                <div className="space-y-2">
                                                    {filteredImages.map((img) => (
                                                        <button
                                                            key={img.id}
                                                            type="button"
                                                            onClick={() => setSelectedId(img.id)}
                                                            className={cn(
                                                                'flex w-full items-center gap-3 rounded-2xl border p-2 text-left transition-colors',
                                                                selectedImage?.id === img.id
                                                                    ? 'border-primary bg-primary/5 shadow-sm'
                                                                    : 'border-border/70 bg-background hover:border-border hover:bg-muted/30',
                                                            )}
                                                        >
                                                            <img src={img.url} alt={img.name ?? 'Gallery photo'} className="h-16 w-16 rounded-xl object-cover" />
                                                            <div className="min-w-0 flex-1 space-y-1">
                                                                <div className="truncate text-sm font-medium text-foreground">
                                                                    {img.name ?? 'Untitled photo'}
                                                                </div>
                                                                <div className="text-[11px] text-muted-foreground">
                                                                    {format(new Date(img.uploadedAt), 'MMM d, yyyy')}
                                                                </div>
                                                                {img.tags.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {img.tags.slice(0, 3).map((tag) => (
                                                                            <Badge key={tag} variant="outline" className="text-[10px]">
                                                                                {tag}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}

                                                    {filteredImages.length === 0 && (
                                                        <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-4 text-center text-sm text-muted-foreground">
                                                            No images match the current search and filters.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
                                            {selectedImage ? (
                                                <>
                                                    <div className="mb-3 flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="truncate text-base font-semibold text-foreground">
                                                                {selectedImage.name ?? 'Untitled photo'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Uploaded {format(new Date(selectedImage.uploadedAt), 'MMM d, yyyy h:mm a')}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => moveSelection('prev')}>
                                                                <ChevronLeft className="h-4 w-4" />
                                                            </Button>
                                                            <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => moveSelection('next')}>
                                                                <ChevronRight className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border bg-muted/20">
                                                        <AnimatePresence mode="wait">
                                                            <motion.div
                                                                key={selectedImage.id}
                                                                initial={{ opacity: 0, x: 22, scale: 0.985 }}
                                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                                exit={{ opacity: 0, x: -18, scale: 0.985 }}
                                                                transition={MODAL_SPRING}
                                                                className="absolute inset-0"
                                                            >
                                                                <img
                                                                    src={selectedImage.url}
                                                                    alt={selectedImage.name ?? 'Selected photo'}
                                                                    className="h-full w-full object-contain p-3 sm:p-5"
                                                                />
                                                            </motion.div>
                                                        </AnimatePresence>

                                                        <div className="absolute bottom-3 right-3">
                                                            <Badge variant="secondary" className="text-xs">
                                                                {Math.max(1, selectedIndex + 1)} / {Math.max(filteredImages.length, 1)}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
                                                        <div className="space-y-2 rounded-2xl border bg-muted/10 p-3">
                                                            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                                Tags
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    placeholder="Add a tag"
                                                                    value={tagInput}
                                                                    onChange={(e) => setTagInput(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault()
                                                                            addTag()
                                                                        }
                                                                    }}
                                                                    className="h-9 text-sm"
                                                                />
                                                                <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={addTag}>
                                                                    <Tag className="h-3.5 w-3.5" />
                                                                    Add
                                                                </Button>
                                                            </div>

                                                            <div className="flex min-h-8 flex-wrap gap-1.5">
                                                                {selectedImage.tags.length > 0 ? selectedImage.tags.map((tag) => (
                                                                    <Badge key={tag} variant="outline" className="gap-1 text-[10px]">
                                                                        {tag}
                                                                        <button
                                                                            type="button"
                                                                            className="rounded-full p-0.5 hover:bg-muted"
                                                                            onClick={() => removeTag(selectedImage.id, tag)}
                                                                            aria-label={`Remove tag ${tag}`}
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </button>
                                                                    </Badge>
                                                                )) : (
                                                                    <div className="text-xs text-muted-foreground">No tags added yet.</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="rounded-2xl border bg-background p-3">
                                                            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                                                Image Details
                                                            </div>
                                                            <div className="mt-2 space-y-2 text-sm">
                                                                <div>
                                                                    <div className="text-[11px] text-muted-foreground">Filename</div>
                                                                    <div className="truncate font-medium text-foreground">{selectedImage.name ?? 'Untitled photo'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[11px] text-muted-foreground">Uploaded</div>
                                                                    <div className="font-medium text-foreground">{format(new Date(selectedImage.uploadedAt), 'MMM d, yyyy h:mm a')}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[11px] text-muted-foreground">Visible Tags</div>
                                                                    <div className="font-medium text-foreground">{selectedImage.tags.length}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed text-sm text-muted-foreground">
                                                    No images match the selected search and filter criteria.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
