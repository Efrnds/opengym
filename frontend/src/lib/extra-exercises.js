/**
 * Curated list of essential gym & cardio exercises (similar to Hevy / Strong)
 * to expand the openGym library with missing gym classics and full cardio tracking.
 */
export const EXTRA_EXERCISES = [
  // ── Cardio ─────────────────────────────────────────────────────────────
  {
    id: 'c001',
    n: 'Treadmill Walking',
    bp: 'cardio',
    eq: 'leverage machine',
    tg: 'cardiovascular system',
    mg: 'cardiovascular system',
    sm: ['quadriceps', 'calves', 'glutes'],
    st: [
      'Step onto the treadmill and set a comfortable walking pace.',
      'Maintain an upright posture with shoulders relaxed and core engaged.',
      'Swing your arms naturally and breathe rhythmically.',
      'Walk for the desired duration or distance.'
    ]
  },
  {
    id: 'c002',
    n: 'Treadmill Running',
    bp: 'cardio',
    eq: 'leverage machine',
    tg: 'cardiovascular system',
    mg: 'cardiovascular system',
    sm: ['quadriceps', 'calves', 'hamstrings', 'glutes'],
    st: [
      'Set the treadmill to your desired running speed and incline.',
      'Land softly on mid-foot with a steady cadence.',
      'Keep your chest lifted and arms bent at 90 degrees.',
      'Run for the desired duration or target distance.'
    ]
  },
  {
    id: 'c003',
    n: 'Incline Treadmill Walking',
    bp: 'cardio',
    eq: 'leverage machine',
    tg: 'cardiovascular system',
    mg: 'glutes',
    sm: ['calves', 'hamstrings', 'quadriceps'],
    st: [
      'Set the treadmill incline between 8% and 15% at a brisk walking speed (4-5 km/h).',
      'Walk without holding the handrails to maximize core and posterior chain engagement.',
      'Drive through your heels on each stride.'
    ]
  },
  {
    id: 'c004',
    n: 'Stationary Bike',
    bp: 'cardio',
    eq: 'stationary bike',
    tg: 'cardiovascular system',
    mg: 'quads',
    sm: ['calves', 'hamstrings', 'glutes'],
    st: [
      'Adjust seat height so your knee has a slight bend at the bottom of the pedal stroke.',
      'Keep your back neutral and grip handlebars comfortably.',
      'Pedal at a consistent cadence against chosen resistance.'
    ]
  },
  {
    id: 'c005',
    n: 'Recumbent Bike',
    bp: 'cardio',
    eq: 'stationary bike',
    tg: 'cardiovascular system',
    mg: 'quads',
    sm: ['glutes', 'calves'],
    st: [
      'Adjust the seat so your leg is nearly extended at the furthest pedal point.',
      'Lean back against the backrest and pedal smoothly.'
    ]
  },
  {
    id: 'c006',
    n: 'Spinning Bike',
    bp: 'cardio',
    eq: 'stationary bike',
    tg: 'cardiovascular system',
    mg: 'quads',
    sm: ['hamstrings', 'glutes', 'calves'],
    st: [
      'Adjust saddle and handlebar heights.',
      'Alternate between seated climbing and standing sprints according to your training plan.'
    ]
  },
  {
    id: 'c007',
    n: 'Assault Air Bike',
    bp: 'cardio',
    eq: 'stationary bike',
    tg: 'cardiovascular system',
    mg: 'cardiovascular system',
    sm: ['quadriceps', 'shoulders', 'chest', 'back'],
    st: [
      'Push and pull the handles while pedaling vigorously.',
      'The fan resistance scales with your effort — ideal for HIIT intervals.'
    ]
  },
  {
    id: 'c008',
    n: 'Elliptical Trainer',
    bp: 'cardio',
    eq: 'elliptical machine',
    tg: 'cardiovascular system',
    mg: 'cardiovascular system',
    sm: ['quadriceps', 'glutes', 'calves', 'arms'],
    st: [
      'Step onto the pedals and grip the moving handles.',
      'Push down with your legs while pumping your arms in an elliptical motion.'
    ]
  },
  {
    id: 'c009',
    n: 'Stairmaster Stair Climber',
    bp: 'cardio',
    eq: 'stepmill machine',
    tg: 'cardiovascular system',
    mg: 'glutes',
    sm: ['quadriceps', 'calves', 'hamstrings'],
    st: [
      'Step onto the rotating stairs and choose your pace.',
      'Step fully on each stair with upright posture without slouching over the rails.'
    ]
  },
  {
    id: 'c010',
    n: 'Indoor Rowing Machine',
    bp: 'cardio',
    eq: 'leverage machine',
    tg: 'cardiovascular system',
    mg: 'lats',
    sm: ['quadriceps', 'hamstrings', 'biceps', 'upper back'],
    st: [
      'Drive with your legs, hinge back with hips, then pull handle to lower chest.',
      'Reverse the sequence: extend arms, hinge forward, then slide forward on the seat.'
    ]
  },
  {
    id: 'c011',
    n: 'Jump Rope',
    bp: 'cardio',
    eq: 'rope',
    tg: 'cardiovascular system',
    mg: 'calves',
    sm: ['shoulders', 'forearms', 'core'],
    st: [
      'Hold the handles at hip height with elbows tucked.',
      'Turn the rope with your wrists and jump lightly on the balls of your feet.'
    ]
  },
  {
    id: 'c012',
    n: 'Outdoor Running',
    bp: 'cardio',
    eq: 'body weight',
    tg: 'cardiovascular system',
    mg: 'cardiovascular system',
    sm: ['quadriceps', 'hamstrings', 'calves', 'glutes'],
    st: [
      'Run outdoors maintaining good posture, regular breathing, and forward gaze.'
    ]
  },
  {
    id: 'c013',
    n: 'Outdoor Walking',
    bp: 'cardio',
    eq: 'body weight',
    tg: 'cardiovascular system',
    mg: 'cardiovascular system',
    sm: ['calves', 'quadriceps', 'glutes'],
    st: [
      'Walk at a steady, brisk pace outdoors.'
    ]
  },
  {
    id: 'c014',
    n: 'Outdoor Cycling',
    bp: 'cardio',
    eq: 'body weight',
    tg: 'cardiovascular system',
    mg: 'quads',
    sm: ['hamstrings', 'calves', 'glutes'],
    st: [
      'Ride bicycle on roads or trails.'
    ]
  },
  {
    id: 'c015',
    n: 'Swimming',
    bp: 'cardio',
    eq: 'body weight',
    tg: 'cardiovascular system',
    mg: 'lats',
    sm: ['shoulders', 'pectorals', 'core', 'quadriceps'],
    st: [
      'Swim laps using freestyle, breaststroke, backstroke, or butterfly.'
    ]
  },
  {
    id: 'c016',
    n: 'Jumping Jacks',
    bp: 'cardio',
    eq: 'body weight',
    tg: 'cardiovascular system',
    mg: 'calves',
    sm: ['shoulders', 'quadriceps', 'glutes'],
    st: [
      'Jump feet outward while raising arms overhead, then return to center.'
    ]
  },
  {
    id: 'c017',
    n: 'Mountain Climbers',
    bp: 'cardio',
    eq: 'body weight',
    tg: 'abs',
    mg: 'abs',
    sm: ['shoulders', 'hip flexors', 'cardiovascular system'],
    st: [
      'From a high plank position, alternate driving your knees toward your chest rapidly.'
    ]
  },
  {
    id: 'c018',
    n: 'HIIT Session',
    bp: 'cardio',
    eq: 'body weight',
    tg: 'cardiovascular system',
    mg: 'cardiovascular system',
    sm: ['quadriceps', 'abs', 'calves'],
    st: [
      'Perform high-intensity effort intervals followed by short recovery periods.'
    ]
  },
  {
    id: 'c019',
    n: 'Heavy Bag Boxing',
    bp: 'cardio',
    eq: 'body weight',
    tg: 'cardiovascular system',
    mg: 'shoulders',
    sm: ['core', 'arms', 'back', 'legs'],
    st: [
      'Throw combinations of jabs, crosses, hooks, and uppercuts on the heavy bag.'
    ]
  },
  {
    id: 'c020',
    n: 'Battle Ropes',
    bp: 'cardio',
    eq: 'rope',
    tg: 'cardiovascular system',
    mg: 'shoulders',
    sm: ['arms', 'core', 'upper back'],
    st: [
      'Alternate slamming or waving the heavy ropes with rapid arm pulses.'
    ]
  },

  // ── Strength / Gym Classics ─────────────────────────────────────────────
  {
    id: 'g001',
    n: 'Barbell Hip Thrust',
    bp: 'upper legs',
    eq: 'barbell',
    tg: 'glutes',
    mg: 'glutes',
    sm: ['hamstrings', 'quadriceps', 'lower back'],
    st: [
      'Sit on the floor with your upper back against a bench and a padded barbell across your hips.',
      'Plant your feet flat on the floor, shoulder-width apart.',
      'Drive through your heels to lift your hips until your thighs and torso are parallel to the floor.',
      'Squeeze your glutes hard at the top for a second, then lower under control.'
    ]
  },
  {
    id: 'g002',
    n: 'Machine Hip Thrust',
    bp: 'upper legs',
    eq: 'leverage machine',
    tg: 'glutes',
    mg: 'glutes',
    sm: ['hamstrings', 'quadriceps'],
    st: [
      'Fasten the waist belt or pad securely across your hip crease.',
      'Position your feet flat and drive through heels to full hip extension.',
      'Squeeze glutes at the peak contraction.'
    ]
  },
  {
    id: 'g003',
    n: 'Dumbbell Bulgarian Split Squat',
    bp: 'upper legs',
    eq: 'dumbbell',
    tg: 'quads',
    mg: 'quads',
    sm: ['glutes', 'hamstrings', 'calves'],
    st: [
      'Stand about two feet in front of a bench holding dumbbells at your sides.',
      'Place the top of your rear foot onto the bench.',
      'Lower your hips down until your front thigh is parallel to the ground.',
      'Press through the front heel to return to the starting position.'
    ]
  },
  {
    id: 'g004',
    n: 'Smith Machine Bulgarian Split Squat',
    bp: 'upper legs',
    eq: 'smith machine',
    tg: 'quads',
    mg: 'quads',
    sm: ['glutes', 'hamstrings'],
    st: [
      'Position a bench behind the Smith bar.',
      'Unrack the bar across your upper back with one foot elevated behind you.',
      'Lower straight down and press back up with your front leg.'
    ]
  },
  {
    id: 'g005',
    n: 'V-Bar Lat Pulldown',
    bp: 'back',
    eq: 'cable',
    tg: 'lats',
    mg: 'lats',
    sm: ['biceps', 'rhomboids', 'upper back'],
    st: [
      'Attach a V-bar handle to the lat pulldown machine.',
      'Grip the handles with neutral grip and sit with thighs secured.',
      'Pull the handle down to your upper chest while driving elbows down and back.',
      'Slowly extend arms back to the starting stretch.'
    ]
  },
  {
    id: 'g006',
    n: 'Chest Supported T-Bar Row',
    bp: 'back',
    eq: 'leverage machine',
    tg: 'upper back',
    mg: 'lats',
    sm: ['biceps', 'rhomboids', 'rear deltoids'],
    st: [
      'Lie face down with chest resting on the pad.',
      'Grasp the handles and pull toward your ribcage, squeezing shoulder blades together.',
      'Lower the weight with control.'
    ]
  },
  {
    id: 'g007',
    n: 'Seated Cable Row (V-Bar)',
    bp: 'back',
    eq: 'cable',
    tg: 'lats',
    mg: 'lats',
    sm: ['biceps', 'rhomboids', 'rear deltoids'],
    st: [
      'Sit at the low cable row with feet on the footrests and knees slightly bent.',
      'Grasp the V-handle with both hands.',
      'Keep your torso upright and pull the handle to your abdomen, squeezing your back.'
    ]
  },
  {
    id: 'g008',
    n: 'Reverse Pec Deck Fly',
    bp: 'shoulders',
    eq: 'leverage machine',
    tg: 'delts',
    mg: 'delts',
    sm: ['rear deltoids', 'rhomboids', 'traps'],
    st: [
      'Sit facing the pec deck machine with chest against the pad.',
      'Grasp the handles at shoulder height with elbows slightly bent.',
      'Open your arms outward in a reverse arc, squeezing rear delts.',
      'Return slowly to the starting position.'
    ]
  },
  {
    id: 'g009',
    n: 'Cable Face Pull',
    bp: 'shoulders',
    eq: 'cable',
    tg: 'delts',
    mg: 'delts',
    sm: ['rear deltoids', 'rotator cuff', 'upper back', 'traps'],
    st: [
      'Set cable pulley at upper chest height with a rope attachment.',
      'Grasp ends with thumbs facing backward and step back.',
      'Pull rope directly toward your face/forehead while separating the ends.',
      'Externally rotate shoulders at the finish and hold for a second.'
    ]
  },
  {
    id: 'g010',
    n: 'Cable Lateral Raise',
    bp: 'shoulders',
    eq: 'cable',
    tg: 'delts',
    mg: 'delts',
    sm: ['traps'],
    st: [
      'Set cable to the lowest position and grab the handle across your body.',
      'Raise your arm out to the side until parallel to the floor.',
      'Lower under steady tension.'
    ]
  },
  {
    id: 'g011',
    n: 'Machine Shoulder Press',
    bp: 'shoulders',
    eq: 'leverage machine',
    tg: 'delts',
    mg: 'delts',
    sm: ['triceps', 'upper chest'],
    st: [
      'Adjust seat so handles are at shoulder level.',
      'Press handles overhead to full lockout without shrugging shoulders.',
      'Lower slowly to ear level.'
    ]
  },
  {
    id: 'g012',
    n: 'Chest Press Machine',
    bp: 'chest',
    eq: 'leverage machine',
    tg: 'pectorals',
    mg: 'pectorals',
    sm: ['triceps', 'delts'],
    st: [
      'Adjust seat so handles align with mid-chest.',
      'Press handles forward until arms are extended, keeping back flat on pad.',
      'Return slowly until you feel a gentle stretch in the chest.'
    ]
  },
  {
    id: 'g013',
    n: 'Incline Chest Press Machine',
    bp: 'chest',
    eq: 'leverage machine',
    tg: 'pectorals',
    mg: 'pectorals',
    sm: ['triceps', 'delts'],
    st: [
      'Sit on the incline press machine with back firmly supported.',
      'Press upward and forward along the machine trajectory.',
      'Lower with control.'
    ]
  },
  {
    id: 'g014',
    n: 'Pec Deck Fly Machine',
    bp: 'chest',
    eq: 'leverage machine',
    tg: 'pectorals',
    mg: 'pectorals',
    sm: ['delts'],
    st: [
      'Sit back against pad and place arms against the padded levers or handles.',
      'Bring handles together in front of your chest, squeezing pectorals.',
      'Control the eccentric return.'
    ]
  },
  {
    id: 'g015',
    n: 'Mid Cable Fly',
    bp: 'chest',
    eq: 'cable',
    tg: 'pectorals',
    mg: 'pectorals',
    sm: ['delts', 'biceps'],
    st: [
      'Set pulleys at chest height. Take a handle in each hand and step forward.',
      'Bring hands together in front of your chest with a slight elbow bend.',
      'Squeeze pecs at the center point.'
    ]
  },
  {
    id: 'g016',
    n: 'Low Cable Fly',
    bp: 'chest',
    eq: 'cable',
    tg: 'pectorals',
    mg: 'pectorals',
    sm: ['delts', 'biceps'],
    st: [
      'Set pulleys to the lowest position.',
      'Scoop arms upward and together in an arc, focusing on upper chest.'
    ]
  },
  {
    id: 'g017',
    n: 'Rope Triceps Pushdown',
    bp: 'upper arms',
    eq: 'cable',
    tg: 'triceps',
    mg: 'triceps',
    sm: ['forearms'],
    st: [
      'Attach rope to high cable. Grip ends with neutral grip.',
      'Pin elbows to your sides and push down, spreading rope apart at the bottom.',
      'Squeeze triceps at full lockout.'
    ]
  },
  {
    id: 'g018',
    n: 'Straight Bar Triceps Pushdown',
    bp: 'upper arms',
    eq: 'cable',
    tg: 'triceps',
    mg: 'triceps',
    sm: ['forearms'],
    st: [
      'Grip straight bar with overhand grip at chest level.',
      'Extend arms downward to full extension, locking out triceps.'
    ]
  },
  {
    id: 'g019',
    n: 'V-Bar Triceps Pushdown',
    bp: 'upper arms',
    eq: 'cable',
    tg: 'triceps',
    mg: 'triceps',
    sm: ['forearms'],
    st: [
      'Grip angled V-bar attachment with overhand grip.',
      'Push down firmly while keeping upper arms vertical.'
    ]
  },
  {
    id: 'g020',
    n: 'Overhead Cable Triceps Extension',
    bp: 'upper arms',
    eq: 'cable',
    tg: 'triceps',
    mg: 'triceps',
    sm: ['forearms', 'shoulders'],
    st: [
      'Attach rope to cable, face away from machine and extend arms overhead.',
      'Flex at elbows to let rope travel behind head, then extend to lockout.'
    ]
  },
  {
    id: 'g021',
    n: 'EZ-Bar Skullcrusher',
    bp: 'upper arms',
    eq: 'ez barbell',
    tg: 'triceps',
    mg: 'triceps',
    sm: ['forearms'],
    st: [
      'Lie flat on bench holding EZ bar with narrow overhand grip above chest.',
      'Hinge at elbows to lower bar toward forehead/crown of head.',
      'Extend forearms back up to starting position.'
    ]
  },
  {
    id: 'g022',
    n: 'EZ-Bar Preacher Curl',
    bp: 'upper arms',
    eq: 'ez barbell',
    tg: 'biceps',
    mg: 'biceps',
    sm: ['forearms', 'brachialis'],
    st: [
      'Sit at preacher bench with armpits snug against the top edge.',
      'Curl the EZ bar upward, squeezing biceps at top contraction.',
      'Lower until arms are almost fully extended.'
    ]
  },
  {
    id: 'g023',
    n: 'Machine Preacher Curl',
    bp: 'upper arms',
    eq: 'leverage machine',
    tg: 'biceps',
    mg: 'biceps',
    sm: ['forearms', 'brachialis'],
    st: [
      'Position chest and upper arms against pad and grasp handles.',
      'Curl handles upward with smooth tension throughout range.'
    ]
  },
  {
    id: 'g024',
    n: '21s Bicep Curl',
    bp: 'upper arms',
    eq: 'ez barbell',
    tg: 'biceps',
    mg: 'biceps',
    sm: ['forearms'],
    st: [
      'Perform 7 reps from bottom to halfway point.',
      'Perform 7 reps from halfway point to top contraction.',
      'Perform 7 full range of motion reps.'
    ]
  },
  {
    id: 'g025',
    n: 'Reverse EZ-Bar Curl',
    bp: 'lower arms',
    eq: 'ez barbell',
    tg: 'forearms',
    mg: 'forearms',
    sm: ['biceps', 'brachialis'],
    st: [
      'Grip EZ bar with overhand (pronated) grip.',
      'Curl upward to train brachioradialis and forearm extensors.'
    ]
  },
  {
    id: 'g026',
    n: 'Leg Extension Machine',
    bp: 'upper legs',
    eq: 'leverage machine',
    tg: 'quads',
    mg: 'quads',
    sm: ['calves'],
    st: [
      'Sit on machine with pad resting against lower shins just above ankles.',
      'Extend legs to full horizontal position, pausing briefly at the top.',
      'Lower weight with control.'
    ]
  },
  {
    id: 'g027',
    n: 'Lying Leg Curl Machine',
    bp: 'upper legs',
    eq: 'leverage machine',
    tg: 'hamstrings',
    mg: 'hamstrings',
    sm: ['calves', 'glutes'],
    st: [
      'Lie face down with pad positioned just below calf muscles.',
      'Curl heels toward glutes, keeping hips pressed into the bench.',
      'Lower slowly back to start.'
    ]
  },
  {
    id: 'g028',
    n: 'Seated Leg Curl Machine',
    bp: 'upper legs',
    eq: 'leverage machine',
    tg: 'hamstrings',
    mg: 'hamstrings',
    sm: ['calves', 'glutes'],
    st: [
      'Sit with back against pad and thigh clamp secured.',
      'Curl legs downward and backward toward the seat base.',
      'Return slowly under control.'
    ]
  },
  {
    id: 'g029',
    n: 'Standing Leg Curl Machine',
    bp: 'upper legs',
    eq: 'leverage machine',
    tg: 'hamstrings',
    mg: 'hamstrings',
    sm: ['calves'],
    st: [
      'Stand facing machine with one leg against roller pad.',
      'Curl one heel up toward your glute, squeeze, and lower.'
    ]
  },
  {
    id: 'g030',
    n: 'Hip Adductor Machine',
    bp: 'upper legs',
    eq: 'leverage machine',
    tg: 'adductors',
    mg: 'adductors',
    sm: ['glutes'],
    st: [
      'Sit with inner thighs resting against pads and legs spread wide.',
      'Squeeze legs together against resistance.',
      'Control the return outward.'
    ]
  },
  {
    id: 'g031',
    n: 'Hip Abductor Machine',
    bp: 'upper legs',
    eq: 'leverage machine',
    tg: 'glutes',
    mg: 'glutes',
    sm: ['abductors'],
    st: [
      'Sit with outer thighs against pads and feet on footrests.',
      'Push legs outward away from each other, squeezing side glutes.',
      'Return slowly to center.'
    ]
  },
  {
    id: 'g032',
    n: 'Seated Calf Raise Machine',
    bp: 'lower legs',
    eq: 'leverage machine',
    tg: 'calves',
    mg: 'calves',
    sm: ['soleus'],
    st: [
      'Sit with knees under pad and balls of feet on platform.',
      'Lower heels for full stretch, then press upward on toes as high as possible.'
    ]
  },
  {
    id: 'g033',
    n: 'Smith Machine Calf Raise',
    bp: 'lower legs',
    eq: 'smith machine',
    tg: 'calves',
    mg: 'calves',
    sm: ['gastrocnemius'],
    st: [
      'Stand on a step or block under the Smith bar.',
      'Lower heels below platform level, then drive onto tiptoes.'
    ]
  },
  {
    id: 'g034',
    n: 'Kneeling Cable Crunch',
    bp: 'waist',
    eq: 'cable',
    tg: 'abs',
    mg: 'abs',
    sm: ['obliques', 'core'],
    st: [
      'Kneel below high cable holding rope attachment behind head/ears.',
      'Crunch downward, drawing elbows toward knees and curling spine.',
      'Squeeze abs at bottom without sitting back on heels.'
    ]
  },
  {
    id: 'g035',
    n: 'Machine Abdominal Crunch',
    bp: 'waist',
    eq: 'leverage machine',
    tg: 'abs',
    mg: 'abs',
    sm: ['core'],
    st: [
      'Sit with upper chest or shoulders against lever pad.',
      'Flex spine forward to crunch against resistance.',
      'Return under control.'
    ]
  },
  {
    id: 'g036',
    n: 'Plank',
    bp: 'waist',
    eq: 'body weight',
    tg: 'abs',
    mg: 'abs',
    sm: ['core', 'shoulders', 'glutes'],
    st: [
      'Support weight on forearms and toes with body in straight line from head to heels.',
      'Brace core and glutes, holding position for target time.'
    ]
  },
  {
    id: 'g037',
    n: 'Side Plank',
    bp: 'waist',
    eq: 'body weight',
    tg: 'abs',
    mg: 'obliques',
    sm: ['core', 'shoulders'],
    st: [
      'Lie on side and prop upper body on forearm.',
      'Lift hips off ground until body forms straight diagonal line.'
    ]
  },
  {
    id: 'g038',
    n: 'Stomach Vacuum',
    bp: 'waist',
    eq: 'body weight',
    tg: 'abs',
    mg: 'abs',
    sm: ['transverse abdominis'],
    st: [
      'Exhale all air from lungs and pull navel inward toward spine as hard as possible.',
      'Hold the isometric contraction for 15-30 seconds while taking shallow breaths.'
    ]
  },
  {
    id: 'g039',
    n: 'Hack Squat Machine',
    bp: 'upper legs',
    eq: 'sled machine',
    tg: 'quads',
    mg: 'quads',
    sm: ['glutes', 'calves'],
    st: [
      'Place back and shoulders against pad with feet shoulder-width on platform.',
      'Disengage safety and lower hips until knees reach 90 degrees.',
      'Drive through heels to press back up.'
    ]
  },
  {
    id: 'g040',
    n: 'Leg Press 45 Degree',
    bp: 'upper legs',
    eq: 'sled machine',
    tg: 'quads',
    mg: 'quads',
    sm: ['glutes', 'hamstrings', 'calves'],
    st: [
      'Sit on sled leg press with back firmly against seat.',
      'Place feet shoulder-width on platform.',
      'Lower sled until knees reach 90 degrees, then press through whole foot to return.'
    ]
  },
  {
    id: 'g041',
    n: 'Horizontal Leg Press Machine',
    bp: 'upper legs',
    eq: 'leverage machine',
    tg: 'quads',
    mg: 'quads',
    sm: ['glutes', 'calves'],
    st: [
      'Sit in seated horizontal leg press.',
      'Push platform away by extending knees, then return with control.'
    ]
  },
  {
    id: 'g042',
    n: 'Barbell Romanian Deadlift',
    bp: 'upper legs',
    eq: 'barbell',
    tg: 'hamstrings',
    mg: 'hamstrings',
    sm: ['glutes', 'lower back', 'forearms'],
    st: [
      'Hold barbell with overhand grip at hip height, knees slightly unlocked.',
      'Hinge at hips, pushing butt backward while lowering bar down along shins.',
      'Feel deep hamstring stretch, then drive hips forward to stand tall.'
    ]
  },
  {
    id: 'g043',
    n: 'Dumbbell Stiff Leg Deadlift',
    bp: 'upper legs',
    eq: 'dumbbell',
    tg: 'hamstrings',
    mg: 'hamstrings',
    sm: ['glutes', 'lower back'],
    st: [
      'Hold dumbbells in front of thighs with legs nearly straight.',
      'Hinge at hips to lower dumbbells toward feet, keeping back flat.',
      'Contract glutes and hamstrings to return upright.'
    ]
  },
  {
    id: 'g044',
    n: 'Barbell Stiff Leg Deadlift',
    bp: 'upper legs',
    eq: 'barbell',
    tg: 'hamstrings',
    mg: 'hamstrings',
    sm: ['glutes', 'lower back'],
    st: [
      'Stand with feet hip-width apart and knees nearly straight.',
      'Lower barbell down legs with flat spine until hamstrings are stretched, then stand.'
    ]
  },
  {
    id: 'g045',
    n: 'Leg Press Calf Raise',
    bp: 'lower legs',
    eq: 'sled machine',
    tg: 'calves',
    mg: 'calves',
    sm: ['soleus', 'gastrocnemius'],
    st: [
      'Place balls of feet on bottom edge of leg press platform with heels hanging off.',
      'Extend ankles fully forward, hold contraction, then let heels sink into full stretch.'
    ]
  },
  {
    id: 'g046',
    n: 'Incline Dumbbell Bicep Curl',
    bp: 'upper arms',
    eq: 'dumbbell',
    tg: 'biceps',
    mg: 'biceps',
    sm: ['forearms'],
    st: [
      'Sit on incline bench set to 45-60 degrees with dumbbells hanging straight down.',
      'Curl dumbbells upward while supinating wrists, keeping upper arms stationary.',
      'Lower slowly to full stretch.'
    ]
  },
  {
    id: 'g047',
    n: 'Rope Hammer Curl on Cable',
    bp: 'upper arms',
    eq: 'cable',
    tg: 'biceps',
    mg: 'forearms',
    sm: ['brachialis', 'biceps'],
    st: [
      'Attach rope to low pulley and grip with palms facing each other.',
      'Curl upward keeping wrists neutral to target brachialis and forearm muscles.'
    ]
  },
  {
    id: 'g048',
    n: 'Landmine Shoulder Press',
    bp: 'shoulders',
    eq: 'barbell',
    tg: 'delts',
    mg: 'delts',
    sm: ['triceps', 'upper chest', 'core'],
    st: [
      'Insert one end of barbell into landmine or corner.',
      'Grasp end of bar with one hand at shoulder level and press upward and forward at 45 degrees.'
    ]
  },
  {
    id: 'g049',
    n: 'Seated Dumbbell Lateral Raise',
    bp: 'shoulders',
    eq: 'dumbbell',
    tg: 'delts',
    mg: 'delts',
    sm: ['traps'],
    st: [
      'Sit upright on bench holding dumbbells at sides.',
      'Raise dumbbells out to shoulder height without swinging torso.',
      'Lower under control.'
    ]
  },
  {
    id: 'g050',
    n: 'Neutral Grip Dumbbell Bench Press',
    bp: 'chest',
    eq: 'dumbbell',
    tg: 'pectorals',
    mg: 'pectorals',
    sm: ['triceps', 'delts'],
    st: [
      'Lie on flat bench with palms facing each other holding dumbbells.',
      'Press upward over chest, keeping elbows tucked close to ribcage for shoulder comfort.'
    ]
  }
]
