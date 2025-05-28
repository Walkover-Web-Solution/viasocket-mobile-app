// src/api/interceptor.ts
import axios from 'axios';
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { $ReduxCoreType } from '../../../types/redux/reduxCore';
import { store } from '../../store';
import { setUserInfo } from '../../features/userInfo/userInfoSlice';

export const customFetchBaseQuery = (
    baseUrl: string
): BaseQueryFn<any, unknown, unknown> => {
    const baseQuery = fetchBaseQuery({
        baseUrl,
        prepareHeaders: (headers, { getState }) => {
            const state = getState() as $ReduxCoreType;
            const token = state.userInfo.proxyAuthToken
            headers.set('Proxy_auth_token', token);
            return headers;
        },
    });

    return async (args, api, extraOptions) => {
        const result = await baseQuery(args, api, extraOptions);
        if (result.error) {
            console.log(result.error, "ERROR")
        }
        if (result.error && result.error.status === 401) {
            store.dispatch(setUserInfo({ proxyAuthToken: null, currentOrgId: null }));
        }

        return result;
    };
};
