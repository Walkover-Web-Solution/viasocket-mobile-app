// src/utils/mmkvStorage.ts
import { MMKV } from 'react-native-mmkv';
import type { Storage } from 'redux-persist';

export const storage = new MMKV();

export const mmkvStorage: Storage = {
    setItem: (key: string, value: string): Promise<boolean> => {
        storage.set(key, value);
        return Promise.resolve(true);
    },
    getItem: (key: string): Promise<string | null> => {
        const value = storage.getString(key);
        return Promise.resolve(value ?? null);
    },
    removeItem: (key: string): Promise<void> => {
        storage.delete(key);
        return Promise.resolve();
    },
};
