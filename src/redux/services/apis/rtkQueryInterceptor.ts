// src/api/interceptor.ts
import axios from 'axios';
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { $ReduxCoreType } from '../../../types/redux/reduxCore';

export const customFetchBaseQuery = (
    baseUrl: string
): BaseQueryFn<any, unknown, unknown> => {
    const baseQuery = fetchBaseQuery({
        baseUrl,
        prepareHeaders: (headers, { getState }) => {
            const state = getState() as $ReduxCoreType;
            const token = state.userInfo.proxyAuthToken

            // if (token) {
            headers.set('Proxy_auth_token', 'S1craVkrQkxYOWVseXFTTWF6R1VVejJuS2o4V3BaSGxuaVIveFo1bWF1ZlQ2eUhLa1JWKzE1VWcvY1V3UERsODgwcklSaDNJUHlYZFhyTW53b2Fka3lkN3VSelZOYVltZVBKZHZ2TkN0NXRzMXZ1UURocHBQZXA2N3k2QXZraFp4MjNTcldpTXJXTmhROGh2c0tmL29WS0FGTEpzQXp2Q2ZDYU9BeElvcmhZPQ==');
            // headers.set('techdoc_auth', 'S1craVkrQkxYOWVseXFTTWF6R1VVejJuS2o4V3BaSGxuaVIveFo1bWF1ZlQ2eUhLa1JWKzE1VWcvY1V3UERsODgwcklSaDNJUHlYZFhyTW53b2Fka3lkN3VSelZOYVltZVBKZHZ2TkN0NXRzMXZ1UURocHBQZXA2N3k2QXZraFp4MjNTcldpTXJXTmhROGh2c0tmL29WS0FGTEpzQXp2Q2ZDYU9BeElvcmhZPQ==');
            // }

            return headers;
        },
    });

    return async (args, api, extraOptions) => {
        return baseQuery(args, api, extraOptions);
    };
};
