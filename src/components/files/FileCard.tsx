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
  ArrowRight,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';

type FileCategory = 'documents' | 'images' | 'testimonials' | 'video' | 'brand' | 'content' | 'designs' | 'copy' | 'other';

interface FileFlag {
  id: string;
  flagged_for: string;
  flag_message: string;
  resolved: boolean;
  flagged_by_role: string;
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
  designs: { icon: Image, label: 'Designs', color: 'text-orange-500' },
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

  // Find active (unresolved) flags for this user
  const activeFlag = flags.find(f => !f.resolved && (
    (userRole === 'client' && f.flagged_for === 'client') ||
    ((userRole === 'team' || userRole === 'admin') && f.flagged_for === 'team')
  ));

  const hasAnyFlag = flags.some(f => !f.resolved);
  const isOwnUpload = file.uploaded_by === currentUserId;

  return (
    <Card className="group hover:shadow-md transition-shadow relative">
      <CardContent className="p-4">
        {/* Status Icons */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {activeFlag && (
            <Badge 
              variant="destructive" 
              className="text-xs gap-1 cursor-pointer"
              onClick={() => onResolveFlag?.(activeFlag)}
            >
              <ArrowRight className="h-3 w-3" />
              You
            </Badge>
          )}
          {hasAnyFlag && !activeFlag && (
            <Badge variant="outline" className="text-xs gap-1">
              <Flag className="h-3 w-3" />
            </Badge>
          )}
          {file.is_pinned_to_dashboard && (
            <Pin className="h-4 w-4 text-primary" />
          )}
          {file.is_favorite && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <h4 className="font-medium truncate">{file.title || file.name}</h4>
            <p className="text-xs text-muted-foreground truncate">{file.name}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {projectName}
          </Badge>
          {file.file_size && (
            <span className="text-xs text-muted-foreground">
              {formatFileSize(file.file_size)}
            </span>
          )}
        </div>

        {/* Active Flag Message */}
        {activeFlag && (
          <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/20">
            <p className="text-xs font-medium text-destructive mb-1">FLAG FOR YOU:</p>
            <p className="text-xs text-muted-foreground line-clamp-2">"{activeFlag.flag_message}"</p>
            <div className="flex gap-2 mt-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 text-xs"
                onClick={() => onResolveFlag?.(activeFlag)}
              >
                <Check className="h-3 w-3 mr-1" />
                Resolve
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
            <DropdownMenuItem asChild>
              <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={onFlag}>
              <Flag className="h-4 w-4 mr-2" />
              Flag for {userRole === 'client' ? 'Team' : 'Team/Client'}
            </DropdownMenuItem>

            {canManage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleFavorite}>
                  <Star className={`h-4 w-4 mr-2 ${file.is_favorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                  {file.is_favorite ? 'Remove Favorite' : 'Add Favorite'}
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
