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

export interface ConnectionsResponse {
  success: boolean;
  message: string;
  data: Connection[];
  isCached: boolean;
}

export const ConnectionsApi = createApi({
  reducerPath: 'ConnectionsApi',
  baseQuery: customFetchBaseQuery('https://flow-api.viasocket.com'),
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
  }),
});

export const { useGetConnectionsQuery } = ConnectionsApi;
