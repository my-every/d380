import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import type { UserRole } from "@/types/d380-user-session";
import type { TrainingModuleV2 } from "@/types/training";
import { resolveShareDirectory } from "@/lib/runtime/share-directory";

async function resolveTrainingBaseDir(): Promise<string> {
    const shareDir = await resolveShareDirectory();
    return path.join(shareDir, "training");
}

const ALL_ROLES: UserRole[] = [
    "DEVELOPER",
    "MANAGER",
    "SUPERVISOR",
    "TEAM_LEAD",
    "QA",
    "BRANDER",
    "ASSEMBLER",
];

function normalizeRoleArray(value: unknown): UserRole[] {
    if (!Array.isArray(value)) return ALL_ROLES;
    const roles = value.filter((role): role is UserRole => ALL_ROLES.includes(role as UserRole));
    return roles.length > 0 ? roles : ALL_ROLES;
}

function normalizeTraining(training: TrainingModuleV2): TrainingModuleV2 {
    return {
        ...training,
        coverImage: {
            imageUrl: training.coverImage?.imageUrl || "",
            alt: training.coverImage?.alt || "",
            caption: training.coverImage?.caption || "",
        },
        visibility: training.visibility === "restricted" ? "restricted" : "everyone",
        visibleRoles: normalizeRoleArray(training.visibleRoles),
    };
}

function sanitizePathSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, "").trim();
}

async function ensureDir(dir: string) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Get the path to a training module JSON file
 * Structure: Share/training/<category>/<type>/<id>.json
 */
function getTrainingPath(trainingBaseDir: string, training: { id: string; category?: string; type?: string }): string {
    const safeId = `${sanitizePathSegment(training.id)}.json`;
    const safeCategory = training.category ? sanitizePathSegment(training.category) : "";
    const safeType = training.type ? sanitizePathSegment(training.type) : "";

    if (safeCategory && safeType) {
        return `${trainingBaseDir}/${safeCategory}/${safeType}/${safeId}`;
    } else if (safeCategory) {
        return `${trainingBaseDir}/${safeCategory}/${safeId}`;
    }

    return `${trainingBaseDir}/${safeId}`;
}

/**
 * Recursively find a training module by ID
 */
async function findTrainingById(dir: string, id: string): Promise<{ training: TrainingModuleV2; filePath: string } | null> {
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                const result = await findTrainingById(fullPath, id);
                if (result) return result;
            } else if (entry.isFile() && entry.name === `${id}.json`) {
                try {
                    const content = await fs.readFile(fullPath, "utf-8");
                    const training = JSON.parse(content) as TrainingModuleV2;
                    if (training.id === id) {
                        return { training, filePath: fullPath };
                    }
                } catch {
                    // Invalid JSON, skip
                }
            }
        }
    } catch {
        // Directory not found or not readable
    }
    
    return null;
}

/**
 * GET /api/training/[id]
 * Get a specific training module
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const trainingBaseDir = await resolveTrainingBaseDir();
    
    const result = await findTrainingById(trainingBaseDir, id);
    
    if (!result) {
        return NextResponse.json({ error: "Training not found" }, { status: 404 });
    }
    
    return NextResponse.json({ training: normalizeTraining(result.training) });
}

/**
 * PUT /api/training/[id]
 * Update a training module
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const trainingBaseDir = await resolveTrainingBaseDir();
    const body = await request.json() as Partial<TrainingModuleV2>;
    
    const result = await findTrainingById(trainingBaseDir, id);
    
    if (!result) {
        return NextResponse.json({ error: "Training not found" }, { status: 404 });
    }
    
    const updated: TrainingModuleV2 = normalizeTraining({
        ...result.training,
        ...body,
        id,
        version: (result.training.version || 1) + 1,
        updatedAt: new Date().toISOString(),
    });
    
    // Check if category/type changed - need to move file
    const oldPath = result.filePath;
    const newPath = getTrainingPath(trainingBaseDir, updated);
    
    if (oldPath !== newPath) {
        // Delete old file
        try {
            await fs.unlink(oldPath);
        } catch {
            // Old file may not exist
        }
    }
    
    await writeJsonFile(newPath, updated);
    
    return NextResponse.json({ success: true, training: updated });
}

/**
 * DELETE /api/training/[id]
 * Delete a training module
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const trainingBaseDir = await resolveTrainingBaseDir();
    
    const result = await findTrainingById(trainingBaseDir, id);
    
    if (!result) {
        return NextResponse.json({ error: "Training not found" }, { status: 404 });
    }
    
    try {
        await fs.unlink(result.filePath);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to delete training" }, { status: 500 });
    }
}
