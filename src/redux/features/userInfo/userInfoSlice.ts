import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { $UserInfoReducerType, User } from '../../../types/redux/userInfoReducerType';


const initialState: $UserInfoReducerType = {
    email: '',
    id: '',
    name: '',
    proxyAuthToken: '',
    currentOrgId: '',
    currentOrgData: {},
    currentPageId: "",
    currentCollectionId: "",
    orgs: []
};

const userSlice = createSlice({
    name: 'userInfo',
    initialState,
    reducers: {
        setUserInfo: (state, action: PayloadAction<User>) => {
            return {
                ...state,
                ...action.payload
            };
        },
        clearUserInfo: () => ({}),
    },
});

export const { setUserInfo, clearUserInfo } = userSlice.actions;
export default userSlice.reducer;
