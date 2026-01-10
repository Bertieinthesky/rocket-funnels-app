import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Pencil, 
  Check, 
  X, 
  Mail, 
  Globe, 
  DollarSign,
  Clock,
  Calendar
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  contact_email: string | null;
  invoicing_email: string | null;
  company_website: string | null;
  hours_allocated: number | null;
  hours_used: number | null;
  hourly_rate: number | null;
  payment_schedule: string | null;
  billing_email: string | null;
  retainer_type: string;
}

interface CompanyInfoTabProps {
  company: Company;
  onUpdate: () => void;
}

export function CompanyInfoTab({ company, onUpdate }: CompanyInfoTabProps) {
  const { toast } = useToast();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const startEdit = (field: string, currentValue: string | number | null) => {
    setEditingField(field);
    setEditValue(currentValue?.toString() || '');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveField = async (field: string) => {
    setSaving(true);
    try {
      let value: string | number | null = editValue;
      
      if (field === 'hours_allocated') {
        const parsed = parseInt(editValue);
        if (isNaN(parsed) || parsed < 0) {
          toast({ title: 'Invalid value', description: 'Must be a positive integer', variant: 'destructive' });
          return;
        }
        value = parsed;
      } else if (field === 'hourly_rate') {
        const parsed = parseFloat(editValue);
        if (isNaN(parsed) || parsed < 0) {
          toast({ title: 'Invalid value', description: 'Must be a positive number', variant: 'destructive' });
          return;
        }
        value = parsed;
      }

      const { error } = await supabase
        .from('companies')
        .update({ [field]: value })
        .eq('id', company.id);

      if (error) throw error;

      toast({ title: 'Updated successfully' });
      setEditingField(null);
      setEditValue('');
      onUpdate();
    } catch (error) {
      console.error('Error updating company:', error);
      toast({ title: 'Failed to update', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const hoursUsed = company.hours_used || 0;
  const hoursAllocated = company.hours_allocated || 0;
  const hoursPercentage = hoursAllocated > 0 ? Math.min((hoursUsed / hoursAllocated) * 100, 100) : 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Contact & Billing Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact & Billing Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Point of Contact Email
            </p>
            <p className="font-medium">{company.contact_email || company.billing_email || 'Not set'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Invoicing Email
            </p>
            <p className="font-medium">{company.invoicing_email || company.billing_email || 'Not set'}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Company Website
            </p>
            {company.company_website ? (
              <a 
                href={company.company_website.startsWith('http') ? company.company_website : `https://${company.company_website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                {company.company_website}
              </a>
            ) : (
              <p className="font-medium text-muted-foreground">Not set</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Payment Schedule
            </p>
            {company.payment_schedule ? (
              <Badge variant="secondary">{company.payment_schedule} of the month</Badge>
            ) : (
              <p className="font-medium text-muted-foreground">Not set</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Retainer Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Retainer Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Monthly Hours Allocation */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Monthly Hours Allocation
            </p>
            {editingField === 'hours_allocated' ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-24"
                  min={0}
                  autoFocus
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => saveField('hours_allocated')}
                  disabled={saving}
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" onClick={cancelEdit}>
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium">{company.hours_allocated || 0} hours</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6"
                  onClick={() => startEdit('hours_allocated', company.hours_allocated)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Hourly Rate */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Hourly Rate
            </p>
            {editingField === 'hourly_rate' ? (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-24"
                  min={0}
                  step="0.01"
                  autoFocus
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => saveField('hourly_rate')}
                  disabled={saving}
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" onClick={cancelEdit}>
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  ${company.hourly_rate?.toFixed(2) || '0.00'}
                </span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6"
                  onClick={() => startEdit('hourly_rate', company.hourly_rate)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Hours Used/Remaining */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Hours Used / Remaining</p>
            <p className="font-medium">
              {hoursUsed}/{hoursAllocated} hours used
            </p>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${hoursPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.max(hoursAllocated - hoursUsed, 0)} hours remaining
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
