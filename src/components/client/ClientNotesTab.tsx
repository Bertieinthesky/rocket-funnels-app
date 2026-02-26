import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { NoteCommentThread } from './NoteCommentThread';
import {
  Plus,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  StickyNote,
} from 'lucide-react';

type NoteCategory = 'Meeting Notes' | 'General Info' | 'Project Context';

interface ClientNote {
  id: string;
  company_id: string;
  category: NoteCategory;
  content: string;
  created_at: string;
  created_by: string | null;
  author?: {
    full_name: string | null;
  };
}

interface ClientNotesTabProps {
  companyId: string;
}

const categoryColors: Record<NoteCategory, string> = {
  'Meeting Notes': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'General Info': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  'Project Context': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const NOTES_PAGE_SIZE = 50;

export function ClientNotesCard({ companyId }: ClientNotesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null);
  const [deleteNote, setDeleteNote] = useState<ClientNote | null>(null);
  const [category, setCategory] = useState<NoteCategory>('General Info');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [companyId]);

  const fetchNotes = async (loadMore = false) => {
    try {
      if (!loadMore) setLoading(true);
      else setLoadingMore(true);

      const from = loadMore ? notes.length : 0;
      const to = from + NOTES_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('client_notes')
        .select(`
          *,
          author:profiles!client_notes_created_by_fkey(full_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const typedData = (data || []).map(note => ({
        ...note,
        category: note.category as NoteCategory
      }));

      if (loadMore) {
        setNotes(prev => [...prev, ...typedData]);
      } else {
        setNotes(typedData);
      }

      setHasMore((data || []).length === NOTES_PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({ title: 'Failed to load notes', variant: 'destructive' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({ title: 'Content required', description: 'Please enter note content', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingNote) {
        const { error } = await supabase
          .from('client_notes')
          .update({ category, content: content.trim() })
          .eq('id', editingNote.id);

        if (error) throw error;
        toast({ title: 'Note updated' });
      } else {
        const { error } = await supabase
          .from('client_notes')
          .insert({
            company_id: companyId,
            category,
            content: content.trim(),
            created_by: user?.id
          });

        if (error) throw error;
        toast({ title: 'Note added' });
      }

      resetForm();
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast({ title: 'Failed to save note', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteNote) return;

    try {
      const { error } = await supabase
        .from('client_notes')
        .delete()
        .eq('id', deleteNote.id);

      if (error) throw error;

      toast({ title: 'Note deleted' });
      setDeleteNote(null);
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({ title: 'Failed to delete note', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setDialogOpen(false);
    setEditingNote(null);
    setCategory('General Info');
    setContent('');
  };

  const openEdit = (note: ClientNote) => {
    setEditingNote(note);
    setCategory(note.category);
    setContent(note.content);
    setDialogOpen(true);
  };

  const toggleExpand = (noteId: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between shrink-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          Notes
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Edit Note' : 'Add Note'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={(v) => setCategory(v as NoteCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meeting Notes">Meeting Notes</SelectItem>
                    <SelectItem value="General Info">General Info</SelectItem>
                    <SelectItem value="Project Context">Project Context</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter note content..."
                  rows={6}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Saving...' : editingNote ? 'Update' : 'Add Note'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-0">
        {loading ? (
          <div className="px-4 pb-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No notes yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add your first note to get started
            </p>
          </div>
        ) : (
          <div className="px-4 pb-4 space-y-2">
            {notes.map((note) => {
              const isExpanded = expandedNotes.has(note.id);
              const shouldTruncate = note.content.length > 200;
              const displayContent = shouldTruncate && !isExpanded
                ? note.content.slice(0, 200) + '...'
                : note.content;

              return (
                <div key={note.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[10px] h-5 px-1.5 ${categoryColors[note.category]}`}>
                          {note.category}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(note.created_at), "MMM d, yyyy")}
                        </span>
                        {note.author?.full_name && (
                          <span className="text-[11px] text-muted-foreground">
                            {note.author.full_name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{displayContent}</p>
                      {shouldTruncate && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs text-primary"
                          onClick={() => toggleExpand(note.id)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-0.5" />
                              Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-0.5" />
                              More
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {note.created_by === user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(note)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteNote(note)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <NoteCommentThread noteId={note.id} />
                </div>
              );
            })}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNotes(true)}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteNote} onOpenChange={(open) => !open && setDeleteNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Keep old export name for backward compatibility
export const ClientNotesTab = ClientNotesCard;
