import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useNoteComments, useCreateNoteComment } from '@/hooks/useNoteComments';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Send, Loader2, MessageCircle } from 'lucide-react';

interface NoteCommentThreadProps {
  noteId: string;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return email?.slice(0, 2).toUpperCase() || '?';
}

export function NoteCommentThread({ noteId }: NoteCommentThreadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: comments = [], isLoading } = useNoteComments(noteId);
  const createComment = useCreateNoteComment();
  const [content, setContent] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleSubmit = () => {
    if (!content.trim() || !user) return;

    createComment.mutate(
      {
        note_id: noteId,
        author_id: user.id,
        content: content.trim(),
      },
      {
        onSuccess: () => {
          setContent('');
          setShowInput(false);
        },
        onError: () => {
          toast({ title: 'Failed to add comment', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      {/* Existing comments */}
      {comments.map((comment) => (
        <div key={comment.id} className="flex items-start gap-2">
          <Avatar className="h-5 w-5 shrink-0 mt-0.5">
            <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
              {getInitials(comment.author_name, comment.author_email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium">
                {comment.author_name || comment.author_email || 'Team member'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
          </div>
        </div>
      ))}

      {/* Add comment */}
      {showInput ? (
        <div className="flex items-start gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="text-xs resize-none flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
              if (e.key === 'Escape') {
                setShowInput(false);
                setContent('');
              }
            }}
          />
          <div className="flex flex-col gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleSubmit}
              disabled={!content.trim() || createComment.isPending}
            >
              {createComment.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[11px] text-muted-foreground gap-1 px-1"
          onClick={() => setShowInput(true)}
        >
          <MessageCircle className="h-3 w-3" />
          {comments.length > 0
            ? `${comments.length} comment${comments.length !== 1 ? 's' : ''}`
            : 'Add comment'}
        </Button>
      )}
    </div>
  );
}
