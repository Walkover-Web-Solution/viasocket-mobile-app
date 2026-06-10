import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import ChatBot from 'chatbot-react-native-sdk';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../hooks/hooks';
import AllFoldersAndFlows from '../screens/allFoldersAndFlows';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import SearchOverlay from '../components/searchOverlay';
import FlowPreview from '../screens/flowPreview';
import FlowsList from '../screens/allFlows';
import { useGetChatbotTokenMutation } from '../redux/services/apis/chatbotApis';
import TabNavigator from './tabNavigator';
import { useNavigation } from '@react-navigation/native';

export type AppStackParamList = {
    MainTabs: undefined;
    FlowsAndFoldersList: undefined;
    FlowList: { projectId: string };
    FlowPreview: { flowId: string; flowName?: string };
};

const Stack = createStackNavigator<AppStackParamList>();

const AppNavigator = () => {
    const { currentOrgId } = useAppSelector((state) => ({
        currentOrgId: state.userInfo.currentOrgId,
    }));

    const { chatbotToken } = useAppSelector((state) => ({
        chatbotToken: state.userInfo.chatbotToken,
    }));

    const [currentRoute, setCurrentRoute] = useState<string>('MainTabs');
    const navigation = useNavigation();

    const [getChatbotToken, { isLoading, isError, error }] = useGetChatbotTokenMutation()
    
    useEffect(() => {
        const unsubscribe = navigation.addListener('state', (e: any) => {
            const state = e.data.state;
            const routeName = state?.routes?.[state.index]?.name;
            if (routeName) {
                setCurrentRoute(routeName);
                console.log('📍 Current route:', routeName);
            }
        });

        return unsubscribe;
    }, [navigation]);
    
    useEffect(() => {
        console.log('=== CHATBOT TOKEN STATE ===');
        console.log('chatbotToken:', chatbotToken);
        console.log('chatbotToken type:', typeof chatbotToken);
        console.log('chatbotToken length:', chatbotToken?.length);
        console.log('currentOrgId:', currentOrgId);
        
        if (!chatbotToken) {
            console.log('🔄 Fetching chatbot token...');
            getChatbotToken()
                .unwrap()
                .then(() => console.log('✅ Chatbot token fetch initiated'))
                .catch((err) => console.error('❌ Chatbot token fetch error:', err));
        } else {
            console.log('✅ Chatbot token already exists:', chatbotToken.substring(0, 20) + '...');
        }
    }, [chatbotToken, getChatbotToken]);

    useEffect(() => {
        if (isError) {
            console.error('❌ Chatbot token mutation error:', error);
        }
    }, [isError, error]);

  

    return (
        <View style={{ flex: 1 }}>
            <Stack.Navigator>
                <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
                <Stack.Screen name="FlowList" component={FlowsList} options={{ headerShown: true, headerBackTitle: '' }} />
                <Stack.Screen name="FlowPreview" component={FlowPreview} options={{ headerShown: true, headerBackTitle: '' }} />
            </Stack.Navigator>

            {!chatbotToken && (
                <TouchableOpacity
                    style={styles.debugButton}
                    onPress={() => {
                        console.log('🔄 Manual chatbot token fetch triggered');
                        getChatbotToken();
                    }}
                >
                    <MaterialIcons name="bug-report" size={24} color="white" />
                    <Text style={styles.debugText}>Fetch Token</Text>
                </TouchableOpacity>
            )}

            {(() => {
                const isFlowPreviewScreen = currentRoute === 'FlowPreview';
                
                if (chatbotToken && chatbotToken.length > 0 && isFlowPreviewScreen) {
                   
                    return (
                        <View style={styles.chatbotWrapper} pointerEvents="box-none">
                            <ChatBot
                                key={`chatbot-${currentOrgId}`}
                                embedToken={chatbotToken}
                                threadId={String(currentOrgId)}
                                bridgeName="flowbyai-reactchatbot"
                                variables={{
                                    orgId: currentOrgId,
                                }}
                                openInContainer={false}
                                hideIcon={false}
                                defaultOpen={false}
                                hideCloseButton={false}
                            />
                        </View>
                    );
                } else {
                    if (!isFlowPreviewScreen) {
                        console.log('⚠️ ChatBot not rendering - not on FlowPreview screen');
                    } else {
                        console.log('⚠️ ChatBot not rendering - no token available');
                    }
                    return null;
                }
            })()}
        </View>
    );
};

export default AppNavigator;

const styles = StyleSheet.create({
    chatbotWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: 80,
        zIndex: 9999,
        elevation: 999,
    },
    chatbotContainer: {
        position: 'absolute',
        bottom: 80,
        right: 0,
        zIndex: 9999,
        elevation: 999,
    },
    debugButton: {
        position: 'absolute',
        bottom: 150,
        right: 10,
        backgroundColor: '#FF6B6B',
        padding: 12,
        borderRadius: 50,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 9999,
        elevation: 999,
    },
    debugText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    }
});