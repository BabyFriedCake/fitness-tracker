import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';

export type MediaObject = {
  objectKey: string;
  contentType: string;
  sizeBytes: number;
};

export interface MediaObjectStorage {
  put(objectKey: string, content: Uint8Array, contentType: string): Promise<MediaObject>;
  get(objectKey: string): Promise<{ metadata: MediaObject; body: ReturnType<typeof createReadStream> }>;
  remove(objectKey: string): Promise<void>;
}

const safeKey = (objectKey: string): string => {
  const normalized = objectKey.replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || normalized.includes('..')) {
    throw new Error('Media object key is invalid.');
  }
  return normalized;
};

export class LocalMediaObjectStorage implements MediaObjectStorage {
  constructor(private readonly rootDirectory: string) {}

  async put(objectKey: string, content: Uint8Array, contentType: string): Promise<MediaObject> {
    const key = safeKey(objectKey);
    const path = resolve(this.rootDirectory, key);
    if (!relative(resolve(this.rootDirectory), path) || relative(resolve(this.rootDirectory), path).startsWith('..')) {
      throw new Error('Media object key escapes storage root.');
    }
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, content, { flag: 'wx' });
    return { objectKey: key, contentType, sizeBytes: content.byteLength };
  }

  async get(objectKey: string) {
    const key = safeKey(objectKey);
    const path = resolve(this.rootDirectory, key);
    const content = await readFile(path);
    return {
      metadata: { objectKey: key, contentType: 'application/octet-stream', sizeBytes: content.byteLength },
      body: createReadStream(path),
    };
  }

  async remove(objectKey: string): Promise<void> {
    await rm(resolve(this.rootDirectory, safeKey(objectKey)), { force: false });
  }
}

export const mediaObjectFileName = (objectKey: string): string => basename(safeKey(objectKey));
