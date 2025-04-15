import React from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { StyleSheet } from 'react-native';
import { useGetUserQuery } from '../redux/services/apis/userApi';
import { useAppDispatch } from '../hooks/hooks';
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { TouchableOpacity, Text } from 'react-native';
import { ActivityIndicator } from 'react-native';

export default function AllWorkspace() {

    const dispatch = useAppDispatch();
    const { data, isLoading, isFetching, refetch } = useGetUserQuery();

    const handleOrgSelect = (org: any) => {
        dispatch(setUserInfo({ currentOrgId: org?.id, currentOrgData: org }));
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}>
                {data?.orgs?.map((org) => (
                    <TouchableOpacity key={org.id} style={styles.card} onPress={() => handleOrgSelect(org)}>
                        <Text style={styles.orgName}>{org.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    )
}


const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    container: {
        flex: 1,
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
    }
});