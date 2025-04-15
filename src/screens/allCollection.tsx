import React, { useCallback } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, RefreshControl } from 'react-native';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { useGetAllCollectionsQuery } from '../redux/services/apis/collectionsApi';
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { useNavigation } from '@react-navigation/native';

function AllCollections() {
    const { currentOrgData, currentOrgId } = useAppSelector((state) => ({
        currentOrgId: state.userInfo.currentOrgId,
        currentOrgData: state.userInfo.currentOrgData,
    }));
    const dispatch = useAppDispatch();
    const navigation = useNavigation();
    const { data, error, isLoading, isFetching, refetch } = useGetAllCollectionsQuery(currentOrgId);

    const switchOrg = useCallback(() => {
        dispatch(setUserInfo({ currentOrgId: null }));
    }, [dispatch]);

    const navigateToAllPages = useCallback(
        (collectionId: string) => {
            if (collectionId) {
                navigation.navigate('PageList', { collectionId });
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

    const renderOrgHeader = () => (
        <View style={styles.orgHeader}>
            <TouchableOpacity onPress={switchOrg} style={styles.orgButton}>
                <Text style={styles.orgButtonText}>
                    {currentOrgData?.name
                        ?.split(' ')
                        .map((word: string) => word[0])
                        .join('')
                        .toUpperCase()}
                </Text>
            </TouchableOpacity>
            <Text style={styles.orgNameText}>{currentOrgData?.name}</Text>
        </View>
    );

    const renderCollections = () => (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}>
            {renderOrgHeader()}
            <View style={{ padding: 16 }}>
                {data?.steps?.root?.map((collectionId: string) => {
                    const collection = data?.collectionJson[collectionId];
                    return (
                        <TouchableOpacity
                            key={collectionId}
                            style={styles.card}
                            onPress={() => navigateToAllPages(collectionId)}
                        >
                            <Text style={styles.collectionTitle}>{collection.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );

    return (
        <View style={{ flex: 1 }}>
            {isLoading ? renderLoading() : error ? renderError() : renderCollections()}
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

export default AllCollections;
