// src/api/FlowApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { customFetchBaseQuery } from './rtkQueryInterceptor';

export const FlowApi = createApi({
    reducerPath: 'FlowApi',
    baseQuery: customFetchBaseQuery('https://flow-api.viasocket.com'),
    endpoints: (builder) => ({
        GetFlowsAndFolders: builder.query<{ flows: Array<{ id: string; identifier: string; project_id: string; status: number; title: string; updatedAt: string, description: string }>, projects: Array<{ id: string; title: string }> }, { orgId: string }>({
            query: ({ orgId }) => `/orgs/${orgId}/flows`,
            transformResponse: (response: any) => {
               
                
                // /flows endpoint only returns flows, not projects
                const projects: Array<{ id: string; title: string }> = []; // Empty projects array since this endpoint doesn't provide projects
                
                // Filter and transform flows
                const filteredFlows = response?.data?.flows
                    ?.filter((flow: any) => {
                        return flow !== null && flow?.status != 0
                    })
                    .map((flow: any) => ({
                        id: flow.id,
                        identifier: flow.identifier,
                        project_id: flow.project_id,
                        status: flow.status,
                        title: flow.title,
                        updatedAt: flow.updatedAt,
                        description: flow.metadata?.description,
                    })) || [];
                
                return {
                    flows: filteredFlows,
                    projects: projects
                };
            },
        }),
        GetProjects: builder.query<Array<{ id: string; title: string }>, string>({
            query: (orgId: string) => `/orgs/${orgId}/projects?type=flow`,
            transformResponse: (response: any) => {
              
                // Filter and transform projects/folders
                const projects = response?.data?.projects
                    ?.filter((project: any) => project !== null && project?.status != 0)
                    .map((project: any) => ({
                        id: project.id,
                        title: project.title,
                    })) || [];
                
                return projects;
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

export const { useGetFlowsAndFoldersQuery, useGetProjectsQuery, useGetAiFlowJsonQuery } = FlowApi;
