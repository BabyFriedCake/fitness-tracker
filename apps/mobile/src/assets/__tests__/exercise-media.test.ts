/// <reference types="jest" />

import {
  EXERCISE_MEDIA_ASSET_MAP,
  resolveExerciseImageSource,
} from '../exercise-media';

describe('exercise media assets', () => {
  it('maps the bundled dataset images to local assets', () => {
    const imageUri = 'assets/images/exercises/0001-2gPfomN.jpg';

    expect(Object.keys(EXERCISE_MEDIA_ASSET_MAP)).toHaveLength(1324);
    expect(EXERCISE_MEDIA_ASSET_MAP[imageUri]).toBeTruthy();
    expect(resolveExerciseImageSource(imageUri)).toEqual(
      EXERCISE_MEDIA_ASSET_MAP[imageUri],
    );
  });

  it('falls back to a source uri for non-bundled image references', () => {
    expect(resolveExerciseImageSource('file://exercise.png')).toEqual({
      uri: 'file://exercise.png',
    });
  });
});
