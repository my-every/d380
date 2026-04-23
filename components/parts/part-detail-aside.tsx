"use client";

import { useState, useEffect } from "react";
import {
    Edit,
    Save,
    X,
    Trash2,
    Package,
    ChevronRight,
    ExternalLink,
    Loader2,
} from "lucide-react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DynamicDetailsForm } from "./dynamic-details-form";
import { InstallationStepsEditor } from "./installation-steps-editor";
import { TrainingStepsViewer } from "./training-steps-viewer";
import { InstallationTemplatePicker, DetailsTemplatePicker } from "./template-picker";
import type {
    PartRecord,
    PartCategory,
    DetailSchema,
} from "@/types/parts-library";
import { PART_CATEGORY_INFO, DEFAULT_PART_TYPES } from "@/types/parts-library";

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface PartDetailAsideProps {
    part: PartRecord;
    onClose: () => void;
    onUpdate?: (part: PartRecord) => void;
    onDelete?: () => void;
    canEdit?: boolean;
}

export function PartDetailAside({
    part: initialPart,
    onClose,
    onUpdate,
    onDelete,
    canEdit = true,
}: PartDetailAsideProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedPart, setEditedPart] = useState<PartRecord>(initialPart);
    const [isSaving, setIsSaving] = useState(false);
    
    // Fetch schema for the part's category/type
    const { data: schemaData } = useSWR<{ schema: DetailSchema }>(
        `/api/parts/${editedPart.category}/${editedPart.type}?schema=true`,
        fetcher
    );
    
    const schema = schemaData?.schema;
    
    // Reset edited part when initial part changes
    useEffect(() => {
        setEditedPart(initialPart);
    }, [initialPart]);
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(
                `/api/parts/${editedPart.category}/${editedPart.type}/${encodeURIComponent(editedPart.partNumber)}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editedPart),
                }
            );
            
            if (res.ok) {
                const { part } = await res.json();
                setIsEditing(false);
                onUpdate?.(part);
            }
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        const res = await fetch(
            `/api/parts/${editedPart.category}/${editedPart.type}/${encodeURIComponent(editedPart.partNumber)}`,
            { method: 'DELETE' }
        );
        
        if (res.ok) {
            onDelete?.();
            onClose();
        }
    };
    
    const handleCancel = () => {
        setEditedPart(initialPart);
        setIsEditing(false);
    };
    
    // Available types for the selected category
    const availableTypes = DEFAULT_PART_TYPES[editedPart.category] ?? [];
    
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{PART_CATEGORY_INFO[editedPart.category]?.label}</span>
                            <ChevronRight className="h-3 w-3" />
                            <span>{editedPart.type.replace(/-/g, ' ')}</span>
                        </div>
                        <h3 className="font-mono text-base font-bold truncate mt-1">
                            {editedPart.partNumber}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {editedPart.description}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="default"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                </Button>
                            </>
                        ) : canEdit ? (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Part?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete part {editedPart.partNumber}.
                                                This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDelete}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </>
                        ) : null}
                    </div>
                </div>
                
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">
                        {PART_CATEGORY_INFO[editedPart.category]?.label}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                        {editedPart.type.replace(/-/g, ' ')}
                    </Badge>
                    {editedPart.manufacturer && (
                        <Badge variant="secondary" className="text-[10px]">
                            {editedPart.manufacturer}
                        </Badge>
                    )}
                </div>
            </div>
            
            <Separator />
            
            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-4">
                    <Tabs defaultValue="basic">
                        <TabsList className="w-full grid grid-cols-3 mb-4">
                            <TabsTrigger value="basic">Basic</TabsTrigger>
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="install">Install</TabsTrigger>
                        </TabsList>
                        
                        {/* Basic Tab */}
                        <TabsContent value="basic" className="space-y-4 mt-0">
                            {isEditing ? (
                                <BasicInfoEdit
                                    part={editedPart}
                                    onChange={setEditedPart}
                                    availableTypes={availableTypes}
                                />
                            ) : (
                                <BasicInfoView part={editedPart} />
                            )}
                        </TabsContent>
                        
                        {/* Details Tab */}
                        <TabsContent value="details" className="mt-0">
                            {schema ? (
                                <div className="space-y-4">
                                    {isEditing && (
                                        <div className="flex justify-end">
                                            <DetailsTemplatePicker
                                                category={editedPart.category}
                                                type={editedPart.type}
                                                currentValues={editedPart.details}
                                                schemaId={schema.id}
                                                onApplyTemplate={(values, templateId) => {
                                                    setEditedPart({
                                                        ...editedPart,
                                                        details: { ...editedPart.details, ...values },
                                                        detailsTemplateId: templateId,
                                                    });
                                                }}
                                            />
                                        </div>
                                    )}
                                    <DynamicDetailsForm
                                        schema={schema}
                                        values={editedPart.details ?? {}}
                                        onChange={(details) => setEditedPart({ ...editedPart, details })}
                                        disabled={!isEditing}
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p className="text-sm">No detail schema defined for this type.</p>
                                    <p className="text-xs mt-1">
                                        Use the &quot;Edit Schema&quot; button to define fields.
                                    </p>
                                </div>
                            )}
                        </TabsContent>
                        
                        {/* Installation Tab - Now uses Training Module */}
                        <TabsContent value="install" className="mt-0">
                            <TrainingStepsViewer partNumber={editedPart.partNumber} />
                        </TabsContent>
                    </Tabs>
                </div>
            </ScrollArea>
        </div>
    );
}

// ============================================================================
// BASIC INFO VIEW
// ============================================================================

function BasicInfoView({ part }: { part: PartRecord }) {
    return (
        <div className="space-y-4">
            {/* Images */}
            {(part.images?.primary?.src || part.images?.icon?.src) && (
                <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
                    <img
                        src={part.images.primary?.src ?? part.images.icon?.src}
                        alt={part.description}
                        className="max-h-32 object-contain"
                    />
                </div>
            )}
            
            {/* Description */}
            <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm mt-1">{part.description}</p>
            </div>
            
            {/* Manufacturer */}
            {part.manufacturer && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs text-muted-foreground">Manufacturer</Label>
                        <p className="text-sm mt-1">{part.manufacturer}</p>
                    </div>
                    {part.manufacturerPartNumber && (
                        <div>
                            <Label className="text-xs text-muted-foreground">MPN</Label>
                            <p className="text-sm font-mono mt-1">{part.manufacturerPartNumber}</p>
                        </div>
                    )}
                </div>
            )}
            
            {/* Alternate Part Numbers */}
            {part.alternatePartNumbers && part.alternatePartNumbers.length > 0 && (
                <div>
                    <Label className="text-xs text-muted-foreground">Alternate Part Numbers</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {part.alternatePartNumbers.map((pn) => (
                            <Badge key={pn} variant="outline" className="font-mono text-[10px]">
                                {pn}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Associated Parts */}
            {part.associatedParts && part.associatedParts.length > 0 && (
                <div>
                    <Label className="text-xs text-muted-foreground">Associated Parts</Label>
                    <div className="space-y-1.5 mt-1.5">
                        {part.associatedParts.map((ap, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-2 rounded bg-muted/30"
                            >
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-mono text-sm">{ap.partNumber}</span>
                                </div>
                                <Badge variant="outline" className="text-[10px]">
                                    {ap.relationship}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Tags */}
            {part.tags && part.tags.length > 0 && (
                <div>
                    <Label className="text-xs text-muted-foreground">Tags</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {part.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Metadata */}
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                    <span>Source:</span>
                    <span className="ml-1 font-medium">{part.source}</span>
                </div>
                <div>
                    <span>Updated:</span>
                    <span className="ml-1 font-medium">
                        {new Date(part.updatedAt).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// BASIC INFO EDIT
// ============================================================================

function BasicInfoEdit({
    part,
    onChange,
    availableTypes,
}: {
    part: PartRecord;
    onChange: (part: PartRecord) => void;
    availableTypes: string[];
}) {
    return (
        <div className="space-y-4">
            {/* Category & Type */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs">Category</Label>
                    <Select
                        value={part.category}
                        onValueChange={(value) =>
                            onChange({
                                ...part,
                                category: value as PartCategory,
                                type: DEFAULT_PART_TYPES[value as PartCategory]?.[0] ?? 'uncategorized',
                            })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(PART_CATEGORY_INFO).map(([key, info]) => (
                                <SelectItem key={key} value={key}>
                                    {info.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Type</Label>
                    <Select
                        value={part.type}
                        onValueChange={(value) => onChange({ ...part, type: value })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {availableTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {type.replace(/-/g, ' ')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            {/* Description */}
            <div className="space-y-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                    value={part.description}
                    onChange={(e) => onChange({ ...part, description: e.target.value })}
                    rows={2}
                />
            </div>
            
            {/* Manufacturer */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs">Manufacturer</Label>
                    <Input
                        value={part.manufacturer ?? ''}
                        onChange={(e) => onChange({ ...part, manufacturer: e.target.value || undefined })}
                        placeholder="e.g., Phoenix Contact"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Manufacturer Part Number</Label>
                    <Input
                        value={part.manufacturerPartNumber ?? ''}
                        onChange={(e) =>
                            onChange({ ...part, manufacturerPartNumber: e.target.value || undefined })
                        }
                        placeholder="MPN"
                    />
                </div>
            </div>
            
            {/* Alternate Part Numbers */}
            <div className="space-y-2">
                <Label className="text-xs">Alternate Part Numbers (comma separated)</Label>
                <Input
                    value={part.alternatePartNumbers?.join(', ') ?? ''}
                    onChange={(e) =>
                        onChange({
                            ...part,
                            alternatePartNumbers: e.target.value
                                .split(',')
                                .map(s => s.trim())
                                .filter(Boolean),
                        })
                    }
                    placeholder="e.g., ALT-001, ALT-002"
                />
            </div>
            
            {/* Tags */}
            <div className="space-y-2">
                <Label className="text-xs">Tags (comma separated)</Label>
                <Input
                    value={part.tags?.join(', ') ?? ''}
                    onChange={(e) =>
                        onChange({
                            ...part,
                            tags: e.target.value
                                .split(',')
                                .map(s => s.trim())
                                .filter(Boolean),
                        })
                    }
                    placeholder="e.g., relay, 24v, din-rail"
                />
            </div>
        </div>
    );
}
