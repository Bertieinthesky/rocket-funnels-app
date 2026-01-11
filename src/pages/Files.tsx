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
import { FlagModal } from '@/components/files/FlagModal';
import { FlagResolveModal } from '@/components/files/FlagResolveModal';
import { 
  Plus,
  FileText, 
  Image, 
  Video,
  Palette,
  FileType,
  Package,
  Loader2,
  FolderOpen,
  Upload,
  Link as LinkIcon,
  Star,
  Flag
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

const categoryConfig: { value: FileCategory | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All Files', icon: Package },
  { value: 'brand', label: 'Brand Assets', icon: Palette },
  { value: 'designs', label: 'Designs', icon: Image },
  { value: 'content', label: 'Content', icon: FileType },
  { value: 'copy', label: 'Copy', icon: FileText },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'documents', label: 'Documents', icon: FileText },
  { value: 'images', label: 'Images', icon: Image },
  { value: 'testimonials', label: 'Testimonials', icon: FileText },
  { value: 'other', label: 'Other', icon: Package },
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
  const [uploadTab, setUploadTab] = useState<'upload' | 'link'>('upload');
  const [uploadCategory, setUploadCategory] = useState<FileCategory>('other');
  const [uploadProject, setUploadProject] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  
  // Flag modals
  const [flagModalFile, setFlagModalFile] = useState<FileRecord | null>(null);
  const [flagResolveModal, setFlagResolveModal] = useState<{ file: FileRecord; flag: FileFlag } | null>(null);

  const userRole = isClient ? 'client' : isTeam ? 'team' : 'admin';
  const canManage = isTeam || isAdmin;

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || !companyId) return;

    setUploading(true);
    
    try {
      for (const file of Array.from(selectedFiles)) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('portal-files')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('portal-files')
          .getPublicUrl(filePath);
        
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            company_id: companyId,
            name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            mime_type: file.type,
            category: uploadCategory,
            uploaded_by: user?.id,
            project_id: uploadProject || null,
            is_external_link: false,
          });
        
        if (dbError) throw dbError;
      }
      
      toast({
        title: 'Files uploaded!',
        description: `Successfully uploaded ${selectedFiles.length} file(s)`,
      });
      
      setShowUploadModal(false);
      setUploadCategory('other');
      setUploadProject('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload files',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl || !companyId) return;
    
    setUploading(true);
    try {
      const platform = detectPlatform(linkUrl);
      const title = linkTitle || platform || 'External Link';
      
      const { error } = await supabase
        .from('files')
        .insert({
          company_id: companyId,
          name: title,
          title: title,
          file_url: linkUrl,
          category: uploadCategory,
          uploaded_by: user?.id,
          project_id: uploadProject || null,
          is_external_link: true,
          external_platform: platform,
        });
      
      if (error) throw error;
      
      toast({
        title: 'Link added!',
        description: 'External link has been saved',
      });
      
      setShowUploadModal(false);
      setLinkUrl('');
      setLinkTitle('');
      setUploadCategory('other');
      setUploadProject('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Failed to add link',
        description: error.message,
        variant: 'destructive',
      });
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
          <Button 
            size="sm"
            className="h-8"
            onClick={() => setShowUploadModal(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add File
          </Button>
          
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">Project:</span>
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
            
            <Button
              variant={showFlagged ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setShowFlagged(!showFlagged)}
            >
              <Flag className="mr-1 h-3 w-3" />
              Flagged
            </Button>
            
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
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {categoryConfig.map(({ value, label, icon: Icon }) => {
            const count = getCategoryCount(value);
            const isSelected = selectedCategories.includes(value);
            
            return (
              <Button
                key={value}
                variant={isSelected ? "default" : "outline"}
                size="lg"
                className="h-10"
                onClick={() => toggleCategory(value)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
                <Badge variant="secondary" className="ml-2">
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add File</DialogTitle>
          </DialogHeader>
          
          <Tabs value={uploadTab} onValueChange={(v) => setUploadTab(v as 'upload' | 'link')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="link">
                <LinkIcon className="mr-2 h-4 w-4" />
                Add Link
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={uploadCategory} onValueChange={(v) => setUploadCategory(v as FileCategory)}>
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
              
              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Select value={uploadProject} onValueChange={setUploadProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No project</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button 
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Choose Files
              </Button>
            </TabsContent>
            
            <TabsContent value="link" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  placeholder="https://docs.google.com/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                {linkUrl && detectPlatform(linkUrl) && (
                  <p className="text-sm text-muted-foreground">
                    Detected: {detectPlatform(linkUrl)}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input
                  placeholder="My Document"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={uploadCategory} onValueChange={(v) => setUploadCategory(v as FileCategory)}>
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
              
              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Select value={uploadProject} onValueChange={setUploadProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No project</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                className="w-full"
                onClick={handleAddLink}
                disabled={uploading || !linkUrl}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LinkIcon className="mr-2 h-4 w-4" />
                )}
                Add Link
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

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
    </DashboardLayout>
  );
}
