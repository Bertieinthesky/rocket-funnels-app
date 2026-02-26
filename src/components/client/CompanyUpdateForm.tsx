import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateCompanyUpdate } from '@/hooks/useCompanyUpdates';
import { useToast } from '@/hooks/use-toast';
import { Plus, Send, Loader2, Phone, FileText, MessageSquare, Zap } from 'lucide-react';

interface CompanyUpdateFormProps {
  companyId: string;
}

const CATEGORIES = [
  { value: 'general', label: 'General', icon: MessageSquare },
  { value: 'call', label: 'Call Notes', icon: Phone },
  { value: 'deliverable', label: 'Deliverable', icon: FileText },
  { value: 'status', label: 'Status Update', icon: Zap },
] as const;

type Category = (typeof CATEGORIES)[number]['value'];

export function CompanyUpdateForm({ companyId }: CompanyUpdateFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createUpdate = useCreateCompanyUpdate();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>('general');

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;

    const catLabel = CATEGORIES.find(c => c.value === category)?.label || '';
    const prefixed = category !== 'general' ? `[${catLabel}] ${content.trim()}` : content.trim();

    createUpdate.mutate(
      {
        company_id: companyId,
        author_id: user.id,
        content: prefixed,
      },
      {
        onSuccess: () => {
          setContent('');
          setCategory('general');
          setOpen(false);
          toast({ title: 'Update posted' });
        },
        onError: () => {
          toast({ title: 'Failed to post update', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Post Update
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Post Update</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Category pills */}
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              category === 'call'
                ? 'Jumped off a call with the client, discussed...'
                : category === 'deliverable'
                  ? 'Sent over the landing page mockups for review...'
                  : category === 'status'
                    ? 'Wrapping up the homepage build, moving to CRO next...'
                    : 'Write your update here...'
            }
            rows={4}
            className="resize-none text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSubmit}
              disabled={!content.trim() || createUpdate.isPending}
            >
              {createUpdate.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Post Update
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
