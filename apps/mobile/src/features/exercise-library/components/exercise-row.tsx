import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Exercise } from '@/domain/exercise';
import { useTheme } from '@/hooks/use-theme';

import { formatEquipment, formatMuscleGroup } from './exercise-labels';

export type ExerciseRowProps = {
  readonly exercise: Exercise;
  readonly onPress?: (exercise: Exercise) => void;
};

export function ExerciseRow({ exercise, onPress }: ExerciseRowProps) {
  const theme = useTheme();
  const muscleGroup = formatMuscleGroup(exercise.primaryMuscleGroup);
  const equipment = formatEquipment(exercise.equipment);
  const accessibilityLabel = onPress
    ? `查看${exercise.nameZh}详情，${muscleGroup}，${equipment}`
    : `${exercise.nameZh}，${muscleGroup}，${equipment}`;

  return (
    <Pressable
      disabled={!onPress}
      onPress={() => onPress?.(exercise)}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="default">{exercise.nameZh}</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.attributes}
      >
        {muscleGroup} · {equipment}
      </ThemedText>
    </Pressable>
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
  pressed: {
    opacity: 0.72,
  },
});
