import { storage, STORAGE_KEYS } from '../storage';

// Mock dependencies
jest.mock('expo-secure-store', () => ({
    setItemAsync: jest.fn(),
    getItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
    Platform: {
        OS: 'ios', // Default to mobile
    },
}));

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

describe('Storage Utility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Mobile Environment', () => {
        beforeAll(() => {
            Platform.OS = 'ios';
        });

        it('should use SecureStore for secure items', async () => {
            await storage.setSecureItem('key', 'value');
            expect(SecureStore.setItemAsync).toHaveBeenCalledWith('key', 'value');
            expect(AsyncStorage.setItem).not.toHaveBeenCalled();

            (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('value');
            const result = await storage.getSecureItem('key');
            expect(result).toBe('value');
            expect(SecureStore.getItemAsync).toHaveBeenCalledWith('key');

            await storage.removeSecureItem('key');
            expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('key');
        });

        it('should use AsyncStorage for non-secure items', async () => {
            await storage.setItem('key', { data: 'test' });
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('key', JSON.stringify({ data: 'test' }));

            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ data: 'test' }));
            const result = await storage.getItem('key');
            expect(result).toEqual({ data: 'test' });

            await storage.removeItem('key');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('key');
        });
    });

    describe('Web Environment', () => {
        beforeAll(() => {
            Platform.OS = 'web';
        });

        it('should use AsyncStorage for secure items fallback', async () => {
            await storage.setSecureItem('key', 'value');
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('key', 'value');
            expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
        });
    });
});
