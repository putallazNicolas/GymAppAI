import type { Equipment, MuscleGroup } from '../contracts';

export interface ExerciseSeedItem {
  /** Stable slug. The stored id is `seed-<key>`. */
  key: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
}

type Row = [key: string, name: string, muscleGroup: MuscleGroup, equipment: Equipment];

const ROWS: Row[] = [
  // chest
  ['bench-press', 'Press banca', 'chest', 'barbell'],
  ['incline-bench-press', 'Press banca inclinado', 'chest', 'barbell'],
  ['dumbbell-bench-press', 'Press con mancuernas', 'chest', 'dumbbell'],
  ['incline-dumbbell-press', 'Press inclinado con mancuernas', 'chest', 'dumbbell'],
  ['chest-fly', 'Aperturas con mancuernas', 'chest', 'dumbbell'],
  ['cable-crossover', 'Cruces en polea', 'chest', 'cable'],
  ['pec-deck', 'Pec deck', 'chest', 'machine'],
  ['push-up', 'Flexiones de brazos', 'chest', 'bodyweight'],
  // back
  ['pull-up', 'Dominadas', 'back', 'bodyweight'],
  ['lat-pulldown', 'Jalón al pecho', 'back', 'cable'],
  ['barbell-row', 'Remo con barra', 'back', 'barbell'],
  ['dumbbell-row', 'Remo con mancuerna', 'back', 'dumbbell'],
  ['seated-cable-row', 'Remo en polea baja', 'back', 'cable'],
  ['t-bar-row', 'Remo en barra T', 'back', 'barbell'],
  ['deadlift', 'Peso muerto', 'back', 'barbell'],
  ['back-extension', 'Hiperextensiones', 'back', 'bodyweight'],
  // shoulders
  ['overhead-press', 'Press militar', 'shoulders', 'barbell'],
  ['dumbbell-shoulder-press', 'Press de hombros con mancuernas', 'shoulders', 'dumbbell'],
  ['lateral-raise', 'Elevaciones laterales', 'shoulders', 'dumbbell'],
  ['front-raise', 'Elevaciones frontales', 'shoulders', 'dumbbell'],
  ['rear-delt-fly', 'Pájaros', 'shoulders', 'dumbbell'],
  ['face-pull', 'Face pull', 'shoulders', 'cable'],
  ['upright-row', 'Remo al mentón', 'shoulders', 'barbell'],
  // biceps
  ['barbell-curl', 'Curl de bíceps con barra', 'biceps', 'barbell'],
  ['dumbbell-curl', 'Curl de bíceps con mancuernas', 'biceps', 'dumbbell'],
  ['hammer-curl', 'Curl martillo', 'biceps', 'dumbbell'],
  ['preacher-curl', 'Curl predicador', 'biceps', 'barbell'],
  ['cable-curl', 'Curl en polea', 'biceps', 'cable'],
  // triceps
  ['dips', 'Fondos', 'triceps', 'bodyweight'],
  ['triceps-pushdown', 'Extensión de tríceps en polea', 'triceps', 'cable'],
  ['skull-crusher', 'Press francés', 'triceps', 'barbell'],
  ['overhead-triceps-extension', 'Extensión de tríceps sobre la cabeza', 'triceps', 'dumbbell'],
  ['close-grip-bench-press', 'Press banca agarre cerrado', 'triceps', 'barbell'],
  // forearms
  ['wrist-curl', 'Curl de muñeca', 'forearms', 'barbell'],
  ['reverse-wrist-curl', 'Curl de muñeca inverso', 'forearms', 'barbell'],
  ['farmer-walk', 'Caminata del granjero', 'forearms', 'dumbbell'],
  // quads
  ['squat', 'Sentadilla', 'quads', 'barbell'],
  ['front-squat', 'Sentadilla frontal', 'quads', 'barbell'],
  ['leg-press', 'Prensa', 'quads', 'machine'],
  ['leg-extension', 'Sillón de cuádriceps', 'quads', 'machine'],
  ['goblet-squat', 'Sentadilla goblet', 'quads', 'kettlebell'],
  ['bulgarian-split-squat', 'Sentadilla búlgara', 'quads', 'dumbbell'],
  ['lunge', 'Zancadas', 'quads', 'dumbbell'],
  ['hack-squat', 'Sentadilla hack', 'quads', 'machine'],
  // hamstrings
  ['romanian-deadlift', 'Peso muerto rumano', 'hamstrings', 'barbell'],
  ['leg-curl', 'Curl femoral acostado', 'hamstrings', 'machine'],
  ['seated-leg-curl', 'Curl femoral sentado', 'hamstrings', 'machine'],
  ['good-morning', 'Buenos días', 'hamstrings', 'barbell'],
  // glutes
  ['hip-thrust', 'Hip thrust', 'glutes', 'barbell'],
  ['glute-bridge', 'Puente de glúteos', 'glutes', 'bodyweight'],
  ['cable-kickback', 'Patada de glúteo en polea', 'glutes', 'cable'],
  ['hip-abduction', 'Abductores en máquina', 'glutes', 'machine'],
  ['kettlebell-swing', 'Swing con pesa rusa', 'glutes', 'kettlebell'],
  // calves
  ['standing-calf-raise', 'Elevación de talones de pie', 'calves', 'machine'],
  ['seated-calf-raise', 'Elevación de talones sentado', 'calves', 'machine'],
  ['donkey-calf-raise', 'Elevación de talones en prensa', 'calves', 'machine'],
  // core
  ['plank', 'Plancha', 'core', 'bodyweight'],
  ['crunch', 'Abdominales crunch', 'core', 'bodyweight'],
  ['hanging-leg-raise', 'Elevación de piernas colgado', 'core', 'bodyweight'],
  ['cable-crunch', 'Crunch en polea', 'core', 'cable'],
  ['russian-twist', 'Giro ruso', 'core', 'other'],
  ['ab-wheel', 'Rueda abdominal', 'core', 'other'],
  ['pallof-press', 'Press Pallof', 'core', 'band'],
  // full body
  ['clean-and-press', 'Cargada y press', 'full_body', 'barbell'],
  ['thruster', 'Thruster', 'full_body', 'dumbbell'],
  ['burpee', 'Burpee', 'full_body', 'bodyweight'],
  ['kettlebell-snatch', 'Arranque con pesa rusa', 'full_body', 'kettlebell'],
  // cardio
  ['treadmill', 'Cinta de correr', 'cardio', 'machine'],
  ['stationary-bike', 'Bicicleta fija', 'cardio', 'machine'],
  ['rowing-machine', 'Remo ergómetro', 'cardio', 'machine'],
  ['jump-rope', 'Soga', 'cardio', 'other'],
  ['elliptical', 'Elíptico', 'cardio', 'machine'],
];

export const EXERCISE_SEED: readonly ExerciseSeedItem[] = ROWS.map(
  ([key, name, muscleGroup, equipment]) => ({ key, name, muscleGroup, equipment }),
);

export const SEED_ID_PREFIX = 'seed-';

export function seedExerciseId(key: string): string {
  return `${SEED_ID_PREFIX}${key}`;
}
