// src/api/interceptor.ts
import axios from 'axios';
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { $ReduxCoreType } from '../../../types/redux/reduxCore';
import { setUserInfo } from '../../features/userInfo/userInfoSlice';

export const customFetchBaseQuery = (
    baseUrl: string
): BaseQueryFn<any, unknown, unknown> => {
    const baseQuery = fetchBaseQuery({
        baseUrl,
        prepareHeaders: (headers, { getState }) => {
            const state = getState() as $ReduxCoreType;
            const token = state.userInfo.proxyAuthToken;
            
            // Only set header if token exists and is not empty
            if (token && token.trim() !== '') {
                headers.set('Proxy_auth_token', token);
            }
            
            return headers;
        },
    });

    return async (args, api, extraOptions) => {
        const result = await baseQuery(args, api, extraOptions);
        if (result.error) {
            console.log(result.error, "ERROR")
        }
        if (result.error && result.error.status === 401) {
            console.log('🔐 401 Unauthorized - Clearing user session');
            // Clear entire user session on 401
            api.dispatch(setUserInfo({
                proxyAuthToken: '',
                currentOrgId: '',
                currentOrgData: {},
                name: '',
                email: '',
                id: '',
                orgs: []
            }));
        }

        return result;
    };
};
