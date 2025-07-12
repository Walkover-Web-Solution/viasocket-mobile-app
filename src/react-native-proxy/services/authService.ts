// import { storeToken } from './tokenStorage';
import { googleLogin } from './providers/googleAuth';

/**
 * Login with the specified provider
 * @param {string} provider - Authentication provider (google, linkedin, email, otp)
 * @param {object} options - Provider-specific options
 * @returns {Promise<object>} - Authentication result
 */
export const login = async (provider: any) => {
    let authData;

    // Handle different auth providers
    switch (provider) {
        case 'google':
            authData = await googleLogin();
            break;
        default:
            throw new Error(`Unsupported authentication provider: ${provider}`);
    }
    return authData

    // if (!response.ok) {
    //     const error = await response.json();
    //     throw new Error(error.message || 'Authentication failed');
    // }

    // const authResult = await response.json();

    // // Store the token securely
    // await storeToken(authResult.token);

    // return authResult;
};
