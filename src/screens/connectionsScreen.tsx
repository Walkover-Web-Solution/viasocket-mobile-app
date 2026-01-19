import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, TextInput, Modal, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from '../hooks/hooks';
import { useGetConnectionsQuery, Connection } from '../redux/services/apis/connectionsApi';

// Using the proper Connection type from our API

const ConnectionsScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const { currentOrgId, userId, userName } = useAppSelector((state) => ({
    currentOrgId: state.userInfo.currentOrgId,
    userId: state.userInfo.id,
    userName: state.userInfo.name,
  }));

  // Use the real API to fetch connections
  const { data: connections, isLoading, error, refetch, isFetching } = 
    useGetConnectionsQuery(currentOrgId || '');

  // Build authentication URL for reconnecting
  const buildAuthUrl = (connection: Connection) => {
    const VITE_AUTH_URL = 'https://auth.viasocket.com';
    const params = {
      userid: userId,
      orgid: currentOrgId,
      orgId: currentOrgId,
      authidtoupdatetoken: connection.id,
      openerURL: 'viasocket-mobile://auth-callback',
      level: 'org',
      orgOrProjectName: userName || '',
      serviceid: connection.service_id,
      authrowid: connection.auth_row_id,
      isUpdate: 'true',
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

  // Handle reconnect button press
  const handleReconnect = () => {
    if (selectedConnection) {
      const url = buildAuthUrl(selectedConnection);
      console.log('🔗 Opening Auth URL:', url);
      setAuthUrl(url);
      setShowReconnectModal(false);
      setShowWebViewModal(true);
      setIsAuthenticating(true);
    }
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
      
      // Show the value, not the key (e.g., show "kartik@gmail.com" not "email")
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
      if (item.isExpired) {
        setSelectedConnection(item);
        setShowReconnectModal(true);
      }
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
        visible={showReconnectModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReconnectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowReconnectModal(false)}
            >
              <MaterialIcons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
            
            <View style={styles.modalIconContainer}>
              <MaterialIcons name="warning" size={32} color="#ef4444" />
            </View>
            
            <Text style={styles.modalTitle}>Reconnect Connection</Text>
            
            <Text style={styles.modalMessage}>
              Reconnect {selectedConnection?.service_name} to continue using it in your flows
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowReconnectModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.reconnectButton}
                onPress={handleReconnect}
              >
                <Text style={styles.reconnectButtonText}>Reconnect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
        <SafeAreaView style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
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
        </SafeAreaView>
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
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  reconnectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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
    paddingVertical: 12,
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
});

export default ConnectionsScreen;

// Note: To complete the integration, you'll need to update navigation to
// include this screen in your app's navigation stack.
