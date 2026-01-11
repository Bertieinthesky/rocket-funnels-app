import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCard } from '@/components/files/FileCard';
import { FilePreviewModal } from '@/components/files/FilePreviewModal';
import { FlagModal } from '@/components/files/FlagModal';
import { FlagResolveModal } from '@/components/files/FlagResolveModal';
import {
  Upload,
  FileText,
  Star,
  Flag,
  Loader2,
  FolderOpen,
  X,
  Link as LinkIcon,
  Plus,
} from 'lucide-react';

type FileCategory = 'documents' | 'images' | 'testimonials' | 'video' | 'brand' | 'content' | 'designs' | 'copy' | 'other';

interface FileRecord {
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
}

interface FileFlag {
  id: string;
  file_id: string;
  flagged_by: string;
  flagged_by_role: string;
  flagged_for: string;
  flag_message: string;
  created_at: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_message: string | null;
  resolved_at: string | null;
  flagged_by_name?: string;
  resolved_by_name?: string;
}

interface Project {
  id: string;
  name: string;
}

interface FileManagerTabProps {
  companyId: string;
  projects: Project[];
}

const categories = [
  { value: 'documents', label: 'Documents' },
  { value: 'images', label: 'Images' },
  { value: 'designs', label: 'Design Files' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
];

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function FileManagerTab({ companyId, projects }: FileManagerTabProps) {
  const { user, isClient, isTeam, isAdmin } = useAuth();
  const { canManageFiles, canUploadFiles } = usePermissions();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [flags, setFlags] = useState<FileFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Filters - REMOVED: searchQuery and showMyUploads
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showFlagged, setShowFlagged] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalLink, setExternalLink] = useState('');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'documents' as FileCategory,
    project_id: '',
    description: '',
  });

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    category: 'documents' as FileCategory,
    project_id: '',
    description: '',
    video_hosted_link: '',
  });

  // Flag modal state
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flaggingFile, setFlaggingFile] = useState<FileRecord | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolvingFlag, setResolvingFlag] = useState<{
    id: string;
    flag_message: string;
    flagged_by_role: string;
    flagged_for: string;
    created_at: string;
    resolved: boolean;
    resolved_by?: string;
    resolved_message?: string;
    resolved_at?: string;
    flagged_by_name?: string;
    resolved_by_name?: string;
  } | null>(null);
  const [resolvingFileName, setResolvingFileName] = useState('');

  // Preview modal state
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  const userRole = isAdmin ? 'admin' : isTeam ? 'team' : 'client';

  // Get navigable files (images, videos, testimonials) for preview navigation
  const navigableFiles = files.filter(f => {
    if (f.is_external_link) return false;
    const category = f.category;
    if (category === 'images' || category === 'video' || category === 'testimonials') return true;
    // Also check mime type for images/videos
    const mimeType = f.mime_type;
    if (mimeType?.startsWith('image/') || mimeType?.startsWith('video/')) return true;
    return false;
  });

  const currentPreviewFile = previewFileId ? files.find(f => f.id === previewFileId) : null;
  const currentPreviewIndex = previewFileId ? navigableFiles.findIndex(f => f.id === previewFileId) : -1;
  const hasPrevPreview = currentPreviewIndex > 0;
  const hasNextPreview = currentPreviewIndex >= 0 && currentPreviewIndex < navigableFiles.length - 1;

  const handleNavigatePrev = () => {
    if (hasPrevPreview) {
      setPreviewFileId(navigableFiles[currentPreviewIndex - 1].id);
    }
  };

  const handleNavigateNext = () => {
    if (hasNextPreview) {
      setPreviewFileId(navigableFiles[currentPreviewIndex + 1].id);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchFlags();
  }, [companyId]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlags = async () => {
    try {
      const { data: companyFiles } = await supabase
        .from('files')
        .select('id')
        .eq('company_id', companyId);

      if (!companyFiles?.length) return;

      const fileIds = companyFiles.map(f => f.id);
      
      const { data, error } = await supabase
        .from('file_flags')
        .select('*')
        .in('file_id', fileIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error('Error fetching flags:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 50MB', variant: 'destructive' });
      return;
    }

    setSelectedFile(file);
    setUploadForm(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const detectExternalPlatform = (url: string): string | null => {
    if (url.includes('docs.google.com')) return 'Google Docs';
    if (url.includes('sheets.google.com')) return 'Google Sheets';
    if (url.includes('drive.google.com')) return 'Google Drive';
    if (url.includes('figma.com')) return 'Figma';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('vimeo.com')) return 'Vimeo';
    if (url.includes('loom.com')) return 'Loom';
    if (url.includes('canva.com')) return 'Canva';
    if (url.includes('dropbox.com')) return 'Dropbox';
    return null;
  };

  const handleUpload = async () => {
    const isLinkUpload = uploadMethod === 'link';
    
    if (isLinkUpload && !externalLink) {
      toast({ title: 'Please enter a link', variant: 'destructive' });
      return;
    }
    
    if (!isLinkUpload && !selectedFile) {
      toast({ title: 'Please select a file', variant: 'destructive' });
      return;
    }

    if (!uploadForm.title) {
      toast({ title: 'Please enter a title', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      if (isLinkUpload) {
        // Add external link
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            company_id: companyId,
            name: uploadForm.title,
            title: uploadForm.title,
            description: uploadForm.description || null,
            file_url: externalLink,
            category: uploadForm.category,
            project_id: uploadForm.project_id || null,
            uploaded_by: user?.id,
            is_external_link: true,
            external_platform: detectExternalPlatform(externalLink),
          });

        if (dbError) throw dbError;
      } else {
        // Upload file
        const fileExt = selectedFile!.name.split('.').pop();
        const filePath = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('portal-files')
          .upload(filePath, selectedFile!);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('portal-files')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('files')
          .insert({
            company_id: companyId,
            name: selectedFile!.name,
            title: uploadForm.title,
            description: uploadForm.description || null,
            file_url: urlData.publicUrl,
            file_size: selectedFile!.size,
            mime_type: selectedFile!.type,
            category: uploadForm.category,
            project_id: uploadForm.project_id || null,
            uploaded_by: user?.id,
            is_external_link: false,
          });

        if (dbError) throw dbError;
      }

      toast({ title: isLinkUpload ? 'Link added successfully!' : 'File uploaded successfully!' });
      resetUploadModal();
      fetchFiles();
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const resetUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setExternalLink('');
    setUploadMethod('file');
    setUploadForm({ title: '', category: 'documents', project_id: '', description: '' });
  };

  const handleEdit = (file: FileRecord) => {
    setEditingFile(file);
    setEditForm({
      title: file.title || file.name,
      category: file.category as FileCategory,
      project_id: file.project_id || '',
      description: file.description || '',
      video_hosted_link: file.video_hosted_link || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFile || !editForm.title) return;

    try {
      const { error } = await supabase
        .from('files')
        .update({
          title: editForm.title,
          category: editForm.category,
          project_id: editForm.project_id || null,
          description: editForm.description || null,
          video_hosted_link: editForm.video_hosted_link || null,
        })
        .eq('id', editingFile.id);

      if (error) throw error;

      toast({ title: 'File updated successfully!' });
      setShowEditModal(false);
      setEditingFile(null);
      fetchFiles();
    } catch (error) {
      toast({ title: 'Failed to update file', variant: 'destructive' });
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      setFiles(files.filter(f => f.id !== fileId));
      toast({ title: 'File deleted' });
    } catch (error) {
      toast({ title: 'Failed to delete file', variant: 'destructive' });
    }
  };

  const handleFlagFile = (file: FileRecord) => {
    setFlaggingFile(file);
    setShowFlagModal(true);
  };

  const handleCreateFlag = async (flaggedFor: 'team' | 'client', message: string) => {
    if (!flaggingFile) return;

    try {
      const { error } = await supabase
        .from('file_flags')
        .insert({
          file_id: flaggingFile.id,
          flagged_by: user?.id,
          flagged_by_role: userRole,
          flagged_for: flaggedFor,
          flag_message: message,
        });

      if (error) throw error;

      toast({ title: 'File flagged successfully!' });
      fetchFlags();
    } catch (error) {
      toast({ title: 'Failed to flag file', variant: 'destructive' });
    }
  };

  const handleResolveFlag = async (flagId: string, message: string) => {
    try {
      const { error } = await supabase
        .from('file_flags')
        .update({
          resolved: true,
          resolved_by: user?.id,
          resolved_message: message,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', flagId);

      if (error) throw error;

      toast({ title: 'Flag resolved!' });
      fetchFlags();
    } catch (error) {
      toast({ title: 'Failed to resolve flag', variant: 'destructive' });
    }
  };

  const handleTogglePinned = async (file: FileRecord) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_pinned_to_dashboard: !file.is_pinned_to_dashboard })
        .eq('id', file.id);

      if (error) throw error;

      toast({ 
        title: file.is_pinned_to_dashboard 
          ? 'Unpinned from dashboard' 
          : 'Pinned to client dashboard' 
      });
      fetchFiles();
    } catch (error) {
      toast({ title: 'Failed to update file', variant: 'destructive' });
    }
  };

  const handleToggleFavorite = async (file: FileRecord) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_favorite: !file.is_favorite })
        .eq('id', file.id);

      if (error) throw error;

      toast({ 
        title: file.is_favorite 
          ? 'Removed from favorites' 
          : 'Added to favorites' 
      });
      fetchFiles();
    } catch (error) {
      toast({ title: 'Failed to update file', variant: 'destructive' });
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'Global';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getFileFlagsById = (fileId: string) => {
    return flags.filter(f => f.file_id === fileId);
  };

  const getCategoryCount = (category: string) => {
    return files.filter(f => f.category === category).length;
  };

  // Filter files - REMOVED: searchQuery and myUploads filters
  const filteredFiles = files.filter(f => {
    // Category filter (multi-select: if none selected, show all)
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(f.category);
    
    // Project filter
    const projectMatch = projectFilter === 'all' || 
      (projectFilter === 'global' && !f.project_id) ||
      f.project_id === projectFilter;
    
    // Flagged filter
    const flaggedMatch = !showFlagged || flags.some(flag => 
      flag.file_id === f.id && !flag.resolved
    );

    // Favorites filter
    const favoritesMatch = !showFavorites || f.is_favorite;
    
    return categoryMatch && projectMatch && flaggedMatch && favoritesMatch;
  });

  // Counts
  const flaggedCount = files.filter(f => 
    flags.some(flag => flag.file_id === f.id && !flag.resolved)
  ).length;
  const favoritesCount = files.filter(f => f.is_favorite).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Title Section */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold">All Project Files</h3>
        <p className="text-sm text-muted-foreground">
          All files related to this client, including uploads and team deliverables.
        </p>
      </div>

      {/* ACTION BAR - Muted background, compact, secondary/outline buttons */}
      <div className="bg-muted/50 border-b py-3 px-4 -mx-4 mb-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Flagged Filter */}
          <Button 
            variant={showFlagged ? 'secondary' : 'outline'} 
            size="sm"
            onClick={() => setShowFlagged(!showFlagged)}
            className="h-8 gap-2"
          >
            <Flag className="h-4 w-4" />
            Flagged
            {flaggedCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {flaggedCount}
              </Badge>
            )}
          </Button>

          {/* Favorites Filter (team/admin only) */}
          {(isTeam || isAdmin) && (
            <Button 
              variant={showFavorites ? 'secondary' : 'outline'} 
              size="sm"
              onClick={() => setShowFavorites(!showFavorites)}
              className="h-8 gap-2"
            >
              <Star className="h-4 w-4" />
              Favorites
              {favoritesCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {favoritesCount}
                </Badge>
              )}
            </Button>
          )}

          {/* Project Filter with Label */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Project:</span>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="global">Global Files</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1" />

          {/* Add File Button - Changed from "Upload File" */}
          {canUploadFiles && (
            <Button size="sm" className="h-8" onClick={() => setShowUploadModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add File
            </Button>
          )}
        </div>
      </div>

      {/* CATEGORY PILLS - Prominent, full-width, default button styling */}
      <div className="py-4 px-4 -mx-4 bg-background">
        <div className="flex flex-wrap gap-2">
          {/* All Button */}
          <Button
            variant={selectedCategories.length === 0 ? 'default' : 'outline'}
            size="default"
            onClick={() => setSelectedCategories([])}
            className="h-10"
          >
            All
            <Badge variant="secondary" className="ml-2">
              {files.length}
            </Badge>
          </Button>

          {/* Category Buttons */}
          {categories.map((cat) => {
            const isSelected = selectedCategories.includes(cat.value);
            const count = getCategoryCount(cat.value);

            return (
              <Button
                key={cat.value}
                variant={isSelected ? 'default' : 'outline'}
                size="default"
                onClick={() => toggleCategory(cat.value)}
                className="h-10"
              >
                {cat.label}
                <Badge variant="secondary" className="ml-2">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      {/* File Grid or Empty State */}
      {filteredFiles.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent className="p-0">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">No files yet</h4>
            <p className="text-muted-foreground mb-4">
              {files.length === 0 
                ? 'Add your first file to get started' 
                : 'No files match your current filters'}
            </p>
            {canUploadFiles && files.length === 0 && (
              <Button onClick={() => setShowUploadModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add File
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          {filteredFiles.map(file => (
            <FileCard
              key={file.id}
              file={file}
              flags={getFileFlagsById(file.id)}
              projectName={getProjectName(file.project_id)}
              userRole={userRole}
              currentUserId={user?.id}
              canManage={canManageFiles}
              onEdit={() => handleEdit(file)}
              onDelete={() => handleDelete(file.id)}
              onFlag={() => handleFlagFile(file)}
              onResolveFlag={(flag) => {
                const fullFlag = flags.find(f => f.id === flag.id);
                if (fullFlag) {
                  setResolvingFlag({
                    id: fullFlag.id,
                    flag_message: fullFlag.flag_message,
                    flagged_by_role: fullFlag.flagged_by_role,
                    flagged_for: fullFlag.flagged_for,
                    created_at: fullFlag.created_at,
                    resolved: fullFlag.resolved,
                    resolved_by: fullFlag.resolved_by || undefined,
                    resolved_message: fullFlag.resolved_message || undefined,
                    resolved_at: fullFlag.resolved_at || undefined,
                  });
                  setResolvingFileName(file.title || file.name);
                  setShowResolveModal(true);
                }
              }}
              onTogglePinned={() => handleTogglePinned(file)}
              onToggleFavorite={() => handleToggleFavorite(file)}
              onPreview={() => setPreviewFileId(file.id)}
            />
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Add File Modal - Changed title from "Upload File or Add Link" to "Add New File" */}
      <Dialog open={showUploadModal} onOpenChange={(open) => !open && resetUploadModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New File</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label>Category*</Label>
              <Select 
                value={uploadForm.category} 
                onValueChange={(v) => setUploadForm(prev => ({ ...prev, category: v as FileCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documents">Documents</SelectItem>
                  <SelectItem value="images">Images</SelectItem>
                  <SelectItem value="designs">Design Files</SelectItem>
                  <SelectItem value="testimonials">Testimonials</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Upload Method Tabs - Keep tab labels as "Upload File" and "Add Link" */}
            <Tabs value={uploadMethod} onValueChange={(v) => setUploadMethod(v as 'file' | 'link')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">Upload File</TabsTrigger>
                <TabsTrigger value="link">Add Link</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4 mt-4">
                {!selectedFile ? (
                  <div 
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">Click to select file</p>
                    <p className="text-xs text-muted-foreground">Max 50MB</p>
                    <Button variant="outline" size="sm" className="mt-3">
                      Select File
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="link" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>External Link*</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="https://..."
                      value={externalLink}
                      onChange={(e) => setExternalLink(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste Google Docs, Sheets, Figma, YouTube, or any URL
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Title & Project (shown when file selected or link entered) */}
            {(selectedFile || (uploadMethod === 'link' && externalLink)) && (
              <>
                <div className="space-y-2">
                  <Label>Title*</Label>
                  <Input 
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter file title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select 
                    value={uploadForm.project_id || '__global__'} 
                    onValueChange={(v) => setUploadForm(prev => ({ ...prev, project_id: v === '__global__' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Global (All Projects)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__global__">Global (All Projects)</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea 
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add a description..."
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetUploadModal}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {uploadMethod === 'link' ? 'Add Link' : 'Upload File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit File Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={editForm.category} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, category: v as FileCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="documents">Documents</SelectItem>
                  <SelectItem value="images">Images</SelectItem>
                  <SelectItem value="designs">Design Files</SelectItem>
                  <SelectItem value="testimonials">Testimonials</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="copy">Copy</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {editForm.category === 'video' && (
              <div className="space-y-2">
                <Label>Hosted Video Link</Label>
                <Input 
                  value={editForm.video_hosted_link}
                  onChange={(e) => setEditForm(prev => ({ ...prev, video_hosted_link: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Assign to Project</Label>
              <Select 
                value={editForm.project_id || '__global__'} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, project_id: v === '__global__' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Global (All Projects)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">Global (All Projects)</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Modal */}
      <FlagModal
        open={showFlagModal}
        onOpenChange={setShowFlagModal}
        fileName={flaggingFile?.title || flaggingFile?.name || ''}
        onSubmit={handleCreateFlag}
        canFlagForClient={!isClient}
        isClient={isClient}
      />

      {/* Resolve Flag Modal */}
      <FlagResolveModal
        open={showResolveModal}
        onOpenChange={setShowResolveModal}
        flag={resolvingFlag}
        fileName={resolvingFileName}
        onResolve={handleResolveFlag}
      />

      {/* File Preview Modal with Navigation */}
      <FilePreviewModal
        file={currentPreviewFile}
        open={!!previewFileId}
        onOpenChange={(open) => !open && setPreviewFileId(null)}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        hasPrev={hasPrevPreview}
        hasNext={hasNextPreview}
      />
    </div>
  );
}
