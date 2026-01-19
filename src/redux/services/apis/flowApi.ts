// src/api/FlowApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { customFetchBaseQuery } from './rtkQueryInterceptor';

export const FlowApi = createApi({
    reducerPath: 'FlowApi',
    baseQuery: customFetchBaseQuery('https://flow-api.viasocket.com'),
    tagTypes: ['Flow', 'FlowDetail'],
    endpoints: (builder) => ({
        GetFlowsAndFolders: builder.query<{ flows: Array<{ id: string; identifier: string; project_id: string; status: number; title: string; updatedAt: string; description: string; created_by: string; updated_by: string; success_rate?: number; runs_count?: number }>, projects: Array<{ id: string; title: string }> }, string>({
            query: (orgId: string) => `/orgs/${orgId}/projects?type=flow&bringflows=true`,
            providesTags: ['Flow'],
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
                    .map((flow: any) => {
                        // Get actual values from API response
                        const successRate = flow.success_rate || flow.metadata?.success_rate || 0;
                        const runsCount = flow.runs_count || flow.metadata?.runs_count || flow.total_runs || 0;
                        
                        let status = flow.status;
                        if (status === -1 || Number(status) < 0) {
                            status = 0; // Convert to paused instead
                        }
                        
                        if (status === 3 || String(status) === '3') {
                            status = 3; // Ensure it's correctly typed
                        }

                        return {
                            id: flow.id,
                            identifier: flow.identifier,
                            project_id: flow.project_id,
                            status: status,
                            title: flow.title,
                            updatedAt: flow.updatedAt,
                            description: flow.metadata?.description,
                            org_id: flow.org_id,
                            created_by: flow.created_by || '',
                            updated_by: flow.updated_by || '',
                            success_rate: successRate,
                            runs_count: runsCount
                        };
                    });
                    
                response.data.flows = filteredFlows;
                return response.data;
            },
        }),
        GetAiFlowJson: builder.query<any, { projectId: string; flowId: string }>({
            query: ({ projectId, flowId }) => ({
                url: `/projects/${projectId}/scripts/${flowId}?type=flow`,
                method: 'GET',
            }),
            providesTags: (result, error, { flowId }) => [{ type: 'FlowDetail', id: flowId }],
            keepUnusedDataFor: 0,
            transformResponse: (response: any) => {
                const jsonScript = response?.data?.json_script;
                const blocks = jsonScript?.blocks || {};
                const order = jsonScript?.order?.root || [];
                
                // Recursively collect only plugin blocks (with icons) - skip all other types
                const collectActions = (blockIds: string[]): any[] => {
                    const result: any[] = [];
                    
                    for (const blockId of blockIds) {
                        const block = blocks[blockId];
                        if (!block) continue;
                        
                        // Only show plugin type blocks (these have icons and are actual actions)
                        if (block.type === 'plugin') {
                            result.push({
                                data: {
                                    type: block.type,
                                    status: block.status,
                                    slugName: blockId.replace(/_/g, ' '),
                                    description: block.statement || block.data || '',
                                    iconUrl: block.iconUrl,
                                    showConfigure: block.status === 'DRAFTED',
                                    connection: block.metaData?.connection,
                                    connectionIconUrl: block.metaData?.connectionIconUrl,
                                    connectionName: block.metaData?.connectionName
                                }
                            });
                        }
                        
                        // Recursively check children of all blocks
                        const children = jsonScript.order[blockId] || [];
                        if (children.length > 0) {
                            result.push(...collectActions(children));
                        }
                    }
                    
                    return result;
                };
                
                const actions = collectActions(order);
                
                return {
                    trigger: jsonScript?.trigger || { triggerType: 'webhook' },
                    action: actions,
                    version: response?.data?.version || '1.0'
                };
            },
            transformErrorResponse: (response: any) => response,
        }),

    }),
});

export const { useGetFlowsAndFoldersQuery, useGetAiFlowJsonQuery } = FlowApi;
