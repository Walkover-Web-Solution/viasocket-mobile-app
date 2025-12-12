import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState, useEffect } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { useGetFlowsAndFoldersQuery } from '../redux/services/apis/flowApi';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import type { AppStackParamList } from '../navigators/appNavigator';

function AllFoldersAndFlows() {
    const [allFlows, setAllFlows] = useState<any[]>([]);
    const [showAllFlows, setShowAllFlows] = useState(false);
    const [showAllFolders, setShowAllFolders] = useState(false);
    const FLOWS_LIMIT = 5;
    const FOLDERS_LIMIT = 5;

    const { currentOrgData, currentOrgId } = useAppSelector((state) => ({
        currentOrgId: state.userInfo.currentOrgId,
        currentOrgData: state.userInfo.currentOrgData,
    }));
    const dispatch = useAppDispatch();
    const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
    
    // Use single API with bringflows=true parameter
    const { data, error, isLoading, isFetching, refetch } = useGetFlowsAndFoldersQuery(
        currentOrgId as string,
        { 
            skip: !currentOrgId,
            refetchOnMountOrArgChange: true
        }
    );

    const handleSwitchOrganization = useCallback(() => {
        dispatch(setUserInfo({ currentOrgId: undefined }));
    }, [dispatch]);

    const handleRefresh = useCallback(() => {
        setShowAllFlows(false);
        setShowAllFolders(false);
        refetch();
    }, [refetch]);

    const handleNavigateToFlowList = useCallback(
        (projectId: string) => {
            if (projectId) {
                navigation.navigate('FlowList', { projectId });
            }
        },
        [navigation]
    );

    const handleNavigateToFlowPreview = useCallback(
        (flowId: string) => {
            if (flowId) {
                navigation.navigate('FlowPreview', { flowId });
            }
        },
        [navigation]
    );

    const handleToggleShowAllFlows = useCallback(() => {
        setShowAllFlows(prev => !prev);
    }, []);

    const handleToggleShowAllFolders = useCallback(() => {
        setShowAllFolders(prev => !prev);
    }, []);

    // Handle flows data updates - simplified filtering logic for better compatibility across workspaces
    useEffect(() => {
        if (data?.flows) {
            const validProjectIds = data?.projects?.map((p) => p.id) ?? [];
            
            // Step 1: Try to get root level flows with less restrictive filtering
            let rootLevelFlows = data.flows.filter((flow) => {
                // Consider a flow as root level if it doesn't belong to any project in the validProjectIds list
                return !validProjectIds.includes(flow.project_id);
            });
            
            // Step 2: If still no flows, just show all flows (no filtering)
            if (rootLevelFlows.length === 0) {
                rootLevelFlows = data.flows;
            }
            
            setAllFlows(rootLevelFlows);
            
            console.log('📊 Flows data:', {
                workspace: currentOrgData?.name || currentOrgId,
                totalFlows: data.flows.length,
                displayedFlows: rootLevelFlows.length,
                validProjectIds: validProjectIds.length
            });
        } else {
            // Reset flows when no data
            setAllFlows([]);
        }
    }, [data, currentOrgId, currentOrgData?.name]);

    // Reset show all states when data changes
    useEffect(() => {
        if (data?.flows && !isFetching) {
            setShowAllFlows(false);
        }
    }, [data, isFetching]);

    useEffect(() => {
        if (data?.projects && !isFetching) {
            setShowAllFolders(false);
        }
    }, [data, isFetching]);

    const displayFlows = showAllFlows ? allFlows : allFlows.slice(0, FLOWS_LIMIT);
    const displayFolders = showAllFolders ? data?.projects : data?.projects?.slice(0, FOLDERS_LIMIT);

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

    const renderOrganizationHeader = () => (
  <View style={styles.orgHeader}>
    <TouchableOpacity onPress={handleSwitchOrganization} style={styles.orgButton}>
      <Text style={styles.orgButtonText}>
        {(currentOrgData?.name ?? '')
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((word) => word[0])
          .join('')
          .toUpperCase() || '?'}
      </Text>
    </TouchableOpacity>

    {/* Workspace name clickable -> switch org (go to workspace list) */}
    <TouchableOpacity onPress={handleSwitchOrganization}>
      <Text style={styles.orgNameText}>{currentOrgData?.name}</Text>
    </TouchableOpacity>
  </View>
);

    const renderFlowAndFolderCollections = () => (
        <ScrollView 
            style={{ flex: 1 }} 
            refreshControl={
                <RefreshControl 
                    refreshing={isFetching} 
                    onRefresh={handleRefresh} 
                />
            }
        >
            {renderOrganizationHeader()}
            <View style={{ padding: 16 }}>
                {/* Flows Section */}
                <Text style={styles.sectionHeading}>Flows</Text>
                <FlatList
                    data={displayFlows}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => handleNavigateToFlowPreview(item.id)}>
                            <Text style={styles.collectionTitle}>{item.title || 'Untitled Flow'}</Text>
                            {item.description ? (
                                <Text style={styles.collectionDescription}>{item.description}</Text>
                            ) : null}
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No flows found.</Text>}
                />
                
                {/* Load More/Show Less for Flows */}
                {!showAllFlows && allFlows.length > FLOWS_LIMIT && (
                    <TouchableOpacity style={styles.loadMoreLink} onPress={handleToggleShowAllFlows}>
                        <Text style={styles.loadMoreLinkText}>Load More ({allFlows.length - FLOWS_LIMIT} more)</Text>
                    </TouchableOpacity>
                )}
                {showAllFlows && allFlows.length > FLOWS_LIMIT && (
                    <TouchableOpacity style={styles.loadMoreLink} onPress={handleToggleShowAllFlows}>
                        <Text style={styles.loadMoreLinkText}>Show Less</Text>
                    </TouchableOpacity>
                )}

                {/* Folders Section */}
                <Text style={styles.sectionHeading}>Collections</Text>
                <FlatList
                    data={displayFolders}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => handleNavigateToFlowList(item.id)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name="folder" size={20} color="#000" style={{ marginRight: 8 }} />
                                <Text style={styles.collectionTitle}>{item.title || 'Untitled Folder'}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No folders found.</Text>}
                    contentContainerStyle={{ paddingBottom: 10 }}
                />
                
                {/* Load More/Show Less for Folders */}
                {!showAllFolders && (data?.projects?.length ?? 0) > FOLDERS_LIMIT && (
                    <TouchableOpacity style={styles.loadMoreLink} onPress={handleToggleShowAllFolders}>
                        <Text style={styles.loadMoreLinkText}>Load More ({(data?.projects?.length ?? 0) - FOLDERS_LIMIT} more)</Text>
                    </TouchableOpacity>
                )}
                {showAllFolders && (data?.projects?.length ?? 0) > FOLDERS_LIMIT && (
                    <TouchableOpacity style={styles.loadMoreLink} onPress={handleToggleShowAllFolders}>
                        <Text style={styles.loadMoreLinkText}>Show Less</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView style={{ flex: 1 }}>
            {isLoading ? 
                renderLoadingIndicator() : 
                error ? 
                    renderErrorMessage() : 
                    renderFlowAndFolderCollections()
            }
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    collectionDescription: {
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
    orgHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 0,
    },
    orgButton: {
        width: 37,
        height: 37,
        borderRadius: 10,
        backgroundColor: '#007acc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    orgButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    orgNameText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    collectionTitle: {
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
    sectionHeading: {
        fontSize: 20,
        fontWeight: '500',
        marginBottom: 10,
        marginTop: 10,
        color: '#222',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 4,
    },
    emptyText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginTop: 20,
    },
    loadMoreLink: {
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    loadMoreLinkText: {
        fontSize: 16,
        color: '#007acc',
        fontWeight: '500',
    },
});

export default AllFoldersAndFlows;