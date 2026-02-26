import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateCompany, type Company } from '@/hooks/useCompanies';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Pencil,
  Save,
  X,
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

export function ClientBriefTab({ company }: ClientBriefTabProps) {
  const { toast } = useToast();
  const { canEditCompanyInfo } = usePermissions();
  const updateCompany = useUpdateCompany();
  const [editing, setEditing] = useState<string | null>(null);

  // Parse JSON arrays safely
  const brandColors = Array.isArray(company.brand_colors)
    ? (company.brand_colors as string[])
    : [];
  const brandFonts = Array.isArray(company.brand_fonts)
    ? (company.brand_fonts as string[])
    : [];

  // Local drafts for each section
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

  const startEditing = (section: string) => {
    setEditing(section);
    switch (section) {
      case 'icp':
        setIcpDraft(company.icp_description || '');
        break;
      case 'voice':
        setVoiceDraft(company.brand_voice || '');
        break;
      case 'industry':
        setIndustryDraft(company.industry || '');
        break;
      case 'notes':
        setNotesDraft(company.notes || '');
        break;
      case 'brief':
        setBriefContentDraft(company.brief_content || '');
        setBriefLinkDraft(company.brief_link || '');
        setBriefLinkTypeDraft(company.brief_link_type || 'other');
        break;
      case 'colors':
        setColorsDraft([...brandColors]);
        setNewColor('#000000');
        break;
      case 'fonts':
        setFontsDraft([...brandFonts]);
        setNewFont('');
        break;
    }
  };

  const saveField = (updates: Record<string, unknown>) => {
    updateCompany.mutate(
      { id: company.id, ...updates } as any,
      {
        onSuccess: () => {
          toast({ title: 'Updated successfully' });
          setEditing(null);
        },
        onError: () => {
          toast({
            title: 'Error',
            description: 'Failed to save changes.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const EditButton = ({ section }: { section: string }) =>
    canEditCompanyInfo && editing !== section ? (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground"
        onClick={() => startEditing(section)}
      >
        <Pencil className="h-3 w-3 mr-1" />
        Edit
      </Button>
    ) : null;

  const SaveCancelButtons = ({
    onSave,
  }: {
    onSave: () => void;
  }) => (
    <div className="flex justify-end gap-2 mt-2">
      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
        <X className="h-3 w-3 mr-1" />
        Cancel
      </Button>
      <Button size="sm" onClick={onSave}>
        <Save className="h-3 w-3 mr-1" />
        Save
      </Button>
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ICP */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Ideal Customer Profile
            </CardTitle>
            <EditButton section="icp" />
          </div>
        </CardHeader>
        <CardContent>
          {editing === 'icp' ? (
            <div>
              <Textarea
                value={icpDraft}
                onChange={(e) => setIcpDraft(e.target.value)}
                rows={4}
                placeholder="Describe the ideal customer — demographics, pain points, goals..."
                autoFocus
              />
              <SaveCancelButtons
                onSave={() =>
                  saveField({ icp_description: icpDraft || null })
                }
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {company.icp_description || 'No ICP defined yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Brand Voice */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              Brand Voice & Tone
            </CardTitle>
            <EditButton section="voice" />
          </div>
        </CardHeader>
        <CardContent>
          {editing === 'voice' ? (
            <div>
              <Textarea
                value={voiceDraft}
                onChange={(e) => setVoiceDraft(e.target.value)}
                rows={4}
                placeholder="Professional, friendly, technical... describe the brand's communication style"
                autoFocus
              />
              <SaveCancelButtons
                onSave={() =>
                  saveField({ brand_voice: voiceDraft || null })
                }
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {company.brand_voice || 'No brand voice defined yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              Brand Colors
            </CardTitle>
            <EditButton section="colors" />
          </div>
        </CardHeader>
        <CardContent>
          {editing === 'colors' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {colorsDraft.map((color, i) => (
                  <div key={i} className="flex items-center gap-1.5 border rounded-md px-2 py-1">
                    <div
                      className="h-5 w-5 rounded border"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-mono">{color}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() =>
                        setColorsDraft(colorsDraft.filter((_, idx) => idx !== i))
                      }
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
              <SaveCancelButtons
                onSave={() => saveField({ brand_colors: colorsDraft })}
              />
            </div>
          ) : brandColors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {brandColors.map((color, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div
                    className="h-6 w-6 rounded border"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono text-muted-foreground">
                    {color}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No colors defined yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Brand Fonts */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              Brand Fonts
            </CardTitle>
            <EditButton section="fonts" />
          </div>
        </CardHeader>
        <CardContent>
          {editing === 'fonts' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {fontsDraft.map((font, i) => (
                  <Badge key={i} variant="secondary" className="gap-1.5 pr-1">
                    {font}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={() =>
                        setFontsDraft(fontsDraft.filter((_, idx) => idx !== i))
                      }
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
              <SaveCancelButtons
                onSave={() => saveField({ brand_fonts: fontsDraft })}
              />
            </div>
          ) : brandFonts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {brandFonts.map((font, i) => (
                <Badge key={i} variant="secondary">
                  {font}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No fonts defined yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Industry */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Industry
            </CardTitle>
            <EditButton section="industry" />
          </div>
        </CardHeader>
        <CardContent>
          {editing === 'industry' ? (
            <div>
              <Input
                value={industryDraft}
                onChange={(e) => setIndustryDraft(e.target.value)}
                placeholder="e.g. SaaS, E-commerce, Healthcare"
                autoFocus
              />
              <SaveCancelButtons
                onSave={() =>
                  saveField({ industry: industryDraft || null })
                }
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {company.industry || 'Not set.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Brief / External Link */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Campaign Brief
            </CardTitle>
            <EditButton section="brief" />
          </div>
        </CardHeader>
        <CardContent>
          {editing === 'brief' ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Brief Link (external)</Label>
                <div className="flex gap-2">
                  <Select
                    value={briefLinkTypeDraft}
                    onValueChange={setBriefLinkTypeDraft}
                  >
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
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Brief Content (internal notes)</Label>
                <Textarea
                  value={briefContentDraft}
                  onChange={(e) => setBriefContentDraft(e.target.value)}
                  rows={4}
                  placeholder="Campaign brief, objectives, key messaging..."
                />
              </div>
              <SaveCancelButtons
                onSave={() =>
                  saveField({
                    brief_content: briefContentDraft || null,
                    brief_link: briefLinkDraft || null,
                    brief_link_type: briefLinkTypeDraft || null,
                  })
                }
              />
            </div>
          ) : (
            <div className="space-y-2">
              {company.brief_link && (
                <a
                  href={company.brief_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Brief
                  {company.brief_link_type && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1 ml-1">
                      {LINK_TYPES.find((lt) => lt.value === company.brief_link_type)
                        ?.label || company.brief_link_type}
                    </Badge>
                  )}
                </a>
              )}
              {company.brief_content ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {company.brief_content}
                </p>
              ) : !company.brief_link ? (
                <p className="text-sm text-muted-foreground">No brief added yet.</p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              General Notes
            </CardTitle>
            <EditButton section="notes" />
          </div>
        </CardHeader>
        <CardContent>
          {editing === 'notes' ? (
            <div>
              <Textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={4}
                placeholder="Any additional notes about this client..."
                autoFocus
              />
              <SaveCancelButtons
                onSave={() => saveField({ notes: notesDraft || null })}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {company.notes || 'No notes.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
