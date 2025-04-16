import React from 'react';
import { FlatList, RefreshControl, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useGetUserQuery, useSwitchOrgMutation } from '../redux/services/apis/userApi';
import { useAppDispatch } from '../hooks/hooks';
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';

export default function AllWorkspace() {
    const dispatch = useAppDispatch();
    const { data, isLoading, isFetching, refetch } = useGetUserQuery();
    const [switchOrg] = useSwitchOrgMutation();

    const handleOrgSelect = (org: any) => {
        dispatch(setUserInfo({ currentOrgId: org?.id, currentOrgData: org }));
        switchOrg(org?.id);
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <FlatList
            style={styles.list} // Added style to ensure scrolling works
            contentContainerStyle={[styles.container, { paddingBottom: 80 }]} // Added bottom padding for breathing space
            data={data?.orgs || []}
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
            renderItem={({ item }) => (
                <TouchableOpacity style={styles.card} onPress={() => handleOrgSelect(item)}>
                    <Text style={styles.orgName}>{item.name}</Text>
                </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No workspaces found.</Text>}
        />
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    list: {
        flex: 1, // Ensures the FlatList takes up the full available space for scrolling
    },
    container: {
        padding: 16,
        backgroundColor: '#f5f5f5'
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
    orgName: {
        fontSize: 18,
        color: '#333'
    },
    orgId: {
        marginTop: 4,
        fontSize: 12,
        color: '#666'
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
        marginTop: 20,
    },
});