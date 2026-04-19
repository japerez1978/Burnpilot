import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Folder, Plus } from 'lucide-react';
import { projectFormSchema, type ProjectFormValues } from '@burnpilot/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useSessionStore } from '@/store/sessionStore';

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  archived_at: string | null;
};

export function ProjectSidebarSection() {
  const user = useSessionStore((s) => s.session?.user);
  const configured = isSupabaseConfigured();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const projectsQuery = useQuery({
    queryKey: ['projects', user?.id],
    enabled: configured && Boolean(user?.id),
    queryFn: async (): Promise<ProjectRow[]> => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, archived_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjectRow[];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { name: '', description: '' },
  });

  const archiveMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('projects')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
        })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['project-summary', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['savings-plan', user?.id] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('projects').insert({
        user_id: user!.id,
        name: values.name.trim(),
        description: values.description?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', user?.id] });
      reset();
      setOpen(false);
    },
  });

  return (
    <div className="mt-auto flex flex-1 flex-col border-t border-bg-border p-2">
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Proyectos</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded p-1 text-accent-green hover:bg-bg-card"
          title="Nuevo proyecto"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-48 space-y-0.5 overflow-y-auto px-1">
        {projectsQuery.isLoading ? (
          <p className="px-2 text-xs text-fg-muted">Cargando…</p>
        ) : projectsQuery.isError ? (
          <p className="px-2 text-xs text-accent-amber">No se pudieron cargar proyectos.</p>
        ) : projectsQuery.data?.length === 0 ? (
          <p className="px-2 text-xs text-fg-muted">Ninguno aún.</p>
        ) : (
          projectsQuery.data?.map((p) => (
            <div
              key={p.id}
              className="group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-fg-muted"
            >
              <Link
                to={`/projects/${p.id}`}
                className="flex min-w-0 flex-1 items-center gap-2 truncate rounded hover:text-accent-green"
                title={p.name}
              >
                <Folder className="h-3.5 w-3.5 shrink-0 text-accent-green/80" />
                <span className="truncate text-fg-primary">{p.name}</span>
              </Link>
              <button
                type="button"
                title="Archivar"
                className="shrink-0 rounded px-1 text-[10px] uppercase text-fg-muted opacity-0 hover:text-accent-amber group-hover:opacity-100"
                onClick={() => {
                  if (!confirm(`¿Archivar «${p.name}»?`)) return;
                  archiveMutation.mutate(p.id);
                }}
              >
                arch
              </button>
            </div>
          ))
        )}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-title"
        >
          <div className="w-full max-w-md rounded-xl border border-bg-border bg-bg-card p-6 shadow-xl">
            <h2 id="new-project-title" className="text-lg font-semibold text-fg-primary">
              Nuevo proyecto
            </h2>
            <p className="mt-1 text-sm text-fg-muted">Una app o producto que mantienes vivo.</p>
            <form
              className="mt-5 space-y-4"
              onSubmit={handleSubmit((v) => createMutation.mutate(v))}
              noValidate
            >
              <div className="space-y-1.5">
                <label htmlFor="proj-name" className="text-sm font-medium text-fg-primary">
                  Nombre
                </label>
                <Input id="proj-name" {...register('name')} autoFocus />
                {errors.name ? (
                  <p className="text-sm text-accent-red">{errors.name.message}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="proj-desc" className="text-sm font-medium text-fg-primary">
                  Descripción (opcional)
                </label>
                <textarea
                  id="proj-desc"
                  rows={2}
                  className="w-full rounded-lg border border-bg-border bg-bg-base px-3 py-2 text-sm text-fg-primary placeholder:text-fg-muted/60 focus:border-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green"
                  {...register('description')}
                />
              </div>
              {createMutation.isError ? (
                <p className="text-sm text-accent-red" role="alert">
                  No se pudo crear. ¿Aplicaste la migración Sprint 2 en Supabase?
                </p>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-fg-muted hover:bg-bg-elev hover:text-fg-primary"
                >
                  Cancelar
                </button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creando…' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
