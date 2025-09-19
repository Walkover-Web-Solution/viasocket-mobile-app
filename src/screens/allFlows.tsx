import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useLayoutEffect, useState, useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppSelector } from '../hooks/hooks';
import { useGetFlowsAndFoldersQuery, useGetProjectsQuery } from '../redux/services/apis/flowApi';
import { RootStackParamList } from '../types/navigators/navigationTypes';

type FlowListProps = NativeStackScreenProps<RootStackParamList, 'FlowList'>;

function FlowList({ route, navigation }: FlowListProps) {
    const { projectId } = route.params;
    const [allProjectFlows, setAllProjectFlows] = useState<any[]>([]);
    const [showAllFlows, setShowAllFlows] = useState(false);
    
    const currentOrgId = useAppSelector(state => state.userInfo.currentOrgId);
    
    const { data: flowsData, error: flowsError, isLoading: flowsIsLoading, isFetching: flowsIsFetching, refetch: flowsRefetch } = useGetFlowsAndFoldersQuery(
        { orgId: currentOrgId as string }, 
        { 
            skip: !currentOrgId,
            refetchOnMountOrArgChange: true
        }
    );
    
    const { data: projectsData, error: projectsError, isLoading: projectsIsLoading, isFetching: projectsIsFetching, refetch: projectsRefetch } = useGetProjectsQuery(currentOrgId as string, { skip: !currentOrgId });
    
    const projectName = projectsData?.find(project => project.id === projectId)?.title || 'No project selected';
    
    useLayoutEffect(() => {
        navigation.setOptions({ title: projectName });
    }, [navigation, projectName]);

    const handleRefresh = useCallback(() => {
        setShowAllFlows(false);
        setAllProjectFlows([]); // Clear flows to show loading state properly
        flowsRefetch();
        projectsRefetch();
    }, [flowsRefetch, projectsRefetch]);

    const handleToggleShowAllFlows = useCallback(() => {
        console.log('Toggle clicked, current showAllFlows:', showAllFlows);
        console.log('Total project flows available:', allProjectFlows.length);
        setShowAllFlows(prev => !prev);
    }, [showAllFlows, allProjectFlows.length]);

    // Handle flows data updates for specific project - simplified approach
    useEffect(() => {
        if (flowsData?.flows) {
            const projectFlows = flowsData.flows.filter(flow => flow.project_id === projectId);
            
            // Remove duplicates by creating a Set of unique IDs
            const uniqueFlows = projectFlows.filter((flow, index, self) => 
                index === self.findIndex(f => f.id === flow.id)
            );
            
            console.log('Setting project flows:', uniqueFlows.length);
            setAllProjectFlows(uniqueFlows);
        }
    }, [flowsData, projectId]);

    // Determine which flows to display
    const displayFlows = showAllFlows ? allProjectFlows : allProjectFlows.slice(0, 5);
    console.log('Display project flows count:', displayFlows.length, 'showAllFlows:', showAllFlows);

    const renderLoadingIndicator = () => (
        <View style={styles.centeredContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
        </View>
    );

    const renderErrorMessage = () => (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
                We encountered an issue. Please restart the app and try again.
            </Text>
        </View>
    );

    const renderFlowList = () => (
        <View style={{ flex: 1 }}>
            <FlatList
                data={displayFlows}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.flowContainer}
                refreshControl={<RefreshControl refreshing={flowsIsFetching || projectsIsFetching} onRefresh={handleRefresh} />}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() => navigation.navigate('FlowPreview', { flowId: item.id })}
                    >
                        <Text style={styles.flowTitle}>{item.title || 'Untitled'}</Text>
                        {item.description ? (
                            <Text style={styles.flowDescription}>{item.description}</Text>
                        ) : null}
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No flows available.</Text>}
            />
            {allProjectFlows.length > 5 && (
                <View style={styles.loadMoreContainer}>
                    <TouchableOpacity style={styles.loadMoreLink} onPress={handleToggleShowAllFlows}>
                        <Text style={styles.loadMoreLinkText}>{showAllFlows ? 'Show Less' : 'Load More...'}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            {(flowsIsLoading || projectsIsLoading) ? renderLoadingIndicator() : (flowsError || projectsError) ? renderErrorMessage() : renderFlowList()}
        </View>
    );
}

const styles = StyleSheet.create({
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    flowDescription: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
    },
    loadingText: {
        fontSize: 18,
        color: '#555',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#d9534f',
    },
    flowContainer: {
        padding: 16,
        paddingBottom: 80,
    },
    flowTitle: {
        fontSize: 16,
        color: '#333',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    emptyText: {
        fontSize: 14,
        color: '#888',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20,
    },
    loadMoreContainer: {
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadMoreLink: {
        padding: 12,
    },
    loadMoreLinkText: {
        fontSize: 16,
        color: '#007bff',
    },
});

export default FlowList;
