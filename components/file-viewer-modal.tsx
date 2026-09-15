"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileIcon,
  ExternalLink,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Eye,
  FileText,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PreviewFileType = "image" | "pdf" | "office" | "unknown";

export function detectFileType(
  url: string | null | undefined,
  overrideType?: string
): PreviewFileType {
  if (!url) return "unknown";
  if (overrideType && overrideType !== "auto") {
    if (
      overrideType === "image" ||
      overrideType === "pdf" ||
      overrideType === "office" ||
      overrideType === "unknown"
    ) {
      return overrideType as PreviewFileType;
    }
  }

  const cleanUrl = url.split("?")[0].split("#")[0].toLowerCase();

  if (
    cleanUrl.endsWith(".pdf") ||
    url.includes("application/pdf") ||
    url.startsWith("data:application/pdf") ||
    url.includes("/pdf/")
  ) {
    return "pdf";
  }

  if (
    cleanUrl.match(/\.(jpeg|jpg|png|webp|gif|svg|bmp|ico|avif)$/) ||
    url.startsWith("data:image/") ||
    url.includes("/image/upload/")
  ) {
    return "image";
  }

  if (cleanUrl.match(/\.(doc|docx|xls|xlsx|ppt|pptx|csv)$/)) {
    return "office";
  }

  return "unknown";
}

export interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null | undefined;
  fileName?: string;
  fileType?: "image" | "pdf" | "office" | "unknown" | "auto";
  allowDownload?: boolean;
}

export function FileViewerModal({
  isOpen,
  onClose,
  fileUrl,
  fileName = "Document",
  fileType = "auto",
  allowDownload = true,
}: FileViewerModalProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Reset zoom & rotation when dialog opens or URL changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, fileUrl]);

  const resolvedFileType = useMemo(
    () => detectFileType(fileUrl, fileType),
    [fileUrl, fileType]
  );

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = async () => {
    if (!fileUrl) return;
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: direct window download
      const link = document.createElement("a");
      link.href = fileUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = fileName || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderContent = () => {
    if (!fileUrl) {
      return (
        <div className="flex h-64 items-center justify-center p-8 text-center text-muted-foreground">
          No file provided
        </div>
      );
    }

    switch (resolvedFileType) {
      case "image":
        return (
          <div className="relative flex min-h-[50vh] max-h-[75vh] flex-col items-center justify-center overflow-hidden rounded-md bg-muted/20">
            {/* Image display */}
            <div className="flex size-full items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={fileName}
                className="max-h-[68vh] max-w-full rounded object-contain transition-transform duration-200 ease-out select-none"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              />
            </div>

            {/* Floating Image Toolbar */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/80 bg-background/90 px-3 py-1.5 shadow-lg backdrop-blur-md">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-full"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                title="Zoom Out"
              >
                <ZoomOut className="size-3.5" />
              </Button>
              <span className="min-w-[44px] text-center font-mono text-xs font-semibold">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-full"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                title="Zoom In"
              >
                <ZoomIn className="size-3.5" />
              </Button>
              <div className="mx-1 h-3.5 w-px bg-border" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-full"
                onClick={handleRotate}
                title="Rotate 90°"
              >
                <RotateCw className="size-3.5" />
              </Button>
              {(zoom !== 1 || rotation !== 0) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={handleResetZoom}
                  title="Reset view"
                >
                  <RefreshCw className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        );

      case "pdf":
        return (
          <div className="flex h-[75vh] flex-col rounded-md overflow-hidden bg-muted/20">
            <iframe
              src={fileUrl}
              className="size-full border-0 rounded-md bg-white dark:bg-zinc-900"
              title={fileName}
            />
            <div className="flex items-center justify-between border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground">
              <span>If preview does not load in your browser:</span>
              <div className="flex items-center gap-2">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  Open in New Tab <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </div>
        );

      case "office": {
        const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
          fileUrl
        )}&embedded=true`;
        return (
          <div className="h-[75vh] w-full rounded-md overflow-hidden bg-muted/20">
            <iframe
              src={googleDocsUrl}
              className="size-full border-0"
              title={fileName}
            />
          </div>
        );
      }

      default:
        return (
          <div className="flex min-h-[40vh] flex-col items-center justify-center p-12 text-center bg-muted/20 rounded-md">
            <FileIcon className="size-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-semibold text-lg">Unable to preview file directly</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              This document type cannot be previewed in the browser. You can download it or open it externally.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Button onClick={handleDownload} variant="default" size="sm" className="rounded-full gap-1.5">
                <Download className="size-4" /> Download File
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  Open Externally <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-card shrink-0 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            {resolvedFileType === "pdf" ? (
              <FileText className="size-5 text-primary shrink-0" />
            ) : resolvedFileType === "image" ? (
              <ImageIcon className="size-5 text-primary shrink-0" />
            ) : (
              <FileIcon className="size-5 text-muted-foreground shrink-0" />
            )}
            <DialogTitle className="text-base font-semibold truncate">
              {fileName}
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 shrink-0">
              {resolvedFileType}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 mr-6">
            {allowDownload && fileUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={handleDownload}
                title="Download file"
              >
                <Download className="size-4" />
                <span className="sr-only">Download</span>
              </Button>
            )}

            {fileUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                asChild
                title="Open in new tab"
              >
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                  <span className="sr-only">Open in new tab</span>
                </a>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 bg-background/50">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface FilePreviewTriggerProps {
  fileUrl: string | null | undefined;
  fileName?: string;
  fileType?: "image" | "pdf" | "office" | "unknown" | "auto";
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function FilePreviewTrigger({
  fileUrl,
  fileName = "Document",
  fileType = "auto",
  children,
  className,
  disabled = false,
}: FilePreviewTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!fileUrl || disabled) {
    return <span className={className}>{children}</span>;
  }

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setIsOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className={cn("inline-flex cursor-pointer select-none", className)}
      >
        {children}
      </span>
      <FileViewerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        fileUrl={fileUrl}
        fileName={fileName}
        fileType={fileType}
      />
    </>
  );
}

export interface FilePreviewButtonProps {
  fileUrl: string | null | undefined;
  fileName?: string;
  fileType?: "image" | "pdf" | "office" | "unknown" | "auto";
  label?: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
}

export function FilePreviewButton({
  fileUrl,
  fileName = "Document",
  fileType = "auto",
  label = "View",
  icon,
  variant = "outline",
  size = "sm",
  className,
  disabled = false,
}: FilePreviewButtonProps) {
  const detected = detectFileType(fileUrl, fileType);
  const defaultIcon =
    icon ||
    (detected === "pdf" ? (
      <FileText className="size-3.5" />
    ) : (
      <Eye className="size-3.5" />
    ));

  return (
    <FilePreviewTrigger
      fileUrl={fileUrl}
      fileName={fileName}
      fileType={fileType}
      disabled={disabled || !fileUrl}
    >
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled || !fileUrl}
        className={cn("gap-1.5", className)}
      >
        {defaultIcon}
        {label && <span>{label}</span>}
      </Button>
    </FilePreviewTrigger>
  );
}

export interface FilePreviewThumbnailProps {
  fileUrl: string | null | undefined;
  fileName?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  showHoverOverlay?: boolean;
}

export function FilePreviewThumbnail({
  fileUrl,
  fileName = "Attachment",
  alt,
  className,
  imgClassName,
  showHoverOverlay = true,
}: FilePreviewThumbnailProps) {
  const detected = detectFileType(fileUrl);
  const displayAlt = alt || fileName;

  if (!fileUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border bg-muted text-muted-foreground",
          className
        )}
      >
        <FileIcon className="size-5 opacity-40" />
      </div>
    );
  }

  return (
    <FilePreviewTrigger fileUrl={fileUrl} fileName={fileName}>
      <div
        className={cn(
          "group relative overflow-hidden rounded-lg border bg-muted/30 transition-all hover:ring-2 hover:ring-primary/40",
          className
        )}
      >
        {detected === "pdf" ? (
          <div className="flex size-full flex-col items-center justify-center p-2 text-center">
            <FileText className="size-6 text-primary mb-1" />
            <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
              PDF
            </span>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={fileUrl}
            alt={displayAlt}
            className={cn(
              "size-full object-cover transition-transform duration-200 group-hover:scale-105",
              imgClassName
            )}
          />
        )}
        {showHoverOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Eye className="size-4 text-white" />
          </div>
        )}
      </div>
    </FilePreviewTrigger>
  );
}

export function useFilePreview() {
  const [state, setState] = useState<{
    isOpen: boolean;
    fileUrl: string | null;
    fileName?: string;
    fileType?: "image" | "pdf" | "office" | "unknown" | "auto";
  }>({
    isOpen: false,
    fileUrl: null,
  });

  const openPreview = useCallback(
    (
      url: string,
      name?: string,
      type?: "image" | "pdf" | "office" | "unknown" | "auto"
    ) => {
      setState({ isOpen: true, fileUrl: url, fileName: name, fileType: type });
    },
    []
  );

  const closePreview = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const Modal = useCallback(
    () => (
      <FileViewerModal
        isOpen={state.isOpen}
        onClose={closePreview}
        fileUrl={state.fileUrl}
        fileName={state.fileName}
        fileType={state.fileType}
      />
    ),
    [state, closePreview]
  );

  return {
    openPreview,
    closePreview,
    FilePreviewModal: Modal,
    isPreviewOpen: state.isOpen,
  };
}
