// LoginScreen.tsx
import React from 'react';
import { View } from 'react-native';
import { ShowProxyAuth } from '../react-native-proxy/src';
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { store } from '../redux/store';

const LoginScreen = () => {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ShowProxyAuth config={{}}
                referenceId='870623a1697443499652ceeab330e5'
                onLoginSuccess={(data) => {
                    console.log("✅ Login successful! Full response:", JSON.stringify(data, null, 2));
                    
                    const token = data.data?.proxy_auth_token;
                    
                    if (token) {
                        console.log("🔑 Proxy auth token extracted:", token.substring(0, 20) + '...');
                        store.dispatch(setUserInfo({ proxyAuthToken: token }));
                        console.log("✅ Proxy auth token stored in Redux successfully");
                    } else {
                        console.error("❌ No proxy auth token found in response");
                        console.error("❌ Response structure:", JSON.stringify(data, null, 2));
                    }
                }}
                onLoginFailure={(data) => {
                    console.log("Login failed", data)
                }} />
        </View>
    );
};

export default LoginScreen;
