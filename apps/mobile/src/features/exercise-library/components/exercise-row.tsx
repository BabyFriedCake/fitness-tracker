import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Equipment, Exercise, MuscleGroup } from '@/domain/exercise';
import { useTheme } from '@/hooks/use-theme';

export type ExerciseRowProps = {
  readonly exercise: Exercise;
};

export function ExerciseRow({ exercise }: ExerciseRowProps) {
  const theme = useTheme();
  const muscleGroup = formatMuscleGroup(exercise.primaryMuscleGroup);
  const equipment = formatEquipment(exercise.equipment);

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.container, { borderColor: theme.backgroundSelected }]}
      accessibilityRole="text"
      accessibilityLabel={`${exercise.nameZh}，${muscleGroup}，${equipment}`}
    >
      <ThemedText type="default">{exercise.nameZh}</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.attributes}
      >
        {muscleGroup} · {equipment}
      </ThemedText>
    </ThemedView>
  );
}

export function formatMuscleGroup(muscleGroup: MuscleGroup): string {
  switch (muscleGroup) {
    case 'chest':
      return '胸';
    case 'back':
      return '背';
    case 'shoulders':
      return '肩';
    case 'arms':
      return '手臂';
    case 'legs':
      return '腿';
    case 'core':
      return '核心';
    case 'full_body':
      return '全身';
    case 'cardio':
      return '有氧';
  }
}

export function formatEquipment(equipment: Equipment): string {
  switch (equipment) {
    case 'barbell':
      return '杠铃';
    case 'dumbbell':
      return '哑铃';
    case 'machine':
      return '器械';
    case 'cable':
      return '绳索';
    case 'bodyweight':
      return '自重';
    case 'cardio_machine':
      return '有氧器械';
    case 'other':
      return '其他';
  }
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  attributes: {
    flexShrink: 1,
  },
});
