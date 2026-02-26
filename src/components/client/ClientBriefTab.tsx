import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { useUpdateCompany, type Company } from '@/hooks/useCompanies';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Pencil,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  Target,
  Megaphone,
  Palette,
  Type,
  FileText,
  Building2,
  StickyNote,
  Loader2,
} from 'lucide-react';

interface ClientBriefTabProps {
  company: Company;
}

const LINK_TYPES = [
  { value: 'google_docs', label: 'Google Docs' },
  { value: 'notion', label: 'Notion' },
  { value: 'loom', label: 'Loom' },
  { value: 'figma', label: 'Figma' },
  { value: 'other', label: 'Other' },
];

export function ClientBriefCard({ company }: ClientBriefTabProps) {
  const { toast } = useToast();
  const { canEditCompanyInfo } = usePermissions();
  const updateCompany = useUpdateCompany();
  const [isEditing, setIsEditing] = useState(false);

  const brandColors = Array.isArray(company.brand_colors)
    ? (company.brand_colors as string[])
    : [];
  const brandFonts = Array.isArray(company.brand_fonts)
    ? (company.brand_fonts as string[])
    : [];

  // Draft state for edit dialog
  const [icpDraft, setIcpDraft] = useState('');
  const [voiceDraft, setVoiceDraft] = useState('');
  const [industryDraft, setIndustryDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [briefContentDraft, setBriefContentDraft] = useState('');
  const [briefLinkDraft, setBriefLinkDraft] = useState('');
  const [briefLinkTypeDraft, setBriefLinkTypeDraft] = useState('');
  const [colorsDraft, setColorsDraft] = useState<string[]>([]);
  const [fontsDraft, setFontsDraft] = useState<string[]>([]);
  const [newColor, setNewColor] = useState('#000000');
  const [newFont, setNewFont] = useState('');

  const startEditing = () => {
    setIcpDraft(company.icp_description || '');
    setVoiceDraft(company.brand_voice || '');
    setIndustryDraft(company.industry || '');
    setNotesDraft(company.notes || '');
    setBriefContentDraft(company.brief_content || '');
    setBriefLinkDraft(company.brief_link || '');
    setBriefLinkTypeDraft(company.brief_link_type || 'other');
    setColorsDraft([...brandColors]);
    setFontsDraft([...brandFonts]);
    setNewColor('#000000');
    setNewFont('');
    setIsEditing(true);
  };

  const saveAll = () => {
    updateCompany.mutate(
      {
        id: company.id,
        icp_description: icpDraft || null,
        brand_voice: voiceDraft || null,
        industry: industryDraft || null,
        notes: notesDraft || null,
        brief_content: briefContentDraft || null,
        brief_link: briefLinkDraft || null,
        brief_link_type: briefLinkTypeDraft || null,
        brand_colors: colorsDraft,
        brand_fonts: fontsDraft,
      } as any,
      {
        onSuccess: () => {
          toast({ title: 'Brief updated successfully' });
          setIsEditing(false);
        },
        onError: () => {
          toast({ title: 'Failed to save changes', variant: 'destructive' });
        },
      },
    );
  };

  return (
    <>
      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client Brief</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-1">
            {/* Industry */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Industry
              </Label>
              <Input
                value={industryDraft}
                onChange={(e) => setIndustryDraft(e.target.value)}
                placeholder="e.g. SaaS, E-commerce, Healthcare"
              />
            </div>

            {/* ICP */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Ideal Customer Profile
              </Label>
              <Textarea
                value={icpDraft}
                onChange={(e) => setIcpDraft(e.target.value)}
                rows={3}
                placeholder="Demographics, pain points, goals..."
              />
            </div>

            {/* Brand Voice */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Megaphone className="h-3.5 w-3.5" />
                Brand Voice & Tone
              </Label>
              <Textarea
                value={voiceDraft}
                onChange={(e) => setVoiceDraft(e.target.value)}
                rows={3}
                placeholder="Professional, friendly, technical..."
              />
            </div>

            {/* Brand Colors */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" />
                Brand Colors
              </Label>
              <div className="flex flex-wrap gap-2">
                {colorsDraft.map((color, i) => (
                  <div key={i} className="flex items-center gap-1.5 border rounded-md px-2 py-1">
                    <div className="h-5 w-5 rounded border" style={{ backgroundColor: color }} />
                    <span className="text-xs font-mono">{color}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setColorsDraft(colorsDraft.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="h-8 w-8 rounded border cursor-pointer"
                />
                <Input
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-28 font-mono text-xs h-8"
                  placeholder="#000000"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    if (newColor && !colorsDraft.includes(newColor)) {
                      setColorsDraft([...colorsDraft, newColor]);
                      setNewColor('#000000');
                    }
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Brand Fonts */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5" />
                Brand Fonts
              </Label>
              <div className="flex flex-wrap gap-2">
                {fontsDraft.map((font, i) => (
                  <Badge key={i} variant="secondary" className="gap-1.5 pr-1">
                    {font}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() => setFontsDraft(fontsDraft.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newFont}
                  onChange={(e) => setNewFont(e.target.value)}
                  className="h-8 text-sm"
                  placeholder="e.g. Outfit, Inter, Playfair Display"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFont.trim()) {
                      e.preventDefault();
                      if (!fontsDraft.includes(newFont.trim())) {
                        setFontsDraft([...fontsDraft, newFont.trim()]);
                      }
                      setNewFont('');
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    if (newFont.trim() && !fontsDraft.includes(newFont.trim())) {
                      setFontsDraft([...fontsDraft, newFont.trim()]);
                      setNewFont('');
                    }
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Campaign Brief */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Campaign Brief
              </Label>
              <div className="flex gap-2">
                <Select value={briefLinkTypeDraft} onValueChange={setBriefLinkTypeDraft}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LINK_TYPES.map((lt) => (
                      <SelectItem key={lt.value} value={lt.value} className="text-xs">
                        {lt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={briefLinkDraft}
                  onChange={(e) => setBriefLinkDraft(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-xs flex-1"
                />
              </div>
              <Textarea
                value={briefContentDraft}
                onChange={(e) => setBriefContentDraft(e.target.value)}
                rows={3}
                placeholder="Campaign brief, objectives, key messaging..."
              />
            </div>

            {/* General Notes */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <StickyNote className="h-3.5 w-3.5" />
                General Notes
              </Label>
              <Textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={3}
                placeholder="Any additional notes about this client..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveAll} disabled={updateCompany.isPending}>
                {updateCompany.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                {updateCompany.isPending ? 'Saving...' : 'Save All'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Read-Only Card */}
      <Card className="flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between shrink-0 pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Client Brief
          </CardTitle>
          {canEditCompanyInfo && (
            <Button variant="ghost" size="sm" onClick={startEditing}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-3">
          {/* Industry */}
          <div>
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-0.5">
              <Building2 className="h-3 w-3" />
              Industry
            </p>
            <p className="text-sm">{company.industry || 'Not set'}</p>
          </div>

          <Separator />

          {/* ICP */}
          <div>
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-0.5">
              <Target className="h-3 w-3" />
              Ideal Customer Profile
            </p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
              {company.icp_description || 'Not defined'}
            </p>
          </div>

          <Separator />

          {/* Brand Voice */}
          <div>
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-0.5">
              <Megaphone className="h-3 w-3" />
              Brand Voice
            </p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
              {company.brand_voice || 'Not defined'}
            </p>
          </div>

          <Separator />

          {/* Colors & Fonts row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <Palette className="h-3 w-3" />
                Colors
              </p>
              {brandColors.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {brandColors.map((color, i) => (
                    <div
                      key={i}
                      className="h-6 w-6 rounded border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">None</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <Type className="h-3 w-3" />
                Fonts
              </p>
              {brandFonts.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {brandFonts.map((font, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] h-5 px-1.5">
                      {font}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">None</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Campaign Brief */}
          <div>
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-0.5">
              <FileText className="h-3 w-3" />
              Campaign Brief
            </p>
            {company.brief_link && (
              <a
                href={company.brief_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-1"
              >
                <ExternalLink className="h-3 w-3" />
                View Brief
                {company.brief_link_type && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 ml-0.5">
                    {LINK_TYPES.find((lt) => lt.value === company.brief_link_type)?.label ||
                      company.brief_link_type}
                  </Badge>
                )}
              </a>
            )}
            {company.brief_content ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                {company.brief_content}
              </p>
            ) : !company.brief_link ? (
              <p className="text-sm text-muted-foreground">No brief added</p>
            ) : null}
          </div>

          {/* General Notes */}
          {company.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-0.5">
                  <StickyNote className="h-3 w-3" />
                  General Notes
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                  {company.notes}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// Keep old export name for backward compatibility
export const ClientBriefTab = ClientBriefCard;
