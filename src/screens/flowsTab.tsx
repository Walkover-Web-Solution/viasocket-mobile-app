import React, { useCallback, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from '../hooks/hooks';
import { useGetFlowsAndFoldersQuery } from '../redux/services/apis/flowApi';
import type { AppStackParamList } from '../navigators/appNavigator';
import { RouteProp } from '@react-navigation/native';

// Flow status types for category filtering
type FlowStatusCategory = 'all' | 'active' | 'paused' | 'draft';

// Flow statistics type
interface FlowStats {
  all: number;
  active: number;
  paused: number;
  error: number;
  draft: number;
}

// Flow item interface
interface FlowItem {
  id: string;
  title: string;
  description?: string;
  status: string | number;
  updatedAt?: string;
  project_id: string;
  created_by?: string;
  updated_by?: string;
  success_rate?: number;
  runs_count?: number;
}

// Removed user avatar generation functionality as requested

type FlowsTabParams = {
  filter?: FlowStatusCategory;
};

const FlowsTab = ({ route }: { route?: RouteProp<{ params: FlowsTabParams }, 'params'> }) => {
  // Check if filter parameter exists in route
  const initialFilter = route?.params?.filter || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FlowStatusCategory>(initialFilter as FlowStatusCategory);
  const [flowStats, setFlowStats] = useState<FlowStats>({ all: 0, active: 0, paused: 0, error: 0, draft: 0 });
  const [filteredFlows, setFilteredFlows] = useState<FlowItem[]>([]);
  const [allFlows, setAllFlows] = useState<FlowItem[]>([]);

  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const { currentOrgId } = useAppSelector((state) => ({ currentOrgId: state.userInfo.currentOrgId }));
  
  const { data, error, isLoading } = useGetFlowsAndFoldersQuery(currentOrgId as string, { 
    skip: !currentOrgId,
    refetchOnMountOrArgChange: true
  });

  // Process flows data and calculate stats
  useEffect(() => {
    if (data?.flows) {
      const flows = [...data.flows];
      // Update all flows
      setAllFlows(flows);
      setFilteredFlows(flows);
      
      // Calculate flow statistics
      const stats = {
        all: flows.length,
        active: flows.filter(flow => 
          flow.status === 1 || String(flow.status) === '1' || 
          String(flow.status).toLowerCase() === 'active'
        ).length,
        paused: flows.filter(flow => 
          flow.status === 2 || String(flow.status) === '2' || 
          String(flow.status).toLowerCase() === 'paused'
        ).length,
        error: flows.filter(flow => 
          flow.status === -1 || String(flow.status) === '-1' || 
          String(flow.status).toLowerCase() === 'error' ||
          Number(flow.status) < 0
        ).length,
        draft: flows.filter(flow => 
          flow.status === 3 || String(flow.status) === '3' || 
          String(flow.status).toLowerCase() === 'draft' ||
          String(flow.status).toLowerCase() === 'drafted'
        ).length
      };
      
      setFlowStats(stats);
    }
  }, [data]);
  
  // Filter flows based on search and category
  useEffect(() => {
    if (allFlows.length === 0) {
      setFilteredFlows([]);
      return;
    }
    
    let result = [...allFlows];
    
    // Apply category filter
    if (activeCategory !== 'all') {
      // Debug log to see all flow status values
      console.log('All flow status values:', allFlows.map(flow => ({ id: flow.id, status: flow.status, statusStr: String(flow.status) })));
      
      result = result.filter(flow => {
        const statusStr = String(flow.status).toLowerCase();
        let matches = false;
        
        switch(activeCategory) {
          case 'active':
            matches = flow.status === 1 || statusStr === '1' || statusStr === 'active';
            break;
          case 'paused':
            matches = flow.status === 2 || statusStr === '2' || statusStr === 'paused';
            break;
          case 'draft':
            matches = flow.status === 3 || statusStr === '3' || statusStr === 'draft' || statusStr === 'drafted';
            break;
          default:
            matches = true;
        }
        
        return matches;
      });
    }
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(flow => 
        (flow.title?.toLowerCase() || '').includes(query) ||
        (flow.description?.toLowerCase() || '').includes(query)
      );
    }
    
    setFilteredFlows(result);
  }, [allFlows, searchQuery, activeCategory]);

  // Handle category selection
  const handleCategoryPress = useCallback((category: FlowStatusCategory) => {
    setActiveCategory(category);
    setShowCategoryMenu(false);
  }, []);
  
  // Handle flow item press
  const handleFlowPress = useCallback((flowId: string) => {
    navigation.navigate('FlowPreview', { flowId });
  }, [navigation]);

  // Render flow status badge
  const renderStatusBadge = (status: string | number) => {
    const statusStr = String(status).toLowerCase();
    let label = 'Unknown';
    let bgColor = '#f0f0f0';
    let textColor = '#64748b';
    
    if (status === 1 || statusStr === '1' || statusStr === 'active') {
      label = 'Active';
      bgColor = '#dcfdf5';
      textColor = '#10b981';
    } else if (status === 2 || statusStr === '2' || statusStr === 'paused') {
      label = 'Paused';
      bgColor = '#fef3c7';
      textColor = '#f59e0b';
    } else if (status === -1 || statusStr === '-1' || statusStr === 'error') {
      label = 'Error';
      bgColor = '#fee2e2';
      textColor = '#ef4444';
    } else if (status === 3 || statusStr === '3' || statusStr === 'drafted' || statusStr === 'draft') {
      label = 'Draft';
      bgColor = '#e2e8f0';
      textColor = '#475569';
    }
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusText, { color: textColor }]}>{label}</Text>
      </View>
    );
  };
  
  // This function is no longer needed as we're directly rendering avatar circles in the flow item


  // Render a single flow item
  const renderFlowItem = ({ item }: { item: FlowItem }) => {
    const statusStr = String(item.status).toLowerCase();
    
    return (
      <TouchableOpacity 
        style={styles.flowCard}
        onPress={() => handleFlowPress(item.id)}
      >
        <View style={styles.flowCardTop}>
          <Text style={styles.flowTitle} numberOfLines={1}>{item.title || 'Untitled Flow'}</Text>
          {renderStatusBadge(item.status)}
          <MaterialIcons name="chevron-right" size={20} color="#94a3b8" style={styles.chevronIcon} />
        </View>
        
        {item.description && (
          <Text style={styles.descriptionText} numberOfLines={1}>
            {item.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Render categories menu
  const renderCategoriesMenu = () => {
    if (!showCategoryMenu) return null;
    
    return (
      <View style={styles.categoriesMenu}>
        <TouchableOpacity 
          style={styles.categoryItem}
          onPress={() => handleCategoryPress('all')}
        >
          <Text style={styles.categoryItemText}>All Flows</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{flowStats.all}</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.categoryItem}
          onPress={() => handleCategoryPress('active')}
        >
          <Text style={styles.categoryItemText}>Active</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{flowStats.active}</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.categoryItem}
          onPress={() => handleCategoryPress('paused')}
        >
          <Text style={styles.categoryItemText}>Paused</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{flowStats.paused}</Text>
          </View>
        </TouchableOpacity>
        
        {/* Error filter removed as requested */}
        
        <TouchableOpacity 
          style={styles.categoryItem}
          onPress={() => handleCategoryPress('draft')}
        >
          <Text style={styles.categoryItemText}>Draft</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{flowStats.draft}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          We encountered an issue. Please restart the app and try again.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Automation Flows</Text>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#94a3b8" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search flows..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowCategoryMenu(!showCategoryMenu)}
        >
          <MaterialIcons name="filter-list" size={18} color="#6366f1" />
          <Text style={styles.filterButtonText}>
            {activeCategory === 'all' ? 'All Flows' :
             activeCategory === 'active' ? 'Active' :
             activeCategory === 'paused' ? 'Paused' :
             'Draft'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {renderCategoriesMenu()}
      
      <FlatList
        data={filteredFlows}
        keyExtractor={item => item.id}
        renderItem={renderFlowItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No flows found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#1f2937',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  filterButtonText: {
    color: '#4b5563',
    fontWeight: '500',
    fontSize: 13,
    marginLeft: 4,
  },
  categoriesMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  categoryItemText: {
    fontSize: 15,
    color: '#1f2937',
  },
  countBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  flowCard: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  flowCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  flowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    marginRight: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 8,
    marginTop: 2,
  },
  flowCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  flowStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statsLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  statsValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  // Removed avatar styles as requested
  chevronIcon: {
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
  },
});

export default FlowsTab;
