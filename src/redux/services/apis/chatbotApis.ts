// src/api/userApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { customFetchBaseQuery } from './rtkQueryInterceptor';
import { User } from '../../../types/redux/userInfoReducerType';
import { setUserInfo } from '../../features/userInfo/userInfoSlice';

export const chatbotApi = createApi({
    reducerPath: 'chatbotApi',
    baseQuery: customFetchBaseQuery('https://flow-api.viasocket.com'),
    endpoints: (builder) => ({
        getChatbotToken: builder.mutation<User, void>({
            query: () => ({
                url: 'utility/get-token',
                method: 'POST',
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(setUserInfo({
                        chatbotToken: data?.data
                    }));
                } catch (err) {
                    console.error('Failed to fetch chatbot token:', err);
                }
            },
        }),
    }),
});

export const { useGetChatbotTokenMutation } = chatbotApi;
