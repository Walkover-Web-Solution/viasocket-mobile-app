// LoginScreen.tsx
import React from 'react';
import { View, Button, Text } from 'react-native';
import { useLazyGetUserQuery } from '../redux/services/apis/userApi';

const LoginScreen = () => {
    const [getUserDetails, { data, isLoading, error }] = useLazyGetUserQuery();

    const handleLogin = async () => {
        getUserDetails();
    };

    return (
        <View>
            <Button title="Login" onPress={handleLogin} />
            {isLoading && <Text>Loading user info...</Text>}
        </View>
    );
};

export default LoginScreen;
