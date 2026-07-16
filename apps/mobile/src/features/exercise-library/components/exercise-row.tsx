import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { Exercise } from '@/domain/exercise';
import { useTheme } from '@/hooks/use-theme';

import { formatEquipment, formatMuscleGroup } from './exercise-labels';

export type ExerciseRowProps = {
  readonly exercise: Exercise;
  readonly onPress?: (exercise: Exercise) => void;
  readonly action?: ExerciseRowAction;
};

export type ExerciseRowAction = {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly disabled?: boolean;
  readonly disabledHint?: string;
  readonly onPress: (exercise: Exercise) => void;
};

export function ExerciseRow({ exercise, onPress, action }: ExerciseRowProps) {
  const theme = useTheme();
  const muscleGroup = formatMuscleGroup(exercise.primaryMuscleGroup);
  const equipment = formatEquipment(exercise.equipment);
  const accessibilityLabel = onPress
    ? `查看${exercise.nameZh}详情，${muscleGroup}，${equipment}`
    : `${exercise.nameZh}，${muscleGroup}，${equipment}`;

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.container,
        {
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <Pressable
        disabled={!onPress}
        onPress={() => onPress?.(exercise)}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.textContent,
          pressed && onPress && styles.pressed,
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
        {action?.disabledHint && (
          <ThemedText type="small" themeColor="textSecondary">
            {action.disabledHint}
          </ThemedText>
        )}
      </Pressable>
      {action && (
        <Pressable
          disabled={action.disabled}
          onPress={() => action.onPress(exercise)}
          accessibilityRole="button"
          accessibilityState={{ disabled: action.disabled ?? false }}
          accessibilityLabel={action.accessibilityLabel}
          style={({ pressed }) => [
            styles.actionButton,
            {
              borderColor: action.disabled
                ? theme.backgroundSelected
                : theme.text,
              opacity: action.disabled ? 0.56 : 1,
            },
            pressed && !action.disabled && styles.pressed,
          ]}
        >
          <ThemedText
            type="smallBold"
            themeColor={action.disabled ? 'textSecondary' : 'text'}
          >
            {action.label}
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
  },
  textContent: {
    flex: 1,
    gap: Spacing.one,
  },
  attributes: {
    flexShrink: 1,
  },
  actionButton: {
    minHeight: 44,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
});
