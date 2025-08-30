import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import LoginScreen from '../screens/loginScreen';
import { RootState } from '../redux/store';
import AllWorkspace from '../screens/allWorkspace';
import EditProfile from '../screens/editProfile';
const Stack = createStackNavigator();

const AuthNavigator = () => {
    const { token, currentOrgId } = useSelector((state: RootState) => ({
        token: state.userInfo.proxyAuthToken || null,
        currentOrgId: state.userInfo.currentOrgId || null
    }));

    return (
        <Stack.Navigator>
            {!token ? (
                <Stack.Screen name="Login" component={LoginScreen} />
            ) : !currentOrgId ? (
                <>
                    <Stack.Screen name="Select Workspace" component={AllWorkspace} options={{ headerShown: false }} />
                    <Stack.Screen name="EditProfile" component={EditProfile} options={{ headerShown: false }} />
                </>
            ) : null}
        </Stack.Navigator>
    );
};

export default AuthNavigator;
