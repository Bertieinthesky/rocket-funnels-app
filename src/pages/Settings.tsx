import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Building2, 
  Bell, 
  Palette, 
  Shield,
  Clock
} from 'lucide-react';

export default function Settings() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">You don't have access to this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your portal configuration</p>
        </div>

        {/* Agency Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Agency Information</CardTitle>
            </div>
            <CardDescription>
              Your agency branding and details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agency-name">Agency Name</Label>
                <Input id="agency-name" placeholder="Your Agency" defaultValue="Client Portal" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency-email">Support Email</Label>
                <Input id="agency-email" type="email" placeholder="support@agency.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agency-logo">Logo URL</Label>
              <Input id="agency-logo" placeholder="https://..." />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure email notification settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New project notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Email team when clients submit new projects
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Deliverable approvals</Label>
                <p className="text-sm text-muted-foreground">
                  Email team when clients approve or request changes
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Client updates</Label>
                <p className="text-sm text-muted-foreground">
                  Email clients when projects are updated
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Hours Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Hours Management</CardTitle>
            </div>
            <CardDescription>
              Monthly hours tracking settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-reset hours monthly</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically reset client hours on the 1st of each month
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="pt-2">
              <Button variant="outline">Reset All Client Hours Now</Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>
              Authentication and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Google Sign-In</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to sign in with Google
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Magic Link Sign-In</Label>
                <p className="text-sm text-muted-foreground">
                  Allow passwordless email authentication
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}