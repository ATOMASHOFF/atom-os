// apps/web/src/pages/member/MemberAIPlan.tsx
// AI Workout Plan Generator — member picks preferences, gets personalized plan from Claude

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiApi, workoutApi } from '@/lib/api';
import {
    Sparkles, Dumbbell, Clock, Target, ChevronRight, ChevronLeft,
    Check, Loader2, Zap, RotateCcw, Plus, Calendar, Weight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { WorkoutPlan, PlanDay, PlanExercise } from '@atom-os/shared';

// ─── FORM STATE ──────────────────────────────────────────────────────────────

type Goal = 'muscle_gain' | 'fat_loss' | 'strength' | 'endurance' | 'general_fitness';
type Experience = 'beginner' | 'intermediate' | 'advanced';
type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'resistance_band' | 'other';
type FocusArea = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'full_body';

const GOAL_OPTIONS: { value: Goal; label: string; icon: string; desc: string }[] = [
    { value: 'muscle_gain', label: 'Build Muscle', icon: '💪', desc: 'Hypertrophy-focused training' },
    { value: 'fat_loss', label: 'Lose Fat', icon: '🔥', desc: 'High-intensity fat burning' },
    { value: 'strength', label: 'Get Stronger', icon: '🏋️', desc: 'Heavy compound lifts' },
    { value: 'endurance', label: 'Build Endurance', icon: '🏃', desc: 'Stamina and conditioning' },
    { value: 'general_fitness', label: 'General Fitness', icon: '⚡', desc: 'Balanced overall health' },
];

const EXPERIENCE_OPTIONS: { value: Experience; label: string; desc: string }[] = [
    { value: 'beginner', label: 'Beginner', desc: '< 6 months training' },
    { value: 'intermediate', label: 'Intermediate', desc: '6 months – 2 years' },
    { value: 'advanced', label: 'Advanced', desc: '2+ years consistent' },
];

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
    { value: 'barbell', label: 'Barbell' },
    { value: 'dumbbell', label: 'Dumbbells' },
    { value: 'machine', label: 'Machines' },
    { value: 'cable', label: 'Cables' },
    { value: 'bodyweight', label: 'Bodyweight' },
    { value: 'kettlebell', label: 'Kettlebell' },
    { value: 'resistance_band', label: 'Resistance Band' },
];

const FOCUS_OPTIONS: { value: FocusArea; label: string }[] = [
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back' },
    { value: 'shoulders', label: 'Shoulders' },
    { value: 'arms', label: 'Arms' },
    { value: 'legs', label: 'Legs' },
    { value: 'core', label: 'Core' },
    { value: 'full_body', label: 'Full Body' },
];

// ─── STEP COMPONENTS ─────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-700 transition-all ${i < current ? 'bg-atom-gold text-atom-bg' :
                        i === current ? 'bg-atom-gold/20 text-atom-gold border border-atom-gold/40' :
                            'bg-atom-border text-atom-muted'
                        }`}>
                        {i < current ? <Check size={14} /> : i + 1}
                    </div>
                    {i < total - 1 && (
                        <div className={`w-8 h-0.5 ${i < current ? 'bg-atom-gold' : 'bg-atom-border'}`} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function MemberAIPlan() {
    const [step, setStep] = useState(0);
    const [plan, setPlan] = useState<WorkoutPlan | null>(null);

    // Form state
    const [goal, setGoal] = useState<Goal>('muscle_gain');
    const [daysPerWeek, setDaysPerWeek] = useState(4);
    const [experience, setExperience] = useState<Experience>('intermediate');
    const [equipment, setEquipment] = useState<Equipment[]>(['barbell', 'dumbbell', 'bodyweight']);
    const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
    const [notes, setNotes] = useState('');

    const generateMut = useMutation({
        mutationFn: () => aiApi.generatePlan({
            goal,
            days_per_week: daysPerWeek,
            experience_level: experience,
            equipment,
            focus_areas: focusAreas.length > 0 ? focusAreas : undefined,
            notes: notes.trim() || undefined,
        }),
        onSuccess: (data) => {
            setPlan(data.plan);
            setStep(4); // Go to results
            toast.success('Plan generated!');
        },
        onError: (e: any) => toast.error(e.message || 'Failed to generate plan'),
    });

    const saveWorkoutMut = useMutation({
        mutationFn: async (day: PlanDay) => {
            // Create workout log for today
            const { log } = await workoutApi.create({
                title: `${plan?.title} — ${day.label}`,
                workout_date: new Date().toISOString().split('T')[0],
                notes: `AI Generated: ${plan?.title}`,
            });

            // Add all sets for each exercise
            for (const ex of day.exercises) {
                if (ex.exercise_id) {
                    for (let s = 1; s <= ex.sets; s++) {
                        await workoutApi.addSet(log.id, {
                            exercise_id: ex.exercise_id,
                            set_number: s,
                            reps: parseInt(ex.reps) || 10,
                            notes: ex.notes,
                        });
                    }
                }
            }
            return log;
        },
        onSuccess: () => toast.success('Workout saved! Check your Workouts tab.'),
        onError: (e: any) => toast.error(e.message),
    });

    const toggleEquipment = (eq: Equipment) => {
        setEquipment(prev =>
            prev.includes(eq) ? prev.filter(e => e !== eq) : [...prev, eq]
        );
    };

    const toggleFocus = (fa: FocusArea) => {
        setFocusAreas(prev =>
            prev.includes(fa) ? prev.filter(f => f !== fa) : [...prev, fa]
        );
    };

    const resetForm = () => {
        setStep(0);
        setPlan(null);
        setGoal('muscle_gain');
        setDaysPerWeek(4);
        setExperience('intermediate');
        setEquipment(['barbell', 'dumbbell', 'bodyweight']);
        setFocusAreas([]);
        setNotes('');
    };

    // ─── RENDER STEPS ──────────────────────────────────────────────────────────

    const renderStep = () => {
        switch (step) {
            case 0: // Goal
                return (
                    <div>
                        <h2 className="font-display font-700 text-xl uppercase tracking-wide mb-2">What's your goal?</h2>
                        <p className="text-atom-muted text-sm mb-6">This shapes the entire training structure.</p>
                        <div className="grid gap-3">
                            {GOAL_OPTIONS.map(g => (
                                <button
                                    key={g.value}
                                    onClick={() => setGoal(g.value)}
                                    className={`card text-left flex items-center gap-4 transition-all ${goal === g.value
                                        ? 'border-atom-gold bg-atom-gold/5'
                                        : 'hover:border-atom-border'
                                        }`}
                                >
                                    <span className="text-2xl">{g.icon}</span>
                                    <div className="flex-1">
                                        <p className="font-display font-600 text-sm uppercase tracking-wide">{g.label}</p>
                                        <p className="text-atom-muted text-xs">{g.desc}</p>
                                    </div>
                                    {goal === g.value && <Check size={18} className="text-atom-gold" />}
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 1: // Schedule + Experience
                return (
                    <div>
                        <h2 className="font-display font-700 text-xl uppercase tracking-wide mb-2">Your schedule</h2>
                        <p className="text-atom-muted text-sm mb-6">How often can you train?</p>

                        <div className="mb-8">
                            <label className="label mb-3">Training days per week</label>
                            <div className="flex gap-2">
                                {[2, 3, 4, 5, 6].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setDaysPerWeek(d)}
                                        className={`flex-1 py-3 rounded-xl font-display font-700 text-lg transition-all ${daysPerWeek === d
                                            ? 'bg-atom-gold text-atom-bg'
                                            : 'bg-atom-surface border border-atom-border text-atom-muted hover:border-atom-gold/30'
                                            }`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="label mb-3">Experience level</label>
                            <div className="grid gap-3">
                                {EXPERIENCE_OPTIONS.map(e => (
                                    <button
                                        key={e.value}
                                        onClick={() => setExperience(e.value)}
                                        className={`card text-left flex items-center gap-4 transition-all ${experience === e.value
                                            ? 'border-atom-gold bg-atom-gold/5'
                                            : 'hover:border-atom-border'
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <p className="font-display font-600 text-sm uppercase tracking-wide">{e.label}</p>
                                            <p className="text-atom-muted text-xs">{e.desc}</p>
                                        </div>
                                        {experience === e.value && <Check size={18} className="text-atom-gold" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 2: // Equipment
                return (
                    <div>
                        <h2 className="font-display font-700 text-xl uppercase tracking-wide mb-2">Available equipment</h2>
                        <p className="text-atom-muted text-sm mb-6">Select everything you have access to.</p>
                        <div className="grid grid-cols-2 gap-3">
                            {EQUIPMENT_OPTIONS.map(eq => (
                                <button
                                    key={eq.value}
                                    onClick={() => toggleEquipment(eq.value)}
                                    className={`card text-center py-4 transition-all ${equipment.includes(eq.value)
                                        ? 'border-atom-gold bg-atom-gold/5'
                                        : 'hover:border-atom-border'
                                        }`}
                                >
                                    <Weight size={20} className={`mx-auto mb-2 ${equipment.includes(eq.value) ? 'text-atom-gold' : 'text-atom-muted'}`} />
                                    <p className="font-display font-600 text-xs uppercase tracking-wide">{eq.label}</p>
                                    {equipment.includes(eq.value) && (
                                        <Check size={14} className="text-atom-gold mx-auto mt-1" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="mt-6">
                            <label className="label mb-3">Focus areas (optional)</label>
                            <div className="flex flex-wrap gap-2">
                                {FOCUS_OPTIONS.map(fa => (
                                    <button
                                        key={fa.value}
                                        onClick={() => toggleFocus(fa.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wide transition-all ${focusAreas.includes(fa.value)
                                            ? 'bg-atom-gold/20 text-atom-gold border border-atom-gold/40'
                                            : 'bg-atom-surface border border-atom-border text-atom-muted hover:border-atom-gold/30'
                                            }`}
                                    >
                                        {fa.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 3: // Notes + Generate
                return (
                    <div>
                        <h2 className="font-display font-700 text-xl uppercase tracking-wide mb-2">Final details</h2>
                        <p className="text-atom-muted text-sm mb-6">Any injuries, preferences, or specific requests?</p>

                        <div className="mb-6">
                            <label className="label">Notes (optional)</label>
                            <textarea
                                className="input min-h-[100px] resize-none"
                                placeholder="e.g. I have a bad lower back, prefer morning workouts, want to focus on compound movements..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                maxLength={500}
                            />
                            <p className="text-atom-muted text-xs mt-1">{notes.length}/500</p>
                        </div>

                        {/* Summary */}
                        <div className="card bg-atom-surface/50 mb-6">
                            <h3 className="font-display font-600 text-xs uppercase tracking-widest text-atom-muted mb-3">Your Plan Summary</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-atom-muted">Goal</span>
                                    <span className="text-atom-text font-500">{GOAL_OPTIONS.find(g => g.value === goal)?.label}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-atom-muted">Days/week</span>
                                    <span className="text-atom-text font-500">{daysPerWeek}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-atom-muted">Level</span>
                                    <span className="text-atom-text font-500 capitalize">{experience}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-atom-muted">Equipment</span>
                                    <span className="text-atom-text font-500">{equipment.length} types</span>
                                </div>
                                {focusAreas.length > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-atom-muted">Focus</span>
                                        <span className="text-atom-text font-500 capitalize">{focusAreas.join(', ')}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => generateMut.mutate()}
                            disabled={generateMut.isPending}
                            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5"
                        >
                            {generateMut.isPending ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Generating your plan...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    Generate AI Workout Plan
                                </>
                            )}
                        </button>
                    </div>
                );

            case 4: // Results
                if (!plan) return null;
                return (
                    <div>
                        {/* Plan header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <span className="badge-yellow text-xs mb-2 inline-block">AI Generated</span>
                                <h2 className="font-display font-700 text-xl uppercase tracking-wide">{plan.title}</h2>
                                <p className="text-atom-muted text-sm mt-1">{plan.description}</p>
                            </div>
                            <button
                                onClick={resetForm}
                                className="btn-ghost text-xs flex items-center gap-1.5"
                            >
                                <RotateCcw size={13} /> Regenerate
                            </button>
                        </div>

                        {/* Plan days */}
                        <div className="space-y-4 mb-6">
                            {plan.days.map((day: PlanDay) => (
                                <div key={day.day_number} className="card">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <span className="badge-gray text-xs mb-1 inline-block">Day {day.day_number}</span>
                                            <h3 className="font-display font-700 text-sm uppercase tracking-wide">{day.label}</h3>
                                            <p className="text-atom-muted text-xs">{day.focus}</p>
                                        </div>
                                        <button
                                            onClick={() => saveWorkoutMut.mutate(day)}
                                            disabled={saveWorkoutMut.isPending}
                                            className="btn-primary text-xs flex items-center gap-1.5"
                                        >
                                            <Plus size={13} /> Log Workout
                                        </button>
                                    </div>

                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-atom-border">
                                                {['Exercise', 'Sets', 'Reps', 'Rest', 'Notes'].map(h => (
                                                    <th key={h} className="text-left py-2 px-2 text-atom-muted text-xs font-display uppercase tracking-widest">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {day.exercises.map((ex: PlanExercise, i: number) => (
                                                <tr key={i} className="border-b border-atom-border/30">
                                                    <td className="py-2.5 px-2">
                                                        <p className="text-atom-text font-500">{ex.exercise_name}</p>
                                                        {ex.category && (
                                                            <p className="text-atom-muted text-xs">{ex.category} · {ex.equipment}</p>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-2 font-mono text-atom-text">{ex.sets}</td>
                                                    <td className="py-2.5 px-2 font-mono text-atom-text">{ex.reps}</td>
                                                    <td className="py-2.5 px-2 font-mono text-atom-muted">{ex.rest_sec}s</td>
                                                    <td className="py-2.5 px-2 text-atom-muted text-xs max-w-[120px] truncate">{ex.notes}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>

                        {/* Tips */}
                        {plan.tips.length > 0 && (
                            <div className="card bg-atom-gold/5 border-atom-gold/20">
                                <h3 className="font-display font-600 text-xs uppercase tracking-widest text-atom-gold mb-3">
                                    <Zap size={13} className="inline mr-1.5" /> Pro Tips
                                </h3>
                                <ul className="space-y-2">
                                    {plan.tips.map((tip: string, i: number) => (
                                        <li key={i} className="text-atom-text text-sm flex items-start gap-2">
                                            <span className="text-atom-gold mt-0.5">•</span>
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
        }
    };

    const TOTAL_STEPS = 4; // Steps 0-3 are form, 4 is results

    return (
        <div className="page">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-atom-gold/10 flex items-center justify-center">
                    <Sparkles size={20} className="text-atom-gold" />
                </div>
                <div>
                    <h1 className="section-title">AI Coach</h1>
                    <p className="text-atom-muted text-sm">Generate a personalized workout plan</p>
                </div>
            </div>

            {step < 4 && <StepIndicator current={step} total={TOTAL_STEPS} />}

            {renderStep()}

            {/* Navigation buttons */}
            {step < 4 && (
                <div className="flex gap-3 mt-8">
                    {step > 0 && (
                        <button onClick={() => setStep(s => s - 1)} className="btn-ghost flex-1 flex items-center justify-center gap-2">
                            <ChevronLeft size={16} /> Back
                        </button>
                    )}
                    {step < 3 && (
                        <button onClick={() => setStep(s => s + 1)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                            Next <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}