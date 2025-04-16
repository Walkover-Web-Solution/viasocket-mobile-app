import { combineReducers } from 'redux';
import persistReducer from 'redux-persist/es/persistReducer';
import { mmkvStorage } from '../utils/storage/mmkv';
import userInfoReducer from '../redux/features/userInfo/userInfoSlice'
import { userApi } from './services/apis/userApi';
import { FlowApi } from './services/apis/flowApi';
import { pagesApi } from './services/apis/pagesApi';
import { chatbotApi } from './services/apis/chatbotApis';
const persistConfig = {
    key: 'root',
    storage: mmkvStorage,
    whitelist: ['userInfo', 'userApi', 'FlowApi']
};

const rootReducer = combineReducers({
    userInfo: userInfoReducer,
    [userApi.reducerPath]: userApi.reducer,
    [FlowApi.reducerPath]: FlowApi.reducer,
    [pagesApi.reducerPath]: pagesApi.reducer,
    [chatbotApi.reducerPath]: chatbotApi.reducer
});

const persistedReducer = persistReducer(persistConfig, rootReducer);
export default persistedReducer;
