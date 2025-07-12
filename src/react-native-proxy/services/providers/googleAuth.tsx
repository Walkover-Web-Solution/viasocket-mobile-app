import {
    GoogleSignin,
    type SignInResponse,
} from '@react-native-google-signin/google-signin';

/**
 * Configure Google Sign-In
 * @param {object} config - Google Sign-In configuration
 */
export const configureGoogleSignIn = (config: any) => {
    console.log(config)
    GoogleSignin.configure(config);
};

/**
 * Perform Google login and get authorization code
 * @param {object} options - Options for Google login
 * @returns {Promise<object>} - Google authentication data with auth code
 */
export const googleLogin = async () => {
    try {
        await GoogleSignin.hasPlayServices();
        // This will prompt for consent and return auth code
        const signInResponse: SignInResponse = await GoogleSignin.signIn();
        const { data } = signInResponse;
        console.log("data recieved from google", data);
        return data
    } catch (error: any) {
        console.error('Google Sign In Error:', error);
        throw new Error('Google authentication failed: ' + error.message);
    }
};

/**
 * Sign out from Google
 */
export const googleSignOut = async () => {
    try {
        await GoogleSignin.signOut();
    } catch (error) {
        console.error('Google Sign Out Error:', error);
        throw error;
    }
};
