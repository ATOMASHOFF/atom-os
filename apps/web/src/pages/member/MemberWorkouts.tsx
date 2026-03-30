// apps/web/src/pages/member/MemberWorkouts.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutApi } from '@/lib/api';
import { Plus, Dumbbell, CheckCircle2, ChevronRight, X, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function MemberWorkouts() {
  const qc = useQueryClient();
  const [showNewLog, setShowNewLog] = useState(false);
  const [activeLog,  setActiveLog]  = useState<any>(null);
  const [newLogForm, setNewLogForm] = useState({ title: '', workout_date: todayStr() });
  const [addSetForm, setAddSetForm] = useState({ exercise_id: '', set_number: 1, reps: '', weight_kg: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => workoutApi.list(),
  });

  const { data: activeData } = useQuery({
    queryKey: ['workout-detail', activeLog?.id],
    queryFn: () => workoutApi.get(activeLog.id),
    enabled: !!activeLog?.id,
  });

  const { data: exData } = useQuery({
    queryKey: ['exercises'],
    queryFn: workoutApi.exercises,
  });

  const exercises = exData?.exercises ?? [];
  const logs      = data?.logs ?? [];

  const createLogMut = useMutation({
    mutationFn: workoutApi.create,
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['workouts'] });
      setShowNewLog(false);
      setActiveLog(d.log);
      setNewLogForm({ title: '', workout_date: todayStr() });
      toast.success('Workout started!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addSetMut = useMutation({
    mutationFn: ({ logId, body }: { logId: string; body: any }) => workoutApi.addSet(logId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-detail', activeLog?.id] });
      setAddSetForm(f => ({ ...f, reps: '', weight_kg: '', set_number: f.set_number + 1 }));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSetMut = useMutation({
    mutationFn: ({ logId, setId }: { logId: string; setId: string }) => workoutApi.deleteSet(logId, setId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-detail', activeLog?.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const completeLogMut = useMutation({
    mutationFn: ({ id, duration_min }: { id: string; duration_min?: number }) =>
      workoutApi.update(id, { is_completed: true, duration_min }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts'] });
      qc.invalidateQueries({ queryKey: ['workout-stats'] });
      setActiveLog(null);
      toast.success('Workout complete! 💪');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteLogMut = useMutation({
    mutationFn: workoutApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workouts'] }); toast.success('Deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const sets        = activeData?.sets ?? [];
  const selectedEx  = exercises.find((e: any) => e.id === addSetForm.exercise_id);

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Workouts</h1>
          <p className="text-atom-muted text-sm mt-1">{data?.total ?? 0} sessions logged</p>
        </div>
        {!activeLog && (
          <button onClick={() => setShowNewLog(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Workout
          </button>
        )}
      </div>

      {/* ── ACTIVE SESSION ── */}
      {activeLog && (
        <div className="card border-atom-gold/40 bg-atom-gold/5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="badge-yellow text-xs mb-1">Active Session</span>
              <h2 className="font-display text-lg font-700 uppercase tracking-wide text-atom-text">
                {activeLog.title || 'Workout'}
              </h2>
              <p className="text-atom-muted text-xs">{format(new Date(activeLog.workout_date), 'd MMM yyyy')}</p>
            </div>
            <button
              onClick={() => completeLogMut.mutate({ id: activeLog.id })}
              disabled={completeLogMut.isPending}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Check size={15} />
              {completeLogMut.isPending ? 'Finishing...' : 'Finish'}
            </button>
          </div>

          {/* Sets table */}
          {sets.length > 0 && (
            <div className="mb-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-atom-border">
                    {['Exercise', 'Set', 'Reps', 'Weight', ''].map(h => (
                      <th key={h} className="text-left py-2 px-2 text-atom-muted text-xs font-display uppercase tracking-widest">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sets.map((s: any) => (
                    <tr key={s.id} className="border-b border-atom-border/30">
                      <td className="py-2 px-2 text-atom-text">
                        {s.exercise?.name ?? '—'}
                      </td>
                      <td className="py-2 px-2 font-mono text-atom-muted">{s.set_number}</td>
                      <td className="py-2 px-2 font-mono text-atom-text">{s.reps ?? '—'}</td>
                      <td className="py-2 px-2 font-mono text-atom-text">
                        {s.weight_kg != null ? `${s.weight_kg}kg` : '—'}
                      </td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => deleteSetMut.mutate({ logId: activeLog.id, setId: s.id })}
                          className="text-atom-muted hover:text-atom-danger transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add set form */}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-40">
              <label className="label">Exercise</label>
              <select
                className="input text-sm py-2"
                value={addSetForm.exercise_id}
                onChange={e => setAddSetForm(f => ({ ...f, exercise_id: e.target.value }))}
              >
                <option value="">Select exercise</option>
                {exercises.map((ex: any) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>
            <div className="w-16">
              <label className="label">Set</label>
              <input type="number" min={1} className="input text-sm py-2 font-mono"
                value={addSetForm.set_number}
                onChange={e => setAddSetForm(f => ({ ...f, set_number: Number(e.target.value) }))} />
            </div>
            <div className="w-20">
              <label className="label">Reps</label>
              <input type="number" min={0} className="input text-sm py-2 font-mono"
                placeholder="12"
                value={addSetForm.reps}
                onChange={e => setAddSetForm(f => ({ ...f, reps: e.target.value }))} />
            </div>
            <div className="w-24">
              <label className="label">Weight (kg)</label>
              <input type="number" min={0} step={0.5} className="input text-sm py-2 font-mono"
                placeholder="60"
                value={addSetForm.weight_kg}
                onChange={e => setAddSetForm(f => ({ ...f, weight_kg: e.target.value }))} />
            </div>
            <button
              className="btn-primary text-sm py-2.5 px-4 flex items-center gap-1.5"
              disabled={!addSetForm.exercise_id || addSetMut.isPending}
              onClick={() => addSetMut.mutate({
                logId: activeLog.id,
                body: {
                  exercise_id: addSetForm.exercise_id,
                  set_number: addSetForm.set_number,
                  reps: addSetForm.reps ? Number(addSetForm.reps) : undefined,
                  weight_kg: addSetForm.weight_kg ? Number(addSetForm.weight_kg) : undefined,
                },
              })}
            >
              <Plus size={15} /> Add Set
            </button>
          </div>
        </div>
      )}

      {/* ── WORKOUT HISTORY ── */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-20 bg-atom-surface/50" />
          ))
        ) : logs.length === 0 ? (
          <div className="card text-center py-16">
            <Dumbbell size={32} className="text-atom-muted mx-auto mb-3 opacity-30" />
            <p className="text-atom-muted text-sm">No workouts logged yet.</p>
            <button onClick={() => setShowNewLog(true)} className="btn-primary text-sm mt-4 mx-auto">
              Start First Workout
            </button>
          </div>
        ) : logs.map((log: any) => (
          <div
            key={log.id}
            className="card flex items-center gap-4 cursor-pointer hover:border-atom-gold/30 transition-all"
            onClick={() => !activeLog && setActiveLog(log)}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              log.is_completed ? 'bg-atom-gold/20' : 'bg-atom-border'
            }`}>
              {log.is_completed
                ? <CheckCircle2 size={18} className="text-atom-gold" />
                : <Dumbbell size={18} className="text-atom-muted" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-700 uppercase tracking-wide text-atom-text text-sm">
                {log.title || 'Workout'}
              </p>
              <p className="text-atom-muted text-xs">
                {format(new Date(log.workout_date), 'EEE, d MMM yyyy')}
                {log.duration_min ? ` · ${log.duration_min}min` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {log.is_completed
                ? <span className="badge-green">Done</span>
                : <span className="badge-gray">Draft</span>
              }
              {!log.is_completed && (
                <button
                  onClick={e => { e.stopPropagation(); if (confirm('Delete workout?')) deleteLogMut.mutate(log.id); }}
                  className="text-atom-muted hover:text-atom-danger transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <ChevronRight size={14} className="text-atom-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* New workout modal */}
      {showNewLog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-atom-surface border border-atom-border rounded-2xl w-full max-w-sm animate-slide-up">
            <div className="p-5 border-b border-atom-border flex items-center justify-between">
              <h3 className="font-display font-700 uppercase tracking-wide">New Workout</h3>
              <button onClick={() => setShowNewLog(false)} className="text-atom-muted hover:text-atom-text"><X size={18} /></button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="label">Session Name (optional)</label>
                <input className="input" placeholder="e.g. Push Day, Leg Day..."
                  value={newLogForm.title}
                  onChange={e => setNewLogForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input"
                  value={newLogForm.workout_date}
                  onChange={e => setNewLogForm(f => ({ ...f, workout_date: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button className="btn-ghost flex-1" onClick={() => setShowNewLog(false)}>Cancel</button>
                <button
                  className="btn-primary flex-1"
                  disabled={createLogMut.isPending}
                  onClick={() => createLogMut.mutate(newLogForm)}
                >
                  {createLogMut.isPending ? 'Starting...' : 'Start Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}
