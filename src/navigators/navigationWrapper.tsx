import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAppSelector } from '../hooks/hooks';
import AuthNavigator from './authNavigator';
import AppNavigator from './appNavigator';

const NavigationWrapper = () => {
    const userInfo = useAppSelector((state) => state.userInfo);
    const token = userInfo?.proxyAuthToken;
    const currentOrgId = userInfo?.currentOrgId;
    const isAuthenticated = token && currentOrgId;
    return (
        <NavigationContainer>
            {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
};

export default NavigationWrapper;
