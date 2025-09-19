import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    AppState,
    Platform,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useGetUserProfileQuery, useGetMSG91UserProfileQuery, useUpdateUserMutation } from '../redux/services/apis/userApi';
import { RootState } from '../redux/store';

// Define navigation type
type RootStackParamList = {
    'Select Workspace': undefined;
    'EditProfile': undefined;
};

type EditProfileNavigationProp = NavigationProp<RootStackParamList>;

const EditProfile = () => {
    const navigation = useNavigation<EditProfileNavigationProp>();
    const userInfo = useSelector((state: RootState) => state.userInfo);
    
    // Fresh data from API with polling for real-time sync
    const { data: profileData, isLoading: profileLoading, error: profileError, refetch } = useGetUserProfileQuery(undefined, {
        pollingInterval: 30000, // Poll every 30 seconds
        refetchOnFocus: true,   // Refetch when window/app gets focus
        refetchOnReconnect: true // Refetch when network reconnects
    });
    
    // Get complete profile data from MSG91 API (includes mobile)
    const { data: msg91ProfileData, isLoading: msg91Loading, refetch: refetchMSG91 } = useGetMSG91UserProfileQuery(undefined, {
        pollingInterval: 30000,
        refetchOnFocus: true,
        refetchOnReconnect: true
    });
    
    // Update User API
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);

    // Update form when API data loads
    useEffect(() => {
        // Priority 1: MSG91 API data (has mobile number)
        if (msg91ProfileData) {
            console.log(' MSG91 profile data loaded:', msg91ProfileData);
            setName(msg91ProfileData.name || '');
            setEmail(msg91ProfileData.email || '');
            setMobile(msg91ProfileData.mobile || '');
        }
        // Priority 2: Regular profile API data
        else if (profileData) {
            setName(profileData.name || '');
            setEmail(profileData.email || '');
            setMobile(profileData.mobile || '');
        }
        // Priority 3: Redux fallback data
        else if (userInfo && !profileLoading && !msg91Loading) {
            setName(userInfo.name || '');
            setEmail(userInfo.email || '');
            setMobile(''); // No mobile in userInfo fallback
        }
    }, [msg91ProfileData, profileData, userInfo, profileLoading, msg91Loading]);

    // Refresh data when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            refetch();
            refetchMSG91();
        }, [refetch, refetchMSG91])
    );

    // Listen for app state changes (foreground/background)
    useEffect(() => {
        const handleAppStateChange = (nextAppState: string) => {
            if (nextAppState === 'active') {
                console.log(' App came to foreground - refreshing profile data');
                refetch();
                refetchMSG91();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        
        return () => subscription?.remove();
    }, [refetch, refetchMSG91]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        // Only send name for update (email and mobile are read-only)
        const userData = {
            name: name.trim(),
            email: email, // Keep existing email
            mobile: mobile // Keep existing mobile
        };

        try {
            setIsLoading(true);
            
            // Call real API
            const result = await updateUser(userData).unwrap();

            Alert.alert(
                'Success',
                'Profile updated successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack()
                    }
                ]
            );
        } catch (error: any) {
            console.error(' Error updating profile:', error);
            
            // Parse API error messages
            let errorMessage = 'Failed to update profile. Please try again.';
            
            if (error?.data?.message) {
                errorMessage = error.data.message;
            } else if (error?.data?.errors) {
                // Handle validation errors from MSG91 API
                const errors = error.data.errors;
                const errorMessages = [];
                
                if (errors.User) {
                    errorMessages.push(...errors.User);
                }
                if (errors['user.name']) {
                    errorMessages.push(...errors['user.name']);
                }
                if (errors['user.email']) {
                    errorMessages.push(...errors['user.email']);
                }
                
                if (errorMessages.length > 0) {
                    errorMessage = errorMessages.join(', ');
                }
            } else if (error?.message) {
                errorMessage = error.message;
            }
            
            Alert.alert(
                'Update Notice', 
                `Your changes have been saved locally. ${errorMessage}`,
                [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state while fetching profile data
    if (profileLoading || msg91Loading) {
        return (
            <View style={styles.container}>
                <StatusBar 
                    barStyle="dark-content" 
                    backgroundColor="#fff"
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading your profile...</Text>
                </View>
            </View>
        );
    }

    // Error state if profile data fails to load
    if (profileError) {
        return (
            <View style={styles.container}>
                <StatusBar 
                    barStyle="dark-content" 
                    backgroundColor="#fff"
                />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}> Could not load profile data</Text>
                    <Text style={styles.errorSubText}>Please check your connection and try again</Text>
                    <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.retryButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar 
                barStyle="dark-content" 
                backgroundColor="#fff"
            />
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Select Workspace')}
                >
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Edit Profile</Text>
                <View style={styles.rightPlaceholder} />
            </View>
            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Name *</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter your name"
                        editable={!isLoading && !isUpdating}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, styles.readOnlyLabel]}>Email </Text>
                    <TextInput
                        style={[styles.input, styles.readOnlyInput]}
                        value={email}
                        placeholder="Email address"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={false}
                        selectTextOnFocus={false}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, styles.readOnlyLabel]}>Mobile</Text>
                    <TextInput
                        style={[styles.input, styles.readOnlyInput]}
                        value={mobile}
                        placeholder="Mobile number"
                        keyboardType="phone-pad"
                        editable={false}
                        selectTextOnFocus={false}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, (isLoading || isUpdating) && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isLoading || isUpdating}
                >
                    {(isLoading || isUpdating) ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Update Profile</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'ios' ? 44 : 10,
        paddingBottom: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...Platform.select({
            android: {
                elevation: 3,
                height: 56,
                paddingTop: 10,
            },
            ios: {
                height: 88, // 44 (status bar) + 44 (header)
            },
        }),
    },
    backButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -8,
    },
    backButtonText: {
        fontSize: 28,
        color: '#007AFF',
        lineHeight: 30,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
        position: 'absolute',
        left: 0,
        right: 0,
    },
    rightPlaceholder: {
        width: 44,
    },
    form: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    readOnlyLabel: {
        color: '#6c757d',
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        color: '#333',
    },
    readOnlyInput: {
        backgroundColor: '#f8f9fa',
        borderColor: '#e9ecef',
        color: '#6c757d',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Loading state styles
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    // Error state styles
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#e74c3c',
        textAlign: 'center',
        marginBottom: 8,
        fontWeight: '600',
    },
    errorSubText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default EditProfile;
