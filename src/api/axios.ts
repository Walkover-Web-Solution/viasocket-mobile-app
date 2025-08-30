import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserEmail, saveProxyAuthToken, getProxyAuthToken, saveUserEmail, getToken } from '../utils/auth';

// Function to get proxy auth token using JWT token from AsyncStorage
export const getAuthToken = async (): Promise<string | null> => {
  try {
    console.log('🔍 Starting getAuthToken function...');
    
    // Get JWT token from AsyncStorage using the correct function
    const jwtToken = await getToken();
    console.log('🔍 Retrieved JWT token from storage for proxy generation');
    console.log('🔑 JWT Token exists:', !!jwtToken);
    console.log('🔑 JWT Token length:', jwtToken ? jwtToken.length : 'null');
    console.log('🔑 JWT Token first 100 chars:', jwtToken ? jwtToken.substring(0, 100) + '...' : 'null');
    
    if (!jwtToken) {
      console.log('❌ No JWT token found in storage');
      return null;
    }

    const endpoint = `https://flow.sokt.io/func/scrifta5dq36?otpToken=${encodeURIComponent(jwtToken)}&service=viasocket`;
    
    console.log('🌐 Making proxy token request to:', endpoint);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);
    console.log('📡 Response status text:', response.statusText);

    // Always try to get response text first for debugging
    const responseText = await response.text();
    console.log('📡 Raw response text:', responseText);

    if (response.ok) {
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ Proxy token response data:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.log('❌ Failed to parse response as JSON:', parseError);
        console.log('📡 Response was:', responseText);
        return null;
      }
      
      // Extract proxy token from response - try multiple possible fields
      const token = data.proxy_auth_token || 
                   data.token || 
                   data.authToken ||
                   data.auth_token ||
                   data.data?.proxy_auth_token || 
                   data.data?.token ||
                   data.data?.authToken ||
                   data.data?.auth_token ||
                   data.result?.proxy_auth_token ||
                   data.result?.token;
      
      // Extract email from response
      const email = data.email || 
                   data.user_email ||
                   data.data?.email ||
                   data.data?.user_email ||
                   data.result?.email ||
                   data.user?.email;
      
      if (token) {
        // Save both proxy token and email from API response
        await saveProxyAuthToken(token);
        if (email) {
          await saveUserEmail(email);
          console.log('📧 Email from API response:', email);
        }
        
        console.log('✅ Proxy auth token generated and saved successfully');
        console.log('🔑 Generated proxy token length:', token.length);
        console.log('🔑 Generated proxy token first 50 chars:', token.substring(0, 50) + '...');
        return token;
      } else {
        console.log('❌ No proxy token found in response data');
        console.log('🔍 Available keys in response:', Object.keys(data));
        console.log('🔍 Response data structure:', JSON.stringify(data, null, 2));
        
        // Check if there's an error message in the response
        const errorMessage = data.error || 
                            data.message || 
                            data.data?.error || 
                            data.data?.message ||
                            'Unknown error';
        console.log('🔍 Error message from API:', errorMessage);
        return null;
      }
    } else {
      console.log('❌ Proxy token API Error Response:', responseText);
      console.log('❌ Response status:', response.status);
      console.log('❌ Response status text:', response.statusText);
      
      // Try to parse error response for more details
      try {
        const errorData = JSON.parse(responseText);
        console.log('❌ Parsed error data:', JSON.stringify(errorData, null, 2));
        
        const errorMessage = errorData.error || 
                            errorData.message || 
                            errorData.data?.error || 
                            errorData.data?.message ||
                            'Unknown API error';
        console.log('❌ API Error Message:', errorMessage);
      } catch (parseError) {
        console.log('❌ Could not parse error response as JSON');
      }
      
      // Check for specific error conditions
      if (response.status === 401 || response.status === 403) {
        console.log('❌ Authentication error - User may not be registered');
      } else if (response.status === 400) {
        console.log('❌ Bad request - Check JWT token validity');
      } else if (response.status === 404) {
        console.log('❌ Endpoint not found - Check API URL');
      } else if (response.status >= 500) {
        console.log('❌ Server error - API may be temporarily unavailable');
      }
      
      return null;
    }
  } catch (error: any) {
    console.log('💥 Error generating proxy auth token:', error);
    console.log('💥 Error message:', error?.message);
    console.log('💥 Error stack:', error?.stack);
    
    // Network-specific error handling
    if (error?.message?.includes('Network request failed')) {
      console.log('🌐 Network error - Check internet connection');
    } else if (error?.message?.includes('timeout')) {
      console.log('⏰ Request timeout - API may be slow');
    }
    
    return null;
  }
};

const api: AxiosInstance = axios.create({
  baseURL: 'https://routes.msg91.com/api',
  headers: {
    'Accept': '*/*',
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7',
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json',
    'Origin': 'https://chat.50agents.com',
    'Pragma': 'no-cache',
    'Priority': 'u=1, i',
    'Referer': 'https://chat.50agents.com/',
    'Sec-CH-UA': '"Chromium";v="118", "Google Chrome";v="118", "Not=A?Brand";v="99"',
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Get dynamic token from storage
    const token = await getProxyAuthToken();
    
    if (!token) {
      console.log('No proxy auth token found in storage');
    } else {
      console.log('Using dynamic token from storage');
      console.log('proxy_auth_token:', token);
    }
    
    if (config.headers) {
      config.headers['proxy_auth_token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Disabled session expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('401 Unauthorized - Token expired or invalid');
      
      // DISABLED: No longer clearing auth storage or auto-logout
      // This prevents session expiration logic
      console.log('Session expiration handling disabled');
      
      // Note: Individual screens can handle errors as needed
    }
    return Promise.reject(error);
  }
);

export default api;
