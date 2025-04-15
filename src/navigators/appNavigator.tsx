import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import ChatBot from 'chatbot-react-native-sdk';
import PageHtmlRenderer from '../components/pageHtmlRenderer';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../hooks/hooks';
import AllPages from '../screens/allPages';
import AllCollections from '../screens/allCollection';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import SearchOverlay from '../components/searchOverlay';

const Stack = createStackNavigator();

const AppNavigator = () => {
    const [showSearch, setShowSearch] = useState(false);

    const { currentOrgId } = useAppSelector((state) => ({
        currentOrgId: state.userInfo.currentOrgId,
    }));

    return (
        <View style={{ flex: 1 }}>
            <Stack.Navigator>
                <Stack.Screen name="CollectionsList" component={AllCollections} options={{ headerShown: false }} />
                <Stack.Screen name="PageList" component={AllPages} options={{ headerShown: true }} />
                <Stack.Screen name="PageDetail" component={PageHtmlRenderer} options={{ headerShown: true }} />
            </Stack.Navigator>

            <ChatBot
                embedToken="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdfaWQiOiI1OTgyIiwiY2hhdGJvdF9pZCI6IjY2NTQ3OWE4YmQ1MDQxYWU5M2ZjZDNjNSIsInVzZXJfaWQiOiIxMjQifQ.aI4h6OmkVvQP5dyiSNdtKpA4Z1TVNdlKjAe5D8XCrew"
                threadId={currentOrgId}
                bridgeName="techdoc_internal_chatbot"
                variables={{}}
                openInContainer={false}
                hideIcon={false}
                defaultOpen={false}
                hideCloseButton={false}
            />

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