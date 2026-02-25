import {
  Lightbulb,
  PenLine,
  Palette,
  Settings2,
  Rocket,
  TrendingUp,
  Circle,
  Play,
  Ban,
  Eye,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Workflow Phases — the sequential delivery pipeline
// ---------------------------------------------------------------------------

export type WorkflowPhase =
  | 'shaping'
  | 'sales_copy'
  | 'design'
  | 'crm_config'
  | 'launch_analyze'
  | 'cro';

export interface PhaseConfig {
  label: string;
  color: string;       // Tailwind bg + text classes
  icon: LucideIcon;
  defaultDays: number | null; // null = no default duration
  order: number;
}

export const PHASES: Record<WorkflowPhase, PhaseConfig> = {
  shaping: {
    label: 'Shaping',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    icon: Lightbulb,
    defaultDays: null,
    order: 0,
  },
  sales_copy: {
    label: 'Sales Copy',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: PenLine,
    defaultDays: 14,
    order: 1,
  },
  design: {
    label: 'Design',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Palette,
    defaultDays: 14,
    order: 2,
  },
  crm_config: {
    label: 'CRM Config',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Settings2,
    defaultDays: 7,
    order: 3,
  },
  launch_analyze: {
    label: 'Launch & Analyze',
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    icon: Rocket,
    defaultDays: 7,
    order: 4,
  },
  cro: {
    label: 'CRO',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: TrendingUp,
    defaultDays: null,
    order: 5,
  },
};

export const PHASE_ORDER: WorkflowPhase[] = [
  'shaping',
  'sales_copy',
  'design',
  'crm_config',
  'launch_analyze',
  'cro',
];

export function getNextPhase(current: WorkflowPhase): WorkflowPhase | null {
  const idx = PHASE_ORDER.indexOf(current);
  return idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : null;
}

// ---------------------------------------------------------------------------
// Project Statuses — Kanban columns
// ---------------------------------------------------------------------------

export type ProjectStatus =
  | 'queued'
  | 'in_progress'
  | 'blocked'
  | 'review'
  | 'complete';

export interface StatusConfig {
  label: string;
  color: string;         // badge classes
  columnColor: string;   // kanban column header bg
  icon: LucideIcon;
  order: number;
}

export const STATUSES: Record<ProjectStatus, StatusConfig> = {
  queued: {
    label: 'Queued',
    color: 'bg-muted text-muted-foreground',
    columnColor: 'bg-muted',
    icon: Circle,
    order: 0,
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    columnColor: 'bg-blue-50 dark:bg-blue-900/20',
    icon: Play,
    order: 1,
  },
  blocked: {
    label: 'Blocked',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    columnColor: 'bg-red-50 dark:bg-red-900/20',
    icon: Ban,
    order: 2,
  },
  review: {
    label: 'Review',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    columnColor: 'bg-orange-50 dark:bg-orange-900/20',
    icon: Eye,
    order: 3,
  },
  complete: {
    label: 'Complete',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    columnColor: 'bg-green-50 dark:bg-green-900/20',
    icon: CheckCircle2,
    order: 4,
  },
};

export const STATUS_ORDER: ProjectStatus[] = [
  'queued',
  'in_progress',
  'blocked',
  'review',
  'complete',
];

// ---------------------------------------------------------------------------
// Project Types
// ---------------------------------------------------------------------------

export type ProjectType =
  | 'copywriting'
  | 'design'
  | 'strategy'
  | 'cro'
  | 'other';

export interface ProjectTypeConfig {
  label: string;
  color: string;
}

export const PROJECT_TYPES: Record<ProjectType, ProjectTypeConfig> = {
  copywriting: {
    label: 'Copywriting',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  design: {
    label: 'Design',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  strategy: {
    label: 'Strategy',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  cro: {
    label: 'CRO',
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  other: {
    label: 'Other',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  },
};

// ---------------------------------------------------------------------------
// Priority Levels
// ---------------------------------------------------------------------------

export type Priority = 'urgent' | 'important' | 'normal' | 'queued';

export interface PriorityConfig {
  label: string;
  color: string;    // badge classes
  dotColor: string; // small indicator dot
  order: number;
}

export const PRIORITIES: Record<Priority, PriorityConfig> = {
  urgent: {
    label: 'Urgent',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    dotColor: 'bg-red-500',
    order: 0,
  },
  important: {
    label: 'Important',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    dotColor: 'bg-yellow-500',
    order: 1,
  },
  normal: {
    label: 'Normal',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dotColor: 'bg-green-500',
    order: 2,
  },
  queued: {
    label: 'Queued',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    dotColor: 'bg-purple-500',
    order: 3,
  },
};

// ---------------------------------------------------------------------------
// Retainer Types
// ---------------------------------------------------------------------------

export type RetainerType = 'retainer' | 'one_time';

export interface RetainerConfig {
  label: string;
  description: string;
}

export const RETAINER_TYPES: Record<RetainerType, RetainerConfig> = {
  retainer: {
    label: 'Retainer',
    description: 'Monthly hourly bucket (30hr min @ $150/hr, overages @ $170-175/hr)',
  },
  one_time: {
    label: 'One-Time',
    description: 'Lump sum project fee',
  },
};

// ---------------------------------------------------------------------------
// Notification Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'file_upload'
  | 'file_flagged'
  | 'flag_resolved'
  | 'file_pinned'
  | 'project_blocked'
  | 'project_review'
  | 'project_phase_advanced'
  | 'hours_warning'
  | 'hours_exceeded'
  | 'message_received'
  | 'request_submitted'
  | 'task_assigned';

// ---------------------------------------------------------------------------
// File Categories
// ---------------------------------------------------------------------------

export type FileCategory =
  | 'documents'
  | 'images'
  | 'designs'
  | 'testimonials'
  | 'video'
  | 'links'
  | 'brand'
  | 'content'
  | 'copy'
  | 'other';

export const FILE_CATEGORIES: Record<FileCategory, { label: string }> = {
  documents: { label: 'Documents' },
  images: { label: 'Images' },
  designs: { label: 'Designs' },
  testimonials: { label: 'Testimonials' },
  video: { label: 'Video' },
  links: { label: 'Links' },
  brand: { label: 'Brand' },
  content: { label: 'Content' },
  copy: { label: 'Copy' },
  other: { label: 'Other' },
};

// ---------------------------------------------------------------------------
// Link type detection
// ---------------------------------------------------------------------------

export function detectLinkType(url: string): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes('loom.com')) return 'loom';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('vimeo.com')) return 'vimeo';
  if (lower.includes('docs.google.com')) return 'google_docs';
  if (lower.includes('sheets.google.com')) return 'google_sheets';
  if (lower.includes('drive.google.com')) return 'google_drive';
  if (lower.includes('figma.com')) return 'figma';
  if (lower.includes('canva.com')) return 'canva';
  if (lower.includes('notion.so') || lower.includes('notion.site')) return 'notion';
  if (lower.includes('dropbox.com')) return 'dropbox';
  if (lower.includes('miro.com')) return 'miro';
  if (lower.includes('airtable.com')) return 'airtable';
  return 'other';
}

// ---------------------------------------------------------------------------
// External platform detection (for files)
// ---------------------------------------------------------------------------

export function detectExternalPlatform(url: string): string | null {
  const type = detectLinkType(url);
  if (!type || type === 'other') return null;
  const platformNames: Record<string, string> = {
    loom: 'Loom',
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    google_docs: 'Google Docs',
    google_sheets: 'Google Sheets',
    google_drive: 'Google Drive',
    figma: 'Figma',
    canva: 'Canva',
    notion: 'Notion',
    dropbox: 'Dropbox',
    miro: 'Miro',
    airtable: 'Airtable',
  };
  return platformNames[type] || null;
}
