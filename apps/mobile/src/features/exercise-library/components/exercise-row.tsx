import { Pressable, StyleSheet, View } from 'react-native';

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
      <View style={styles.imagePlaceholder}>
        <ThemedText type="smallBold" style={styles.imageBadge}>
          讲解
        </ThemedText>
        <ThemedText type="title" style={styles.imageInitial}>
          {exercise.nameZh.slice(0, 1)}
        </ThemedText>
      </View>
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
    flex: 1,
    minHeight: 280,
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.three,
  },
  imagePlaceholder: {
    height: 170,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#DCE9AD',
    padding: Spacing.three,
  },
  textContent: {
    gap: Spacing.one,
  },
  imageBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderBottomRightRadius: 12,
    backgroundColor: '#1677EF',
    color: '#FFFFFF',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  imageInitial: {
    color: 'rgba(27, 32, 22, 0.28)',
    fontSize: 96,
    lineHeight: 104,
  },
  attributes: {
    flexShrink: 1,
  },
  actionButton: {
    minHeight: 44,
    minWidth: 72,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
});
