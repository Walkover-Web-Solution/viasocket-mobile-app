// src/api/collectionsApi.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { customFetchBaseQuery } from './rtkQueryInterceptor';
import { User } from '../../../types/redux/userInfoReducerType';
import { setUserInfo } from '../../features/userInfo/userInfoSlice';

export const collectionsApi = createApi({
    reducerPath: 'collectionsApi',
    baseQuery: customFetchBaseQuery('https://proxy.viasocket.com/proxy/api/1258584/27fspgb25/orgs'),
    endpoints: (builder) => ({
        getAllCollections: builder.query<{ steps: { [key: string]: string[] }, collectionJson: { [collectionId: string]: { id: string, name: string, description: string, rootParentId: string } }, pagesJson: { [pageId: string]: { type: number, collectionId: string, id: string, child: string[], name: string, description: string, parentId: string } } }, string>({
            query: (orgId) => `/${orgId}/getSideBarData`,
            transformResponse: (response: { data: any }) => {
                function gg(data: { collections: Record<string, { id: string, name: string, description: string, rootParentId: string }>, pages: Record<string, { type: number, collectionId: string, id: string, child: string[], name: string, description: string }> }) {
                    let updatedData: Record<string, string[]> = {
                        root: []
                    }
                    let collections = data.collections
                    let pagesJson = data.pages
                    let pages = Object.values(pagesJson)
                    updatedData.root = Object.keys(collections)
                    updatedData.root.forEach((collectionId) => {
                        updatedData[collectionId] = pages.filter((item) => {
                            return item.collectionId === collectionId && item.type === 1
                        }).map((item) => item.id)
                        updatedData?.[collectionId]?.forEach((parentPageId) => {
                            let versionId = pagesJson[parentPageId].child[0]
                            updatedData[parentPageId] = pagesJson[versionId]?.child.filter((subPageId) => pagesJson[subPageId]?.type !== 4)
                            function updateSubPages(subPageId: string) {
                                updatedData[subPageId] = pagesJson[subPageId]?.child.filter((subPageId) => pagesJson[subPageId]?.type !== 4)
                                updatedData[subPageId]?.forEach((childId) => {
                                    updateSubPages(childId)
                                })
                            }

                            updatedData[parentPageId]?.forEach((subPageId) => {
                                updateSubPages(subPageId)
                            })
                        })

                    })

                    const filteredCollections = Object.keys(collections).reduce((acc, key) => {
                        const { id, name, description, rootParentId } = collections[key];
                        acc[key] = { id, name, description, rootParentId };
                        return acc;
                    }, {});

                    const filteredPages = Object.keys(pagesJson).reduce((acc, key) => {
                        const { id, name, description, parentId, collectionId } = pagesJson[key];
                        acc[key] = { id, name, description, parentId, collectionId };
                        return acc;
                    }, {});

                    return { steps: updatedData, collectionJson: filteredCollections, pagesJson: filteredPages }

                }
                return gg(response)
            }
        }),
    }),
});

export const { useGetAllCollectionsQuery, useLazyGetAllCollectionsQuery } = collectionsApi;
