import React, { useCallback, useLayoutEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, RefreshControl } from 'react-native';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { useGetAllCollectionsQuery } from '../redux/services/apis/collectionsApi';
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigators/navigationTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'PageList'>;

function CollectionsList({ route, navigation }: Props) {
    const { collectionId } = route.params;
    const { currentOrgId } = useAppSelector((state) => ({
        currentOrgId: state.userInfo.currentOrgId,
    }));
    const dispatch = useAppDispatch();
    const { data, error, isLoading, isFetching, refetch } = useGetAllCollectionsQuery(currentOrgId);
    const collectionName = data?.collectionJson?.[collectionId]?.name || 'No page selected';

    useLayoutEffect(() => {
        navigation.setOptions({
            title: collectionName
        });
    }, [navigation]);

    const navigateToPageDetails = useCallback(
        (pageId: string) => {
            if (pageId) {
                navigation.navigate('PageDetail', { pageId });
            }
        },
        [dispatch, navigation]
    );

    const renderLoading = () => (
        <View style={styles.centeredContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
        </View>
    );

    const renderError = () => (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
                We encountered an issue. Please restart the app and try again.
            </Text>
        </View>
    );


    const renderAllPages = () => (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />} >
            <View style={{ padding: 16 }}>
                {data?.steps?.[collectionId]?.map((pageId: string) => {
                    const collection = data?.pagesJson[pageId];
                    return (
                        <TouchableOpacity
                            key={pageId}
                            style={styles.card}
                            onPress={() => navigateToPageDetails(pageId)}
                        >
                            <Text style={styles.collectionTitle}>{collection?.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );

    return (
        <View style={{ flex: 1 }}>
            {isLoading ? renderLoading() : error ? renderError() : renderAllPages()}
        </View>
    );
}

const styles = StyleSheet.create({
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        color: '#555',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#d9534f',
    },
    orgHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 0,
    },
    orgButton: {
        width: 37,
        height: 37,
        borderRadius: 10,
        backgroundColor: '#007acc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    orgButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    orgNameText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    collectionTitle: {
        fontSize: 16,
        color: '#333',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
});

export default CollectionsList;
