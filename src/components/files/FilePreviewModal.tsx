import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Download, X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface FileRecord {
  id: string;
  name: string;
  title: string | null;
  file_url: string;
  mime_type: string | null;
  category: string;
}

interface FilePreviewModalProps {
  file: FileRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const getPreviewType = (mimeType: string | null, fileUrl: string): 'image' | 'video' | 'pdf' | 'other' => {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  
  const ext = fileUrl.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image';
  if (['mp4', 'webm'].includes(ext || '')) return 'video';
  if (ext === 'pdf') return 'pdf';
  
  return 'other';
};

export function FilePreviewModal({
  file,
  open,
  onOpenChange,
  onNavigatePrev,
  onNavigateNext,
  hasPrev = false,
  hasNext = false,
}: FilePreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!file) return null;

  const previewType = getPreviewType(file.mime_type, file.file_url);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(file.file_url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(file.file_url, '_blank', 'noopener,noreferrer');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && hasPrev) {
      onNavigatePrev?.();
    } else if (e.key === 'ArrowRight' && hasNext) {
      onNavigateNext?.();
    }
  };

  const showNavigation = hasPrev || hasNext;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] p-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Close and Download buttons */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <Button
            size="lg"
            onClick={handleDownload}
            className="shadow-lg"
            disabled={isDownloading}
          >
            <Download className="h-5 w-5 mr-2" />
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="shadow-lg h-10 w-10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation pill */}
        {showNavigation && (
          <div className="absolute bottom-6 right-6 z-50">
            <div className="flex items-center bg-secondary/95 backdrop-blur-sm rounded-full shadow-lg border border-border/50">
              <Button
                variant="ghost"
                size="icon"
                onClick={onNavigatePrev}
                disabled={!hasPrev}
                className="h-10 w-10 rounded-l-full rounded-r-none hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="w-px h-6 bg-border" />
              <Button
                variant="ghost"
                size="icon"
                onClick={onNavigateNext}
                disabled={!hasNext}
                className="h-10 w-10 rounded-r-full rounded-l-none hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* File title bar */}
        <div className="bg-muted/50 px-6 py-4 border-b">
          <h3 className="font-semibold truncate pr-32">{file.title || file.name}</h3>
          <p className="text-sm text-muted-foreground">{file.name}</p>
        </div>

        {/* Preview content */}
        <div className="flex items-center justify-center min-h-[400px] max-h-[70vh] overflow-auto bg-muted/20 p-4">
          {previewType === 'image' && (
            <img 
              src={file.file_url} 
              alt={file.title || file.name}
              className="max-w-full max-h-[65vh] object-contain rounded"
            />
          )}
          {previewType === 'video' && (
            <video 
              src={file.file_url} 
              controls 
              className="max-w-full max-h-[65vh] rounded"
              key={file.id} // Force remount when file changes
            >
              Your browser does not support the video tag.
            </video>
          )}
          {previewType === 'pdf' && (
            <object 
              data={file.file_url}
              type="application/pdf"
              className="w-full h-[65vh] rounded border"
            >
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">PDF preview not available in your browser</p>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </object>
          )}
          {previewType === 'other' && (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
