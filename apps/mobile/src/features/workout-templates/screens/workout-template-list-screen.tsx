import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { WorkoutTemplateId } from '@/domain/workout-template';
import {
  useWorkoutTemplateList,
  type WorkoutTemplateListScreenControls,
  type WorkoutTemplateListScreenState,
} from '@/features/workout-templates/application/use-workout-template-list';
import type { WorkoutTemplateListItem } from '@/features/workout-templates/application/load-workout-template-list';
import { useTheme } from '@/hooks/use-theme';

const NEW_TEMPLATE_ROUTE = '/templates/new' as Href;
export function WorkoutTemplateListScreen() {
  const router = useRouter();

  return (
    <WorkoutTemplateListContent
      {...useWorkoutTemplateList()}
      onCreateTemplate={() => {
        router.push(NEW_TEMPLATE_ROUTE);
      }}
      onOpenTemplate={(templateId) => {
        router.push({
          pathname: '/templates/[id]',
          params: { id: templateId },
        } as unknown as Href);
      }}
    />
  );
}

export type WorkoutTemplateListContentProps = {
  readonly state: WorkoutTemplateListScreenState;
  readonly controls: WorkoutTemplateListScreenControls;
  readonly onCreateTemplate: () => void;
  readonly onOpenTemplate: (templateId: WorkoutTemplateId) => void;
};

export function WorkoutTemplateListContent({
  state,
  controls,
  onCreateTemplate,
  onOpenTemplate,
}: WorkoutTemplateListContentProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedView style={styles.headerCopy}>
              <ThemedText type="small" themeColor="textSecondary">
                训练库
              </ThemedText>
              <ThemedText type="title">我的模板</ThemedText>
            </ThemedView>
            <PrimaryActionButton
              label="+"
              accessibilityLabel="新增训练模板"
              onPress={onCreateTemplate}
            />
          </ThemedView>

          {state.status === 'loading' && <LoadingState />}
          {state.status === 'empty' && (
            <EmptyState onCreateTemplate={onCreateTemplate} />
          )}
          {state.status === 'error' && (
            <ErrorState message={state.message} onReload={controls.reload} />
          )}
          {state.status === 'ready' && (
            <TemplateList
              templates={state.templates}
              onOpenTemplate={onOpenTemplate}
            />
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

function LoadingState() {
  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="progressbar">
      <ActivityIndicator />
      <ThemedText type="default">正在加载训练模板</ThemedText>
    </ThemedView>
  );
}

function EmptyState({
  onCreateTemplate,
}: {
  readonly onCreateTemplate: () => void;
}) {
  return (
    <ThemedView style={styles.feedbackState}>
      <ThemedText type="default">还没有训练模板</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        创建第一个模板，开始规划你的训练。
      </ThemedText>
      <PrimaryActionButton
        label="创建训练模板"
        accessibilityLabel="创建第一个训练模板"
        onPress={onCreateTemplate}
      />
    </ThemedView>
  );
}

function ErrorState({
  message,
  onReload,
}: {
  readonly message: string;
  readonly onReload: () => void;
}) {
  return (
    <ThemedView style={styles.feedbackState} accessibilityRole="alert">
      <ThemedText type="default">训练模板加载失败</ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.centerText}
      >
        {message}
      </ThemedText>
      <SecondaryActionButton
        label="重新加载"
        accessibilityLabel="重新加载训练模板"
        onPress={onReload}
      />
    </ThemedView>
  );
}

function TemplateList({
  templates,
  onOpenTemplate,
}: {
  readonly templates: readonly WorkoutTemplateListItem[];
  readonly onOpenTemplate: (templateId: WorkoutTemplateId) => void;
}) {
  return (
    <FlatList
      data={templates}
      keyExtractor={(template) => template.id}
      renderItem={({ item }) => (
        <TemplateCard template={item} onOpenTemplate={onOpenTemplate} />
      )}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={ListSeparator}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={8}
      accessibilityLabel="训练模板列表"
    />
  );
}

function TemplateCard({
  template,
  onOpenTemplate,
}: {
  readonly template: WorkoutTemplateListItem;
  readonly onOpenTemplate: (templateId: WorkoutTemplateId) => void;
}) {
  const theme = useTheme();
  const metrics = [
    `${template.exerciseCount} 个动作`,
    `${template.totalTargetSets} 组`,
  ];

  return (
    <Pressable
      onPress={() => onOpenTemplate(template.id)}
      accessibilityRole="button"
      accessibilityLabel={`查看训练模板${template.name}，${metrics.join('，')}，${formatTemplateStatus(template.status)}`}
      style={({ pressed }) => [
        styles.templateCard,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
        pressed && styles.pressed,
      ]}
    >
      <ThemedView style={styles.cardHeader}>
        <ThemedText type="subtitle" style={styles.templateName}>
          {template.name}
        </ThemedText>
        <ThemedText type="subtitle" themeColor="textSecondary">
          →
        </ThemedText>
      </ThemedView>
      <ThemedText type="small" themeColor="textSecondary">
        {metrics.join(' · ')}
      </ThemedText>
      <ThemedView style={styles.templateActions}>
        <ThemedText type="small" themeColor="textSecondary">
          查看详情
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatTemplateStatus(template.status)}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function PrimaryActionButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.primaryButton,
        {
          backgroundColor: theme.text,
        },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={[
          styles.primaryButtonText,
          {
            color: theme.background,
          },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SecondaryActionButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  readonly label: string;
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.secondaryButton,
        { borderColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

function ListSeparator() {
  return <ThemedView style={styles.separator} />;
}

function formatTemplateStatus(status: WorkoutTemplateListItem['status']) {
  switch (status) {
    case 'active':
      return '可使用';
    case 'archived':
      return '已归档';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  content: {
    flex: 1,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: Spacing.five,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  listContent: {
    paddingBottom: Spacing.three,
  },
  templateCard: {
    minHeight: 168,
    justifyContent: 'center',
    gap: Spacing.three,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  templateName: {
    flex: 1,
  },
  templateActions: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DFDDD4',
    paddingTop: Spacing.three,
  },
  statusChip: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
  },
  primaryButton: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
  },
  primaryButtonText: {
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
  separator: {
    height: Spacing.two,
  },
  feedbackState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  centerText: {
    textAlign: 'center',
  },
});
