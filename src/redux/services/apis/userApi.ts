// src/api/userApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { customFetchBaseQuery } from './rtkQueryInterceptor';
import { User } from '../../../types/redux/userInfoReducerType';
import { setUserInfo } from '../../features/userInfo/userInfoSlice';

export const userApi = createApi({
    reducerPath: 'userApi',
    baseQuery: customFetchBaseQuery('https://routes.msg91.com/api/c'),
    endpoints: (builder) => ({
        getUser: builder.query<User, void>({
            query: () => '/getDetails',
            transformResponse: (response: { data: any }) => {
                const data = response.data[0]
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
                    proxyAuthToken: 'dEt0WnNYdVUzQmNsd1hJRUtmdzczNWdmMHB2NlhjU1AvdVBUN21peTFrWkxJd1FQUTZCNmZaTC91L2o0RFRJRXJEbjV6SmlWNnNPVTJQRTRiVGNWWER5VEFCMm54NkxGa0pMenRFVVd1N3hWdm5HaW51c1Vvc0tHVWpLMzU0QXYzVzNCYi9SeitYMEVES1R2N3h5UkhaMncvdHY0T3RORHZadlZOV0pEdnA4PQ=='
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
    }),
});

export const { useGetUserQuery, useLazyGetUserQuery } = userApi;
