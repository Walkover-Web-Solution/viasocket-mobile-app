import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    View,
    ScrollView,
    Text,
    useWindowDimensions,
    TouchableOpacity,
    RefreshControl,
    DeviceEventEmitter
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import RenderHTML from 'react-native-render-html';
import { useAppSelector } from '../hooks/hooks';
import { useGetPageHtmlQuery } from '../redux/services/apis/pagesApi';
import { RootStackParamList } from '../types/navigators/navigationTypes';
import { Menu, IconButton } from 'react-native-paper';
import { useGetAiFlowJsonQuery, useGetFlowsAndFoldersQuery } from '../redux/services/apis/flowApi';

type Props = NativeStackScreenProps<RootStackParamList, 'FlowPreview'>;

function FlowPreview({ route, navigation }: Props) {
    const { flowId } = route.params;
    const { currentOrgId, proxy_auth_token } = useAppSelector((state) => ({
        currentOrgId: state.userInfo.currentOrgId,
        proxy_auth_token: state.userInfo.proxyAuthToken
    }));

    const { data: flowsAndFolders } = useGetFlowsAndFoldersQuery(currentOrgId);
    const { data: aiFlowJson, error, isLoading, isFetching, refetch } = useGetAiFlowJsonQuery(flowId);
    const selectedFlow = flowsAndFolders?.flows?.find((flow) => flow.id === flowId) || {};
    const flowName = selectedFlow.title || 'No page selected';
    const flowDescription = selectedFlow.description || '';
    const projectId = selectedFlow.project_id || '';

    useEffect(() => {
        DeviceEventEmitter.emit('SendDataToChatbot', {
            type: 'SendDataToChatbot',
            data: {
                variables: {
                    orgId: currentOrgId,
                    scriptId: flowId,
                    "variables": {
                        "env": "prod",
                        "proxy_auth_token": proxy_auth_token,
                        "orgId": currentOrgId,
                        "projectId": projectId || `proj${currentOrgId}`,
                        "scriptId": flowId
                    },
                    "context": {
                        "req": {
                            "body": {}
                        },
                        "res": {},
                        "vals": {}
                    }
                },
                threadId: projectId,
                subThreadId: flowId
            }
        });

        return () => {
            DeviceEventEmitter.emit('SendDataToChatbot', {
                type: 'SendDataToChatbot',
                data: {
                    variables: {
                        orgId: currentOrgId,
                        scriptId: null,
                        "variables": {
                            "env": "prod",
                            "proxy_auth_token": proxy_auth_token,
                            "orgId": currentOrgId,
                            "projectId": null,
                            "scriptId": null
                        },
                    },
                    threadId: currentOrgId,
                }
            });
        };
    }, [currentOrgId]);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: flowName
        });
    }, [navigation]);

    const getBackgroundColor = (level: number) => {
        return level % 2 === 0 ? '#f5f5f5' : '#e0e0e0'; // subtle grayscale
    };

    const renderAction = (action, index, parentIndex = '', parentType = '') => {
        const level = parentIndex.split('.').length;
        const type = action?.data?.type;
        const isIfBlock = type === 'ifBlock';
        const isPath = type === 'path';
        const isChildOfPath = parentType === 'path';

        let titleLabel = `${parentIndex}${index + 1}. `;

        if (isChildOfPath && isIfBlock) {
            titleLabel += `Path ${index + 1}`;
        } else if (isPath) {
            titleLabel += 'Multi Path';
        } else if (isIfBlock) {
            titleLabel += 'If Block';
        } else {
            titleLabel += action?.data?.slugName;
        }

        return (
            <View
                key={parentIndex + index}
                style={{
                    backgroundColor: getBackgroundColor(level),
                    padding: 12,
                    marginBottom: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#dcdcdc',
                }}
            >
                <Text style={{ fontSize: 15, fontWeight: '500', marginBottom: 4, color: '#333' }}>
                    {titleLabel}
                </Text>
                {!isPath && (
                    <Text style={{ fontSize: 13, color: '#666' }}>
                        {action?.data?.description || 'No description'}
                    </Text>
                )}


                {action?.child && (
                    <View style={{ marginTop: 10 }}>
                        {action.child.map((child, childIndex) =>
                            renderAction(child, childIndex, `${parentIndex}${index + 1}.`, type)
                        )}
                    </View>
                )}
            </View>
        );
    };


    return (
        <View style={{ flex: 1 }}>
            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, color: '#4682b4' }}>Loading...</Text>
                </View>
            ) : error ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Text style={{ fontSize: 18, color: '#ff0000' }}>
                        We encountered an issue. Please restart the app and try again.
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1, padding: 16 }}
                    contentContainerStyle={{ paddingBottom: 80 }} // 👈 Adds bottom spacing
                    refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                >
                    <Text style={{ fontSize: 16, marginBottom: 10, color: '#222' }}>{flowDescription}</Text>
                    <Text style={{ fontSize: 20, fontWeight: '500', marginBottom: 10, color: '#222' }}>When:</Text>
                    <View
                        style={{
                            backgroundColor: '#f9f9f9',
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#e2e2e2',
                            padding: 12,
                            marginBottom: 20,
                        }}
                    >
                        <Text style={{ fontSize: 15, fontWeight: '500', color: '#333' }}>
                            {aiFlowJson?.trigger?.triggerType === 'service'
                                ? `${aiFlowJson?.trigger?.meta?.name} in ${aiFlowJson?.trigger?.meta?.pluginname}`
                                : aiFlowJson?.trigger?.triggerType === 'cron'
                                    ? `Cron: ${aiFlowJson?.trigger?.statement}`
                                    : aiFlowJson?.trigger?.triggerType || 'No Trigger Added'}
                        </Text>
                    </View>


                    <Text style={{ fontSize: 20, fontWeight: '500', marginBottom: 10, color: '#222' }}>Do:</Text>

                    {aiFlowJson?.action?.map((action, index) => renderAction(action, index))}

                </ScrollView>
            )}
        </View>
    );
}

export default FlowPreview;
