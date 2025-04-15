import React, { useLayoutEffect, useRef, useState } from 'react';
import {
    View,
    ScrollView,
    Text,
    useWindowDimensions,
    TouchableOpacity,
    RefreshControl
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import RenderHTML from 'react-native-render-html';
import { useAppSelector } from '../hooks/hooks';
import { useGetPageHtmlQuery } from '../redux/services/apis/pagesApi';
import { RootStackParamList } from '../types/navigators/navigationTypes';
import { Menu, IconButton } from 'react-native-paper';
import { useGetAiFlowJsonQuery, useGetFlowsAndFoldersQuery } from '../redux/services/apis/flowApi';

type Props = NativeStackScreenProps<RootStackParamList, 'FlowPreview'>;

function FlowPreview({ route, navigation }: Props) {
    const { flowId } = route.params;
    const { currentOrgId } = useAppSelector((state) => ({
        currentOrgId: state.userInfo.currentOrgId,
    }));

    const { data: flowsAndFolders } = useGetFlowsAndFoldersQuery(currentOrgId);
    const { data: aiFlowJson, error, isLoading, isFetching, refetch } = useGetAiFlowJsonQuery(flowId);
    const flowName = flowsAndFolders?.flows?.find((flow) => flow.id === flowId)?.title || 'No page selected';
    console.log(aiFlowJson, error)
    useLayoutEffect(() => {
        navigation.setOptions({
            title: flowName
        });
    }, [navigation]);

    return (
        <View style={{ flex: 1 }}>
            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, color: '#4682b4' }}>Loading...</Text>
                </View>
            ) : error ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Text style={{ fontSize: 18, color: '#ff0000' }}>
                        We encountered an issue. Please restart the app and try again.
                    </Text>
                </View>
            ) : (
                <ScrollView style={{ flex: 1, padding: 16 }} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}>
                    <Text>{JSON.stringify(aiFlowJson)}</Text>
                </ScrollView>
            )}
        </View>
    );
}

export default FlowPreview;
