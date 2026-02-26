import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateCompanyUpdate } from '@/hooks/useCompanyUpdates';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2 } from 'lucide-react';

interface CompanyUpdateFormProps {
  companyId: string;
}

export function CompanyUpdateForm({ companyId }: CompanyUpdateFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createUpdate = useCreateCompanyUpdate();
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;

    createUpdate.mutate(
      {
        company_id: companyId,
        author_id: user.id,
        content: content.trim(),
      },
      {
        onSuccess: () => {
          setContent('');
          toast({ title: 'Update posted' });
        },
        onError: () => {
          toast({ title: 'Failed to post update', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Post an update... (e.g. 'Jumped off a call with client, discussed...')"
        rows={2}
        className="resize-none text-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
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
  );
}
