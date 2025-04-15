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
import { useGetAllCollectionsQuery } from '../redux/services/apis/collectionsApi';
import { RootStackParamList } from '../types/navigators/navigationTypes';
import { Menu, IconButton } from 'react-native-paper';

type Props = NativeStackScreenProps<RootStackParamList, 'PageDetail'>;

function PageHtmlRenderer({ route, navigation }: Props) {
    const { pageId } = route.params;
    const { currentOrgId } = useAppSelector((state) => ({
        currentOrgId: state.userInfo.currentOrgId,
    }));

    const { data: pageHtmlData, error, isLoading, isFetching, refetch } = useGetPageHtmlQuery(pageId);
    const { data: pageData } = useGetAllCollectionsQuery(currentOrgId);
    const { width } = useWindowDimensions();
    const pageName = pageData?.pagesJson?.[pageId]?.name || 'No page selected';
    const subPages: string[] = pageData?.steps?.[pageId] || [];

    useLayoutEffect(() => {
        navigation.setOptions({
            title: pageName
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
                    <RenderHTML
                        contentWidth={width}
                        source={{ html: pageHtmlData?.html || '' }}
                    />
                    {subPages.length > 0 && (
                        <View style={{ marginTop: 20, marginBottom: 100 }}>
                            <Text style={{ fontSize: 20, color: '#333', fontWeight: 'bold', marginBottom: 8 }}>Sub Pages :</Text>
                            <View style={{ paddingLeft: 16 }}>
                                {subPages.map((subPageId: string, index: number) => (
                                    <Text
                                        key={subPageId}
                                        style={{ fontSize: 16, color: '#0000ff', marginBottom: 4, marginRight: 8, textDecorationLine: 'underline' }}
                                        onPress={() => navigation.push('PageDetail', { pageId: subPageId })}
                                    >
                                        {index + 1}. {pageData?.pagesJson?.[subPageId]?.name || 'Untitled'}
                                        {index < subPages.length - 1 ? ',' : ''}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

export default PageHtmlRenderer;
