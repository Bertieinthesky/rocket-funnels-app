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

  const hasAnyFlag = flags.some(f => !f.resolved);
  const isOwnUpload = file.uploaded_by === currentUserId;
  const isTeamOrAdmin = userRole === 'team' || userRole === 'admin';

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

  return (
    <Card className="group hover:shadow-md transition-shadow relative">
      <CardContent className="p-4">
        {/* Top Right: Flag indicator + Favorite star */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {/* Flag display */}
          {flagDisplay && (
            <Badge 
              variant={flagDisplay.isFlaggedForMe ? 'destructive' : 'outline'} 
              className={`text-xs gap-1 ${flagDisplay.isFlaggedForMe ? 'cursor-pointer' : ''} ${!flagDisplay.isFlaggedForMe ? 'text-orange-600 border-orange-300' : ''}`}
              onClick={() => flagDisplay.isFlaggedForMe && activeFlag && onResolveFlag?.(activeFlag)}
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
        <div className="mt-2 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
          {file.file_size && ` • ${formatFileSize(file.file_size)}`}
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
          <div className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30">
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
                onClick={() => onResolveFlag?.(activeFlag)}
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
