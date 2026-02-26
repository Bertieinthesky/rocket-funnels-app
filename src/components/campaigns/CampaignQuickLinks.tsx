import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCompany, useUpdateCompany } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2,
  FileText,
  KeyRound,
  ExternalLink,
  Palette,
  Target,
  Plus,
  X,
  Link as LinkIcon,
} from 'lucide-react';

interface CampaignQuickLinksProps {
  companyId: string;
}

interface CustomLink {
  label: string;
  url: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function CampaignQuickLinks({ companyId }: CampaignQuickLinksProps) {
  const navigate = useNavigate();
  const { isTeam, isAdmin } = useAuth();
  const { data: company } = useCompany(companyId);
  const updateCompany = useUpdateCompany();
  const canEdit = isTeam || isAdmin;

  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  if (!company) return null;

  const hasIcp = !!company.icp_description;
  const hasBrief = !!company.brief_link || !!company.brief_content;
  const hasBrand =
    !!company.brand_voice ||
    (Array.isArray(company.brand_colors) && company.brand_colors.length > 0) ||
    (Array.isArray(company.brand_fonts) && company.brand_fonts.length > 0);

  const customLinks: CustomLink[] = Array.isArray((company as any).custom_links)
    ? (company as any).custom_links
    : [];

  const handleAddLink = () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    let url = newUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const updated = [...customLinks, { label: newLabel.trim(), url }];
    updateCompany.mutate({ id: company.id, custom_links: updated } as any);
    setNewLabel('');
    setNewUrl('');
    setAdding(false);
  };

  const handleRemoveLink = (index: number) => {
    const updated = customLinks.filter((_, i) => i !== index);
    updateCompany.mutate({ id: company.id, custom_links: updated } as any);
  };

  const linkRowClass =
    'flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/50 transition-colors group cursor-pointer';

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Quick Links
          </CardTitle>
          {canEdit && !adding && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={() => setAdding(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {/* Client */}
        <div
          className={linkRowClass}
          onClick={() => navigate(`/clients/${companyId}`)}
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={company.logo_url || ''} />
            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">
              {getInitials(company.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{company.name}</p>
            {company.industry && (
              <p className="text-[10px] text-muted-foreground">{company.industry}</p>
            )}
          </div>
          <Building2 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Brief */}
        {hasBrief && company.brief_link ? (
          <a
            href={company.brief_link}
            target="_blank"
            rel="noopener noreferrer"
            className={linkRowClass}
          >
            <div className="h-7 w-7 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Campaign Brief</p>
              <p className="text-[10px] text-muted-foreground">External link</p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ) : hasBrief ? (
          <div
            className={linkRowClass}
            onClick={() => navigate(`/clients/${companyId}?tab=brief`)}
          >
            <div className="h-7 w-7 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Campaign Brief</p>
            </div>
          </div>
        ) : null}

        {/* ICP */}
        {hasIcp && (
          <div
            className={linkRowClass}
            onClick={() => navigate(`/clients/${companyId}?tab=brief`)}
          >
            <div className="h-7 w-7 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <Target className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">ICP & Targeting</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {company.icp_description?.slice(0, 50)}
                {(company.icp_description?.length || 0) > 50 ? '...' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Brand */}
        {hasBrand && (
          <div
            className={linkRowClass}
            onClick={() => navigate(`/clients/${companyId}?tab=brief`)}
          >
            <div className="h-7 w-7 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
              <Palette className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Brand Guidelines</p>
              <div className="flex gap-1 mt-0.5">
                {Array.isArray(company.brand_colors) &&
                  (company.brand_colors as string[]).slice(0, 5).map((c, i) => (
                    <div
                      key={i}
                      className="h-3 w-3 rounded-full border border-white/50"
                      style={{ backgroundColor: c }}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Assets */}
        <div
          className={linkRowClass}
          onClick={() => navigate(`/clients/${companyId}?tab=files`)}
        >
          <div className="h-7 w-7 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Client Assets</p>
            <p className="text-[10px] text-muted-foreground">Files & media</p>
          </div>
        </div>

        {/* Passwords */}
        <div
          className={linkRowClass}
          onClick={() => navigate(`/clients/${companyId}?tab=passwords`)}
        >
          <div className="h-7 w-7 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <KeyRound className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Passwords</p>
            <p className="text-[10px] text-muted-foreground">Stored credentials</p>
          </div>
        </div>

        {/* Custom Links */}
        {customLinks.map((link, i) => (
          <div key={i} className="flex items-center gap-1">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{link.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{link.url}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-500"
                onClick={() => handleRemoveLink(i)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}

        {/* Add Link Form */}
        {adding && (
          <div className="space-y-1.5 pt-1.5 border-t">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Link name"
              className="h-7 text-xs"
              autoFocus
            />
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
            />
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => { setAdding(false); setNewLabel(''); setNewUrl(''); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={handleAddLink}
                disabled={!newLabel.trim() || !newUrl.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
