import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LocalMediaObjectStorage, mediaObjectFileName } from './media-storage.js';

describe('LocalMediaObjectStorage', () => {
  it('stores and reads an object without allowing path traversal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'fitness-media-'));
    const storage = new LocalMediaObjectStorage(root);
    await expect(storage.put('exercise-1/demo.gif', new TextEncoder().encode('gif'), 'image/gif'))
      .resolves.toMatchObject({ objectKey: 'exercise-1/demo.gif', sizeBytes: 3 });
    const result = await storage.get('exercise-1/demo.gif');
    await expect(readFile(result.body.path as string, 'utf8')).resolves.toBe('gif');
    await expect(storage.put('../outside', new Uint8Array([1]), 'application/octet-stream')).rejects.toThrow('invalid');
    expect(mediaObjectFileName('exercise-1/demo.gif')).toBe('demo.gif');
  });
});
