// LoginScreen.tsx
import React from 'react';
import { View } from 'react-native';
import { ShowGoogleLoginButton } from '../react-native-proxy'
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { store } from '../redux/store';

const LoginScreen = () => {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ShowGoogleLoginButton config={{}}
                referenceId='870623a1697443499652ceeab330e5'
                onLoginSuccess={(data) => {
                    store.dispatch(setUserInfo({ proxyAuthToken: data.proxy_auth_token }));
                }}
                onLoginFailure={(data) => {
                    console.log("Login failed", data)
                }} />
        </View>
    );
};

export default LoginScreen;
