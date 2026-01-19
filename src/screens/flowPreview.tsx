import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect } from 'react';
import {
    DeviceEventEmitter,
    RefreshControl,
    ScrollView,
    Text,
    View,
    TouchableOpacity,
    Image,
    StyleSheet
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from '../hooks/hooks';
import { useGetAiFlowJsonQuery, useGetFlowsAndFoldersQuery } from '../redux/services/apis/flowApi';
import { RootStackParamList } from '../types/navigators/navigationTypes';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'FlowPreview'>;

function FlowPreview({ route, navigation }: Props) {
    const { flowId } = route.params;
    const { currentOrgId, proxy_auth_token } = useAppSelector((state) => ({
        currentOrgId: state.userInfo.currentOrgId,
        proxy_auth_token: state.userInfo.proxyAuthToken
    }));

    const { data: flowsAndFolders, refetch: refetchFlows } = useGetFlowsAndFoldersQuery(currentOrgId);
    const selectedFlow = flowsAndFolders?.flows?.find((flow) => flow.id === flowId) || {};
    const flowName = selectedFlow.title || 'Untitled Flow';
    const flowDescription = selectedFlow.description || '';
    const projectId = selectedFlow.project_id || '';
    
    const { data: aiFlowJson, error, isLoading, isFetching, refetch } = useGetAiFlowJsonQuery(
        { projectId, flowId },
        { skip: !projectId || !flowId, refetchOnMountOrArgChange: true }
    );

    // Refetch when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            refetchFlows();
            if (projectId && flowId) {
                refetch();
            }
        }, [projectId, flowId, refetch, refetchFlows])
    );
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

    const renderFlowCard = (item: any, index: number, label: string) => {
        const iconUrl = item?.iconUrl || item?.data?.iconUrl;
        const name = item?.slugName || item?.data?.slugName || item?.meta?.name || 'Untitled';
        const description = item?.statement || item?.data?.description || '';
        
        return (
            <View key={index} style={styles.flowCardWrapper}>
                <View style={styles.flowCard}>
                    <View style={styles.flowCardHeader}>
                        {iconUrl ? (
                            <Image source={{ uri: iconUrl }} style={styles.flowIcon} />
                        ) : (
                            <View style={[styles.flowIcon, { backgroundColor: '#e5e7eb' }]} />
                        )}
                        <View style={styles.flowCardContent}>
                            <Text style={styles.labelText}>{label}</Text>
                            <Text style={styles.flowCardTitle} numberOfLines={2}>
                                {name}
                            </Text>
                        </View>
                    </View>
                    {description ? (
                        <Text style={styles.flowCardDescription} numberOfLines={3}>
                            {description}
                        </Text>
                    ) : null}
                    {item?.data?.connection && (
                        <View style={styles.connectionContainer}>
                            <Text style={styles.connectionLabel}>Connection</Text>
                            <View style={styles.connectionBox}>
                                {item?.data?.connectionIconUrl && (
                                    <Image 
                                        source={{ uri: item.data.connectionIconUrl }}
                                        style={styles.connectionIcon}
                                    />
                                )}
                                <Text style={styles.connectionText}>
                                    {item?.data?.connectionName || item?.data?.connection}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
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
                    style={styles.container}
                    contentContainerStyle={styles.contentContainer}
                    refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                >
                    {flowDescription ? (
                        <Text style={styles.description}>{flowDescription}</Text>
                    ) : null}
                    
                    <Text style={styles.sectionTitle}>Flow Steps</Text>

                    {/* When Heading */}
                    {aiFlowJson?.trigger && <Text style={styles.actionHeading}>When</Text>}
                    
                    {/* Trigger Card */}
                    {aiFlowJson?.trigger && renderFlowCard(aiFlowJson.trigger, 0, '')}
                    
                    {/* Arrow */}
                    {aiFlowJson?.action && aiFlowJson.action.length > 0 && (
                        <>
                            <View style={styles.arrowContainerVertical}>
                                <MaterialIcons name="arrow-downward" size={24} color="#9ca3af" />
                            </View>
                            
                            {/* Do Heading */}
                            <Text style={styles.actionHeading}>Do</Text>
                        </>
                    )}
                    
                    {/* Action Cards */}
                    {aiFlowJson?.action?.map((action: any, index: number) => (
                        <React.Fragment key={index}>
                            {renderFlowCard(action, index, '')}
                            {index < aiFlowJson.action.length - 1 && (
                                <View style={styles.arrowContainerVertical}>
                                    <MaterialIcons name="arrow-downward" size={24} color="#9ca3af" />
                                </View>
                            )}
                        </React.Fragment>
                    ))}

                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 80,
    },
    description: {
        fontSize: 15,
        marginBottom: 24,
        color: '#4b5563',
        lineHeight: 22,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        color: '#1f2937',
    },
    actionHeading: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 4,
        color: '#8b5cf6',
    },
    flowCardWrapper: {
        marginBottom: 8,
    },
    flowCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    flowCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    flowIcon: {
        width: 48,
        height: 48,
        borderRadius: 8,
        marginRight: 12,
    },
    flowCardContent: {
        flex: 1,
    },
    labelText: {
        fontSize: 11,
        color: '#8b5cf6',
        fontWeight: '600',
        marginBottom: 4,
    },
    flowCardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
    },
    flowCardDescription: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 18,
        marginTop: 4,
    },
    arrowContainerVertical: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    connectionContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    connectionLabel: {
        fontSize: 11,
        color: '#6b7280',
        marginBottom: 6,
        fontWeight: '600',
    },
    connectionBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    connectionIcon: {
        width: 20,
        height: 20,
        borderRadius: 4,
        marginRight: 8,
    },
    connectionText: {
        fontSize: 13,
        color: '#1f2937',
        flex: 1,
    },
});

export default FlowPreview;