import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import ChatBot from 'chatbot-react-native-sdk';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppSelector } from '../hooks/hooks';
import AllFoldersAndFlows from '../screens/allFoldersAndFlows';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import SearchOverlay from '../components/searchOverlay';
import FlowPreview from '../screens/flowPreview';
import FlowsList from '../screens/allFlows';
import { useGetChatbotTokenMutation } from '../redux/services/apis/chatbotApis';

// Define route param types for the app's stack navigator
export type AppStackParamList = {
    FlowsAndFoldersList: undefined;
    FlowList: { projectId: string };
    FlowPreview: { flowId: string };
};

const Stack = createStackNavigator<AppStackParamList>();

const AppNavigator = () => {
    const [showSearch, setShowSearch] = useState(false);

    const { currentOrgId } = useAppSelector((state) => ({
        currentOrgId: state.userInfo.currentOrgId,
    }));

    const { chatbotToken } = useAppSelector((state) => ({
        chatbotToken: state.userInfo.chatbotToken,
    }));

    const [getChatbotToken] = useGetChatbotTokenMutation()
    useEffect(() => {
        if (!chatbotToken) {
            getChatbotToken()
        }
    }, [chatbotToken]);

    return (
        <SafeAreaProvider>
            <View style={{ flex: 1 }}>
                <Stack.Navigator>
                    <Stack.Screen name="FlowsAndFoldersList" component={AllFoldersAndFlows} options={{ headerShown: false }} />
                    <Stack.Screen name="FlowList" component={FlowsList} options={{ headerShown: true , headerBackTitle:''}} />
                    <Stack.Screen name="FlowPreview" component={FlowPreview} options={{ headerShown: true ,headerBackTitle:''}} />
                </Stack.Navigator>

                {chatbotToken && (
                    <View style={styles.chatbotWrapper}>
                        <ChatBot
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
                )}

                <TouchableOpacity
                    style={styles.floatingButton}
                    onPress={() => setShowSearch(true)}
                >
                    <MaterialIcons name="search" size={22} color="#fff" />
                </TouchableOpacity>

                {showSearch && (
                    <SearchOverlay onClose={() => setShowSearch(false)} />
                )}
            </View>
        </SafeAreaProvider>
    );
};

export default AppNavigator;

const styles = StyleSheet.create({
    floatingButton: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        backgroundColor: '#007AFF',
        borderRadius: 30,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        zIndex: 5,
    },
    chatbotWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        marginTop: 48, // Increased top margin to move header down
    },
});