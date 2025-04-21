import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAppSelector } from '../hooks/hooks';
import AuthNavigator from './authNavigator';
import AppNavigator from './appNavigator';
import { store } from '../redux/store';
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';

const NavigationWrapper = () => {
    const {
        proxyAuthToken,
        currentOrgId
    } = useAppSelector((state) =>({
        proxyAuthToken: state.userInfo.proxyAuthToken,
        currentOrgId: state.userInfo.currentOrgId
    }));

    return (
        <NavigationContainer>
            {proxyAuthToken && currentOrgId ? <AppNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
};

export default NavigationWrapper;
