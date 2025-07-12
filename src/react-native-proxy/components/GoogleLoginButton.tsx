import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    Image,
    View,
    ActivityIndicator,
} from 'react-native';
import { configureGoogleSignIn } from '../services/providers/googleAuth';
import { login } from '../services/authService';
import { FeatureApis } from '../apis/featureApis';
import AppleLoginButton from './AppleLoginButton';

const GOOGLE_LOGO = 'https://developers.google.com/identity/images/g-logo.png';

const GoogleLoginButton = ({
    config = null,
    referenceId,
    onLoginSuccess,
    onLoginFailure,
    buttonText = 'Sign in with Google',
    buttonStyle,
    textStyle,
    loadingColor = '#4285F4',
    disabled = false,
}: {
    referenceId: string,
    onLoginSuccess: (result: any) => void;
    onLoginFailure: (error: any) => void;
    buttonText?: string;
    buttonStyle?: object;
    textStyle?: object;
    loadingColor?: string;
    disabled?: boolean;
    config?: any
}) => {
    const [loading, setLoading] = React.useState(false);

    const handleLogin = async () => {
        if (loading || disabled) return;
        try {
            const listOfFeatures = await FeatureApis.getFeatureList(referenceId)
            const googleFeature = listOfFeatures.find((feature: any) => feature.text === 'Continue with Google');
            const webClientId = googleFeature?.urlLink?.split('client_id=')[1]?.split('&')[0];
            console.log(listOfFeatures, "-0-0-0-0-0")
            configureGoogleSignIn(config || { webClientId, offlineAccess: true });
            setLoading(true);
            const googleLoginResult: any = await login('google');
            const proxyResponse = await FeatureApis.getProxyAuthToken(googleFeature.state, googleLoginResult.idToken)
            onLoginSuccess && onLoginSuccess(proxyResponse);
        } catch (error: any) {
            console.error('Google login failed:', error);
            onLoginFailure && onLoginFailure(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{
            gap:10
        }}>
            <TouchableOpacity
                style={[styles.button, buttonStyle, disabled && styles.disabled]}
                onPress={handleLogin}
                disabled={disabled || loading}
            >
                {loading ? (
                    <ActivityIndicator color={loadingColor} />
                ) : (
                    <View style={styles.buttonContent}>
                        <Image source={{ uri: GOOGLE_LOGO }} style={styles.logo} />
                        <Text style={[styles.text, textStyle]}>{buttonText}</Text>
                    </View>

                )}
            </TouchableOpacity>
            <AppleLoginButton
                onLoginSuccess={(data) => console.log("[ APPLE LOGIN RESPONSE ]",data)}
                onLoginFailure={(data) => console.log("[ ERROR IN APPLE LOGIN ]", data)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 4,
        padding: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabled: {
        opacity: 0.7,
    },
    logo: {
        width: 24,
        height: 24,
        marginRight: 12,
    },
    text: {
        color: '#757575',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default GoogleLoginButton;
