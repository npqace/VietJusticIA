import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Keys for storage
export const STORAGE_KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_DATA: 'user_data',
    THEME: 'theme',
    LANGUAGE: 'language',
};

/**
 * Secure Storage Wrapper
 * Uses Expo SecureStore for sensitive data (tokens)
 * Uses AsyncStorage for non-sensitive data (settings) on mobile
 * Note: SecureStore is not available on web, so we need a fallback if web support is needed.
 */

// Check if we are running on web
// const isWeb = Platform.OS === 'web';

export const storage = {
    /**
     * Save item to secure storage
     * @param key Storage key
     * @param value String value to store
     */
    setSecureItem: async (key: string, value: string): Promise<void> => {
        try {
            if (Platform.OS === 'web') {
                await AsyncStorage.setItem(key, value);
            } else {
                await SecureStore.setItemAsync(key, value);
            }
        } catch (error) {
            console.error(`[Storage] Error setting secure item ${key}:`, error);
            throw error;
        }
    },

    /**
     * Get item from secure storage
     * @param key Storage key
     * @returns Promise resolving to the value or null
     */
    getSecureItem: async (key: string): Promise<string | null> => {
        try {
            if (Platform.OS === 'web') {
                return await AsyncStorage.getItem(key);
            } else {
                return await SecureStore.getItemAsync(key);
            }
        } catch (error) {
            console.error(`[Storage] Error getting secure item ${key}:`, error);
            return null;
        }
    },

    /**
     * Remove item from secure storage
     * @param key Storage key
     */
    removeSecureItem: async (key: string): Promise<void> => {
        try {
            if (Platform.OS === 'web') {
                await AsyncStorage.removeItem(key);
            } else {
                await SecureStore.deleteItemAsync(key);
            }
        } catch (error) {
            console.error(`[Storage] Error removing secure item ${key}:`, error);
            throw error;
        }
    },

    /**
     * Save item to async storage (non-sensitive)
     * @param key Storage key
     * @param value Value to store (will be JSON stringified)
     */
    setItem: async (key: string, value: any): Promise<void> => {
        try {
            const jsonValue = JSON.stringify(value);
            await AsyncStorage.setItem(key, jsonValue);
        } catch (error) {
            console.error(`[Storage] Error setting item ${key}:`, error);
        }
    },

    /**
     * Get item from async storage (non-sensitive)
     * @param key Storage key
     * @returns Promise resolving to the parsed value or null
     */
    getItem: async (key: string): Promise<any | null> => {
        try {
            const jsonValue = await AsyncStorage.getItem(key);
            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (error) {
            console.error(`[Storage] Error getting item ${key}:`, error);
            return null;
        }
    },

    /**
     * Remove item from async storage
     * @param key Storage key
     */
    removeItem: async (key: string): Promise<void> => {
        try {
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error(`[Storage] Error removing item ${key}:`, error);
        }
    },

    /**
     * Clear all auth related data
     */
    clearAuth: async (): Promise<void> => {
        try {
            await storage.removeSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
            await storage.removeSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
            await storage.removeItem(STORAGE_KEYS.USER_DATA);
        } catch (error) {
            console.error('[Storage] Error clearing auth data:', error);
        }
    }
};
