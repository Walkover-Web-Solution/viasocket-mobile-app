// src/utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Storage } from 'redux-persist';

// Try to use MMKV, fallback to AsyncStorage if it fails
let useMMKV = false;
let MMKVStorage: any = null;

try {
    const { MMKV } = require('react-native-mmkv');
    MMKVStorage = new MMKV();
    useMMKV = true;
    console.log('✅ MMKV storage initialized successfully');
} catch (error) {
    console.warn('⚠️ MMKV failed to initialize, falling back to AsyncStorage:', error.message);
    useMMKV = false;
}

// Export the storage instance for direct use if needed
export const storage = MMKVStorage;

// Redux Persist compatible storage
export const mmkvStorage: Storage = {
    setItem: async (key: string, value: string): Promise<boolean> => {
        try {
            if (useMMKV && MMKVStorage) {
                MMKVStorage.set(key, value);
            } else {
                await AsyncStorage.setItem(key, value);
            }
            return true;
        } catch (error) {
            console.error('Storage setItem error:', error);
            return false;
        }
    },
    getItem: async (key: string): Promise<string | null> => {
        try {
            if (useMMKV && MMKVStorage) {
                return MMKVStorage.getString(key) ?? null;
            } else {
                return await AsyncStorage.getItem(key);
            }
        } catch (error) {
            console.error('Storage getItem error:', error);
            return null;
        }
    },
    removeItem: async (key: string): Promise<void> => {
        try {
            if (useMMKV && MMKVStorage) {
                MMKVStorage.delete(key);
            } else {
                await AsyncStorage.removeItem(key);
            }
        } catch (error) {
            console.error('Storage removeItem error:', error);
        }
    },
};

// Log which storage is being used
console.log(`📦 Using ${useMMKV ? 'MMKV' : 'AsyncStorage'} for persistence`);
