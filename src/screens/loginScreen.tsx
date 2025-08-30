// LoginScreen.tsx
import React, { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  Alert,
  View,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Modal,
} from 'react-native';
import { OTPVerification } from '@msg91comm/react-native-sendotp';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveToken } from '../utils/auth';
import { RootStackParamList } from '../types/navigators/navigationTypes';
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { store } from '../redux/store';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const navigation = useNavigation<NavProp>();

  const handleOTPCompletion = async (data: any) => {
    if (otpVerified) return;

    let parsedData = data;
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        console.log('Failed to parse OTP data as JSON:', e);
        parsedData = data;
      }
    }

    console.log(' Full OTP Response:', JSON.stringify(parsedData, null, 2));

    let isSuccess = false;
    let token = null;

    // Check if OTP verification was successful
    if (parsedData?.type?.toLowerCase() === 'success' && parsedData?.message) {
      isSuccess = true;
      token = parsedData.message;
      
      console.log(' MSG91 OTP Success: JWT token extracted');
      console.log(' OTP JWT Token:', token);
      console.log(' OTP JWT Token Length:', token ? token.length : 'null');
    } else {
      console.log(' MSG91 OTP Failed: Invalid response format');
      console.log(' Response Type:', parsedData?.type);
      console.log(' Response Message:', parsedData?.message);
    }

    console.log(' OTP Validation Result:', { 
      isSuccess, 
      tokenExists: !!token
    });

    if (isSuccess && token) {
      console.log(' JWT Token received successfully - Starting proxy token generation');
      
      setOtpVerified(true);
      setIsLoading(true);

      try {
        // Save JWT token
        await Promise.all([
          saveToken(token), // Save JWT token
          AsyncStorage.removeItem('selectedCompany'),
          AsyncStorage.setItem('referenceId', '870623a1697443499652ceeab330e5'),
        ]);
        
        console.log(' JWT token saved in AsyncStorage');
        console.log(' Starting proxy auth token generation...');
        
        // Generate proxy auth token - email will come from API response
        const { getAuthToken } = require('../api/axios');
        console.log(' Calling getAuthToken API...');
        
        const proxyToken = await getAuthToken();
        
        console.log(' Proxy Auth Token Generation Result:');
        console.log(' Proxy Token:', proxyToken);
        console.log(' Proxy Token Length:', proxyToken ? proxyToken.length : 'null');
        
        if (!proxyToken) {
          console.log(' Failed to generate proxy auth token');
          Alert.alert(
            'Registration Required', 
            'Please register on the web platform before logging into the app.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setOtpVerified(false);
                  setIsLoading(false);
                  setModalVisible(false);
                }
              }
            ]
          );
          return;
        }
        
        // Update Redux with proxy auth token and navigate
        store.dispatch(setUserInfo({ 
          proxyAuthToken: proxyToken,
          currentOrgId: undefined // This will trigger Select Workspace screen
        }));
        
        console.log(' Proxy auth token saved to Redux');
        console.log(' Navigating to Select Workspace...');
        
        // Close modal and let AuthNavigator handle the screen transition
        setModalVisible(false);
        setIsLoading(false);
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to complete OTP verification';
        console.error(' OTP Error:', errorMessage, error);
        console.error(' Error Stack:', error?.stack);
        
        // Reset states but keep modal open for retry
        setOtpVerified(false);
        
        // Show user-friendly error message for OTP retry
        Alert.alert(
          'Invalid OTP', 
          'Please enter the correct OTP. Check your messages and try again.',
          [{
            text: 'OK',
            onPress: () => {
              // Keep user on OTP screen for retry
              setOtpVerified(false);
              setIsLoading(false);
            }
          }]
        );
      } finally {
        if (!otpVerified) {
          setIsLoading(false);
        }
      }
    } else {
      console.log(' OTP Validation Failed - Response does not match expected formats');
      throw new Error('Invalid OTP response format. Please try again.');
    }
  };

  const handleLoginPress = () => {
    setOtpVerified(false); // Reset for new login attempt
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.content}>
        <Text style={styles.title}>
          Welcome to Viasocket
        </Text>
        <Text style={styles.subtitle}>
          Sign in to continue
        </Text>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.disabledButton]}
          onPress={handleLoginPress}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>
                Login With OTP
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Modal visible={isModalVisible}>
          <OTPVerification
            onVisible={isModalVisible}
            onCompletion={handleOTPCompletion}
            widgetId="346574676469353432383734"
            authToken="342616TRNlAu6191DI664af651P1"
          />
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 40,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default LoginScreen;