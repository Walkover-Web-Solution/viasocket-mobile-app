// src/api/userApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { customFetchBaseQuery } from './rtkQueryInterceptor';
import { User } from '../../../types/redux/userInfoReducerType';
import { setUserInfo } from '../../features/userInfo/userInfoSlice';

export const userApi = createApi({
    reducerPath: 'userApi',
    baseQuery: customFetchBaseQuery('https://flow-api.viasocket.com'),
    tagTypes: ['UserProfile'], // Add cache tags
    endpoints: (builder) => ({
        getUser: builder.query<User, void>({
            query: () => '/orgs/user-org/details',
            transformResponse: (response: { data: any }) => {
                // Handle the nested data structure: response.data.data[0]
                const data = response.data?.data?.[0] || response.data?.[0] || response.data;

                return {
                    name: data?.name || '',
                    id: data?.id || '',
                    email: data?.email || '',
                    orgs: data?.c_companies?.map((item: any) => {
                        return {
                            id: item?.id,
                            companyId: item?.meta?.companyId || '',
                            name: item?.meta?.companyName || item.name || ''
                        }
                    }) || []
                };
            },

            // 👇 This is where we write to Redux after API success
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(setUserInfo(data));
                } catch (err: any) {
                    console.error('❌ Failed to fetch user info:', {
                        error: err,
                        status: err?.status,
                        data: err?.data,
                        message: err?.message,
                        isUnhandledError: err?.isUnhandledError,
                        meta: err?.meta
                    });
                }
            }
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
        // Logout API with proper error handling
        logout: builder.mutation<any, void>({
            query: () => ({
                url: 'https://routes.msg91.com/api/c/logout',
                method: 'DELETE',
                prepareHeaders: (headers: any, { getState }: any) => {
                    const state = getState();
                    const token = state.userInfo.proxyAuthToken;
                    if (token) {
                        headers.set('Proxy_auth_token', token);
                    }
                    headers.set('Content-Type', 'application/json');
                    return headers;
                },
            }),
            transformResponse: (response: any) => {
                return response;
            },
            transformErrorResponse: (error: any) => {
                return error;
            },
        }),
        
        getUserProfile: builder.query<{ name: string; email: string; id: string; mobile?: string }, void>({
            query: () => '/users/me',
            providesTags: ['UserProfile'], // Provide cache tag
            transformResponse: (response: { data: any }) => {
                // Handle the response structure: { data: [{ name, email, id, ... }] }
                const data = response.data?.[0] || response.data;
                const result = {
                    name: data?.name || '',
                    email: data?.email || '',
                    id: data?.id?.toString() || '',
                    mobile: data?.mobile || ''
                };
                return result;
            },
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    // Update only the profile data in Redux (partial update)
                    dispatch(setUserInfo({ 
                        name: data.name, 
                        email: data.email, 
                        id: data.id,
                        orgs: [] // Add required field
                    }));
                } catch (err) {
                    console.error('Failed to fetch user profile:', err);
                }
            },
        }),

        getUserById: builder.query<{ name: string; email: string; id: string }, string>({
            query: (userId) => `/orgs/user/${userId}`,
            transformResponse: (response: { data: any }, meta, arg) => {
                const data = response.data?.[0] || response.data;
                return {
                    name: data?.name || '',
                    email: data?.email || '',
                    id: data?.id?.toString() || arg,
                };
            },
        }),

        // Get complete user details with c_companies (for connection update payload)
        getCompleteUserDetails: builder.query<any, void>({
            query: () => '/orgs/user-org/details',
            transformResponse: (response: { data: any }) => {
                const data = response.data?.data?.[0] || response.data?.[0] || response.data;
                return data; // Return complete user object
            },
        }),
        
        // Get complete user profile from MSG91 API (includes mobile)
        getMSG91UserProfile: builder.query<{ name: string; email: string; id: string; mobile?: string }, void>({
            query: () => ({
                url: 'https://routes.msg91.com/api/c/user',
                method: 'GET',
                prepareHeaders: (headers: any, { getState }: any) => {
                    const state = getState();
                    const token = state.userInfo.proxyAuthToken;
                    if (token) {
                        headers.set('Proxy_auth_token', token);
                    }
                    headers.set('Content-Type', 'application/json');
                    return headers;
                },
            }),
            providesTags: ['UserProfile'],
            transformResponse: (response: any) => {
                console.log('MSG91 User Profile API Response:', response);
                const result = {
                    name: response?.name || '',
                    email: response?.email || '',
                    id: response?.id?.toString() || '',
                    mobile: response?.mobile || ''
                };
                console.log('MSG91 Profile result:', result);
                return result;
            },
        }),
        
        // Get Auth Token for Organization
        getOrgAuthToken: builder.query<any, string>({
            query: (orgId) => ({
                url: `/authtoken/org/${orgId}/auth`,
                method: 'GET',
            }),
            transformResponse: (response: any) => {
                console.log('🔐 ORG AUTH TOKEN API RESPONSE:', JSON.stringify(response, null, 2));
                console.log('📊 Auth Token:', response?.auth_token ? response.auth_token.substring(0, 30) + '...' : 'N/A');
                console.log('📊 Token Type:', response?.token_type || 'N/A');
                console.log('📊 Expires At:', response?.expire_at || 'N/A');
                console.log('📊 User Ref ID:', response?.user_ref_id || 'N/A');
                console.log('📊 Company Ref ID:', response?.company_ref_id || 'N/A');
                console.log('📊 Org ID:', response?.org_id || 'N/A');
                return response;
            },
            transformErrorResponse: (error: any) => {
                console.error('❌ ORG AUTH TOKEN API ERROR:', JSON.stringify(error, null, 2));
                return error;
            },
        }),
        
        // Update User Profile API
        updateUser: builder.mutation<any, { name: string; email: string; mobile?: string }>({
            query: (userData) => {
                // MSG91 API expects nested structure with 'user' object
                const requestBody = {
                    user: {
                        name: userData.name,
                        email: userData.email,
                        ...(userData.mobile && { mobile: userData.mobile })
                    }
                };
                
                return {
                    url: 'https://routes.msg91.com/api/c/updateUser',
                    method: 'PUT',
                    body: requestBody,
                    // Override base URL for this specific endpoint
                    prepareHeaders: (headers: any, { getState }: any) => {
                        const state = getState();
                        const token = state.userInfo.proxyAuthToken;
                        if (token) {
                            headers.set('Proxy_auth_token', token);
                        }
                        headers.set('Content-Type', 'application/json');
                        return headers;
                    },
                };
            },
            transformResponse: (response: any) => {
                return response;
            },
            transformErrorResponse: (error: any) => {
                return error;
            },
            invalidatesTags: ['UserProfile'], // Invalidate cache after update
            // Update Redux state after successful API call
            async onQueryStarted(userData, { dispatch, queryFulfilled, getState }) {
                // Optimistic update - update Redux immediately
                const currentState = getState() as any;
                const currentUserInfo = currentState.userInfo;
                
                dispatch(setUserInfo({ 
                    ...currentUserInfo,
                    name: userData.name, 
                    email: userData.email
                }));
                
                try {
                    const { data } = await queryFulfilled;
                    
                    // Confirm with server response data
                    dispatch(setUserInfo({ 
                        ...currentUserInfo,
                        name: data.name || userData.name, 
                        email: data.email || userData.email,
                        id: data.id?.toString() || currentUserInfo.id
                    }));
                } catch (err: any) {
                    // Keep the optimistic update even if API fails
                    // This ensures user sees their changes immediately
                    
                    // Re-throw error so UI can show error message
                    throw err;
                }
            }
        }),
    }),
});

export const { 
    useGetUserQuery, 
    useLazyGetUserQuery, 
    useSwitchOrgMutation, 
    useLogoutMutation, 
    useGetUserProfileQuery,
    useGetUserByIdQuery,
    useLazyGetUserByIdQuery,
    useGetCompleteUserDetailsQuery,
    useLazyGetCompleteUserDetailsQuery,
    useGetMSG91UserProfileQuery,
    useGetOrgAuthTokenQuery,
    useLazyGetOrgAuthTokenQuery,
    useUpdateUserMutation
} = userApi;
