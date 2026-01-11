import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send, Package } from 'lucide-react';

interface TeamUpdateFormProps {
  projectId: string;
  onSubmit: (content: string, isDeliverable: boolean, hoursLogged: number | null) => Promise<void>;
}

export function TeamUpdateForm({ projectId, onSubmit }: TeamUpdateFormProps) {
  const [content, setContent] = useState('');
  const [isDeliverable, setIsDeliverable] = useState(false);
  const [hoursLogged, setHoursLogged] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    
    setSubmitting(true);
    try {
      const hours = hoursLogged ? parseFloat(hoursLogged) : null;
      await onSubmit(content.trim(), isDeliverable, hours);
      setContent('');
      setIsDeliverable(false);
      setHoursLogged('');
      setIsExpanded(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isExpanded) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setIsExpanded(true)}
          >
            <Send className="mr-2 h-4 w-4" />
            Post an Update
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Send className="h-4 w-4" />
          Post an Update
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="update-content">Update</Label>
          <Textarea
            id="update-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share progress, notes, or deliverable details..."
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Options row */}
        <div className="flex items-center gap-6">
          {/* Deliverable toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="is-deliverable"
              checked={isDeliverable}
              onCheckedChange={setIsDeliverable}
            />
            <Label htmlFor="is-deliverable" className="flex items-center gap-1.5 cursor-pointer">
              <Package className="h-4 w-4" />
              Mark as Deliverable
            </Label>
          </div>

          {/* Hours logged */}
          <div className="flex items-center gap-2">
            <Label htmlFor="hours" className="text-sm whitespace-nowrap">Hours:</Label>
            <Input
              id="hours"
              type="number"
              step="0.25"
              min="0"
              value={hoursLogged}
              onChange={(e) => setHoursLogged(e.target.value)}
              placeholder="0"
              className="w-20 h-8"
            />
          </div>
        </div>

        {/* Deliverable note */}
        {isDeliverable && (
          <p className="text-xs text-muted-foreground bg-primary/5 p-2 rounded">
            💡 Deliverables require client approval before moving forward.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button 
            variant="ghost" 
            onClick={() => {
              setIsExpanded(false);
              setContent('');
              setIsDeliverable(false);
              setHoursLogged('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {isDeliverable ? 'Submit for Approval' : 'Post Update'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
