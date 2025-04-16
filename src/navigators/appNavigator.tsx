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

const Stack = createStackNavigator();

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
        <View style={{ flex: 1 }}>
            <Stack.Navigator>
                <Stack.Screen name="FlowsAndFoldersList" component={AllFoldersAndFlows} options={{ headerShown: false }} />
                <Stack.Screen name="FlowList" component={FlowsList} options={{ headerShown: true }} />
                <Stack.Screen name="FlowPreview" component={FlowPreview} options={{ headerShown: true }} />
            </Stack.Navigator>

            {chatbotToken && <ChatBot
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
            />}

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
});