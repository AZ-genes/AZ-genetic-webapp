import { adminStorage } from './firebaseAdmin';

type StorageRef = { fullPath: string };

export const storageAdapter = {
  ref(path: string): StorageRef {
    return { fullPath: path };
  },

  async uploadBytes(ref: StorageRef, data: Buffer | Uint8Array | ArrayBuffer) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
    const file = adminStorage.bucket().file(ref.fullPath);
    await file.save(buffer);
    return { metadata: { fullPath: ref.fullPath } } as const;
  },

  async deleteObject(ref: StorageRef) {
    const file = adminStorage.bucket().file(ref.fullPath);
    await file.delete({ ignoreNotFound: true });
  },

  async getBlob(ref: StorageRef): Promise<Blob> {
    const file = adminStorage.bucket().file(ref.fullPath);
    const [contents] = await file.download();
    return new Blob([contents]);
  },

  async getDownloadURL(ref: StorageRef): Promise<string> {
    const file = adminStorage.bucket().file(ref.fullPath);
    const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 3600_000 });
    return url;
  }
};

export type StorageAdapter = typeof storageAdapter;


