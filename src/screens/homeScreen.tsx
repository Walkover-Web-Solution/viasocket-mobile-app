import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../hooks/hooks';
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { useGetFlowsAndFoldersQuery } from '../redux/services/apis/flowApi';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../navigators/appNavigator';

interface FlowStats {
  total: number;
  active: number;
  paused: number;
  errors: number;
  draft: number;
  trashed: number;
  needsAttention: number;
}

interface RecentActivity {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  time: string;
  flowId?: string;
}

const HomeScreen = () => {
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>();
  const dispatch = useAppDispatch();
  const { currentOrgId, currentOrgData } = useAppSelector((state) => ({
    currentOrgId: state.userInfo.currentOrgId,
    currentOrgData: state.userInfo.currentOrgData,
  }));

  const [flowStats, setFlowStats] = useState<FlowStats>({
    total: 0,
    active: 0,
    paused: 0,
    errors: 0,
    draft: 0,
    trashed: 0,
    needsAttention: 0,
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  const { data, error, isLoading, refetch } = useGetFlowsAndFoldersQuery(
    currentOrgId as string,
    { 
      skip: !currentOrgId,
      refetchOnMountOrArgChange: true
    }
  );

  // Force data refresh when component mounts
  useEffect(() => {
    // Force immediate refresh when component mounts
    refetch();
    
    // Set up an interval to refresh data
    const refreshInterval = setInterval(() => {
      refetch();
    }, 5000); // Refresh every 5 seconds
    
    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, [refetch]);

  // Process flow data to calculate statistics and recent activity
  useEffect(() => {
    if (data?.flows) {
      // Calculate actual statistics from flow data
      const total = data.flows.length;
      
      // Debug - log all flow status values
      console.log('HOME SCREEN - All flow status values:', data.flows.map(flow => ({ id: flow.id, status: flow.status })));
      
      // Get flow counts based on status
      const active = data.flows.filter(flow => 
        flow.status === 1 || String(flow.status) === '1' || 
        String(flow.status).toLowerCase() === 'active'
      ).length;
      
      const paused = data.flows.filter(flow => 
        flow.status === 2 || String(flow.status) === '2' || 
        String(flow.status).toLowerCase() === 'paused'
      ).length;
      
      const draft = data.flows.filter(flow => 
        flow.status === 3 || String(flow.status) === '3' || 
        String(flow.status).toLowerCase() === 'draft' ||
        String(flow.status).toLowerCase() === 'drafted'
      ).length;
      
      const trashed = data.flows.filter(flow => 
        flow.status === 0 || String(flow.status) === '0' || 
        String(flow.status).toLowerCase() === 'trashed'
      ).length;
      
      // Find error flows and log them
      const errorFlows = data.flows.filter(flow => 
        flow.status === -1 || String(flow.status) === '-1' || 
        String(flow.status).toLowerCase() === 'error' ||
        Number(flow.status) < 0
      );
      console.log('HOME SCREEN - Found error flows:', errorFlows.map(f => ({ id: f.id, title: f.title, status: f.status })));
      const errors = errorFlows.length;
      
      // For demo purposes, set needsAttention to a percentage of the total flows
      const needsAttention = errors;

      setFlowStats({
        total,
        active: active || 0, 
        paused: paused || 0, 
        draft: draft || 0,
        trashed: trashed || 0,
        errors: errors || 0, 
        needsAttention: errors || 0 // Set to actual error count
      });
      
      // Debug log the final stats
      console.log('HOME SCREEN - Final flow stats:', { total, active, paused, errors, needsAttention: errors });
      
      // Extract recent activity from flows
      const activities: RecentActivity[] = [];
      
      // Get the 5 most recent flows based on updatedAt
      const recentFlows = [...data.flows]
        .sort((a, b) => {
          const dateA = a.updatedAt || '';
          const dateB = b.updatedAt || '';
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        })
        .slice(0, 5);
      
      recentFlows.forEach((flow, index) => {
        // Determine activity type based on flow status
        let type: 'success' | 'error' | 'info' = 'info';
        const statusString = String(flow.status);
        
        if (flow.status === -1 || statusString === '-1' || statusString.toLowerCase() === 'error') {
          type = 'error';
        } else if (flow.status === 1 || statusString === '1' || statusString.toLowerCase() === 'active') {
          type = 'success';
        }
        
        // Create a message based on the flow title
        const message = flow.title || 'Untitled flow';
        
        // Calculate relative time
        const timestamp = flow.updatedAt;
        let time = 'Recently';
        if (timestamp) {
          const date = new Date(timestamp);
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.round(diffMs / 60000);
          const diffDays = Math.floor(diffMins / 1440);
          
          if (diffMins < 60) {
            time = `${diffMins} min ago`;
          } else if (diffMins < 1440) {
            time = `${Math.floor(diffMins / 60)} hours ago`;
          } else if (diffDays < 7) {
            time = `${diffDays} days ago`;
          } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            time = weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
          } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            time = months === 1 ? '1 month ago' : `${months} months ago`;
          } else {
            const years = Math.floor(diffDays / 365);
            time = years === 1 ? '1 year ago' : `${years} years ago`;
          }
        }
        
        activities.push({
          id: flow.id,
          type,
          message: `${message} ${type === 'error' ? 'failed' : type === 'success' ? 'ran successfully' : 'was updated'}`,
          time,
          flowId: flow.id
        });
      });
      
      setRecentActivities(activities);
    }
  }, [data]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.welcomeText}>Welcome, </Text>
            <TouchableOpacity
              onPress={() => {
                dispatch(setUserInfo({ currentOrgId: undefined }));
                // This will return to auth navigator which will show AllWorkspace screen
                // when currentOrgId is undefined
              }}
            >
              <Text style={[styles.welcomeText, styles.clickableText]}>{currentOrgData?.name || 'User'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Flow Statistics Cards - 2x2 Grid */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={styles.statsCard}
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Flows', params: { filter: 'all' } } }]
            })}
          >
            <Text style={styles.statsLabel}>Total Flows</Text>
            <Text style={styles.statsNumber}>{flowStats.total}</Text>
            <View style={[styles.iconContainer, { backgroundColor: '#eef2ff' }]}>
              <MaterialIcons name="sync" size={24} color="#6366f1" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statsCard}
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Flows', params: { filter: 'active' } } }]
            })}
          >
            <Text style={styles.statsLabel}>Active</Text>
            <Text style={styles.statsNumber}>{flowStats.active}</Text>
            <View style={[styles.iconContainer, { backgroundColor: '#ecfdf5' }]}>
              <MaterialIcons name="play-arrow" size={24} color="#10b981" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={styles.statsCard}
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Flows', params: { filter: 'paused' } } }]
            })}
          >
            <Text style={styles.statsLabel}>Paused</Text>
            <Text style={styles.statsNumber}>{flowStats.paused}</Text>
            <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
              <MaterialIcons name="pause" size={24} color="#f59e0b" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statsCard}
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Flows', params: { filter: 'draft' } } }]
            })}
          >
            <Text style={styles.statsLabel}>Draft</Text>
            <Text style={styles.statsNumber}>{flowStats.draft}</Text>
            <View style={[styles.iconContainer, { backgroundColor: '#e2e8f0' }]}>
              <MaterialIcons name="edit" size={24} color="#475569" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={styles.statsCard}
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Flows', params: { filter: 'trashed' } } }]
            })}
          >
            <Text style={styles.statsLabel}>Trashed</Text>
            <Text style={styles.statsNumber}>{flowStats.trashed}</Text>
            <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
              <MaterialIcons name="delete" size={24} color="#dc2626" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statsCard}
            onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs', params: { screen: 'Flows', params: { filter: 'error' } } }]
            })}
          >
            <Text style={styles.statsLabel}>Error</Text>
            <Text style={styles.statsNumber}>{flowStats.errors}</Text>
            <View style={[styles.iconContainer, { backgroundColor: '#fecaca' }]}>
              <MaterialIcons name="error" size={24} color="#ef4444" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs', params: { screen: 'Flows' } }]
          })}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentActivities.map((activity) => (
          <TouchableOpacity 
            key={activity.id} 
            style={styles.activityItem}
            onPress={() => {
              if (activity.flowId) {
                navigation.navigate('FlowPreview', { flowId: activity.flowId });
              }
            }}>
            <View 
              style={[
                styles.activityDot, 
                activity.type === 'error' ? styles.errorDot : 
                (activity.type === 'success' ? styles.successDot : styles.infoDot)
              ]} 
            />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>{activity.message}</Text>
              <Text style={{ fontSize: 15, fontWeight: '500', marginBottom: 4, color: '#333' }}>
                {activity.time}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingTop: 40,
    backgroundColor: '#7c3aed',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    color: '#f3e8ff',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 16,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  statsLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  iconContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCard: {
    backgroundColor: '#f43f5e',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#ffecf0',
    marginBottom: 12,
  },
  alertButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  errorDot: {
    backgroundColor: '#ef4444',
  },
  successDot: {
    backgroundColor: '#10b981',
  },
  infoDot: {
    backgroundColor: '#3b82f6',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  clickableText: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});

export default HomeScreen;
