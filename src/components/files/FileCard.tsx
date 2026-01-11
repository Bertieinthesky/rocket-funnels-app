import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FileText,
  Image,
  Video,
  Star,
  MoreVertical,
  Edit,
  Download,
  Trash,
  ExternalLink,
  Flag,
  Pin,
  Check,
  Palette,
  CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type FileCategory = 'documents' | 'images' | 'testimonials' | 'video' | 'brand' | 'content' | 'designs' | 'copy' | 'other';

interface FileFlag {
  id: string;
  flagged_for: string;
  flag_message: string;
  resolved: boolean;
  flagged_by_role: string;
  created_at?: string;
  flagged_by_name?: string;
}

interface FileCardProps {
  file: {
    id: string;
    name: string;
    title: string | null;
    description: string | null;
    file_url: string;
    file_size: number | null;
    mime_type: string | null;
    category: string;
    project_id: string | null;
    video_hosted_link: string | null;
    created_at: string;
    is_pinned_to_dashboard?: boolean;
    is_favorite?: boolean;
    uploaded_by?: string;
    is_external_link?: boolean;
    external_platform?: string;
    is_optimized?: boolean;
    original_file_size?: number | null;
  };
  flags?: FileFlag[];
  projectName: string;
  userRole: 'client' | 'team' | 'admin';
  currentUserId?: string;
  canManage: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onFlag?: () => void;
  onResolveFlag?: (flag: FileFlag) => void;
  onTogglePinned?: () => void;
  onToggleFavorite?: () => void;
  onPreview?: () => void;
}

const categoryConfig: Record<FileCategory, { icon: any; label: string; color: string }> = {
  documents: { icon: FileText, label: 'Documents', color: 'text-blue-500' },
  images: { icon: Image, label: 'Images', color: 'text-green-500' },
  testimonials: { icon: Star, label: 'Testimonials', color: 'text-yellow-500' },
  video: { icon: Video, label: 'Videos', color: 'text-purple-500' },
  brand: { icon: FileText, label: 'Brand', color: 'text-pink-500' },
  content: { icon: FileText, label: 'Content', color: 'text-cyan-500' },
  designs: { icon: Palette, label: 'Designs', color: 'text-orange-500' },
  copy: { icon: FileText, label: 'Copy', color: 'text-indigo-500' },
  other: { icon: FileText, label: 'Other', color: 'text-gray-500' },
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Check if file is previewable (images, videos, PDFs)
const isPreviewable = (mimeType: string | null, fileUrl: string): boolean => {
  if (!mimeType) {
    const ext = fileUrl.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'mp4', 'webm'].includes(ext || '');
  }
  return mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType === 'application/pdf';
};

export function FileCard({
  file,
  flags = [],
  projectName,
  userRole,
  currentUserId,
  canManage,
  onEdit,
  onDelete,
  onFlag,
  onResolveFlag,
  onTogglePinned,
  onToggleFavorite,
  onPreview,
}: FileCardProps) {
  const config = categoryConfig[file.category as FileCategory] || categoryConfig.other;
  const Icon = config.icon;

  // Find active (unresolved) flag for this user
  const activeFlag = flags.find(f => !f.resolved && (
    (userRole === 'client' && f.flagged_for === 'client') ||
    ((userRole === 'team' || userRole === 'admin') && f.flagged_for === 'team')
  ));

  // Check if flagged for others (not the current user's role)
  const flagForOthers = flags.find(f => !f.resolved && (
    (userRole === 'client' && f.flagged_for === 'team') ||
    ((userRole === 'team' || userRole === 'admin') && f.flagged_for === 'client')
  ));

  const isOwnUpload = file.uploaded_by === currentUserId;
  const isTeamOrAdmin = userRole === 'team' || userRole === 'admin';
  const canPreview = !file.is_external_link && isPreviewable(file.mime_type, file.file_url);

  // Get flag display info
  const getFlagDisplay = () => {
    if (activeFlag) {
      return {
        icon: '🚩→You',
        isFlaggedForMe: true,
        message: activeFlag.flag_message,
        author: activeFlag.flagged_by_name,
        time: activeFlag.created_at ? formatDistanceToNow(new Date(activeFlag.created_at), { addSuffix: true }) : '',
      };
    }
    if (flagForOthers) {
      const target = flagForOthers.flagged_for === 'team' ? 'Team' : 'Client';
      return {
        icon: `🚩→${target}`,
        isFlaggedForMe: false,
        message: flagForOthers.flag_message,
        author: flagForOthers.flagged_by_name,
        time: flagForOthers.created_at ? formatDistanceToNow(new Date(flagForOthers.created_at), { addSuffix: true }) : '',
      };
    }
    return null;
  };

  const flagDisplay = getFlagDisplay();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on dropdown, buttons, or flag badges
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menuitem"]') || target.closest('[data-no-click]')) {
      return;
    }

    if (file.is_external_link) {
      // Open external links in new tab
      window.open(file.file_url, '_blank', 'noopener,noreferrer');
    } else if (canPreview && onPreview) {
      // Call the preview handler
      onPreview();
    } else {
      // For non-previewable files, trigger download
      window.open(file.file_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card 
      className="group hover:shadow-md transition-shadow relative cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Top Right: Flag indicator + Favorite star */}
        <div className="absolute top-2 right-2 flex items-center gap-1" data-no-click>
          {/* Flag display */}
          {flagDisplay && (
            <Badge 
              variant={flagDisplay.isFlaggedForMe ? 'destructive' : 'outline'} 
              className={`text-xs gap-1 ${flagDisplay.isFlaggedForMe ? 'cursor-pointer' : ''} ${!flagDisplay.isFlaggedForMe ? 'text-orange-600 border-orange-300' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                flagDisplay.isFlaggedForMe && activeFlag && onResolveFlag?.(activeFlag);
              }}
            >
              {flagDisplay.icon}
            </Badge>
          )}
          {/* Favorite star (team/admin only) */}
          {isTeamOrAdmin && file.is_favorite && (
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
          )}
          {/* Pinned indicator */}
          {file.is_pinned_to_dashboard && (
            <Pin className="h-4 w-4 text-primary" />
          )}
        </div>

        {/* File icon and title */}
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <h4 className="font-medium truncate">{file.title || file.name}</h4>
            <p className="text-xs text-muted-foreground truncate">{file.name}</p>
          </div>
        </div>

        {/* Metadata badges */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {config.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {projectName}
          </Badge>
        </div>

        {/* File info */}
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
          <span>
            {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
            {file.file_size && ` • ${formatFileSize(file.file_size)}`}
          </span>
          {/* Optimized indicator */}
          {file.is_optimized && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium">Optimized</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Image optimized for web
                  {file.original_file_size && file.file_size && file.original_file_size > file.file_size && (
                    <span className="block text-green-500">
                      Saved {Math.round((1 - file.file_size / file.original_file_size) * 100)}% 
                      ({formatFileSize(file.original_file_size)} → {formatFileSize(file.file_size)})
                    </span>
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* External link indicator */}
        {file.is_external_link && file.external_platform && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs gap-1">
              <ExternalLink className="h-3 w-3" />
              {file.external_platform}
            </Badge>
          </div>
        )}

        {/* Active Flag Alert Box - shown if flagged for current user */}
        {flagDisplay && flagDisplay.isFlaggedForMe && activeFlag && (
          <div 
            className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30"
            data-no-click
          >
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">
              Flagged for You
            </p>
            <p className="text-sm text-muted-foreground italic mb-2">
              "{flagDisplay.message}"
            </p>
            {(flagDisplay.author || flagDisplay.time) && (
              <p className="text-xs text-muted-foreground mb-2">
                {flagDisplay.author && `- ${flagDisplay.author}`}{flagDisplay.time && `, ${flagDisplay.time}`}
              </p>
            )}
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolveFlag?.(activeFlag);
                }}
              >
                <Check className="h-3 w-3 mr-1" />
                Resolve Flag
              </Button>
            </div>
          </div>
        )}

        {/* Video Link */}
        {file.category === 'video' && file.video_hosted_link && (
          <a 
            href={file.video_hosted_link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            Watch Video
          </a>
        )}

        {/* Testimonial Quote */}
        {file.category === 'testimonials' && file.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2 italic">
            "{file.description}"
          </p>
        )}

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 absolute bottom-2 right-2 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Download */}
            <DropdownMenuItem asChild>
              <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </DropdownMenuItem>
            
            {/* Flag */}
            <DropdownMenuItem onClick={onFlag}>
              <Flag className="h-4 w-4 mr-2" />
              Flag File
            </DropdownMenuItem>

            {/* Team/Admin actions */}
            {canManage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleFavorite}>
                  <Star className={`h-4 w-4 mr-2 ${file.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  {file.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onTogglePinned}>
                  <Pin className={`h-4 w-4 mr-2 ${file.is_pinned_to_dashboard ? 'text-primary' : ''}`} />
                  {file.is_pinned_to_dashboard ? 'Unpin from Dashboard' : 'Pin to Dashboard'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}

            {/* Client can delete their own uploads */}
            {userRole === 'client' && isOwnUpload && !canManage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}
