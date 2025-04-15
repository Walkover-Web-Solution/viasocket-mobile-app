import { combineReducers } from 'redux';
import persistReducer from 'redux-persist/es/persistReducer';
import { mmkvStorage } from '../utils/storage/mmkv';
import userInfoReducer from '../redux/features/userInfo/userInfoSlice'
import { userApi } from './services/apis/userApi';
import { collectionsApi } from './services/apis/collectionsApi';
import { pagesApi } from './services/apis/pagesApi';

const persistConfig = {
    key: 'root',
    storage: mmkvStorage,
    whitelist: ['userInfo']
};

const rootReducer = combineReducers({
    userInfo: userInfoReducer,
    [userApi.reducerPath]: userApi.reducer,
    [collectionsApi.reducerPath]: collectionsApi.reducer,
    [pagesApi.reducerPath]: pagesApi.reducer
});

const persistedReducer = persistReducer(persistConfig, rootReducer);
export default persistedReducer;
