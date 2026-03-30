// apps/web/src/hooks/useWorkout.ts
// Encapsulates all workout query logic so components stay clean

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutApi } from '@/lib/api';
import toast from 'react-hot-toast';

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: workoutApi.exercises,
    staleTime: 1000 * 60 * 10, // exercises rarely change — cache 10min
    select: (d: any) => d.exercises ?? [],
  });
}

export function useWorkoutLogs(params?: { page?: number; month?: string }) {
  return useQuery({
    queryKey: ['workouts', params],
    queryFn: () => workoutApi.list(params),
    select: (d: any) => ({ logs: d.logs ?? [], total: d.total ?? 0 }),
  });
}

export function useWorkoutDetail(id: string | null) {
  return useQuery({
    queryKey: ['workout-detail', id],
    queryFn: () => workoutApi.get(id!),
    enabled: !!id,
    select: (d: any) => ({ log: d.log, sets: d.sets ?? [] }),
  });
}

export function useWorkoutStats() {
  return useQuery({
    queryKey: ['workout-stats'],
    queryFn: workoutApi.stats,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddSet(logId: string, onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => workoutApi.addSet(logId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-detail', logId] });
      onSuccess?.();
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCompleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, duration_min }: { id: string; duration_min?: number }) =>
      workoutApi.update(id, { is_completed: true, duration_min }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts'] });
      qc.invalidateQueries({ queryKey: ['workout-stats'] });
      toast.success('Workout complete! 💪');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
