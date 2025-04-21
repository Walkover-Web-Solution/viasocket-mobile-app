// LoginScreen.tsx
import React from 'react';
import { View, Button, Text } from 'react-native';
import { useLazyGetUserQuery } from '../redux/services/apis/userApi';
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { store } from '../redux/store';

const LoginScreen = () => {
    const [getUserDetails, { data, isLoading, error }] = useLazyGetUserQuery();

    const handleLogin = async () => {
        store.dispatch(setUserInfo({proxyAuthToken:'V1ZVZmg5VnJrZVByVWdYVlVpcUllUUxuUG9uU3BTNFhNNSt6ZG1tVDdML1RYY0Jna2w0ejdPRVYvajJlTXp5Wk1pODJuZzJVbkRNcFJ2aEk3VGR0Wkw5OEhPZnYwU3lEMG1xeW9LbnN0eGRNNEFBcU12OWc3anpwYVlHTmJqRldqelZSRzlxTm1vTGF5N0l1L3NUK3NjbElWYU5YajlmYUJxemljcVl3ZEVNPQ==',currentOrgId:null}))
        setTimeout(() => {
            getUserDetails();
        }, 2000);
    };

    return (
        <View>
            <Button title="Login" onPress={handleLogin} />
            {isLoading && <Text>Loading user info...</Text>}
        </View>
    );
};

export default LoginScreen;
