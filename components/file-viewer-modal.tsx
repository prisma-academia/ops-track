"use client";

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileIcon, ExternalLink } from "lucide-react";

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName?: string;
}

export function FileViewerModal({
  isOpen,
  onClose,
  fileUrl,
  fileName = "Document",
}: FileViewerModalProps) {
  const fileType = useMemo(() => {
    if (!fileUrl) return "unknown";
    const lowerUrl = fileUrl.toLowerCase();
    if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/)) {
      return "image";
    }
    if (lowerUrl.match(/\.(pdf)(\?.*)?$/)) {
      return "pdf";
    }
    if (lowerUrl.match(/\.(doc|docx|xls|xlsx|ppt|pptx)(\?.*)?$/)) {
      return "office";
    }
    return "unknown";
  }, [fileUrl]);

  const renderContent = () => {
    if (!fileUrl) return <div className="p-8 text-center text-muted-foreground">No file provided</div>;

    switch (fileType) {
      case "image":
        return (
          <div className="flex items-center justify-center p-4 bg-muted/20 min-h-[50vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-[75vh] object-contain rounded-md"
            />
          </div>
        );
      case "pdf":
        return (
          <div className="w-full h-[75vh] bg-muted/20 rounded-md overflow-hidden">
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title={fileName}
            />
          </div>
        );
      case "office":
        // Use Google Docs Viewer for Office files
        const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
        return (
          <div className="w-full h-[75vh] bg-muted/20 rounded-md overflow-hidden">
            <iframe
              src={googleDocsUrl}
              className="w-full h-full border-0"
              title={fileName}
            />
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 min-h-[40vh] rounded-md">
            <FileIcon className="size-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-semibold text-lg">Unable to preview file</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              This file type cannot be previewed directly in the browser. You can download or open it externally.
            </p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center gap-2 text-sm font-medium text-primary hover:underline bg-primary/10 px-4 py-2 rounded-full"
            >
              Open Externally <ExternalLink className="size-4" />
            </a>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-card shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-semibold truncate pr-4">{fileName}</DialogTitle>
          {fileUrl && (
             <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors mr-6"
              title="Open in new tab"
             >
               <ExternalLink className="size-3.5" />
               <span className="hidden sm:inline">Open in new tab</span>
             </a>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4 bg-background/50">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
