import React, { useCallback } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, RefreshControl, FlatList } from 'react-native';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { setUserInfo } from '../redux/features/userInfo/userInfoSlice';
import { useNavigation } from '@react-navigation/native';
import { useGetFlowsAndFoldersQuery } from '../redux/services/apis/flowApi';
import Icon from 'react-native-vector-icons/MaterialIcons';

function AllFoldersAndFlows() {
    const { currentOrgData, currentOrgId } = useAppSelector((state) => ({
        currentOrgId: state.userInfo.currentOrgId,
        currentOrgData: state.userInfo.currentOrgData,
    }));
    const dispatch = useAppDispatch();
    const navigation = useNavigation();
    const { data, error, isLoading, isFetching, refetch } = useGetFlowsAndFoldersQuery(currentOrgId);

    const handleSwitchOrganization = useCallback(() => {
        dispatch(setUserInfo({ currentOrgId: null }));
    }, [dispatch]);

    const handleNavigateToFlowList = useCallback(
        (projectId: string) => {
            if (projectId) {
                navigation.navigate('FlowList', { projectId });
            }
        },
        [navigation]
    );

    const handleNavigateToFlowPreview = useCallback(
        (flowId: string) => {
            if (flowId) {
                navigation.navigate('FlowPreview', { flowId });
            }
        },
        [navigation]
    );

    const rootLevelFlows = data?.flows?.filter((flow) => flow.project_id === `proj${currentOrgId}`);

    const renderLoadingIndicator = () => (
        <View style={styles.centeredContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
        </View>
    );

    const renderErrorMessage = () => (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
                We encountered an issue. Please restart the app and try again.
            </Text>
        </View>
    );

    const renderOrganizationHeader = () => (
        <View style={styles.orgHeader}>
            <TouchableOpacity onPress={handleSwitchOrganization} style={styles.orgButton}>
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

    const renderFlowAndFolderCollections = () => (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}>
            {renderOrganizationHeader()}
            <View style={{ padding: 16 }}>
                <Text style={styles.sectionHeading}>Flows</Text>
                <FlatList
                    data={rootLevelFlows}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => handleNavigateToFlowPreview(item.id)}>
                            <Text style={styles.collectionTitle}>{item.title || 'Untitled Flow'}</Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No flows found.</Text>}
                />

                <Text style={styles.sectionHeading}>Folders</Text>
                <FlatList
                    data={data?.projects}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => handleNavigateToFlowList(item.id)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name="folder" size={20} color="#000" style={{ marginRight: 8 }} />
                                <Text style={styles.collectionTitle}>{item.title || 'Untitled Flow'}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No folders found.</Text>}
                />
            </View>
        </ScrollView>
    );


    return (
        <View style={{ flex: 1 }}>
            {isLoading ? renderLoadingIndicator() : error ? renderErrorMessage() : renderFlowAndFolderCollections()}
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
    sectionHeading: {
        fontSize: 18,
        fontWeight: '600',
        color: '#222',
        marginBottom: 10,
        marginTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 4,
    },
    emptyText: {
        fontSize: 14,
        color: '#888',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20,
    },

});

export default AllFoldersAndFlows;
