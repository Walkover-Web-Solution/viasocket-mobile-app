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

    const [getChatbotToken] = useGetChatbotTokenMutation()
    useEffect(() => {
        if (!chatbotToken) {
            getChatbotToken()
        }
    }, [chatbotToken]);

    return (
        <View style={{ flex: 1 }}>
            <Stack.Navigator>
                <Stack.Screen name="MainTabs" component={TabNavigator} options={{ headerShown: false }} />
                <Stack.Screen name="FlowList" component={FlowsList} options={{ headerShown: true, headerBackTitle: '' }} />
                <Stack.Screen name="FlowPreview" component={FlowPreview} options={{ headerShown: true, headerBackTitle: '' }} />
            </Stack.Navigator>

            {chatbotToken && (
                <View style={styles.chatbotContainer}>
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
        </View>
    );
};

export default AppNavigator;

const styles = StyleSheet.create({
    chatbotContainer: {
        position: 'absolute',
        bottom: 70, // Increased from default position to move it higher
        right: 0,
        zIndex: 100,
    }
});