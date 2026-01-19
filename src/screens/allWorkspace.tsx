import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { setUserInfo, clearUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { useGetUserQuery, useSwitchOrgMutation, useLogoutMutation } from '../redux/services/apis/userApi';

export default function AllWorkspace() {
    const dispatch = useAppDispatch();
    const navigation = useNavigation();
    const { data, isLoading, isFetching, refetch } = useGetUserQuery(undefined, {
        pollingInterval: 30000, // Poll every 30 seconds
        refetchOnFocus: true,   // Refetch when window/app gets focus
        refetchOnReconnect: true // Refetch when network reconnects
    });
    const [switchOrg] = useSwitchOrgMutation();
    const [logout] = useLogoutMutation();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    
    const userInfo = useAppSelector((state: any) => state.userInfo);

    const handleOrgSelect = (org: any) => {
        dispatch(setUserInfo({ currentOrgId: org?.id, currentOrgData: org }));
        switchOrg(org?.id);
    };
    
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase();
    };

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        // Priority 1: Close profile menu first
                        setShowProfileMenu(false);
                        
                        // Priority 2: Try to notify server BEFORE clearing token
                        try {
                            await logout().unwrap();
                            console.log('Logout API successful - server notified');
                        } catch (error) {
                            console.log('Logout API failed, but proceeding with local logout:', error);
                            // Continue with logout even if API fails
                        }
                        
                        // Priority 3: Clear Redux state after API call (or if API failed)
                        dispatch(clearUserInfo());
                    }
                }
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    // User Avatar Component (Top-right corner)
    const renderUserAvatar = () => {
        // Use data from API call, fallback to userInfo from Redux
        const userName = data?.name || userInfo.name || 'User';
        const initials = getInitials(userName);
        
        return (
            <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={() => setShowProfileMenu(true)}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Dropdown Menu Component
    const renderProfileMenu = () => (
        <Modal
            visible={showProfileMenu}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowProfileMenu(false)}
        >
            <TouchableOpacity 
                style={styles.modalOverlay}
                onPress={() => setShowProfileMenu(false)}
            >
                <View style={styles.profileMenu}>
                    {/* User Info Section */}
                    <View style={styles.userInfoSection}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {data?.name ? getInitials(data.name) : userInfo.name ? getInitials(userInfo.name) : 'U'}
                            </Text>
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.userName}>{data?.name || userInfo.name || 'User'}</Text>
                            <Text style={styles.userEmail}>{data?.email || userInfo.email || 'user@example.com'}</Text>
                        </View>
                    </View>
                    
                    <View style={styles.menuDivider} />
                    
                    {/* Menu Options */}
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={() => {
                            setShowProfileMenu(false);
                            navigation.navigate('EditProfile' as never);
                        }}
                    >
                        <MaterialIcons name="edit" size={20} color="#333" />
                        <Text style={styles.menuItemText}>Edit Profile</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.menuItem}
                        onPress={handleLogout}
                    >
                        <MaterialIcons name="logout" size={20} color="#f44336" />
                        <Text style={[styles.menuItemText, { color: '#f44336' }]}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header with Title and User Avatar */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Select Workspace</Text>
                {renderUserAvatar()}
            </View>
            
            {/* Workspace List */}
            <FlatList
                contentContainerStyle={styles.listContainer}
                data={data?.orgs || []}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.card} 
                        onPress={() => handleOrgSelect(item)}
                    >
                        <View style={styles.orgIconContainer}>
                            <Text style={styles.orgInitial}>{getInitials(item.name).charAt(0)}</Text>
                        </View>
                        <Text style={styles.orgName}>{item.name}</Text>
                        <MaterialIcons name="chevron-right" size={24} color="#94a3b8" style={styles.chevronIcon} />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No workspaces found.</Text>}
            />
            
            {/* Profile Dropdown Menu */}
            {renderProfileMenu()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 20,
        paddingBottom: 12,
        backgroundColor: '#7c3aed',
        borderBottomWidth: 0,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    avatarContainer: {
        padding: 4,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    avatarText: {
        color: '#7c3aed',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 60,
        paddingRight: 16,
    },
    profileMenu: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: 280,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    userInfoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    userDetails: {
        marginLeft: 16,
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 4,
    },
    menuItemText: {
        fontSize: 16,
        marginLeft: 16,
        color: '#333',
        fontWeight: '500',
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 80,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        marginVertical: 8,
        borderRadius: 12,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        flexDirection: 'row',
        alignItems: 'center',
    },
    orgIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    orgInitial: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#6366f1',
    },
    orgName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1e293b',
        flex: 1,
    },
    chevronIcon: {
        marginLeft: 8,
    },
    orgId: {
        marginTop: 4,
        fontSize: 12,
        color: '#666'
    },
    emptyText: {
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 40,
        fontWeight: '500',
    },
});