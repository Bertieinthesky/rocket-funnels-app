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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCard } from '@/components/files/FileCard';
import { FlagModal } from '@/components/files/FlagModal';
import { FlagResolveModal } from '@/components/files/FlagResolveModal';
import { 
  Upload, 
  FileText, 
  Image, 
  Video, 
  Star,
  Flag,
  User,
  Loader2,
  FolderOpen
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

const categoryConfig = {
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

export function FileManagerTab({ companyId, projects }: FileManagerTabProps) {
  const { user, isClient, isTeam, isAdmin } = useAuth();
  const { canManageFiles, canUploadFiles } = usePermissions();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [flags, setFlags] = useState<FileFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showMyUploads, setShowMyUploads] = useState(false);
  const [showFlagged, setShowFlagged] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'documents' as FileCategory,
    project_id: '',
    description: '',
    video_hosted_link: '',
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

  const userRole = isAdmin ? 'admin' : isTeam ? 'team' : 'client';

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
      // Get all file IDs for this company first
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
    setShowUploadModal(true);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    if (uploadForm.category === 'video' && !uploadForm.video_hosted_link) {
      toast({ title: 'Video files require a hosted video link', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('portal-files')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('portal-files')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('files')
        .insert({
          company_id: companyId,
          name: selectedFile.name,
          title: uploadForm.title,
          description: uploadForm.description || null,
          file_url: urlData.publicUrl,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          category: uploadForm.category,
          project_id: uploadForm.project_id || null,
          video_hosted_link: uploadForm.video_hosted_link || null,
          uploaded_by: user?.id,
        });

      if (dbError) throw dbError;

      toast({ title: 'File uploaded successfully!' });
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadForm({ title: '', category: 'documents', project_id: '', description: '', video_hosted_link: '' });
      fetchFiles();
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
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

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'Global';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getFileFlagsById = (fileId: string) => {
    return flags.filter(f => f.file_id === fileId);
  };

  // Filter files
  const filteredFiles = files.filter(f => {
    const categoryMatch = activeCategory === 'all' || f.category === activeCategory;
    const projectMatch = projectFilter === 'all' || 
      (projectFilter === 'global' && !f.project_id) ||
      f.project_id === projectFilter;
    const myUploadsMatch = !showMyUploads || f.uploaded_by === user?.id;
    const flaggedMatch = !showFlagged || flags.some(flag => 
      flag.file_id === f.id && !flag.resolved
    );
    return categoryMatch && projectMatch && myUploadsMatch && flaggedMatch;
  });

  // Count by category
  const categoryCounts = {
    documents: files.filter(f => f.category === 'documents').length,
    images: files.filter(f => f.category === 'images').length,
    testimonials: files.filter(f => f.category === 'testimonials').length,
    video: files.filter(f => f.category === 'video').length,
  };

  const flaggedCount = files.filter(f => 
    flags.some(flag => flag.file_id === f.id && !flag.resolved)
  ).length;

  const myUploadsCount = files.filter(f => f.uploaded_by === user?.id).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">All Project Files</h3>
          <p className="text-sm text-muted-foreground">
            All files related to this client, including uploads and team deliverables.
          </p>
        </div>
      </div>

      {/* Upload Dropzone */}
      {canUploadFiles && (
        <Card>
          <CardContent className="py-8">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Drag files here or click to browse</p>
              <p className="text-xs text-muted-foreground">Maximum file size: 50MB</p>
              <Button variant="outline" className="mt-4">
                Select Files
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="global">Global Files</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button 
          variant={showFlagged ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setShowFlagged(!showFlagged)}
          className="gap-1"
        >
          <Flag className="h-4 w-4" />
          Flagged ({flaggedCount})
        </Button>

        {isClient && (
          <Button 
            variant={showMyUploads ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setShowMyUploads(!showMyUploads)}
            className="gap-1"
          >
            <User className="h-4 w-4" />
            My Uploads ({myUploadsCount})
          </Button>
        )}
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="all">All ({files.length})</TabsTrigger>
          {Object.entries(categoryConfig).slice(0, 4).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="gap-1">
                <Icon className="h-4 w-4" />
                {categoryCounts[key as keyof typeof categoryCounts] || 0}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {filteredFiles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No files in this category</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload File Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                  <SelectItem value="testimonials">Testimonials</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="designs">Designs</SelectItem>
                  <SelectItem value="copy">Copy</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title*</Label>
              <Input 
                value={uploadForm.title}
                onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter file title"
              />
            </div>

            {uploadForm.category === 'video' && (
              <div className="space-y-2">
                <Label>Hosted Video Link*</Label>
                <Input 
                  value={uploadForm.video_hosted_link}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, video_hosted_link: e.target.value }))}
                  placeholder="https://youtube.com/..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Assign to Project</Label>
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

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Upload File
              </Button>
            </div>
          </div>
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
                  <SelectItem value="testimonials">Testimonials</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="designs">Designs</SelectItem>
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

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Flag Modal */}
      <FlagModal
        open={showFlagModal}
        onOpenChange={setShowFlagModal}
        fileName={flaggingFile?.title || flaggingFile?.name || ''}
        onSubmit={handleCreateFlag}
        canFlagForClient={!isClient}
      />

      {/* Resolve Flag Modal */}
      <FlagResolveModal
        open={showResolveModal}
        onOpenChange={setShowResolveModal}
        flag={resolvingFlag}
        fileName={resolvingFileName}
        onResolve={handleResolveFlag}
      />
    </div>
  );
}
