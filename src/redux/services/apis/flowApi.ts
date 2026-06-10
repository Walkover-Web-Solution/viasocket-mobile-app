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
                
                // Less restrictive filtering - only filter out null flows
                const filteredFlows = (response?.data?.flows || [])                    
                    .filter((flow: any) => {
                        return flow !== null;
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
                
                const collectActions = (blockIds: string[], depth: number = 0): any[] => {
                    const result: any[] = [];
                    
                    for (const blockId of blockIds) {
                        const block = blocks[blockId];
                        if (!block) continue;
                        
                        const children = jsonScript.order[blockId] || [];
                        
                        if (block.type === 'plugin') {
                            result.push({
                                blockId,
                                type: 'plugin',
                                depth,
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
                            
                            if (children.length > 0) {
                                result.push(...collectActions(children, depth));
                            }
                        } else if (block.type === 'ifGroup') {
                            if (children.length > 2) {
                                const switchData: any = {
                                    blockId,
                                    type: 'switch',
                                    depth,
                                    data: {
                                        description: 'Switch statement'
                                    },
                                    cases: [] as any[]
                                };
                                
                                for (const childBlockId of children) {
                                    const childBlock = blocks[childBlockId];
                                    if (!childBlock) continue;
                                    
                                    const childChildren = jsonScript.order[childBlockId] || [];
                                    const caseName = childBlock.statement || childBlockId.replace(/_/g, ' ');
                                    
                                    switchData.cases.push({
                                        value: caseName,
                                        blockId: childBlockId,
                                        blocks: collectActions(childChildren, depth + 1)
                                    });
                                }
                                
                                result.push(switchData);
                            } else {
                                const conditionData: any = {
                                    blockId,
                                    type: 'condition',
                                    depth,
                                    data: {
                                        condition: 'If condition',
                                        description: ''
                                    },
                                    branches: {
                                        true: [] as any[],
                                        false: [] as any[]
                                    }
                                };
                                
                                if (children.length > 0) {
                                    for (const childBlockId of children) {
                                        const childBlock = blocks[childBlockId];
                                        if (!childBlock) continue;
                                        
                                        if (childBlock.type === 'ifBlock') {
                                            const childChildren = jsonScript.order[childBlockId] || [];
                                            
                                            if (childBlock.isElseBlock) {
                                                conditionData.branches.false = collectActions(childChildren, depth + 1);
                                            } else {
                                                conditionData.data.condition = childBlock.statement || childBlock.condition || 'If condition';
                                                conditionData.data.description = childBlock.statement || '';
                                                conditionData.branches.true = collectActions(childChildren, depth + 1);
                                            }
                                        }
                                    }
                                }
                                
                                result.push(conditionData);
                            }
                        } else if (block.type === 'ifBlock') {
                            if (children.length > 0) {
                                result.push(...collectActions(children, depth));
                            }
                        } else if (block.type === 'loop' || block.type === 'forEach') {
                            const loopData: any = {
                                blockId,
                                type: block.type,
                                depth,
                                data: {
                                    loopType: block.type,
                                    description: block.statement || block.data?.description || `${block.type} loop`,
                                    iteratorVar: block.data?.iteratorVar || '',
                                    arrayPath: block.data?.arrayPath || ''
                                },
                                children: [] as any[]
                            };
                            
                            if (children.length > 0) {
                                loopData.children = collectActions(children, depth + 1);
                            }
                            
                            result.push(loopData);
                        } else if (block.type === 'switch') {
                            const switchData: any = {
                                blockId,
                                type: 'switch',
                                depth,
                                data: {
                                    switchVar: block.data?.variable || '',
                                    description: block.statement || 'Switch statement'
                                },
                                cases: [] as any[]
                            };
                            
                            const cases = block.data?.cases || [];
                            for (const caseItem of cases) {
                                const caseBlockId = caseItem.blockId;
                                if (caseBlockId && jsonScript.order[caseBlockId]) {
                                    switchData.cases.push({
                                        value: caseItem.value,
                                        blocks: collectActions(jsonScript.order[caseBlockId], depth + 1)
                                    });
                                }
                            }
                            
                            result.push(switchData);
                            
                            if (children.length > 0) {
                                result.push(...collectActions(children, depth));
                            }
                        } else {
                            if (children.length > 0) {
                                result.push(...collectActions(children, depth));
                            }
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
        UpdateFlowStatus: builder.mutation<any, { projectId: string; flowId: string; status: number }>({
            query: ({ projectId, flowId, status }) => {
                console.log('UpdateFlowStatus mutation called with:', { projectId, flowId, status });
                return {
                    url: `/projects/${projectId}/scripts/${flowId}/status?status=${status}`,
                    method: 'PUT',
                    body: {},
                };
            },
            invalidatesTags: ['Flow', 'FlowDetail'],
        }),
        PublishFlow: builder.mutation<any, { projectId: string; flowId: string }>({
            query: ({ projectId, flowId }) => {
                console.log('PublishFlow mutation called with:', { projectId, flowId });
                return {
                    url: `/projects/${projectId}/scripts/${flowId}/publish`,
                    method: 'PUT',
                    body: { flowResponse: { success: true } },
                };
            },
            invalidatesTags: ['Flow', 'FlowDetail'],
        }),
    }),
});

export const { useGetFlowsAndFoldersQuery, useGetAiFlowJsonQuery, useUpdateFlowStatusMutation, usePublishFlowMutation } = FlowApi;
