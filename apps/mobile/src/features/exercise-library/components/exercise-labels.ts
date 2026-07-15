import type { Equipment, MuscleGroup } from '@/domain/exercise';

const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背',
  shoulders: '肩',
  arms: '手臂',
  legs: '腿',
  core: '核心',
  full_body: '全身',
  cardio: '心肺',
};

const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: '杠铃',
  dumbbell: '哑铃',
  machine: '器械',
  cable: '绳索',
  bodyweight: '自重',
  cardio_machine: '有氧器械',
  other: '其他',
};

export function formatMuscleGroup(muscleGroup: MuscleGroup): string {
  return MUSCLE_GROUP_LABELS[muscleGroup];
}

export function formatEquipment(equipment: Equipment): string {
  return EQUIPMENT_LABELS[equipment];
}
