// LoginScreen.tsx
import React from 'react';
import { View } from 'react-native';
import { ShowProxyAuth } from '@msg91comm/react-native-36blocks-proxy';
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { store } from '../redux/store';

const LoginScreen = () => {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ShowProxyAuth config={{}}
                referenceId='870623a1697443499652ceeab330e5'
                onLoginSuccess={(data) => {
                    console.log("✅ Login successful! Proxy auth token generated");
                    
                    const token = data.data?.proxy_auth_token;
                    
                    if (token) {
                        store.dispatch(setUserInfo({ proxyAuthToken: token }));
                        console.log("✅ Proxy auth token stored in Redux successfully");
                    } else {
                        console.error("❌ No proxy auth token found in response");
                    }
                }}
                onLoginFailure={(data) => {
                    console.log("Login failed", data)
                }} />
        </View>
    );
};

export default LoginScreen;
