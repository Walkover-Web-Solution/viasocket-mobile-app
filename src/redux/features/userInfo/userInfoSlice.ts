import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { $UserInfoReducerType, User } from '../../../types/redux/userInfoReducerType';


const initialState: $UserInfoReducerType = {
    email: '',
    id: '',
    name: '',
    proxyAuthToken: '',
    currentOrgId: '',
    currentOrgData: null,
    currentPageId: "",
    currentCollectionId: "",
    orgs: [],
    chatbotToken: ''
};

const userSlice = createSlice({
    name: 'userInfo',
    initialState,
    reducers: {
        setUserInfo: (state, action: PayloadAction<Partial<$UserInfoReducerType>>) => {
            return {
                ...state,
                ...action.payload
            };
        },
        clearUserInfo: () => initialState,
    },
});

export const { setUserInfo, clearUserInfo } = userSlice.actions;
export default userSlice.reducer;
