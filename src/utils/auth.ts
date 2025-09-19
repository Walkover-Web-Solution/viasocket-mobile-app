// src/utils/auth.ts
import { storage } from './storage/mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Storage keys
const TOKEN_KEY = 'auth_token';
const PROXY_AUTH_TOKEN_KEY = 'proxy_auth_token';
const USER_EMAIL_KEY = 'user_email';

/**
 * Save JWT token to storage
 */
export const saveToken = async (token: string): Promise<void> => {
  try {
    // Save to both MMKV and AsyncStorage for compatibility
    storage.set(TOKEN_KEY, token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    console.log('Token saved successfully');
  } catch (error) {
    console.error('Error saving token:', error);
    throw error;
  }
};

/**
 * Save proxy authentication token to storage
 */
export const saveProxyAuthToken = async (token: string): Promise<void> => {
  try {
    // Save to both MMKV and AsyncStorage for compatibility
    storage.set(PROXY_AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(PROXY_AUTH_TOKEN_KEY, token);
    console.log('Proxy auth token saved successfully');
  } catch (error) {
    console.error('Error saving proxy auth token:', error);
    throw error;
  }
};

/**
 * Save user email to storage
 */
export const saveUserEmail = async (email: string): Promise<void> => {
  try {
    // Save to both MMKV and AsyncStorage for compatibility
    storage.set(USER_EMAIL_KEY, email);
    await AsyncStorage.setItem(USER_EMAIL_KEY, email);
    console.log('User email saved successfully');
  } catch (error) {
    console.error('Error saving user email:', error);
    throw error;
  }
};

/**
 * Get JWT token from storage
 */
export const getToken = async (): Promise<string | null> => {
  try {
    // Try MMKV first, then AsyncStorage
    let token = storage.getString(TOKEN_KEY);
    if (!token) {
      token = (await AsyncStorage.getItem(TOKEN_KEY)) || undefined;
    }
    return token || null;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

/**
 * Get proxy auth token from storage
 */
export const getProxyAuthToken = async (): Promise<string | null> => {
  try {
    // Try MMKV first, then AsyncStorage
    let token = storage.getString(PROXY_AUTH_TOKEN_KEY);
    if (!token) {
      token = (await AsyncStorage.getItem(PROXY_AUTH_TOKEN_KEY)) || undefined;
    }
    return token || null;
  } catch (error) {
    console.error('Error getting proxy auth token:', error);
    return null;
  }
};

/**
 * Get user email from storage
 */
export const getUserEmail = async (): Promise<string | null> => {
  try {
    // Try MMKV first, then AsyncStorage
    let email = storage.getString(USER_EMAIL_KEY);
    if (!email) {
      email = (await AsyncStorage.getItem(USER_EMAIL_KEY)) || undefined;
    }
    return email || null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};

/**
 * Remove all authentication data from storage
 */
export const clearAuthData = async (): Promise<void> => {
  try {
    // Clear from both MMKV and AsyncStorage
    storage.delete(TOKEN_KEY);
    storage.delete(PROXY_AUTH_TOKEN_KEY);
    storage.delete(USER_EMAIL_KEY);
    
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(PROXY_AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_EMAIL_KEY);
    
    console.log('Auth data cleared successfully');
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
};

/**
 * Exchange OTP JWT token for proxy auth token from MSG91 API
 */
export const getProxyAuthTokenFromAPI = async (otpToken: string, email: string): Promise<string | null> => {
  try {
    const response = await axios.get('https://routes.msg91.com/api/c/getAuthToken', {
      headers: {
        'user_id': email,
        'Authorization': `Bearer ${otpToken}`
      }
    });
    
    console.log('Proxy auth token API response:', response.data);
    
    // Check if user is registered (based on response structure)
    if (response.data?.status === 'success' && response.data?.data?.proxy_auth_token) {
      const proxyToken = response.data.data.proxy_auth_token;
      
      // Save proxy auth token and email
      await Promise.all([
        saveProxyAuthToken(proxyToken),
        saveUserEmail(email)
      ]);
      
      return proxyToken;
    } else {
      // User is not registered
      console.log('User not registered on web');
      return null;
    }
  } catch (error) {
    console.error('Error getting proxy auth token from API:', error);
    return null;
  }
};
