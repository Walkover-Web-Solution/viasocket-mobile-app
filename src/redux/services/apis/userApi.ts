// src/api/userApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { customFetchBaseQuery } from './rtkQueryInterceptor';
import { User } from '../../../types/redux/userInfoReducerType';
import { setUserInfo } from '../../features/userInfo/userInfoSlice';

export const userApi = createApi({
    reducerPath: 'userApi',
    baseQuery: customFetchBaseQuery('https://flow-api.viasocket.com'),
    endpoints: (builder) => ({
        getUser: builder.query<User, void>({
            query: () => '/orgs/user-org/details',
            transformResponse: (response: { data: any }) => {
                const data = response.data.data[0]
                return {
                    name: data.name,
                    id: data.id,
                    email: data.email,
                    orgs: data.c_companies?.map((item: any) => {
                        return {
                            id: item?.id,
                            companyId: item?.meta?.companyId || '',
                            name: item?.meta?.companyName || item.name || ''
                        }
                    }),
                    proxyAuthToken: 'ZVBqVDZOVmxaeFN0TG5jZkh0ZnIwNlpTWmVyNjRMNm54UlN3cmY4SXFyd1d6Y0dFaEswRXVEckR4Rm93NUNxMWtOZURXbFdGYmhDWnZnR3VZRW1SV1l4aWN3Yy9KVUdhUGNmUVlHR1AwVnNQbm1ONnAvQkRMbFI1MXc1ZHZzdUdMcjArczJQZGFFdVEyZUlxbmtLSEZEZFZlR3g5eExXWVpUWStPMkFOU2l3PQ=='
                }
            },

            // 👇 This is where we write to Redux after API success
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(setUserInfo(data));
                } catch (err) {
                    console.error('Failed to fetch user info:', err);
                }
            },
        }),
        switchOrg: builder.mutation<void, string>({
            query: (orgId) => ({
                url: `/orgs/switchOrg`,
                method: 'POST',
                body: {
                    id: orgId,
                    name: orgId
                }
            }),
        }),
    }),
});

export const { useGetUserQuery, useLazyGetUserQuery, useSwitchOrgMutation } = userApi;
