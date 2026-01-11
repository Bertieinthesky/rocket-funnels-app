import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileCard } from '@/components/files/FileCard';
import { FilePreviewModal } from '@/components/files/FilePreviewModal';
import { FlagModal } from '@/components/files/FlagModal';
import { FlagResolveModal } from '@/components/files/FlagResolveModal';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus,
  FileText, 
  Loader2,
  FolderOpen,
  Upload,
  Link as LinkIcon,
  Star,
  Flag,
  X
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type FileCategory = Database['public']['Enums']['file_category'];

interface FileRecord {
  id: string;
  name: string;
  title: string | null;
  description: string | null;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  category: FileCategory;
  created_at: string;
  project_id: string | null;
  uploaded_by: string | null;
  is_external_link: boolean | null;
  external_platform: string | null;
  is_favorite: boolean | null;
  is_pinned_to_dashboard: boolean | null;
  video_hosted_link: string | null;
}

interface FileFlag {
  id: string;
  flagged_by: string;
  flagged_by_role: string;
  flagged_for: string;
  flag_message: string;
  created_at: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolved_message: string | null;
  flagged_by_name?: string;
  resolved_by_name?: string;
}

interface Project {
  id: string;
  name: string;
}

const categoryConfig: { value: FileCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'documents', label: 'Documents' },
  { value: 'images', label: 'Images' },
  { value: 'designs', label: 'Design Files' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
];

const detectPlatform = (url: string): string | null => {
  if (url.includes('docs.google.com')) return 'Google Docs';
  if (url.includes('sheets.google.com')) return 'Google Sheets';
  if (url.includes('drive.google.com')) return 'Google Drive';
  if (url.includes('figma.com')) return 'Figma';
  if (url.includes('canva.com')) return 'Canva';
  if (url.includes('dropbox.com')) return 'Dropbox';
  if (url.includes('notion.so') || url.includes('notion.site')) return 'Notion';
  if (url.includes('miro.com')) return 'Miro';
  if (url.includes('airtable.com')) return 'Airtable';
  return null;
};

export default function Files() {
  const { user, isTeam, isAdmin, isClient } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [fileFlags, setFileFlags] = useState<Record<string, FileFlag[]>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Filters
  const [selectedCategories, setSelectedCategories] = useState<(FileCategory | 'all')[]>(['all']);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [showFlagged, setShowFlagged] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  
  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalLink, setExternalLink] = useState('');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'other' as FileCategory,
    project_id: '',
    description: '',
  });
  
  // Flag modals
  const [flagModalFile, setFlagModalFile] = useState<FileRecord | null>(null);
  const [flagResolveModal, setFlagResolveModal] = useState<{ file: FileRecord; flag: FileFlag } | null>(null);

  // Preview modal state
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  const userRole = isClient ? 'client' : isTeam ? 'team' : 'admin';
  const canManage = isTeam || isAdmin;

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
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (profile?.company_id) {
        setCompanyId(profile.company_id);
        
        const [filesRes, projectsRes] = await Promise.all([
          supabase
            .from('files')
            .select('*')
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false }),
          supabase
            .from('projects')
            .select('id, name')
            .eq('company_id', profile.company_id)
            .order('name')
        ]);
        
        setFiles(filesRes.data || []);
        setProjects(projectsRes.data || []);
        
        // Fetch flags for all files
        if (filesRes.data && filesRes.data.length > 0) {
          const fileIds = filesRes.data.map(f => f.id);
          const { data: flags } = await supabase
            .from('file_flags')
            .select('*')
            .in('file_id', fileIds);
          
          if (flags) {
            const flagMap: Record<string, FileFlag[]> = {};
            flags.forEach(flag => {
              const fileId = (flag as any).file_id;
              if (!flagMap[fileId]) {
                flagMap[fileId] = [];
              }
              flagMap[fileId].push(flag as FileFlag);
            });
            setFileFlags(flagMap);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const resetUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setExternalLink('');
    setUploadMethod('file');
    setUploadForm({ title: '', category: 'other', project_id: '', description: '' });
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

    if (!companyId) return;

    setUploading(true);
    try {
      if (isLinkUpload) {
        // Add external link
        const platform = detectPlatform(externalLink);
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
            external_platform: platform,
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
      fetchData();
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
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
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };

  const handleToggleFavorite = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_favorite: !file.is_favorite })
        .eq('id', fileId);
      
      if (error) throw error;
      
      setFiles(files.map(f => 
        f.id === fileId ? { ...f, is_favorite: !f.is_favorite } : f
      ));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update favorite',
        variant: 'destructive',
      });
    }
  };

  const handleTogglePin = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_pinned_to_dashboard: !file.is_pinned_to_dashboard })
        .eq('id', fileId);
      
      if (error) throw error;
      
      setFiles(files.map(f => 
        f.id === fileId ? { ...f, is_pinned_to_dashboard: !f.is_pinned_to_dashboard } : f
      ));
      
      toast({
        title: file.is_pinned_to_dashboard ? 'Removed from dashboard' : 'Pinned to dashboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update pin status',
        variant: 'destructive',
      });
    }
  };

  const handleCreateFlag = async (flaggedFor: 'team' | 'client', message: string) => {
    if (!flagModalFile || !user) return;
    
    try {
      const { data: flag, error } = await supabase
        .from('file_flags')
        .insert({
          file_id: flagModalFile.id,
          flagged_by: user.id,
          flagged_by_role: userRole,
          flagged_for: flaggedFor,
          flag_message: message,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Create notification for target users
      if (flaggedFor === 'team') {
        const { data: teamUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['team', 'admin']);
        
        if (teamUsers) {
          const notifications = teamUsers.map(u => ({
            user_id: u.user_id,
            type: 'flag',
            message: `File "${flagModalFile.name}" has been flagged for your review`,
            file_id: flagModalFile.id,
            flag_id: flag.id,
          }));
          
          await supabase.from('notifications').insert(notifications);
        }
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.company_id) {
          const { data: clientProfiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('company_id', profile.company_id);
          
          if (clientProfiles) {
            const clientIds = clientProfiles.map(p => p.id);
            const { data: clientRoles } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', 'client')
              .in('user_id', clientIds);
            
            if (clientRoles) {
              const notifications = clientRoles.map(u => ({
                user_id: u.user_id,
                type: 'flag',
                message: `File "${flagModalFile.name}" has been flagged for your review`,
                file_id: flagModalFile.id,
                flag_id: flag.id,
              }));
              
              await supabase.from('notifications').insert(notifications);
            }
          }
        }
      }
      
      setFileFlags(prev => ({
        ...prev,
        [flagModalFile.id]: [...(prev[flagModalFile.id] || []), flag as FileFlag]
      }));
      setFlagModalFile(null);
      
      toast({
        title: 'File flagged',
        description: `Flagged for ${flaggedFor} review`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to flag file',
        variant: 'destructive',
      });
    }
  };

  const handleResolveFlag = async (flagId: string, message: string) => {
    if (!flagResolveModal || !user) return;
    
    try {
      const { error } = await supabase
        .from('file_flags')
        .update({
          resolved: true,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolved_message: message,
        })
        .eq('id', flagId);
      
      if (error) throw error;
      
      // Update local state
      setFileFlags(prev => ({
        ...prev,
        [flagResolveModal.file.id]: (prev[flagResolveModal.file.id] || []).map(f =>
          f.id === flagId
            ? {
                ...f,
                resolved: true,
                resolved_by: user.id,
                resolved_at: new Date().toISOString(),
                resolved_message: message,
              }
            : f
        ),
      }));
      
      setFlagResolveModal(null);
      toast({ title: 'Flag resolved' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resolve flag',
        variant: 'destructive',
      });
    }
  };

  const toggleCategory = (category: FileCategory | 'all') => {
    if (category === 'all') {
      setSelectedCategories(['all']);
    } else {
      setSelectedCategories(prev => {
        const withoutAll = prev.filter(c => c !== 'all');
        if (withoutAll.includes(category)) {
          const newSelection = withoutAll.filter(c => c !== category);
          return newSelection.length === 0 ? ['all'] : newSelection;
        } else {
          return [...withoutAll, category];
        }
      });
    }
  };

  const getCategoryCount = (category: FileCategory | 'all') => {
    if (category === 'all') return files.length;
    return files.filter(f => f.category === category).length;
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'No Project';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  // Filter files
  let filteredFiles = files;
  
  if (!selectedCategories.includes('all')) {
    filteredFiles = filteredFiles.filter(f => selectedCategories.includes(f.category));
  }
  
  if (selectedProject !== 'all') {
    filteredFiles = filteredFiles.filter(f => f.project_id === selectedProject);
  }
  
  if (showFlagged) {
    filteredFiles = filteredFiles.filter(f => {
      const flags = fileFlags[f.id] || [];
      return flags.some(flag => !flag.resolved);
    });
  }
  
  if (showFavorites) {
    filteredFiles = filteredFiles.filter(f => f.is_favorite);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Files</h1>
            <p className="text-muted-foreground">
              Manage your project files and assets
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {canManage && (
              <Button
                variant={showFavorites ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => setShowFavorites(!showFavorites)}
              >
                <Star className="mr-1 h-3 w-3" />
                Favorites
              </Button>
            )}
            
            <Button
              variant={showFlagged ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setShowFlagged(!showFlagged)}
            >
              <Flag className="mr-1 h-3 w-3" />
              Flagged
            </Button>
          </div>
          
          <Button 
            size="sm"
            className="h-8 ml-auto"
            onClick={() => setShowUploadModal(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add File
          </Button>
        </div>

        {/* Category Pills - Single line */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categoryConfig.map(({ value, label }) => {
            const count = getCategoryCount(value);
            const isSelected = selectedCategories.includes(value);
            
            return (
              <Button
                key={value}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className="h-9 whitespace-nowrap"
                onClick={() => toggleCategory(value)}
              >
                {label}
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* File Grid */}
        {filteredFiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No files found</p>
              <Button 
                variant="outline"
                onClick={() => setShowUploadModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add your first file
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                flags={fileFlags[file.id] || []}
                projectName={getProjectName(file.project_id)}
                userRole={userRole}
                currentUserId={user?.id}
                canManage={canManage}
                onDelete={() => handleDelete(file.id)}
                onToggleFavorite={() => handleToggleFavorite(file.id)}
                onTogglePinned={() => handleTogglePin(file.id)}
                onFlag={() => setFlagModalFile(file)}
                onResolveFlag={(flag) => {
                  const fullFlag = (fileFlags[file.id] || []).find(f => f.id === flag.id);
                  if (fullFlag) {
                    setFlagResolveModal({ file, flag: fullFlag });
                  }
                }}
                onPreview={() => setPreviewFileId(file.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
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
                  {categoryConfig.filter(c => c.value !== 'all').map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Upload Method Tabs */}
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

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={resetUploadModal}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {uploadMethod === 'link' ? 'Add Link' : 'Upload File'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Flag Modal */}
      <FlagModal
        open={!!flagModalFile}
        onOpenChange={(open) => !open && setFlagModalFile(null)}
        fileName={flagModalFile?.name || ''}
        onSubmit={handleCreateFlag}
        canFlagForClient={canManage}
        isClient={isClient}
      />

      {/* Flag Resolve Modal */}
      <FlagResolveModal
        open={!!flagResolveModal}
        onOpenChange={(open) => !open && setFlagResolveModal(null)}
        flag={flagResolveModal?.flag || null}
        fileName={flagResolveModal?.file.name || ''}
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
    </DashboardLayout>
  );
}
