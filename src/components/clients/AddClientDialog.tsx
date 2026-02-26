import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { useCreateCompany } from '@/hooks/useCompanies';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';

export function AddClientDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [retainerType, setRetainerType] = useState<'hourly' | 'one_time'>('hourly');
  const [contactEmail, setContactEmail] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [pocName, setPocName] = useState('');
  const [website, setWebsite] = useState('');
  const [hoursAllocated, setHoursAllocated] = useState('30');
  const [hourlyRate, setHourlyRate] = useState('150');
  const [paymentSchedule, setPaymentSchedule] = useState<string>('1st');

  const createCompany = useCreateCompany();
  const { toast } = useToast();

  const resetForm = () => {
    setName('');
    setRetainerType('hourly');
    setContactEmail('');
    setBillingEmail('');
    setPocName('');
    setWebsite('');
    setHoursAllocated('30');
    setHourlyRate('150');
    setPaymentSchedule('1st');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    createCompany.mutate(
      {
        name: name.trim(),
        retainer_type: retainerType,
        contact_email: contactEmail || undefined,
        billing_email: billingEmail || undefined,
        poc_name: pocName || undefined,
        company_website: website || undefined,
        hours_allocated: retainerType === 'hourly' ? parseInt(hoursAllocated) || 30 : undefined,
        hourly_rate: retainerType === 'hourly' ? parseFloat(hourlyRate) || 150 : undefined,
        payment_schedule: retainerType === 'hourly' ? paymentSchedule : undefined,
      },
      {
        onSuccess: () => {
          toast({ title: 'Client created', description: `${name} has been added.` });
          resetForm();
          setOpen(false);
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to create client.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>Create a new client account to start managing their projects.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Company Name */}
          <div className="space-y-1.5">
            <Label htmlFor="company-name">Company Name *</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
            />
          </div>

          {/* POC Name */}
          <div className="space-y-1.5">
            <Label htmlFor="poc-name">Point of Contact</Label>
            <Input
              id="poc-name"
              value={pocName}
              onChange={(e) => setPocName(e.target.value)}
              placeholder="John Smith"
            />
          </div>

          {/* Emails row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Contact Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="john@acme.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billing-email">Billing Email</Label>
              <Input
                id="billing-email"
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="billing@acme.com"
              />
            </div>
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://acme.com"
            />
          </div>

          {/* Retainer Type */}
          <div className="space-y-1.5">
            <Label>Client Type</Label>
            <Select value={retainerType} onValueChange={(v) => setRetainerType(v as 'hourly' | 'one_time')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Retainer (Hourly)</SelectItem>
                <SelectItem value="one_time">One-Time Project</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Retainer-specific fields */}
          {retainerType === 'hourly' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="hours">Monthly Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  value={hoursAllocated}
                  onChange={(e) => setHoursAllocated(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rate">Hourly Rate ($)</Label>
                <Input
                  id="rate"
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Billing Cycle</Label>
                <Select value={paymentSchedule} onValueChange={setPaymentSchedule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st of month</SelectItem>
                    <SelectItem value="15th">15th of month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || createCompany.isPending}>
            {createCompany.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Create Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
