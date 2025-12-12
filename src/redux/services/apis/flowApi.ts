// src/api/FlowApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { customFetchBaseQuery } from './rtkQueryInterceptor';

export const FlowApi = createApi({
    reducerPath: 'FlowApi',
    baseQuery: customFetchBaseQuery('https://flow-api.viasocket.com'),
    endpoints: (builder) => ({
        GetFlowsAndFolders: builder.query<{ flows: Array<{ id: string; identifier: string; project_id: string; status: number; title: string; updatedAt: string, description: string }>, projects: Array<{ id: string; title: string }> }, string>({
            query: (orgId: string) => `/orgs/${orgId}/projects?type=flow&bringflows=true`,
            transformResponse: (response: any, _meta, arg: string) => {
                // Use the arg parameter which contains the orgId passed to the query
                const orgId = arg;
                
                // Filter out null or inactive projects
                response.data.projects = response?.data?.projects?.filter((project: any) => {
                    return project !== null && project?.status != 0;
                });
                
                const validProjectIds = response?.data?.projects?.map((project: any) => project.id) || [];
                
                // Less restrictive filtering - only filter out null and inactive flows
                const filteredFlows = (response?.data?.flows || [])                    
                    .filter((flow: any) => {
                        return flow !== null && flow?.status != 0;
                    })
                    .map((flow: any) => ({
                        id: flow.id,
                        identifier: flow.identifier,
                        project_id: flow.project_id,
                        status: flow.status,
                        title: flow.title,
                        updatedAt: flow.updatedAt,
                        description: flow.metadata?.description,
                        org_id: flow.org_id
                    }));
                    
                console.log(`Flow API: Found ${filteredFlows.length} flows for org ${orgId}`);
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
