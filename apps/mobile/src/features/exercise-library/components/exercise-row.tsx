import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Exercise } from '@/domain/exercise';
import { useTheme } from '@/hooks/use-theme';

import { formatEquipment, formatMuscleGroup } from './exercise-labels';

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
