import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  FolderKanban,
  ListChecks,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Hook to fetch all tasks for a company's projects
export function useCompanyTasks(companyId: string | undefined, projectIds: string[]) {
  return useQuery({
    queryKey: ['company-tasks', companyId, projectIds],
    queryFn: async () => {
      if (!companyId || projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, project_id, status')
        .in('project_id', projectIds)
        .neq('status', 'done')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && projectIds.length > 0,
  });
}

export function CampaignTaskCombobox({
  companyId,
  projectId,
  taskId,
  projects,
  onChange,
}: {
  companyId: string;
  projectId: string;
  taskId: string;
  projects: Array<{ id: string; name: string; company_id: string }>;
  onChange: (projectId: string, taskId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const companyProjects = projects.filter((p) => p.company_id === companyId);
  const projectIdList = companyProjects.map((p) => p.id);
  const { data: tasks = [] } = useCompanyTasks(companyId, projectIdList);

  // Build display text
  const selectedProject = companyProjects.find((p) => p.id === projectId);
  const selectedTask = tasks.find((t) => t.id === taskId);

  let displayText = 'Select campaign / task';
  if (selectedTask && selectedProject) {
    displayText = `${selectedProject.name} > ${selectedTask.title}`;
  } else if (selectedProject) {
    displayText = selectedProject.name;
  }

  // Group tasks by project
  const tasksByProject = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const list = tasksByProject.get(task.project_id) || [];
    list.push(task);
    tasksByProject.set(task.project_id, list);
  }

  if (!companyId) {
    return (
      <Button
        variant="outline"
        className="w-full h-8 justify-between text-xs text-muted-foreground"
        disabled
      >
        Select a client first
        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full h-8 justify-between text-xs font-normal',
            !projectId && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search campaigns & tasks..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-3 text-xs">No campaigns found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange('', '');
                  setOpen(false);
                }}
                className="text-xs"
              >
                <Check
                  className={cn(
                    'mr-2 h-3 w-3',
                    !projectId ? 'opacity-100' : 'opacity-0',
                  )}
                />
                None
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            {companyProjects.map((project) => {
              const projectTasks = tasksByProject.get(project.id) || [];
              return (
                <CommandGroup key={project.id} heading={project.name}>
                  <CommandItem
                    value={`campaign:${project.id}:${project.name}`}
                    onSelect={() => {
                      onChange(project.id, '');
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-3 w-3',
                        projectId === project.id && !taskId ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <FolderKanban className="mr-1.5 h-3 w-3 text-muted-foreground" />
                    All of {project.name}
                  </CommandItem>

                  {projectTasks.map((task) => (
                    <CommandItem
                      key={task.id}
                      value={`task:${task.id}:${task.title}:${project.name}`}
                      onSelect={() => {
                        onChange(project.id, task.id);
                        setOpen(false);
                      }}
                      className="text-xs pl-6"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-3 w-3',
                          taskId === task.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <ListChecks className="mr-1.5 h-3 w-3 text-muted-foreground" />
                      {task.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
