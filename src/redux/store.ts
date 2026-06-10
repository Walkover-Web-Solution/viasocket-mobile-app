// src/app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore } from 'redux-persist';
import { userApi } from './services/apis/userApi';
import persistedReducer from './rootReducers';
import { FlowApi } from './services/apis/flowApi';
import { pagesApi } from './services/apis/pagesApi';
import { chatbotApi } from './services/apis/chatbotApis';
import { ConnectionsApi } from './services/apis/connectionsApi';

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false, // ✅ prevents function warnings
        }).concat(
            userApi.middleware,
            FlowApi.middleware,
            pagesApi.middleware,
            chatbotApi.middleware,
            ConnectionsApi.middleware
        ),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
