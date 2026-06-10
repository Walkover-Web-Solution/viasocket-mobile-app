// src/api/userApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { customFetchBaseQuery } from './rtkQueryInterceptor';
import { User } from '../../../types/redux/userInfoReducerType';
import { setUserInfo } from '../../features/userInfo/userInfoSlice';

interface ChatbotTokenResponse {
    data?: string;
    token?: string;
    [key: string]: any;
}

export const chatbotApi = createApi({
    reducerPath: 'chatbotApi',
    baseQuery: customFetchBaseQuery('https://flow-api.viasocket.com'),
    endpoints: (builder) => ({
        getChatbotToken: builder.mutation<ChatbotTokenResponse, void>({
            query: () => ({
                url: 'utility/get-token',
                method: 'POST',
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    console.log('🔍 Chatbot API Full Response:', JSON.stringify(data, null, 2));
                    console.log('🔍 Response keys:', Object.keys(data || {}));
                    console.log('🔍 data.data:', data?.data);
                    console.log('🔍 data.token:', data?.token);
                    
                    // Try multiple possible token locations
                    let token: any = data?.data || data?.token;
                    
                    // If token is still an object, try to extract string value
                    if (typeof token === 'object' && token !== null) {
                        console.log('🔍 Token is object, keys:', Object.keys(token));
                        token = token.token || token.data || JSON.stringify(token);
                    }
                    
                    // Last resort: if data itself is a string
                    if (!token && typeof data === 'string') {
                        token = data;
                    }
                    
                    console.log('🎯 Extracted Token:', token);
                    console.log('🎯 Token Type:', typeof token);
                    console.log('🎯 Token Length:', token?.length);
                    
                    if (token && typeof token === 'string' && token.length > 0) {
                        dispatch(setUserInfo({
                            chatbotToken: token
                        }));
                        console.log('✅ Chatbot token saved to Redux:', token.substring(0, 30) + '...');
                    } else {
                        console.error('❌ Invalid token format:', token);
                        console.error('❌ Full response for debugging:', data);
                    }
                } catch (err: any) {
                    console.error('❌ Failed to fetch chatbot token:', err);
                    console.error('❌ Error details:', err?.message || err);
                    console.error('❌ Error response:', err?.response?.data);
                }
            },
        }),
    }),
});

export const { useGetChatbotTokenMutation } = chatbotApi;
