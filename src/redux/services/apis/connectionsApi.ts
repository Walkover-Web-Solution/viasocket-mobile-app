// src/redux/services/apis/connectionsApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { customFetchBaseQuery } from './rtkQueryInterceptor';

export interface Connection {
  auth_row_id: string;
  service_name: string;
  service_id: string;
  type: string;
  user_id: string;
  connection_label: string;
  updated_at: string;
  iconUrl: string;
  validActions: Array<{
    name: string;
    actionversionid: string;
    createdat: string;
    description: string;
    pluginname: string;
    authidlookup: string;
    pluginslugname: string;
    scopes: any;
  }>;
  isExpired: boolean;
  access_level_id: string;
  access_level_ids_list: string[];
  meta_data: {
    description: string;
  };
  id: string;
  slug_name?: string;
}

export interface AuthInfo {
  success: boolean;
  message: string;
  data: {
    auth_row_id: string;
    service_name: string;
    service_id: string;
    type: string;
    user_id: string;
    connection_label: string;
    updated_at: string;
    isExpired: boolean;
    access_level_ids_list: (string | null)[];
    meta_data: {
      _icon_url?: string;
      description?: string;
    };
    validActions: Array<{
      scopes: any;
      name: string;
      actionversionid: string;
      createdat: string;
      description: string;
      pluginname: string;
      rowid: string;
      authidlookup: string;
      pluginslugname: string;
    }>;
    iconUrl: string;
    slug_name: string;
    id: string;
  };
  isCached: boolean;
}

export interface ConnectionsResponse {
  success: boolean;
  message: string;
  data: Connection[];
  isCached: boolean;
}

export interface UsedInResponse {
  success: boolean;
  message: string;
  data: {
    [projectId: string]: {
      title: string;
      scripts: Array<{
        id: string;
        title: string | null;
      }>;
    };
  };
  isCached: boolean;
}

export const ConnectionsApi = createApi({
  reducerPath: 'ConnectionsApi',
  baseQuery: customFetchBaseQuery('https://flow-api.viasocket.com'),
  tagTypes: ['Connection'],
  endpoints: (builder) => ({
    getConnections: builder.query<Connection[], string>({
      query: (orgId: string) => ({
        url: `/authtoken/org/${orgId}/auth`,
        method: 'GET',
      }),
      transformResponse: (response: ConnectionsResponse) => {
        if (!response.success) {
          return [];
        }
        return response.data;
      },
    }),
    getAuthInfo: builder.query<AuthInfo['data'], string>({
      query: (authId: string) => ({
        url: `/authtoken/authInfo/${authId}?getValidAction=true`,
        method: 'GET',
      }),
      transformResponse: (response: AuthInfo) => {
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch auth info');
        }
        return response.data;
      },
    }),
    requestConnectionUpdate: builder.mutation<any, any>({
      query: (payload) => ({
        url: '/utility/script/run/UPDATE_OR_REQUEST_CONNECTION_UPDATE',
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response: any) => {
        console.log('🔄 Script Runner Response:', response);
        return response;
      },
      transformErrorResponse: (error: any) => {
        console.error('❌ Script Runner Error:', error);
        return error;
      },
    }),
    revokeConnection: builder.mutation<any, { orgId: string; authId: string }>({
      query: ({ orgId, authId }) => ({
        url: `/authtoken/org/${orgId}/auth/${authId}/revoke`,
        method: 'POST',
      }),
      transformResponse: (response: any) => {
        console.log('✅ Revoke Connection Response:', response);
        return response;
      },
      transformErrorResponse: (error: any) => {
        console.error('❌ Revoke Connection Error:', error);
        return error;
      },
      invalidatesTags: ['Connection'],
    }),
    getUsedIn: builder.query<UsedInResponse['data'], string>({
      query: (authId: string) => ({
        url: `/authtoken/usedin/${authId}`,
        method: 'GET',
      }),
      transformResponse: (response: UsedInResponse) => {
        if (!response.success) {
          return {};
        }
        return response.data;
      },
    }),
  }),
});

export const { useGetConnectionsQuery, useGetAuthInfoQuery, useRequestConnectionUpdateMutation, useRevokeConnectionMutation, useGetUsedInQuery } = ConnectionsApi;
