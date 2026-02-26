import { useMemo } from 'react';
import { useProject } from '@/hooks/useProjects';
import { useUpdates } from '@/hooks/useUpdates';
import { useTasks } from '@/hooks/useTasks';
import { computeHealthScore, type HealthScoreResult } from '@/lib/healthScore';

export function useCampaignHealth(projectId: string | undefined) {
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: updates = [], isLoading: updatesLoading } = useUpdates(projectId);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks({
    projectId,
    includeDone: true,
  });

  const isLoading = projectLoading || updatesLoading || tasksLoading;

  const health = useMemo<HealthScoreResult | null>(() => {
    if (!project) return null;
    return computeHealthScore({ project, updates, tasks });
  }, [project, updates, tasks]);

  return { health, isLoading };
}
