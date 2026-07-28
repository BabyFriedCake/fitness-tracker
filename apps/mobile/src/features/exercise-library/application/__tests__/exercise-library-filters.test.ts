import {
  EMPTY_EXERCISE_LIBRARY_FILTERS,
  toggleExerciseLibraryMuscleGroup,
} from '../exercise-library-filters';

describe('exercise library filters', () => {
  it('keeps muscle group selection single choice', () => {
    const chest = toggleExerciseLibraryMuscleGroup(
      EMPTY_EXERCISE_LIBRARY_FILTERS,
      'chest',
    );

    expect(chest.muscleGroups).toEqual(['chest']);

    const back = toggleExerciseLibraryMuscleGroup(chest, 'back');
    expect(back.muscleGroups).toEqual(['back']);

    const cleared = toggleExerciseLibraryMuscleGroup(back, 'back');
    expect(cleared.muscleGroups).toEqual([]);
  });
});
