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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  Image, 
  Video, 
  Star,
  MoreVertical,
  Edit,
  Download,
  Trash,
  ExternalLink,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { format } from 'date-fns';

type FileCategory = 'documents' | 'images' | 'testimonials' | 'video';

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
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function FileManagerTab({ companyId, projects }: FileManagerTabProps) {
  const { user } = useAuth();
  const { canManageFiles, canUploadFiles } = usePermissions();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

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

  useEffect(() => {
    fetchFiles();
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

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'Global';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  // Filter files
  const filteredFiles = files.filter(f => {
    const categoryMatch = activeCategory === 'all' || f.category === activeCategory;
    const projectMatch = projectFilter === 'all' || 
      (projectFilter === 'global' && !f.project_id) ||
      f.project_id === projectFilter;
    return categoryMatch && projectMatch;
  });

  // Count by category
  const categoryCounts = {
    documents: files.filter(f => f.category === 'documents').length,
    images: files.filter(f => f.category === 'images').length,
    testimonials: files.filter(f => f.category === 'testimonials').length,
    video: files.filter(f => f.category === 'video').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
      <div className="flex flex-wrap gap-4">
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
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="all">All ({files.length})</TabsTrigger>
          {Object.entries(categoryConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger key={key} value={key} className="gap-1">
                <Icon className="h-4 w-4" />
                {categoryCounts[key as keyof typeof categoryCounts]}
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
              {filteredFiles.map(file => {
                const config = categoryConfig[file.category as keyof typeof categoryConfig] || categoryConfig.documents;
                const Icon = config.icon;

                return (
                  <Card key={file.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 ${config.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{file.title || file.name}</h4>
                            <p className="text-xs text-muted-foreground truncate">{file.name}</p>
                          </div>
                        </div>
                        
                        {canManageFiles && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(file)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </a>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(file.id)}
                                className="text-destructive"
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {getProjectName(file.project_id)}
                        </Badge>
                        {file.file_size && (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.file_size)}
                          </span>
                        )}
                      </div>

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

                      {file.category === 'testimonials' && file.description && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2 italic">
                          "{file.description}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
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
                value={uploadForm.project_id} 
                onValueChange={(v) => setUploadForm(prev => ({ ...prev, project_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Global (All Projects)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Global (All Projects)</SelectItem>
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
                value={editForm.project_id} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, project_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Global (All Projects)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Global (All Projects)</SelectItem>
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
    </div>
  );
}
