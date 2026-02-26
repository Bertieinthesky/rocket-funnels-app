import type { Tables } from '@/integrations/supabase/types';

type Project = Tables<'projects'>;
type Update = Tables<'updates'>;
type Task = Tables<'tasks'>;

export interface HealthSignal {
  name: string;
  score: number;
  maxScore: number;
  status: 'good' | 'warning' | 'critical';
  detail: string;
}

export interface HealthScoreResult {
  score: number;
  label: string;
  color: string;
  bgColor: string;
  signals: HealthSignal[];
}

interface HealthScoreInput {
  project: Project;
  updates: Update[];
  tasks: Task[];
}

function signalStatus(score: number, max: number): 'good' | 'warning' | 'critical' {
  const pct = max > 0 ? score / max : 1;
  if (pct >= 0.7) return 'good';
  if (pct >= 0.4) return 'warning';
  return 'critical';
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

export function computeHealthScore(input: HealthScoreInput): HealthScoreResult {
  const { project, updates, tasks } = input;
  const now = new Date();
  const signals: HealthSignal[] = [];

  // ── 1. Update Recency (25 pts) ────────────────────────────────────────
  const MAX_RECENCY = 25;
  let recencyScore = MAX_RECENCY;
  let recencyDetail = 'No updates yet';

  if (updates.length > 0) {
    const latestUpdate = updates.reduce((a, b) =>
      new Date(a.created_at) > new Date(b.created_at) ? a : b,
    );
    const daysSince = daysBetween(now, new Date(latestUpdate.created_at));

    if (daysSince <= 3) {
      recencyScore = MAX_RECENCY;
      recencyDetail = `Updated ${Math.round(daysSince)} day${Math.round(daysSince) !== 1 ? 's' : ''} ago`;
    } else if (daysSince <= 14) {
      recencyScore = Math.round(MAX_RECENCY * (1 - (daysSince - 3) / 11));
      recencyDetail = `Last update ${Math.round(daysSince)} days ago`;
    } else {
      recencyScore = 0;
      recencyDetail = `No update in ${Math.round(daysSince)} days`;
    }
  } else {
    recencyScore = MAX_RECENCY; // No penalty if no updates expected
    recencyDetail = 'No updates posted yet';
  }

  signals.push({
    name: 'Update Recency',
    score: recencyScore,
    maxScore: MAX_RECENCY,
    status: signalStatus(recencyScore, MAX_RECENCY),
    detail: recencyDetail,
  });

  // ── 2. Deadline Status (20 pts) ───────────────────────────────────────
  const MAX_DEADLINE = 20;
  let deadlineScore = MAX_DEADLINE;
  let deadlineDetail = 'No deadline set';

  const targetDate = project.target_date ? new Date(project.target_date) : null;
  const phaseDueDate = project.phase_due_date
    ? new Date(project.phase_due_date)
    : null;

  if (targetDate && targetDate < now) {
    deadlineScore = 0;
    deadlineDetail = `Overdue by ${Math.round(daysBetween(now, targetDate))} days`;
  } else if (phaseDueDate && phaseDueDate < now) {
    deadlineScore = 10;
    deadlineDetail = `Phase overdue by ${Math.round(daysBetween(now, phaseDueDate))} days`;
  } else if (targetDate) {
    const daysLeft = daysBetween(targetDate, now);
    deadlineDetail =
      daysLeft <= 3
        ? `Due in ${Math.round(daysLeft)} day${Math.round(daysLeft) !== 1 ? 's' : ''}`
        : `On track — ${Math.round(daysLeft)} days remaining`;
  }

  signals.push({
    name: 'Deadline Status',
    score: deadlineScore,
    maxScore: MAX_DEADLINE,
    status: signalStatus(deadlineScore, MAX_DEADLINE),
    detail: deadlineDetail,
  });

  // ── 3. Revision Rate (15 pts) ─────────────────────────────────────────
  const MAX_REVISION = 15;
  const revisionCount = updates.filter(
    (u) => u.is_deliverable && u.is_approved === false,
  ).length;
  let revisionScore: number;
  let revisionDetail: string;

  if (revisionCount <= 1) {
    revisionScore = MAX_REVISION;
    revisionDetail =
      revisionCount === 0 ? 'No revisions' : '1 revision request';
  } else if (revisionCount === 2) {
    revisionScore = 10;
    revisionDetail = '2 revision requests';
  } else if (revisionCount === 3) {
    revisionScore = 5;
    revisionDetail = '3 revision requests';
  } else {
    revisionScore = 0;
    revisionDetail = `${revisionCount} revision requests`;
  }

  signals.push({
    name: 'Revision Rate',
    score: revisionScore,
    maxScore: MAX_REVISION,
    status: signalStatus(revisionScore, MAX_REVISION),
    detail: revisionDetail,
  });

  // ── 4. Task Completion (20 pts) ───────────────────────────────────────
  const MAX_TASKS = 20;
  let taskScore: number;
  let taskDetail: string;

  if (tasks.length === 0) {
    taskScore = MAX_TASKS;
    taskDetail = 'No tasks created';
  } else {
    const doneTasks = tasks.filter((t) => t.status === 'done').length;
    const ratio = doneTasks / tasks.length;
    taskScore = Math.round(MAX_TASKS * ratio);
    taskDetail = `${doneTasks}/${tasks.length} tasks complete (${Math.round(ratio * 100)}%)`;
  }

  signals.push({
    name: 'Task Completion',
    score: taskScore,
    maxScore: MAX_TASKS,
    status: signalStatus(taskScore, MAX_TASKS),
    detail: taskDetail,
  });

  // ── 5. Blocked Status (10 pts) ────────────────────────────────────────
  const MAX_BLOCKED = 10;
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;
  let blockedScore: number;
  let blockedDetail: string;

  if (project.is_blocked) {
    blockedScore = 0;
    blockedDetail = 'Project is blocked';
  } else if (blockedTasks > 0) {
    blockedScore = Math.max(0, MAX_BLOCKED - blockedTasks * 5);
    blockedDetail = `${blockedTasks} blocked task${blockedTasks > 1 ? 's' : ''}`;
  } else {
    blockedScore = MAX_BLOCKED;
    blockedDetail = 'No blockers';
  }

  signals.push({
    name: 'Blocked Status',
    score: blockedScore,
    maxScore: MAX_BLOCKED,
    status: signalStatus(blockedScore, MAX_BLOCKED),
    detail: blockedDetail,
  });

  // ── 6. Has Assignee (5 pts) ───────────────────────────────────────────
  const MAX_ASSIGNEE = 5;
  const assigneeScore = project.assigned_to ? MAX_ASSIGNEE : 0;

  signals.push({
    name: 'Has Assignee',
    score: assigneeScore,
    maxScore: MAX_ASSIGNEE,
    status: signalStatus(assigneeScore, MAX_ASSIGNEE),
    detail: project.assigned_to ? 'Assigned' : 'Unassigned',
  });

  // ── 7. Pending Deliverable (5 pts) ────────────────────────────────────
  const MAX_PENDING = 5;
  const pendingDeliverables = updates.filter(
    (u) => u.is_deliverable && u.is_approved === null,
  );
  let pendingScore = MAX_PENDING;
  let pendingDetail = 'No pending deliverables';

  if (pendingDeliverables.length > 0) {
    const oldest = pendingDeliverables.reduce((a, b) =>
      new Date(a.created_at) < new Date(b.created_at) ? a : b,
    );
    const pendingDays = daysBetween(now, new Date(oldest.created_at));
    if (pendingDays > 5) {
      pendingScore = 0;
      pendingDetail = `Deliverable pending review for ${Math.round(pendingDays)} days`;
    } else {
      pendingDetail = `Deliverable awaiting review (${Math.round(pendingDays)}d)`;
    }
  }

  signals.push({
    name: 'Pending Review',
    score: pendingScore,
    maxScore: MAX_PENDING,
    status: signalStatus(pendingScore, MAX_PENDING),
    detail: pendingDetail,
  });

  // ── Total ─────────────────────────────────────────────────────────────
  const totalScore = signals.reduce((sum, s) => sum + s.score, 0);

  let label: string;
  let color: string;
  let bgColor: string;

  if (totalScore >= 80) {
    label = 'Healthy';
    color = 'text-emerald-700 dark:text-emerald-400';
    bgColor = 'bg-emerald-100 dark:bg-emerald-900/30';
  } else if (totalScore >= 60) {
    label = 'Needs Attention';
    color = 'text-yellow-700 dark:text-yellow-400';
    bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
  } else if (totalScore >= 40) {
    label = 'At Risk';
    color = 'text-orange-700 dark:text-orange-400';
    bgColor = 'bg-orange-100 dark:bg-orange-900/30';
  } else {
    label = 'Critical';
    color = 'text-red-700 dark:text-red-400';
    bgColor = 'bg-red-100 dark:bg-red-900/30';
  }

  return { score: totalScore, label, color, bgColor, signals };
}
