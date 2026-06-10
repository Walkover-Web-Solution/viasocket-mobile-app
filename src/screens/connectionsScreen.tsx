import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, TextInput, Modal, Alert, Linking, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from '../hooks/hooks';
import { useNavigation } from '@react-navigation/native';
import { useGetConnectionsQuery, useGetAuthInfoQuery, useRequestConnectionUpdateMutation, useGetUsedInQuery, Connection } from '../redux/services/apis/connectionsApi';
import { useLazyGetUserByIdQuery, useLazyGetCompleteUserDetailsQuery } from '../redux/services/apis/userApi';

// Using the proper Connection type from our API

const ConnectionsScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const [connectionTitle, setConnectionTitle] = useState('');
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const [showAllScripts, setShowAllScripts] = useState(false);
  
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const { currentOrgId, userId, userName, userEmail, currentOrgData } = useAppSelector((state) => ({
    currentOrgId: state.userInfo.currentOrgId,
    userId: state.userInfo.id,
    userName: state.userInfo.name,
    userEmail: state.userInfo.email,
    currentOrgData: state.userInfo.currentOrgData,
  }));

  // Use the real API to fetch connections
  const { data: connections, isLoading, error, refetch, isFetching } = 
    useGetConnectionsQuery(currentOrgId || '');
  
  // Fetch auth info when details modal is shown
  const { data: authInfo, isLoading: isAuthInfoLoading, error: authInfoError, refetch: refetchAuthInfo } = 
    useGetAuthInfoQuery(selectedConnection?.id || '', { skip: !showDetailsModal || !selectedConnection });
  
  // Fetch used in info when details modal is shown
  const { data: usedInData, isLoading: isUsedInLoading, error: usedInError, refetch: refetchUsedIn } = 
    useGetUsedInQuery(selectedConnection?.id || '', { skip: !showDetailsModal || !selectedConnection });
  
  const [requestConnectionUpdate, { isLoading: isRequestLoading }] = useRequestConnectionUpdateMutation();
  const [getUserById] = useLazyGetUserByIdQuery();
  const [getCompleteUserDetails] = useLazyGetCompleteUserDetailsQuery();

  // Build authentication URL for reconnecting
  const buildAuthUrl = (connection: Connection) => {
    const VITE_AUTH_URL = 'https://auth.viasocket.com';
    const params = {
      userid: userId,
      orgid: currentOrgId,
      orgId: currentOrgId,
      authidtoupdatetoken: connection.id,
      openerURL: 'https://flow.viasocket.com',
      level: 'org',
      orgOrProjectName: userName || '',
      serviceid: connection.service_id,
      authrowid: connection.auth_row_id,
      isUpdate: 'true',
      mode: 'flow',
      openedFromSelectedService: 'false',
    };

    const queryParams = Object.entries(params)
      .filter(([, value]) => value !== '' && value !== undefined)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
      .join('&');

    return `${VITE_AUTH_URL}/auth/service/${connection.service_id}/auth/${connection.auth_row_id}?${queryParams}`;
  };

  // Handle authentication callback from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      console.log('📩 Raw WebView Message:', event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📦 Parsed WebView Data:', data);
      
      if (data?.type === 'ready') {
        console.log('✅ WebView JavaScript injected successfully');
        return;
      }
      
      if (data?.id) {
        // Authentication successful
        console.log('🎉 Authentication successful!', data);
        setShowWebViewModal(false);
        setIsAuthenticating(false);
        Alert.alert(
          'Success',
          `${selectedConnection?.service_name} reconnected successfully!`,
          [
            {
              text: 'OK',
              onPress: () => {
                refetch(); // Refresh connections list
              },
            },
          ]
        );
      } else if (data?.error) {
        // Authentication failed
        console.log('❌ Authentication failed:', data.error);
        setShowWebViewModal(false);
        setIsAuthenticating(false);
        Alert.alert(
          'Authentication Failed',
          data.error || 'Failed to reconnect. Please try again.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('ℹ️ Unknown message type:', data);
      }
    } catch (error) {
      console.error('❌ Error parsing WebView message:', error, event.nativeEvent.data);
    }
  };

  // Check if user owns the connection
  const isConnectionOwner = (connection: Connection) => {
    return String(connection.user_id) === String(userId);
  };

  // Handle reconnect/update button press
  const handleReconnect = () => {
    if (selectedConnection) {
      // Check ownership
      if (isConnectionOwner(selectedConnection)) {
        // Owner - open WebView directly
        const url = buildAuthUrl(selectedConnection);
        console.log('🔗 Opening Auth URL:', url);
        setAuthUrl(url);
        setShowDetailsModal(false);
        setShowWebViewModal(true);
        setIsAuthenticating(true);
      } else {
        // Non-owner - show request modal
        setShowDetailsModal(false);
        setShowRequestModal(true);
      }
    }
  };

  // Handle flow press from Used In section
  const handleFlowPress = useCallback(
    (flowId: string) => {
      if (flowId) {
        console.log('🔄 Opening flow:', flowId);
        setShowDetailsModal(false);
        navigation.navigate('FlowPreview', { flowId });
      }
    },
    [navigation]
  );

  // Handle request update submission
  const handleSendRequest = async () => {
    if (!requestReason.trim()) {
      setReasonError(true);
      Alert.alert('Error', 'Reason is required!');
      return;
    }

    try {
      const url = buildAuthUrl(selectedConnection!);
      
      // Fetch complete requesting user details (matching web app implementation)
      console.log('🔍 Fetching complete requesting user details...');
      let requestingUserData: any = {
        id: userId,
        name: userName,
        email: userEmail
      };
      
      try {
        const completeUserResult = await getCompleteUserDetails();
        if (completeUserResult.data) {
          console.log('✅ Complete User Details Fetched:', completeUserResult.data);
          requestingUserData = completeUserResult.data;
        }
      } catch (fetchError) {
        console.warn('⚠️ Failed to fetch complete user details, using basic info:', fetchError);
      }
      
      // Try to find owner in requestingUser's c_companies array
      console.log('🔍 Looking for owner in c_companies...');
      let requestedUserData: any = {
        id: selectedConnection!.user_id
      };
      
      // Check if owner is in the c_companies array
      if (requestingUserData.c_companies && Array.isArray(requestingUserData.c_companies)) {
        const ownerCompany = requestingUserData.c_companies.find((company: any) => 
          String(company.created_by) === String(selectedConnection!.user_id)
        );
        
        if (ownerCompany) {
          console.log('✅ Found owner in c_companies:', ownerCompany);
          requestedUserData = {
            id: selectedConnection!.user_id,
            name: ownerCompany.name || '',
            email: ownerCompany.email || ''
          };
        } else {
          console.warn('⚠️ Owner not found in c_companies, backend will fetch from user_id');
        }
      }
      
      // Match web app payload structure exactly
      const payload = {
        ...selectedConnection,
        requestingUser: requestingUserData,
        requestedUser: requestedUserData,
        orgName: currentOrgData?.name || '',
        url: url,
        reason: requestReason.trim(),
      };
      
      console.log('📤 Request Update Payload:', JSON.stringify(payload, null, 2));
      
      const response = await requestConnectionUpdate(payload).unwrap();
      
      console.log('✅ Request Update Response:', JSON.stringify(response, null, 2));

      Alert.alert('Success', 'Request sent successfully! The connection owner will be notified via email.');
      setShowRequestModal(false);
      setRequestReason('');
      setReasonError(false);
    } catch (error: any) {
      console.error('❌ Request Update Error:', error);
      console.error('❌ Error Details:', JSON.stringify(error, null, 2));
      Alert.alert('Error', error?.data?.message || 'Failed to send request. Please try again.');
    }
  };

  // Handle remove connection
  const handleRemoveConnection = () => {
    if (!selectedConnection || !currentOrgId) {
      Alert.alert('Error', 'Connection information missing');
      return;
    }

    Alert.alert(
      'Remove Connection',
      `Are you sure you want to remove ${selectedConnection.service_name}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Remove cancelled'),
          style: 'cancel',
        },
        {
          text: 'Yes, Remove',
          onPress: async () => {
            try {
              console.log('🗑️ Removing connection:', {
                orgId: currentOrgId,
                authId: selectedConnection.id,
              });

              console.log('🗑️ Connection removal initiated');

              Alert.alert(
                'Success',
                `${selectedConnection.service_name} connection removed successfully!`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setShowDetailsModal(false);
                      refetch();
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error('❌ Failed to remove connection:', error);
              Alert.alert(
                'Error',
                error?.data?.message || 'Failed to remove connection. Please try again.'
              );
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  // Open in external browser as alternative
  const handleOpenInBrowser = async () => {
    if (selectedConnection) {
      const url = buildAuthUrl(selectedConnection);
      console.log('🌐 Opening in external browser:', url);
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          setShowWebViewModal(false);
          Alert.alert(
            'Authentication Opened',
            `Complete the ${selectedConnection.service_name} authentication in your browser. The connection will update automatically.`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Error', 'Cannot open URL');
        }
      } catch (error) {
        console.error('Error opening URL:', error);
        Alert.alert('Error', 'Failed to open browser');
      }
    }
  };

  // Filter connections based on search query
  const filteredConnections = connections?.filter(connection =>
    connection.service_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const renderConnectionItem = ({ item }: { item: Connection }) => {
    // Parse connection label to display meaningful info
    let displayLabel = '';
    try {
      const labelObj = JSON.parse(item.connection_label);
      const firstKey = Object.keys(labelObj)[0];
      const firstValue = labelObj[firstKey] || '';
      
      // Show the value, not the key
      displayLabel = firstValue;
    } catch (e) {
      displayLabel = 'Connected';
    }
    
    // Calculate last used time as relative time
    const getLastUsedTime = () => {
      const updatedAt = new Date(item.updated_at);
      const now = new Date();
      const diffMs = now.getTime() - updatedAt.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) return 'Just now';
        return `${diffHours} hours ago`;
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else {
        return `${diffDays} days ago`;
      }
    };
    
    const handleConnectionPress = () => {
      console.log('🔍 Selected Connection:', JSON.stringify(item, null, 2));
      console.log('👤 Connection Owner ID:', item.user_id);
      console.log('👤 Current User ID:', userId);
      console.log('🔐 Is Owner:', item.user_id === userId);
      setSelectedConnection(item);
      setConnectionTitle('');
      setIsTitleEditing(false);
      setShowAllScripts(false);
      setShowDetailsModal(true);
      // Refetch fresh data for the new connection
      setTimeout(() => {
        refetchAuthInfo();
        refetchUsedIn();
      }, 0);
    };
    
    return (
      <TouchableOpacity style={styles.connectionItem} onPress={handleConnectionPress}>
        <View style={styles.connectionIconContainer}>
          {item.iconUrl ? (
            <Image 
              source={{ uri: item.iconUrl }} 
              style={styles.connectionIcon}
            />
          ) : (
            <View style={styles.fallbackIconContainer}>
              <Text style={styles.fallbackIconText}>
                {item.service_name.substring(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.connectionDetails}>
          <View style={styles.connectionHeader}>
            <Text style={styles.connectionName}>{item.service_name}</Text>
            <View style={[
              styles.statusBadge,
              item.isExpired ? styles.expiredBadge : styles.activeBadge
            ]}>
              <Text style={[
                styles.statusBadgeText,
                item.isExpired ? styles.expiredBadgeText : styles.activeBadgeText
              ]}>
                {item.isExpired ? 'Expired' : 'Active'}
              </Text>
            </View>
          </View>
          <Text style={styles.lastUsed}>Updated {getLastUsedTime()}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'right', 'left']}>
      <View style={styles.header}>
        <Text style={styles.title}>Connections</Text>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search connections..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading connections...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Could not load connections.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredConnections}
          keyExtractor={(item) => item.id}
          renderItem={renderConnectionItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No connections match your search' : 'No connections found'}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <SafeAreaView style={styles.detailsModalContainer} edges={['top', 'bottom']}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsScrollContent}>
            <View style={styles.detailsHeader}>
              <TouchableOpacity 
                style={styles.detailsCloseButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <MaterialIcons name="close" size={28} color="#1f2937" />
              </TouchableOpacity>
            </View>

            {isAuthInfoLoading ? (
              <View style={styles.detailsLoadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.detailsLoadingText}>Loading connection details...</Text>
              </View>
            ) : authInfoError ? (
              <View style={styles.detailsErrorContainer}>
                <Text style={styles.detailsErrorText}>Failed to load connection details</Text>
              </View>
            ) : authInfo ? (
              <View style={styles.detailsContent}>
                <View style={styles.detailsServiceHeader}>
                  <View style={styles.detailsServiceIconContainer}>
                    {authInfo.iconUrl ? (
                      <Image 
                        source={{ uri: authInfo.iconUrl }} 
                        style={styles.detailsServiceIcon}
                        onError={() => console.log('Failed to load icon:', authInfo.iconUrl)}
                      />
                    ) : (
                      <View style={styles.detailsServiceIconFallback}>
                        <Text style={styles.detailsServiceIconFallbackText}>
                          {authInfo.service_name.substring(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.detailsServiceInfo}>
                    <Text style={styles.detailsServiceName}>{authInfo.service_name}</Text>
                    <Text style={styles.detailsConnectedBy}>
                      Connected by {(() => {
                        try {
                          const labelObj = JSON.parse(selectedConnection?.connection_label || '{}');
                          const firstValue = (Object.values(labelObj)[0] as any) || '';
                          return String(firstValue) || (selectedConnection?.user_id === userId ? 'You' : 'Someone else');
                        } catch {
                          return selectedConnection?.user_id === userId ? 'You' : 'Someone else';
                        }
                      })()}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Title</Text>
                  {isConnectionOwner(selectedConnection!) ? (
                    isTitleEditing ? (
                      <TextInput
                        style={styles.detailsTitleInput}
                        placeholder="Enter title"
                        placeholderTextColor="#9ca3af"
                        value={connectionTitle}
                        onChangeText={setConnectionTitle}
                      />
                    ) : (
                      <TouchableOpacity 
                        style={styles.detailsTitleDisplay}
                        onPress={() => {
                          setConnectionTitle('');
                          setIsTitleEditing(true);
                        }}
                      >
                        <Text style={styles.detailsTitleText}>{connectionTitle || 'Enter Title'}</Text>
                        <MaterialIcons name="edit" size={16} color="#6366f1" />
                      </TouchableOpacity>
                    )
                  ) : (
                    <View style={styles.detailsTitleDisplayReadOnly}>
                      <Text style={styles.detailsTitleTextReadOnly}>{connectionTitle || 'Enter Title'}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Used In</Text>
                  {isUsedInLoading ? (
                    <ActivityIndicator size="small" color="#6366f1" />
                  ) : usedInError ? (
                    <Text style={styles.detailsUsedInText}>Error loading usage</Text>
                  ) : usedInData && Object.keys(usedInData).length > 0 ? (
                    <View>
                      {Object.entries(usedInData).map(([projectId, projectData]) => (
                        <View key={projectId} style={styles.detailsUsedInItem}>
                          <Text style={styles.detailsUsedInProjectTitle}>
                            {projectData.title || 'Untitled Project'}
                          </Text>
                          <Text style={styles.detailsUsedInScriptCount}>
                            {projectData.scripts.length} script{projectData.scripts.length !== 1 ? 's' : ''}
                          </Text>
                          {projectData.scripts.slice(0, showAllScripts ? undefined : 2).map((script) => (
                            <TouchableOpacity 
                              key={script.id}
                              onPress={() => handleFlowPress(script.id)}
                              style={styles.detailsUsedInScriptTouchable}
                            >
                              <Text style={styles.detailsUsedInScriptName}>
                                • {script.title || 'Untitled Script'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                          {projectData.scripts.length > 2 && !showAllScripts && (
                            <TouchableOpacity onPress={() => setShowAllScripts(true)}>
                              <Text style={styles.detailsUsedInMore}>
                                +{projectData.scripts.length - 2} more
                              </Text>
                            </TouchableOpacity>
                          )}
                          {showAllScripts && projectData.scripts.length > 2 && (
                            <TouchableOpacity onPress={() => setShowAllScripts(false)}>
                              <Text style={styles.detailsUsedInMore}>Show less</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.detailsUsedInText}>Not used</Text>
                  )}
                </View>

                {authInfo.validActions && authInfo.validActions.length > 0 && (
                  <View style={styles.detailsSection}>
                    <View style={styles.detailsActionsHeader}>
                      <Text style={styles.detailsSectionTitle}>Valid Actions</Text>
                      {authInfo.validActions.length > 4 && !showAllActions && (
                        <TouchableOpacity onPress={() => setShowAllActions(true)}>
                          <Text style={styles.detailsShowMore}>{authInfo.validActions.length - 4} more</Text>
                        </TouchableOpacity>
                      )}
                      {showAllActions && authInfo.validActions.length > 4 && (
                        <TouchableOpacity onPress={() => setShowAllActions(false)}>
                          <Text style={styles.detailsShowLess}>Show less</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.detailsActionsList}>
                      {authInfo.validActions.slice(0, showAllActions ? undefined : 4).map((action, index) => (
                        <Text key={index} style={styles.detailsActionItem}>• {action.name}</Text>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Delete Permission</Text>
                  <View style={styles.detailsPermissionContainer}>
                    <View style={styles.detailsPermissionInitials}>
                      <Text style={styles.detailsPermissionInitialsText}>
                        {(() => {
                          try {
                            const labelObj = JSON.parse(selectedConnection?.connection_label || '{}');
                            const firstValue = (Object.values(labelObj)[0] as any) || '';
                            return String(firstValue).substring(0, 2).toUpperCase() || 'U';
                          } catch {
                            return 'U';
                          }
                        })()}
                      </Text>
                    </View>
                    <Text style={styles.detailsPermissionName}>
                      {(() => {
                        try {
                          const labelObj = JSON.parse(selectedConnection?.connection_label || '{}');
                          const firstValue = (Object.values(labelObj)[0] as any) || '';
                          return String(firstValue) || userName || 'User';
                        } catch {
                          return userName || 'User';
                        }
                      })()}
                    </Text>
                  </View>
                </View>

                {selectedConnection && (
                  <View style={styles.detailsInlineButtonsContainer}>
                    <TouchableOpacity 
                      style={styles.detailsUpdateButton}
                      onPress={handleReconnect}
                    >
                      <Text style={styles.detailsUpdateButtonText}>UPDATE CONNECTION</Text>
                    </TouchableOpacity>
                    
                    {isConnectionOwner(selectedConnection) && (
                      <TouchableOpacity 
                        style={styles.detailsRemoveButton}
                        onPress={handleRemoveConnection}
                      >
                        <Text style={styles.detailsRemoveButtonText}>REMOVE CONNECTION</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* WebView Modal for Authentication */}
      <Modal
        visible={showWebViewModal}
        animationType="slide"
        onRequestClose={() => {
          setShowWebViewModal(false);
          setIsAuthenticating(false);
        }}
      >
        <View style={styles.webViewContainer}>
          <View style={[styles.webViewHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
              style={styles.webViewCloseButton}
              onPress={() => {
                setShowWebViewModal(false);
                setIsAuthenticating(false);
              }}
            >
              <MaterialIcons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>
              Connect to {selectedConnection?.service_name}
            </Text>
            <TouchableOpacity
              style={styles.webViewCloseButton}
              onPress={handleOpenInBrowser}
            >
              <MaterialIcons name="open-in-browser" size={24} color="#6366f1" />
            </TouchableOpacity>
          </View>
          
          {isAuthenticating && (
            <View style={styles.webViewLoadingContainer}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={styles.webViewLoadingText}>Loading...</Text>
            </View>
          )}
          
          <WebView
            source={{ uri: authUrl }}
            onMessage={handleWebViewMessage}
            onLoadStart={(syntheticEvent) => {
              console.log('🔄 WebView Load Start:', syntheticEvent.nativeEvent.url);
              setIsAuthenticating(true);
            }}
            onLoadEnd={(syntheticEvent) => {
              console.log('✅ WebView Load End:', syntheticEvent.nativeEvent.url);
              setIsAuthenticating(false);
            }}
            onLoadProgress={({ nativeEvent }) => {
              console.log('📊 WebView Load Progress:', nativeEvent.progress);
            }}
            onNavigationStateChange={(navState) => {
              console.log('🧭 Navigation State:', {
                url: navState.url,
                loading: navState.loading,
                canGoBack: navState.canGoBack,
                title: navState.title
              });
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ HTTP Error:', nativeEvent);
              Alert.alert(
                'HTTP Error',
                `Status: ${nativeEvent.statusCode}\nURL: ${nativeEvent.url}`,
                [
                  {
                    text: 'Close',
                    onPress: () => {
                      setShowWebViewModal(false);
                      setIsAuthenticating(false);
                    },
                  },
                ]
              );
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ WebView Error:', nativeEvent);
              Alert.alert(
                'Error',
                `Failed to load: ${nativeEvent.description || 'Unknown error'}`,
                [
                  {
                    text: 'Close',
                    onPress: () => {
                      setShowWebViewModal(false);
                      setIsAuthenticating(false);
                    },
                  },
                ]
              );
            }}
            userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={true}
            cacheEnabled={true}
            incognito={false}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            mixedContentMode="always"
            injectedJavaScript={`
              // Inject code to capture postMessage from auth page
              (function() {
                console.log('🔧 Injected JavaScript loaded');
                
                // Debug: Check page content
                setTimeout(function() {
                  const bodyHTML = document.body ? document.body.innerHTML.substring(0, 500) : 'No body';
                  const hasContent = document.body && document.body.children.length > 0;
                  window.ReactNativeWebView.postMessage(JSON.stringify({ 
                    type: 'debug', 
                    bodyHTML: bodyHTML,
                    hasContent: hasContent,
                    childrenCount: document.body ? document.body.children.length : 0,
                    documentReady: document.readyState
                  }));
                }, 2000);
                
                window.addEventListener('message', function(event) {
                  console.log('📨 Received message:', event.data);
                  window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
                });
                
                // Override window.opener.postMessage for compatibility
                if (!window.opener) {
                  window.opener = {};
                }
                window.opener.postMessage = function(data) {
                  console.log('📤 Posting message to React Native:', data);
                  window.ReactNativeWebView.postMessage(JSON.stringify(data));
                };
                
                // Send ready signal
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
              })();
              true;
            `}
          />
        </View>
      </Modal>

      {/* Request Update Modal for Non-Owners */}
      <Modal
        visible={showRequestModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowRequestModal(false);
          setRequestReason('');
          setReasonError(false);
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.modalOverlay}
            onPress={() => {
              setShowRequestModal(false);
              setRequestReason('');
              setReasonError(false);
            }}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <ScrollView 
                contentContainerStyle={styles.scrollViewContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalContent}>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => {
                      setShowRequestModal(false);
                      setRequestReason('');
                      setReasonError(false);
                    }}
                  >
                    <MaterialIcons name="close" size={24} color="#9ca3af" />
                  </TouchableOpacity>
                  
                  <View style={styles.modalIconContainer}>
                    <MaterialIcons name="mail-outline" size={32} color="#6366f1" />
                  </View>
                  
                  <Text style={styles.modalTitle}>Request Connection Update</Text>
                  
                  <Text style={styles.modalMessage}>
                    This connection was established by someone else. You need to ask the connection owner to update this connection.
                  </Text>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Reason *</Text>
                    <TextInput
                      style={[styles.textInput, reasonError && styles.textInputError]}
                      placeholder="Enter reason for update request..."
                      placeholderTextColor="#9ca3af"
                      value={requestReason}
                      onChangeText={(text) => {
                        setRequestReason(text);
                        if (reasonError) setReasonError(false);
                      }}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                    {reasonError && (
                      <Text style={styles.inputErrorText}>Reason is required</Text>
                    )}
                  </View>
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowRequestModal(false);
                        setRequestReason('');
                        setReasonError(false);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.reconnectButton, isRequestLoading && styles.reconnectButtonDisabled]}
                      onPress={handleSendRequest}
                      disabled={isRequestLoading}
                    >
                      {isRequestLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.reconnectButtonText}>Send Request</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
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
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  fallbackIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackIconText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    padding: 0,
  },
  subtitle: {
    fontSize: 16,
    color: '#f3e8ff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addConnectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 12,
    borderRadius: 8,
  },
  addConnectionText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  connectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  connectionIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  connectionDetails: {
    flex: 1,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
  },
  expiredBadge: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeBadgeText: {
    color: '#065f46',
  },
  expiredBadgeText: {
    color: '#991b1b',
  },
  connectionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  connectedDot: {
    backgroundColor: '#10b981',
  },
  disconnectedDot: {
    backgroundColor: '#9ca3af',
  },
  connectionStatus: {
    fontSize: 14,
    color: '#64748b',
  },
  lastUsed: {
    fontSize: 14,
    color: '#94a3b8',
    marginLeft: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  reconnectButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  reconnectButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  reconnectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    minHeight: 100,
  },
  textInputError: {
    borderColor: '#ef4444',
  },
  inputErrorText: {
    fontSize: 13,
    color: '#ef4444',
    marginTop: 6,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  webViewCloseButton: {
    padding: 8,
  },
  webViewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  webViewLoadingContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    zIndex: 1,
  },
  webViewLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6366f1',
  },
  browserButtonContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  openInBrowserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  openInBrowserText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  detailsModalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  detailsScrollContent: {
    paddingBottom: 120,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 32,
  },
  detailsCloseButton: {
    padding: 8,
    marginBottom: 16,
  },
  detailsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  detailsLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  detailsErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  detailsErrorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  detailsContent: {
    paddingHorizontal: 16,
  },
  detailsServiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailsServiceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  detailsServiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  detailsServiceIconFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsServiceIconFallbackText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  detailsServiceInfo: {
    flex: 1,
  },
  detailsServiceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  detailsConnectedBy: {
    fontSize: 14,
    color: '#64748b',
  },
  detailsSection: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  detailsTitleInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  detailsTitleDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailsTitleText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  detailsTitleDisplayReadOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  detailsTitleTextReadOnly: {
    fontSize: 16,
    color: '#9ca3af',
    flex: 1,
  },
  detailsUsedInText: {
    fontSize: 14,
    color: '#64748b',
  },
  detailsUsedInItem: {
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailsUsedInProjectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  detailsUsedInScriptCount: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  detailsUsedInScriptTouchable: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  detailsUsedInScriptName: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 18,
  },
  detailsUsedInMore: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 4,
  },
  detailsActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsShowMore: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  detailsShowLess: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  detailsActionsList: {
    gap: 8,
  },
  detailsActionItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  detailsPermissionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsPermissionInitials: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailsPermissionInitialsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
  },
  detailsPermissionName: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  detailsButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  detailsInlineButtonsContainer: {
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 0,
  },
  detailsUpdateButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsUpdateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  detailsRemoveButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  detailsRemoveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
});

export default ConnectionsScreen;

