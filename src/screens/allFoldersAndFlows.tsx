import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState, useEffect } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { useGetFlowsAndFoldersQuery } from '../redux/services/apis/flowApi';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import type { AppStackParamList } from '../navigators/appNavigator';

// Flow status types for category filtering
type FlowStatusCategory = 'all' | 'active' | 'paused' | 'error' | 'draft';

// Flow statistics type
interface FlowStats {
    all: number;
    active: number;
    paused: number;
    error: number;
    draft: number;
}

function AllFoldersAndFlows() {
    const [allFlows, setAllFlows] = useState<any[]>([]);
    const [filteredFlows, setFilteredFlows] = useState<any[]>([]);
    const [showAllFlows, setShowAllFlows] = useState(false);
    const [showAllFolders, setShowAllFolders] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<FlowStatusCategory>('all');
    const [flowStats, setFlowStats] = useState<FlowStats>({ all: 0, active: 0, paused: 0, error: 0, draft: 0 });
    
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
            
            // Calculate flow statistics by status
            const stats = {
                all: rootLevelFlows.length,
                active: rootLevelFlows.filter(flow => 
                    flow.status === 1 || String(flow.status) === '1' || 
                    String(flow.status).toLowerCase() === 'active'
                ).length,
                paused: rootLevelFlows.filter(flow => 
                    flow.status === 0 || String(flow.status) === '0' || 
                    String(flow.status).toLowerCase() === 'paused'
                ).length,
                error: rootLevelFlows.filter(flow => 
                    flow.status === -1 || String(flow.status) === '-1' || 
                    String(flow.status).toLowerCase() === 'error'
                ).length,
                draft: rootLevelFlows.filter(flow => 
                    flow.status === 2 || String(flow.status) === '2' || 
                    String(flow.status).toLowerCase() === 'draft'
                ).length
            };
            
            setFlowStats(stats);
            setFilteredFlows(rootLevelFlows);
            
            console.log('📊 Flows data:', {
                workspace: currentOrgData?.name || currentOrgId,
                totalFlows: data.flows.length,
                displayedFlows: rootLevelFlows.length,
                validProjectIds: validProjectIds.length,
                stats
            });
        } else {
            // Reset flows when no data
            setAllFlows([]);
            setFilteredFlows([]);
            setFlowStats({ all: 0, active: 0, paused: 0, error: 0, draft: 0 });
        }
    }, [data, currentOrgId, currentOrgData?.name]);
    
    // Filter flows based on search query and selected category
    useEffect(() => {
        if (allFlows.length === 0) {
            setFilteredFlows([]);
            return;
        }
        
        let result = [...allFlows];
        
        // Apply category filter
        if (activeCategory !== 'all') {
            result = result.filter(flow => {
                const statusStr = String(flow.status).toLowerCase();
                
                switch(activeCategory) {
                    case 'active':
                        return flow.status === 1 || statusStr === '1' || statusStr === 'active';
                    case 'paused':
                        return flow.status === 0 || statusStr === '0' || statusStr === 'paused';
                    case 'error':
                        return flow.status === -1 || statusStr === '-1' || statusStr === 'error';
                    case 'draft':
                        return flow.status === 2 || statusStr === '2' || statusStr === 'draft';
                    default:
                        return true;
                }
            });
        }
        
        // Apply search query filter
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            result = result.filter(flow => 
                (flow.title?.toLowerCase() || '').includes(query) ||
                (flow.description?.toLowerCase() || '').includes(query)
            );
        }
        
        setFilteredFlows(result);
    }, [allFlows, searchQuery, activeCategory]);

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

    // Select the active category
    const handleCategoryPress = useCallback((category: FlowStatusCategory) => {
        setActiveCategory(category);
    }, []);
    
    // Handle search query changes
    const handleSearchChange = useCallback((text: string) => {
        setSearchQuery(text);
    }, []);

    const displayFlows = showAllFlows ? filteredFlows : filteredFlows.slice(0, FLOWS_LIMIT);
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
        {((currentOrgData?.name || '') as string)
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((word: string) => word[0])
          .join('')
          .toUpperCase() || '?'}
      </Text>
    </TouchableOpacity>

    {/* Workspace name clickable -> switch org (go to workspace list) */}
    <TouchableOpacity onPress={handleSwitchOrganization}>
      <Text style={styles.orgNameText}>{String(currentOrgData?.name || 'Select Workspace')}</Text>
    </TouchableOpacity>
  </View>
);

    // Render a category button for flow filtering
    const renderCategoryButton = (category: FlowStatusCategory, label: string, count: number) => (
        <TouchableOpacity
            style={[styles.categoryButton, activeCategory === category && styles.activeCategoryButton]}
            onPress={() => handleCategoryPress(category)}
        >
            <Text 
                style={[styles.categoryButtonText, activeCategory === category && styles.activeCategoryButtonText]}
            >
                {label}
            </Text>
            <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{count}</Text>
            </View>
        </TouchableOpacity>
    );
    
    // Render search bar and filters
    const renderSearchAndFilters = () => (
        <View style={styles.searchAndFilterContainer}>
            {/* Search bar */}
            <View style={styles.searchBarContainer}>
                <Icon name="search" size={22} color="#aaa" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search flows..."
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    placeholderTextColor="#aaa"
                    clearButtonMode="while-editing"
                />
            </View>
            
            {/* Categories filter */}
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.categoryContainer}
            >
                {renderCategoryButton('all', 'All Flows', flowStats.all)}
                {renderCategoryButton('active', 'Active', flowStats.active)}
                {renderCategoryButton('paused', 'Paused', flowStats.paused)}
                {renderCategoryButton('error', 'Error', flowStats.error)}
                {renderCategoryButton('draft', 'Draft', flowStats.draft)}
            </ScrollView>
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
            {renderSearchAndFilters()}
            <View style={{ padding: 16 }}>
                {/* Flows Section */}
                <FlatList
                    data={displayFlows}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => {
                        // Determine flow status for UI
                        const statusStr = String(item.status).toLowerCase();
                        const isActive = item.status === 1 || statusStr === '1' || statusStr === 'active';
                        const isError = item.status === -1 || statusStr === '-1' || statusStr === 'error';
                        const isPaused = item.status === 0 || statusStr === '0' || statusStr === 'paused';
                        const isDraft = item.status === 2 || statusStr === '2' || statusStr === 'draft';
                        
                        let statusColor = '#64748b'; // Default gray
                        let statusLabel = 'Unknown';
                        
                        if (isActive) {
                            statusColor = '#10b981'; // Green
                            statusLabel = 'Active';
                        } else if (isError) {
                            statusColor = '#ef4444'; // Red
                            statusLabel = 'Error';
                        } else if (isPaused) {
                            statusColor = '#f59e0b'; // Amber
                            statusLabel = 'Paused';
                        } else if (isDraft) {
                            statusColor = '#6366f1'; // Indigo
                            statusLabel = 'Draft';
                        }
                        
                        // For demo purposes, generate a random time ago (1-10 mins)
                        const timeAgo = Math.floor(Math.random() * 10) + 1;
                        
                        return (
                            <TouchableOpacity 
                                style={styles.flowCard} 
                                onPress={() => handleNavigateToFlowPreview(item.id)}
                            >
                                <View style={styles.flowCardHeader}>
                                    <View style={styles.flowTitleContainer}>
                                        <Text style={styles.flowTitle}>{item.title || 'Untitled Flow'}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                                            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                            <Text style={[styles.statusText, { color: statusColor }]}>
                                                {statusLabel}
                                            </Text>
                                        </View>
                                    </View>
                                    <Icon name="chevron-right" size={24} color="#94a3b8" />
                                </View>
                                
                                {item.description ? (
                                    <Text style={styles.flowDescription}>{item.description}</Text>
                                ) : null}
                                
                                {/* Flow stats row */}
                                <View style={styles.flowStatsContainer}>
                                    <View style={styles.flowStatItem}>
                                        <Text style={styles.flowStatLabel}>{timeAgo} min ago</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
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
    searchAndFilterContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 5,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 15,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: 16,
        color: '#333',
        paddingVertical: 8,
    },
    categoryContainer: {
        paddingVertical: 5,
    },
    categoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#eee',
    },
    activeCategoryButton: {
        backgroundColor: '#6366f1',
    },
    categoryButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    activeCategoryButtonText: {
        color: '#fff',
    },
    countBadge: {
        backgroundColor: '#e5e7eb',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 6,
    },
    countBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4b5563',
    },
    flowCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    flowCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    flowTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    flowTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginRight: 8,
    },
    flowDescription: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    flowStatsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    flowStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flowStatLabel: {
        fontSize: 13,
        color: '#64748b',
        marginRight: 4,
    },
    flowStatValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
    flowStatDivider: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#cbd5e1',
        marginHorizontal: 8,
    },
});

export default AllFoldersAndFlows;