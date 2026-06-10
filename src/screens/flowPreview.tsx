import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
    DeviceEventEmitter,
    RefreshControl,
    ScrollView,
    Text,
    View,
    TouchableOpacity,
    Image,
    StyleSheet,
    ActivityIndicator,
    Alert
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SvgUri } from 'react-native-svg';
import { useAppSelector } from '../hooks/hooks';
import { useGetAiFlowJsonQuery, useGetFlowsAndFoldersQuery, useUpdateFlowStatusMutation, usePublishFlowMutation } from '../redux/services/apis/flowApi';
import { RootStackParamList } from '../types/navigators/navigationTypes';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'FlowPreview'>;

function FlowPreview({ route, navigation }: Props) {
    const { flowId } = route.params;
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const { currentOrgId, proxy_auth_token } = useAppSelector((state) => ({
        currentOrgId: state.userInfo.currentOrgId,
        proxy_auth_token: state.userInfo.proxyAuthToken
    }));

    const { data: flowsAndFolders, refetch: refetchFlows } = useGetFlowsAndFoldersQuery(currentOrgId);
    const selectedFlow = flowsAndFolders?.flows?.find((flow) => flow.id === flowId) || {} as any;
    const flowName = selectedFlow?.title || 'Untitled Flow';
    const flowDescription = selectedFlow?.description || '';
    const projectId = selectedFlow?.project_id || '';
    const flowStatus = Number(selectedFlow?.status) || 0;

    const [updateFlowStatus] = useUpdateFlowStatusMutation();
    const [publishFlow] = usePublishFlowMutation();
    
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
    }, [currentOrgId, flowId, projectId, proxy_auth_token]);

    // Get status label and next status
    // Status codes: 1=Active, 2=Paused, 3=Draft, 0=Trashed
    const getStatusInfo = (status: number) => {
        console.log('getStatusInfo called with status:', status, 'type:', typeof status);
        switch (status) {
            case 1:
                // Active -> Pause (change to 2)
                return { label: 'Active', nextStatus: 2, nextLabel: 'Pause' };
            case 2:
                // Paused -> Resume (change to 1)
                return { label: 'Paused', nextStatus: 1, nextLabel: 'Resume' };
            case 3:
                // Draft -> Start (publish to active)
                return { label: 'Draft', nextStatus: 1, nextLabel: 'Start', usePublish: true };
            case 0:
                // Trashed -> Restore (change to 3/Draft first)
                return { label: 'Trashed', nextStatus: 3, nextLabel: 'Restore' };
            default:
                console.warn('Unknown status:', status);
                return { label: 'Unknown', nextStatus: 1, nextLabel: 'Start' };
        }
    };

    const statusInfo = getStatusInfo(flowStatus);

    const handleStatusUpdate = async () => {
        if (!projectId || !flowId) {
            Alert.alert('Error', 'Project or Flow ID is missing');
            return;
        }

        setIsUpdatingStatus(true);
        try {
            console.log('Updating flow status:', { projectId, flowId, currentStatus: flowStatus, nextStatus: statusInfo.nextStatus });
            
            let result;
            
            // For draft flows (3), use publish endpoint
            if (statusInfo.usePublish) {
                console.log('Publishing draft flow...');
                result = await publishFlow({
                    projectId,
                    flowId
                }).unwrap();
            } else {
                // For all other flows (active, paused, trashed), use status endpoint
                result = await updateFlowStatus({
                    projectId,
                    flowId,
                    status: statusInfo.nextStatus
                }).unwrap();
            }

            console.log('Status update response:', result);
            
            if (result?.success || result?.message) {
                Alert.alert('Success', `Flow ${statusInfo.nextLabel.toLowerCase()}d successfully`);
                // Wait a moment then refetch to ensure backend has updated
                setTimeout(() => {
                    refetchFlows();
                }, 500);
            }
        } catch (error: any) {
            console.error('Error updating flow status:', error);
            const errorMessage = error?.data?.message || error?.message || 'Failed to update flow status';
            console.error('Full error details:', JSON.stringify(error, null, 2));
            Alert.alert('Error', errorMessage);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            title: flowName,
            headerRight: () => (
                <TouchableOpacity
                    onPress={handleStatusUpdate}
                    disabled={isUpdatingStatus}
                    style={styles.headerButton}
                >
                    {isUpdatingStatus ? (
                        <ActivityIndicator size="small" color="#6366f1" />
                    ) : (
                        <>
                            <MaterialIcons
                                name={statusInfo.nextStatus === 1 ? 'play-arrow' : 'pause'}
                                size={20}
                                color="#6366f1"
                            />
                            <Text style={styles.headerButtonText}>{statusInfo.nextLabel}</Text>
                        </>
                    )}
                </TouchableOpacity>
            )
        });
    }, [navigation, statusInfo, isUpdatingStatus]);

    const renderFlowCard = (item: any, index: number, label: string, depth: number = 0) => {
        const iconUrl = item?.iconUrl || item?.data?.iconUrl;
        const name = item?.slugName || item?.data?.slugName || item?.meta?.name || 'Untitled';
        
        let description = '';
        const descData = item?.statement || item?.data?.description;
        if (typeof descData === 'string') {
            description = descData;
        } else if (descData && typeof descData === 'object') {
            description = descData.userStatement || descData.code || '';
        }
        
        return (
            <View key={index} style={[styles.flowCardWrapper, { marginLeft: depth * 20 }]}>
                <View style={styles.flowCard}>
                    <View style={styles.flowCardHeader}>
                        {iconUrl ? (
                            iconUrl.includes('.svg') ? (
                                <View style={styles.flowIcon}>
                                    <SvgUri
                                        uri={iconUrl}
                                        width="100%"
                                        height="100%"
                                    />
                                </View>
                            ) : (
                                <Image 
                                    source={{ uri: iconUrl }} 
                                    style={styles.flowIcon}
                                    resizeMode="contain"
                                />
                            )
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

    const renderConditionBlock = (item: any, index: number) => {
        const depth = item.depth || 0;
        const hasTrue = item.branches?.true && item.branches.true.length > 0;
        const hasFalse = item.branches?.false && item.branches.false.length > 0;
        
        return (
            <View key={`condition-${index}`} style={[styles.conditionWrapper, { marginLeft: depth * 20 }]}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={true}
                    style={styles.horizontalScrollContainer}
                >
                    <View style={styles.horizontalBranchesContainer}>
                        {hasTrue && (
                            <View style={styles.horizontalBranchColumn}>
                                <View style={styles.branchHeader}>
                                    <MaterialIcons name="check-circle" size={18} color="#10b981" />
                                    <Text style={styles.branchLabel}>If</Text>
                                </View>
                                {item.branches.true.map((block: any, idx: number) => (
                                    <React.Fragment key={idx}>
                                        {renderBlock(block, idx)}
                                        {idx < item.branches.true.length - 1 && (
                                            <View style={styles.arrowContainerVertical}>
                                                <MaterialIcons name="arrow-downward" size={20} color="#9ca3af" />
                                            </View>
                                        )}
                                    </React.Fragment>
                                ))}
                            </View>
                        )}

                        {hasFalse && (
                            <View style={styles.horizontalBranchColumn}>
                                <View style={styles.branchHeader}>
                                    <MaterialIcons name="cancel" size={18} color="#ef4444" />
                                    <Text style={styles.branchLabel}>Else</Text>
                                </View>
                                {item.branches.false.map((block: any, idx: number) => (
                                    <React.Fragment key={idx}>
                                        {renderBlock(block, idx)}
                                        {idx < item.branches.false.length - 1 && (
                                            <View style={styles.arrowContainerVertical}>
                                                <MaterialIcons name="arrow-downward" size={20} color="#9ca3af" />
                                            </View>
                                        )}
                                    </React.Fragment>
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        );
    };

    const renderLoopBlock = (item: any, index: number) => {
        const depth = item.depth || 0;
        return (
            <View key={`loop-${index}`} style={[styles.loopWrapper, { marginLeft: depth * 20 }]}>
                <View style={styles.loopCard}>
                    <View style={styles.loopHeader}>
                        <MaterialIcons name="loop" size={24} color="#8b5cf6" />
                        <Text style={styles.loopTitle}>
                            {item.type === 'forEach' ? 'For Each Loop' : 'Loop'}
                        </Text>
                    </View>
                    <Text style={styles.loopDescription}>
                        {item.data?.description || 'Iterate through items'}
                    </Text>
                </View>

                {item.children && item.children.length > 0 && (
                    <View style={styles.loopChildrenContainer}>
                        {item.children.map((block: any, idx: number) => renderBlock(block, idx))}
                    </View>
                )}
            </View>
        );
    };

    const renderSwitchBlock = (item: any, index: number) => {
        const depth = item.depth || 0;
        
        return (
            <View key={`switch-${index}`} style={[styles.switchWrapper, { marginLeft: depth * 20 }]}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={true}
                    style={styles.horizontalScrollContainer}
                >
                    <View style={styles.horizontalBranchesContainer}>
                        {item.cases && item.cases.length > 0 && item.cases.map((caseItem: any, caseIdx: number) => {
                            const isLastCase = caseIdx === item.cases.length - 1;
                            const caseLabel = isLastCase ? 'Else' : caseItem.blockId?.replace(/_/g, ' ') || caseItem.value;
                            
                            return (
                                <View key={`case-${caseIdx}`} style={styles.horizontalBranchColumn}>
                                    <View style={styles.branchHeader}>
                                        <Text style={styles.branchLabel}>{caseLabel}</Text>
                                    </View>
                                    {caseItem.blocks && caseItem.blocks.map((block: any, idx: number) => (
                                        <React.Fragment key={idx}>
                                            {renderBlock(block, idx)}
                                            {idx < caseItem.blocks.length - 1 && (
                                                <View style={styles.arrowContainerVertical}>
                                                    <MaterialIcons name="arrow-downward" size={20} color="#9ca3af" />
                                                </View>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        );
    };

    const renderBlock = (item: any, index: number): React.ReactNode => {
        if (!item) return null;

        if (item.type === 'condition') {
            return renderConditionBlock(item, index);
        } else if (item.type === 'loop' || item.type === 'forEach') {
            return renderLoopBlock(item, index);
        } else if (item.type === 'switch') {
            return renderSwitchBlock(item, index);
        } else if (item.type === 'plugin') {
            return (
                <React.Fragment key={index}>
                    {renderFlowCard(item, index, '', item.depth || 0)}
                </React.Fragment>
            );
        }
        return null;
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
                            {renderBlock(action, index)}
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
    conditionWrapper: {
        marginBottom: 12,
    },
    conditionCard: {
        backgroundColor: '#fef3c7',
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: '#f59e0b',
        marginBottom: 8,
    },
    conditionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    conditionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#92400e',
        marginLeft: 8,
    },
    conditionDescription: {
        fontSize: 13,
        color: '#78350f',
        lineHeight: 18,
    },
    branchContainer: {
        marginLeft: 16,
        marginTop: 8,
        paddingLeft: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#d1d5db',
    },
    horizontalScrollContainer: {
        marginBottom: 12,
    },
    horizontalBranchesContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingRight: 12,
    },
    horizontalBranchColumn: {
        width: 280,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    branchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    branchLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4b5563',
        marginLeft: 6,
    },
    loopWrapper: {
        marginBottom: 12,
    },
    loopCard: {
        backgroundColor: '#f3e8ff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: '#8b5cf6',
        marginBottom: 8,
    },
    loopHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    loopTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#5b21b6',
        marginLeft: 8,
    },
    loopDescription: {
        fontSize: 13,
        color: '#6b21a8',
        lineHeight: 18,
    },
    loopChildrenContainer: {
        marginLeft: 16,
        paddingLeft: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#c4b5fd',
    },
    switchWrapper: {
        marginBottom: 12,
    },
    switchCard: {
        backgroundColor: '#cffafe',
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: '#06b6d4',
        marginBottom: 8,
    },
    switchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    switchTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#164e63',
        marginLeft: 8,
    },
    switchDescription: {
        fontSize: 13,
        color: '#155e75',
        lineHeight: 18,
    },
    caseContainer: {
        marginLeft: 16,
        marginTop: 8,
        paddingLeft: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#a5f3fc',
    },
    caseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    caseLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0e7490',
        marginLeft: 6,
    },
    headerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 6,
        backgroundColor: '#f3f4f6',
        gap: 6,
    },
    headerButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
    },
});

export default FlowPreview;