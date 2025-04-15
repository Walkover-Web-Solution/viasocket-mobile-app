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
                console.log('response', response);
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
                    proxyAuthToken: 'T1dXd05lQTk5RlBBbTlXOWZsYkN0TmtFajQzMzQzV0NGZ1hSeGVSZ1ZXSUtZd21GR3E5WUhiTmowZ1haaEJjTmsxR3JhdkE0ZnNFaWF6YzR3aXh4eVptYTRNaWp6dlVVODdmRmlGQkNSWmpwUHcrNmlHRUVQa2dJeStJRWZXZjRIMis5WG01bllGZUFTRzVCT3BsRE9lSmJ3cEgrTUZtV044OHNIMXZ4NjlZPQ=='
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
