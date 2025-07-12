import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '__proxy_auth_token';

/**
 * Store authentication token securely
 * @param {string} token - The token to store
 */
export const storeToken = async (token: string) => {
    try {
        await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
        console.error('Error storing token:', error);
        throw error;
    }
};

/**
 * Retrieve the stored authentication token
 * @returns {Promise<string|null>} - The stored token or null if not found
 */
export const retrieveToken = async () => {
    try {
        return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
        console.error('Error retrieving token:', error);
        return null;
    }
};

/**
 * Remove the stored authentication token
 */
export const removeToken = async () => {
    try {
        await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
        console.error('Error removing token:', error);
        throw error;
    }
};
