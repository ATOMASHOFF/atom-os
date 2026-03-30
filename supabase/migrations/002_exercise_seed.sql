-- =============================================================================
-- ATOM OS V3 — EXERCISE SEED DATA
-- 60 global exercises across all categories
-- Run this AFTER 001_init.sql in Supabase SQL Editor
-- =============================================================================

INSERT INTO public.exercises (name, category, equipment, muscle_groups, instructions, is_global)
VALUES

-- ── CHEST ──────────────────────────────────────────────────────────────────
('Barbell Bench Press',       'chest', 'barbell',     ARRAY['chest','triceps','shoulders'],
 'Lie flat on bench. Grip bar slightly wider than shoulder width. Lower to chest, press up explosively.', true),
('Incline Barbell Press',     'chest', 'barbell',     ARRAY['upper chest','triceps','shoulders'],
 'Set bench to 30-45°. Grip bar wider than shoulders. Lower to upper chest and press up.', true),
('Decline Barbell Press',     'chest', 'barbell',     ARRAY['lower chest','triceps'],
 'Set bench to -15°. Lower bar to lower chest. Focus on squeezing pecs at top.', true),
('Dumbbell Bench Press',      'chest', 'dumbbell',    ARRAY['chest','triceps','shoulders'],
 'Hold dumbbells at chest level. Press up and slightly inward. Full range of motion.', true),
('Incline Dumbbell Press',    'chest', 'dumbbell',    ARRAY['upper chest','triceps'],
 'Incline bench 30-45°. Press dumbbells from shoulder level to above chest.', true),
('Dumbbell Flyes',            'chest', 'dumbbell',    ARRAY['chest','shoulders'],
 'Slight bend in elbows. Open arms wide in arc motion. Feel deep chest stretch at bottom.', true),
('Cable Crossover',           'chest', 'cable',       ARRAY['chest','shoulders'],
 'Set cables high. Pull down and across body, crossing wrists at bottom. Squeeze chest.', true),
('Push-Up',                   'chest', 'bodyweight',  ARRAY['chest','triceps','core'],
 'Hands shoulder-width apart. Lower chest to floor. Keep body rigid. Push back up.', true),
('Chest Dip',                 'chest', 'bodyweight',  ARRAY['chest','triceps','shoulders'],
 'Lean forward at about 30°. Lower until elbows at 90°. Push up squeezing chest.', true),

-- ── BACK ───────────────────────────────────────────────────────────────────
('Deadlift',                  'back', 'barbell',      ARRAY['lower back','glutes','hamstrings','traps'],
 'Feet hip-width. Hinge at hips, grip bar. Drive hips forward to stand. Keep back flat.', true),
('Barbell Row',               'back', 'barbell',      ARRAY['mid back','lats','biceps','rear delts'],
 'Hinge forward 45°. Pull bar to lower chest. Lead with elbows. Squeeze shoulder blades.', true),
('Pull-Up',                   'back', 'bodyweight',   ARRAY['lats','biceps','rear delts'],
 'Hang with overhand grip. Pull chest to bar. Full hang at bottom. Controlled descent.', true),
('Chin-Up',                   'back', 'bodyweight',   ARRAY['lats','biceps'],
 'Underhand grip shoulder-width. Pull chin over bar. Squeeze biceps at top.', true),
('Lat Pulldown',              'back', 'machine',      ARRAY['lats','biceps','rear delts'],
 'Wide grip. Lean slightly back. Pull bar to upper chest. Squeeze lats at bottom.', true),
('Seated Cable Row',          'back', 'cable',        ARRAY['mid back','lats','biceps'],
 'Sit tall. Pull handle to lower abdomen. Elbows tight to body. Hold 1s at peak.', true),
('Single Arm Dumbbell Row',   'back', 'dumbbell',     ARRAY['lats','mid back','biceps'],
 'Brace on bench. Pull dumbbell to hip. Keep elbow close to body. Full stretch at bottom.', true),
('Rack Pull',                 'back', 'barbell',      ARRAY['lower back','traps','glutes'],
 'Bar set at knee height. Shorter range deadlift. Drive hips forward at top.', true),
('Face Pull',                 'back', 'cable',        ARRAY['rear delts','traps','external rotators'],
 'Set cable at face height. Pull rope to forehead. Flare elbows out. Squeeze rear delts.', true),

-- ── SHOULDERS ──────────────────────────────────────────────────────────────
('Barbell Overhead Press',    'shoulders', 'barbell',  ARRAY['front delts','triceps','upper traps'],
 'Bar at shoulder height. Brace core. Press straight up. Lower controlled. Bar passes face.', true),
('Dumbbell Shoulder Press',   'shoulders', 'dumbbell', ARRAY['front delts','triceps','side delts'],
 'Hold dumbbells at shoulder height. Press overhead. Do not lock out at top.', true),
('Dumbbell Lateral Raise',    'shoulders', 'dumbbell', ARRAY['side delts'],
 'Slight bend in elbow. Raise arms to shoulder height. Lead with elbows. Slow descent.', true),
('Front Raise',               'shoulders', 'dumbbell', ARRAY['front delts'],
 'Raise one or both dumbbells to eye level. Keep slight elbow bend. Controlled lower.', true),
('Arnold Press',              'shoulders', 'dumbbell', ARRAY['front delts','side delts','triceps'],
 'Start with palms facing you. Rotate wrists as you press overhead. Reverse on way down.', true),
('Upright Row',               'shoulders', 'barbell',  ARRAY['side delts','traps','biceps'],
 'Narrow grip. Pull bar straight up to chin. Lead with elbows. Elbows above bar.', true),

-- ── ARMS ───────────────────────────────────────────────────────────────────
('Barbell Curl',              'arms', 'barbell',      ARRAY['biceps'],
 'Narrow to shoulder-width grip. Curl bar to shoulder. Elbows stay at sides. Slow negative.', true),
('Dumbbell Curl',             'arms', 'dumbbell',     ARRAY['biceps'],
 'Alternate arms. Supinate wrist as you curl. Full extension at bottom.', true),
('Hammer Curl',               'arms', 'dumbbell',     ARRAY['biceps','brachialis','forearms'],
 'Neutral grip (thumbs up). Curl dumbbell to shoulder. No wrist rotation.', true),
('Preacher Curl',             'arms', 'machine',      ARRAY['biceps'],
 'Rest arms on pad. Full stretch at bottom. Curl to near shoulder. No body swing.', true),
('Tricep Pushdown',           'arms', 'cable',        ARRAY['triceps'],
 'Elbows at sides. Push bar or rope to full extension. Squeeze triceps at bottom.', true),
('Skull Crusher',             'arms', 'barbell',      ARRAY['triceps'],
 'Lower bar to forehead or behind head. Keep elbows pointed up. Press back to start.', true),
('Overhead Tricep Extension', 'arms', 'dumbbell',     ARRAY['triceps'],
 'Hold one dumbbell overhead. Lower behind head. Keep elbows close. Extend fully.', true),
('Close Grip Bench Press',    'arms', 'barbell',      ARRAY['triceps','chest'],
 'Grip shoulder-width or narrower. Elbows tucked. Lower to chest. Press up.', true),
('Dips (Tricep)',             'arms', 'bodyweight',   ARRAY['triceps','chest'],
 'Stay upright (no forward lean). Bend elbows to 90°. Press back up fully.', true),

-- ── LEGS ───────────────────────────────────────────────────────────────────
('Barbell Back Squat',        'legs', 'barbell',      ARRAY['quads','glutes','hamstrings'],
 'Bar on upper traps. Feet shoulder-width. Squat below parallel. Drive knees out.', true),
('Front Squat',               'legs', 'barbell',      ARRAY['quads','core','upper back'],
 'Bar on front delts. Elbows high. Stay upright. Squat below parallel.', true),
('Romanian Deadlift',         'legs', 'barbell',      ARRAY['hamstrings','glutes','lower back'],
 'Hinge at hips. Soft knee bend. Lower bar along legs. Feel hamstring stretch. Drive hips.', true),
('Leg Press',                 'legs', 'machine',      ARRAY['quads','glutes','hamstrings'],
 'Feet shoulder-width. Lower until knees at 90°. Press through heels. Do not lock knees.', true),
('Walking Lunge',             'legs', 'dumbbell',     ARRAY['quads','glutes','hamstrings'],
 'Step forward, lower back knee to floor. Push off front foot. Alternate legs.', true),
('Bulgarian Split Squat',     'legs', 'dumbbell',     ARRAY['quads','glutes'],
 'Rear foot elevated. Lower back knee toward floor. Keep front shin vertical.', true),
('Leg Curl (Lying)',          'legs', 'machine',      ARRAY['hamstrings'],
 'Lie face down. Curl heels toward glutes. Full extension each rep. Slow down.', true),
('Leg Extension',             'legs', 'machine',      ARRAY['quads'],
 'Sit on machine. Extend legs to full lockout. Slow controlled descent.', true),
('Standing Calf Raise',       'legs', 'machine',      ARRAY['calves','soleus'],
 'Full stretch at bottom. Rise onto toes. Hold 1s at top. Slow descent.', true),
('Goblet Squat',              'legs', 'kettlebell',   ARRAY['quads','glutes','core'],
 'Hold kettlebell at chest. Squat deep. Push knees out with elbows.', true),

-- ── CORE ───────────────────────────────────────────────────────────────────
('Plank',                     'core', 'bodyweight',   ARRAY['core','shoulders','glutes'],
 'Forearms on floor. Body straight. Brace abs. Do not let hips sag. Hold.', true),
('Crunches',                  'core', 'bodyweight',   ARRAY['abs'],
 'Lie on back, knees bent. Curl shoulders off floor. Do not pull neck. Squeeze abs.', true),
('Hanging Leg Raise',         'core', 'bodyweight',   ARRAY['lower abs','hip flexors'],
 'Hang from bar. Raise legs to 90° or higher. Control descent. Avoid swinging.', true),
('Cable Crunch',              'core', 'cable',        ARRAY['abs'],
 'Kneel below cable. Pull rope beside head. Crunch down, round back. Squeeze abs.', true),
('Russian Twist',             'core', 'bodyweight',   ARRAY['obliques','abs'],
 'Sit with knees bent, lean back slightly. Rotate torso side to side.', true),
('Ab Wheel Rollout',          'core', 'other',        ARRAY['abs','lats','shoulders'],
 'Kneel with wheel. Roll forward until near floor. Pull back using abs, not hip flexors.', true),
('Side Plank',                'core', 'bodyweight',   ARRAY['obliques','core'],
 'Side-lying, supported on forearm. Hips stacked. Hold body in straight line.', true),

-- ── CARDIO ─────────────────────────────────────────────────────────────────
('Treadmill Run',             'cardio', 'machine',    ARRAY['cardiovascular','legs'],
 'Maintain conversational pace for steady state, or intervals for HIIT.', true),
('Stationary Bike',           'cardio', 'machine',    ARRAY['cardiovascular','legs'],
 'Set resistance. Maintain cadence 70-90 RPM. Keep back straight.', true),
('Jump Rope',                 'cardio', 'other',      ARRAY['cardiovascular','calves','shoulders'],
 'Wrists rotate rope. Land on balls of feet. Stay light. Single or double under.', true),
('Rowing Machine',            'cardio', 'machine',    ARRAY['cardiovascular','back','legs'],
 'Drive with legs first, then lean back, then pull arms. Reverse on recovery.', true),
('Burpee',                    'cardio', 'bodyweight', ARRAY['cardiovascular','full body'],
 'Squat to floor, jump feet back, push-up, jump feet forward, explosive jump up.', true),

-- ── FULL BODY ──────────────────────────────────────────────────────────────
('Power Clean',               'full_body', 'barbell', ARRAY['traps','back','legs','shoulders'],
 'Pull bar explosively. Extend hips and shrug. Drop under bar. Catch in front rack.', true),
('Kettlebell Swing',          'full_body', 'kettlebell', ARRAY['glutes','hamstrings','core','shoulders'],
 'Hinge at hips. Drive hips forward explosively. Swing to shoulder height. Hip hinge back.', true),
('Turkish Get-Up',            'full_body', 'kettlebell', ARRAY['core','shoulders','glutes','full body'],
 'From lying with KB pressed up, transition to standing. Control every step.', true),
('Thruster',                  'full_body', 'barbell', ARRAY['quads','shoulders','triceps'],
 'Front squat into overhead press in one fluid motion. Use leg drive.', true);

-- Verify count
SELECT COUNT(*) as total_exercises,
       category,
       COUNT(*) as per_category
FROM public.exercises
WHERE is_global = true
GROUP BY category
ORDER BY category;
