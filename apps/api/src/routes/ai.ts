// apps/api/src/routes/ai.ts
// AI Workout Plan Generator — uses Anthropic Claude to create personalized plans

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../utils/supabase';
import { ok, badRequest, serverError } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/roles';
import { GeneratePlanSchema, GenerateExerciseSchema } from '@atom-os/shared';
import type { WorkoutPlan, Exercise } from '@atom-os/shared';

const router = Router();
router.use(authMiddleware);

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── GENERATE PLAN ──────────────────────────────────────────────────────────

// ─── GENERATE EXERCISE ──────────────────────────────────────────────────────

router.post('/generate-exercise', validate(GenerateExerciseSchema), async (req, res) => {
    try {
        const { muscle_group, equipment, difficulty, focus } = req.body;

        // Fetch available exercises from DB to ground the AI
        const { data: exercises } = await supabaseAdmin
            .from('exercises')
            .select('id, name, category, equipment, muscle_groups, instructions')
            .eq('is_global', true)
            .order('name');

        const exerciseList = (exercises ?? [])
            .map(e => `- ${e.name} (${e.category}, ${e.equipment}, muscles: ${(e.muscle_groups ?? []).join(', ')})`)
            .join('\n');

        const systemPrompt = `You are an expert fitness coach and exercise specialist. You create detailed, safe, and effective exercise descriptions.

IMPORTANT: You MUST respond with ONLY valid JSON. No markdown, no explanation, no text outside the JSON.

The JSON must match this exact structure:
{
  "exercise_name": "string — descriptive exercise name",
  "description": "string — detailed description of how to perform the exercise",
  "muscle_groups": ["string — array of primary muscle groups worked"],
  "equipment": "string — equipment needed",
  "difficulty": "string — beginner, intermediate, or advanced",
  "instructions": "string — step-by-step instructions",
  "video_url": "string — optional video URL",
  "image_url": "string — optional image URL"
}

Rules:
- The exercise_name MUST be unique and descriptive
- Focus on the specified muscle_group and equipment
- Match the difficulty level
- Include proper form cues and safety tips
- Keep instructions clear and concise`;

        const userPrompt = `Generate a new exercise for:
Muscle group: ${muscle_group}
Equipment: ${equipment}
Difficulty: ${difficulty}
Focus: ${focus}

Available exercises (for reference):
${exerciseList}

Create a unique exercise that targets the specified muscle group using the given equipment at the specified difficulty level.`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        });

        const textBlock = message.content.find(block => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
            return serverError(res, 'No text response from AI');
        }

        let exercise: Exercise;
        try {
            // Extract JSON from potential markdown code blocks
            let jsonStr = textBlock.text.trim();
            if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
            }
            exercise = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('[AI] JSON parse error:', textBlock.text);
            return serverError(res, 'AI returned invalid JSON. Please try again.');
        }

        // Validate exercise has required structure
        if (!exercise.name || !exercise.equipment) {
            return serverError(res, 'AI returned incomplete exercise. Please try again.');
        }

        return ok(res, { exercise });
    } catch (err: any) {
        console.error('[AI] Exercise generation error:', err);
        if (err?.status === 429) {
            return badRequest(res, 'AI rate limit reached. Please wait a moment and try again.');
        }
        return serverError(res, 'Failed to generate exercise', err);
    }
});

router.post('/generate-plan', validate(GeneratePlanSchema), async (req, res) => {
    try {
        const { goal, days_per_week, experience_level, equipment, focus_areas, notes } = req.body;

        // Fetch user profile for personalization
        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('full_name, gender, weight_kg, height_cm')
            .eq('id', req.user.id)
            .single();

        // Fetch available exercises from DB to ground the AI
        const { data: exercises } = await supabaseAdmin
            .from('exercises')
            .select('id, name, category, equipment, muscle_groups')
            .eq('is_global', true)
            .order('name');

        const exerciseList = (exercises ?? [])
            .map(e => `- ${e.name} (${e.category}, ${e.equipment}, muscles: ${(e.muscle_groups ?? []).join(', ')})`)
            .join('\n');

        const userProfile = profile
            ? `User: ${profile.full_name}${profile.gender ? `, ${profile.gender}` : ''}${profile.weight_kg ? `, ${profile.weight_kg}kg` : ''}${profile.height_cm ? `, ${profile.height_cm}cm` : ''}`
            : 'User profile not available';

        const systemPrompt = `You are an expert fitness coach and personal trainer. You create structured, evidence-based workout plans.

IMPORTANT: You MUST respond with ONLY valid JSON. No markdown, no explanation, no text outside the JSON.

The JSON must match this exact structure:
{
  "title": "string — descriptive plan name",
  "description": "string — 2-3 sentence overview",
  "duration_weeks": number,
  "days": [
    {
      "day_number": number,
      "label": "string — e.g. 'Monday - Push'",
      "focus": "string — e.g. 'chest, shoulders, triceps'",
      "exercises": [
        {
          "exercise_name": "string — MUST match one from the available exercises list",
          "sets": number,
          "reps": "string — e.g. '8-12' or '15' or '30 sec'",
          "rest_sec": number,
          "notes": "string — brief coaching cue"
        }
      ]
    }
  ],
  "tips": ["string — array of 3-5 general tips for this plan"]
}

Rules:
- Every exercise_name MUST be from the available exercises list provided
- ${days_per_week} training days per week
- Each day should have 4-7 exercises
- Progressive overload principles
- Include warm-up suggestion in first exercise notes
- Rest days between intense sessions
- Match the experience level: beginner=simpler movements, advanced=compound lifts + variations`;

        const userPrompt = `${userProfile}

Goal: ${goal}
Training days per week: ${days_per_week}
Experience level: ${experience_level}
Available equipment: ${equipment.join(', ')}
${focus_areas?.length ? `Focus areas: ${focus_areas.join(', ')}` : ''}
${notes ? `Additional notes: ${notes}` : ''}

Available exercises (use ONLY these names):
${exerciseList}

Generate a ${days_per_week}-day workout plan for a ${experience_level} trainee focused on ${goal}.`;

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        });

        const textBlock = message.content.find(block => block.type === 'text');
        if (!textBlock || textBlock.type !== 'text') {
            return serverError(res, 'No text response from AI');
        }

        let plan: WorkoutPlan;
        try {
            // Extract JSON from potential markdown code blocks
            let jsonStr = textBlock.text.trim();
            if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
            }
            plan = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('[AI] JSON parse error:', textBlock.text);
            return serverError(res, 'AI returned invalid JSON. Please try again.');
        }

        // Validate plan has required structure
        if (!plan.title || !plan.days || !Array.isArray(plan.days) || plan.days.length === 0) {
            return serverError(res, 'AI returned incomplete plan. Please try again.');
        }

        // Map exercise names to actual exercise IDs from DB
        const exerciseMap = new Map(
            (exercises ?? []).map(e => [e.name.toLowerCase(), e])
        );

        const resolvedDays = plan.days.map(day => ({
            ...day,
            exercises: day.exercises.map(ex => {
                const matched = exerciseMap.get(ex.exercise_name.toLowerCase());
                return {
                    ...ex,
                    exercise_id: matched?.id ?? null,
                    exercise_name: matched?.name ?? ex.exercise_name,
                    category: matched?.category ?? null,
                    equipment: matched?.equipment ?? null,
                };
            }),
        }));

        const resolvedPlan: WorkoutPlan = {
            ...plan,
            days: resolvedDays,
        };

        return ok(res, { plan: resolvedPlan });
    } catch (err: any) {
        console.error('[AI] Generation error:', err);
        if (err?.status === 429) {
            return badRequest(res, 'AI rate limit reached. Please wait a moment and try again.');
        }
        return serverError(res, 'Failed to generate workout plan', err);
    }
});

export default router;