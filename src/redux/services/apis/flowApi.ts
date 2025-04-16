// src/api/FlowApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { customFetchBaseQuery } from './rtkQueryInterceptor';
import { User } from '../../../types/redux/userInfoReducerType';
import { setUserInfo } from '../../features/userInfo/userInfoSlice';

export const FlowApi = createApi({
    reducerPath: 'FlowApi',
    baseQuery: customFetchBaseQuery('https://flow-api.viasocket.com'),
    endpoints: (builder) => ({
        GetFlowsAndFolders: builder.query<{ flows: Array<{ id: string; identifier: string; project_id: string; status: number; title: string; updatedAt: string, description: string }>, projects: Array<{ id: string; title: string }> }, string>({
            query: (orgId: string) => `/orgs/${orgId}/projects?type=flow`,
            transformResponse: (response: any) => {
                const filteredFlows = response.data.flows.map((flow: any) => {
                    return {
                        id: flow?.id,
                        identifier: flow?.identifier,
                        project_id: flow?.project_id,
                        status: flow?.status,
                        title: flow?.title,
                        updatedAt: flow?.updatedAt,
                        description: flow?.metadata?.description,
                    };
                }).filter((flow: any) => flow !== null && flow.status != 0);
                response.data.projects = response.data.projects.filter((project: any) => project !== null && project.status != 0);
                response.data.flows = filteredFlows;
                return response.data;
            },
        }),
        GetAiFlowJson: builder.query<{
            action: Array<{
                data: {
                    type: string;
                    status: string;
                    slugName: string;
                    description: string;
                };
            }>;
            trigger: {
                eventId: string;
                triggerType: string;
                sampleResponse: any;
                meta: {
                    name: string;
                    pluginname: string;
                }
            };
            version: string;
        }, string>({
            query: (flowId: string) => ({
                url: `/openai/flow-by-ai-v1/${flowId}/sync-ai-json-script?addDescription=true`,
                method: 'POST',
            }),
            transformResponse: (response: any) => response.data,
            transformErrorResponse: (response: any) => {
                return response;
            },
        }),

    }),
});

export const { useGetFlowsAndFoldersQuery, useGetAiFlowJsonQuery } = FlowApi;
