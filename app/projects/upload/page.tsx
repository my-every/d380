"use client";

import Link from "next/link";

import { ProjectUploadFlow } from "@/components/projects/project-upload-flow";
import { Button } from "@/components/ui/button";

export default function UploadProjectPage() {
  return (
    <div className="space-y-4 p-4">
    
      <ProjectUploadFlow mode="create" />
    </div>
  );
}
