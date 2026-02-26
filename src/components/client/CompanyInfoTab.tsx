import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { HourTracker } from './HourTracker';
import {
  Pencil,
  Save,
  X,
  Mail,
  Globe,
  DollarSign,
  Clock,
  Calendar,
  User,
  Loader2,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  poc_name?: string | null;
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

interface FormData {
  poc_name: string;
  contact_email: string;
  invoicing_email: string;
  company_website: string;
  hours_allocated: string;
  hourly_rate: string;
  payment_schedule: string;
  retainer_type: string;
}

export function CompanyInfoCards({ company, onUpdate }: CompanyInfoTabProps) {
  const { toast } = useToast();
  const { canEditCompanyInfo } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    poc_name: company.poc_name || '',
    contact_email: company.contact_email || '',
    invoicing_email: company.invoicing_email || '',
    company_website: company.company_website || '',
    hours_allocated: company.hours_allocated?.toString() || '',
    hourly_rate: company.hourly_rate?.toString() || '',
    payment_schedule: company.payment_schedule || '',
    retainer_type: company.retainer_type || 'one_time',
  });

  const startEditing = () => {
    setFormData({
      poc_name: company.poc_name || '',
      contact_email: company.contact_email || '',
      invoicing_email: company.invoicing_email || '',
      company_website: company.company_website || '',
      hours_allocated: company.hours_allocated?.toString() || '',
      hourly_rate: company.hourly_rate?.toString() || '',
      payment_schedule: company.payment_schedule || '',
      retainer_type: company.retainer_type || 'one_time',
    });
    setIsEditing(true);
  };

  const validateEmail = (email: string) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUrl = (url: string) => {
    if (!url) return true;
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const saveChanges = async () => {
    if (!validateEmail(formData.contact_email)) {
      toast({ title: 'Invalid contact email format', variant: 'destructive' });
      return;
    }
    if (!validateEmail(formData.invoicing_email)) {
      toast({ title: 'Invalid invoicing email format', variant: 'destructive' });
      return;
    }
    if (!validateUrl(formData.company_website)) {
      toast({ title: 'Invalid website URL format', variant: 'destructive' });
      return;
    }

    const hoursAllocated = formData.hours_allocated ? parseInt(formData.hours_allocated) : null;
    if (formData.hours_allocated && (isNaN(hoursAllocated!) || hoursAllocated! < 1)) {
      toast({ title: 'Monthly hours must be at least 1', variant: 'destructive' });
      return;
    }

    const hourlyRate = formData.hourly_rate ? parseFloat(formData.hourly_rate) : null;
    if (formData.hourly_rate && (isNaN(hourlyRate!) || hourlyRate! < 0.01)) {
      toast({ title: 'Hourly rate must be at least $0.01', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          poc_name: formData.poc_name || null,
          contact_email: formData.contact_email || null,
          invoicing_email: formData.invoicing_email || null,
          company_website: formData.company_website || null,
          hours_allocated: hoursAllocated,
          hourly_rate: hourlyRate,
          payment_schedule: formData.payment_schedule || null,
          retainer_type: formData.retainer_type as 'unlimited' | 'hourly' | 'one_time',
        })
        .eq('id', company.id);

      if (error) throw error;

      toast({ title: 'Company info updated successfully' });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating company:', error);
      toast({ title: 'Failed to update company info', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const hoursUsed = company.hours_used || 0;
  const hoursAllocated = company.hours_allocated || 0;

  return (
    <>
      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Company Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1 max-h-[70vh] overflow-y-auto">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poc_name">Point of Contact</Label>
                <Input
                  id="poc_name"
                  value={formData.poc_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, poc_name: e.target.value }))}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="contact@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoicing_email">Invoicing Email</Label>
                <Input
                  id="invoicing_email"
                  type="email"
                  value={formData.invoicing_email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, invoicing_email: e.target.value }))}
                  placeholder="billing@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_website">Company Website</Label>
                <Input
                  id="company_website"
                  value={formData.company_website}
                  onChange={(e) => setFormData((prev) => ({ ...prev, company_website: e.target.value }))}
                  placeholder="https://company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retainer_type">Client Type</Label>
              <Select
                value={formData.retainer_type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, retainer_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-Time</SelectItem>
                  <SelectItem value="hourly">Retainer (Hourly)</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.retainer_type === 'hourly' && (
              <div className="pt-2 border-t space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Retainer Details</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="payment_schedule">Payment Schedule</Label>
                    <Select
                      value={formData.payment_schedule}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, payment_schedule: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1st">1st of the month</SelectItem>
                        <SelectItem value="15th">15th of the month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hours_allocated">Monthly Hours</Label>
                    <Input
                      id="hours_allocated"
                      type="number"
                      min={1}
                      value={formData.hours_allocated}
                      onChange={(e) => setFormData((prev) => ({ ...prev, hours_allocated: e.target.value }))}
                      placeholder="40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="hourly_rate"
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData((prev) => ({ ...prev, hourly_rate: e.target.value }))}
                        placeholder="150.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveChanges} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact & Billing Details */}
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between shrink-0">
          <CardTitle className="text-lg">Contact & Billing</CardTitle>
          {canEditCompanyInfo && (
            <Button variant="ghost" size="sm" onClick={startEditing}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Point of Contact
            </p>
            <p className="text-sm font-medium">{company.poc_name || 'Not set'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Contact Email
            </p>
            <p className="text-sm font-medium">{company.contact_email || company.billing_email || 'Not set'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Invoicing Email
            </p>
            <p className="text-sm font-medium">{company.invoicing_email || company.billing_email || 'Not set'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Company Website
            </p>
            {company.company_website ? (
              <a
                href={company.company_website.startsWith('http') ? company.company_website : `https://${company.company_website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                {company.company_website}
              </a>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">Not set</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Retainer / Client Type Details */}
      <Card className="flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle className="text-lg">
            {company.retainer_type === 'hourly' ? 'Retainer Details' : 'Client Type'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          {company.retainer_type === 'hourly' ? (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Payment Schedule
                </p>
                {company.payment_schedule ? (
                  <Badge variant="secondary">{company.payment_schedule} of the month</Badge>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">Not set</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Hourly Rate
                </p>
                <p className="font-medium text-xl">
                  ${company.hourly_rate?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="pt-1">
                <HourTracker
                  hoursUsed={hoursUsed}
                  monthlyHours={hoursAllocated}
                  showWarning={true}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 gap-2">
              <Badge variant="secondary" className="text-sm px-3 py-1 capitalize">
                {company.retainer_type === 'one_time' ? 'One-Time Project' : 'Unlimited'}
              </Badge>
              <p className="text-xs text-muted-foreground text-center">
                {company.retainer_type === 'one_time'
                  ? 'Billed per project, not on retainer.'
                  : 'Unlimited scope — no hourly tracking.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// Keep old export name for backward compatibility
export const CompanyInfoTab = CompanyInfoCards;
