import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Clock, FolderKanban, Repeat, Zap } from 'lucide-react';

interface ClientCardProps {
  id: string;
  name: string;
  logo_url: string | null;
  retainer_type: 'unlimited' | 'hourly' | 'one_time';
  hours_allocated: number | null;
  hours_used: number | null;
  active_projects: number;
  project_count: number;
}

export function ClientCard({
  id,
  name,
  logo_url,
  retainer_type,
  hours_allocated,
  hours_used,
  active_projects,
  project_count,
}: ClientCardProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const hoursPercentage = hours_allocated && hours_allocated > 0 
    ? Math.min(((hours_used || 0) / hours_allocated) * 100, 100)
    : 0;

  const isOverBudget = (hours_used || 0) > (hours_allocated || 0) && hours_allocated && hours_allocated > 0;

  const getRetainerConfig = () => {
    switch (retainer_type) {
      case 'one_time':
        return {
          label: 'One-Time',
          icon: Zap,
          variant: 'outline' as const,
          className: 'border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/20',
        };
      case 'hourly':
        return {
          label: 'Retainer',
          icon: Repeat,
          variant: 'outline' as const,
          className: 'border-emerald-500/50 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20',
        };
      case 'unlimited':
      default:
        return {
          label: 'Unlimited',
          icon: Repeat,
          variant: 'outline' as const,
          className: 'border-primary/50 text-primary bg-primary/5',
        };
    }
  };

  const retainerConfig = getRetainerConfig();
  const RetainerIcon = retainerConfig.icon;

  return (
    <Link to={`/clients/${id}`}>
      <Card className="group hover:shadow-lg hover:border-primary/30 transition-all duration-200 cursor-pointer h-full bg-card">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="h-14 w-14 ring-2 ring-background shadow-sm">
              <AvatarImage src={logo_url || ''} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold text-lg">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                {name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={retainerConfig.className}>
                  <RetainerIcon className="h-3 w-3 mr-1" />
                  {retainerConfig.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <FolderKanban className="h-4 w-4" />
              <span className="font-medium text-foreground">{active_projects}</span>
              <span>active</span>
            </div>
            <span className="text-muted-foreground/40">•</span>
            <div>
              <span className="font-medium text-foreground">{project_count}</span>
              <span> total</span>
            </div>
          </div>

          {/* Hours Progress - Only for retainer clients */}
          {retainer_type === 'hourly' && hours_allocated && hours_allocated > 0 && (
            <div className="space-y-2 pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Hours Used</span>
                </div>
                <span className={`font-medium ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}>
                  {hours_used || 0} / {hours_allocated}h
                </span>
              </div>
              <Progress 
                value={hoursPercentage} 
                className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : hoursPercentage > 80 ? '[&>div]:bg-amber-500' : ''}`}
              />
              {isOverBudget && (
                <p className="text-xs text-destructive font-medium">
                  Over budget by {((hours_used || 0) - hours_allocated).toFixed(1)}h
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}