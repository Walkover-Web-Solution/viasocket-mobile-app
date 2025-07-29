// LoginScreen.tsx
import React from 'react';
import { View } from 'react-native';
import {ShowProxyAuth} from '@msg91comm/react-native-36blocks-proxy'
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { store } from '../redux/store';

const LoginScreen = () => {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ShowProxyAuth config={{}}
                referenceId='870623a1697443499652ceeab330e5'
                onLoginSuccess={(data) => {
                    store.dispatch(setUserInfo({ proxyAuthToken: data.data.proxy_auth_token }));
                }}
                onLoginFailure={(data) => {
                    console.log("Login failed", data)
                }} />
        </View>
    );
};

export default LoginScreen;
