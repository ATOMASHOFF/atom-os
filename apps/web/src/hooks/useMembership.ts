// apps/web/src/hooks/useMembership.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '@/lib/api';
import toast from 'react-hot-toast';

export function useMyMemberships() {
  return useQuery({
    queryKey: ['my-memberships'],
    queryFn: membershipApi.myStatus,
    select: (d: any) => d.memberships ?? [],
  });
}

export function useApprovedGyms() {
  const { data: memberships = [] } = useMyMemberships();
  return (memberships as any[]).filter(m => m.status === 'approved');
}

export function useJoinGym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (gym_code: string) => membershipApi.join(gym_code),
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ['my-memberships'] });
      toast.success(d.message ?? 'Join request sent!');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useGymStats() {
  return useQuery({
    queryKey: ['membership-stats'],
    queryFn: membershipApi.stats,
    refetchInterval: 60_000,
  });
}

export function useJoinRequests() {
  return useQuery({
    queryKey: ['join-requests'],
    queryFn: membershipApi.requests,
    select: (d: any) => d.requests ?? [],
    refetchInterval: 30_000,
  });
}

export function useUpdateMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status: string; [k: string]: any }) =>
      membershipApi.updateRequest(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['join-requests'] });
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['membership-stats'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}
