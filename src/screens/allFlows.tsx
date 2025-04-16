import React, { useCallback, useLayoutEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, RefreshControl, FlatList } from 'react-native';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigators/navigationTypes';
import { useGetFlowsAndFoldersQuery } from '../redux/services/apis/flowApi';

type FlowListProps = NativeStackScreenProps<RootStackParamList, 'FlowList'>;

function FlowList({ route, navigation }: FlowListProps) {
    const { projectId } = route.params;
    const currentOrgId = useAppSelector(state => state.userInfo.currentOrgId);
    const { data, error, isLoading, isFetching, refetch } = useGetFlowsAndFoldersQuery(currentOrgId);
    const projectFlows = data?.flows?.filter(flow => flow.project_id === projectId);
    const projectName = data?.projects?.find(project => project.id === projectId)?.title || 'No project selected';
    const navigate = useNavigation();
    useLayoutEffect(() => {
        navigation.setOptions({ title: projectName });
    }, [navigation, projectName]);

    const handleFlowPress = useCallback(
        (flowId: string) => {
            if (flowId) {
                navigate.navigate('FlowPreview', { flowId });
            }
        },
        [navigate]
    );

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

    const renderFlowList = () => (
        <FlatList
            data={projectFlows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.flowContainer}
            refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
            renderItem={({ item }) => (
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => handleFlowPress(item.id)}
                >
                    <Text style={styles.flowTitle}>{item.title || 'Untitled'}</Text>
                    {item.description ? (
                        <Text style={styles.flowDescription}>{item.description}</Text>
                    ) : null}
                </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No flows available.</Text>}
        />
    );

    return (
        <View style={{ flex: 1 }}>
            {isLoading ? renderLoadingIndicator() : error ? renderErrorMessage() : renderFlowList()}
        </View>
    );
}

const styles = StyleSheet.create({
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    flowDescription: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
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
    flowContainer: {
        padding: 16,
        paddingBottom: 80,
    },
    flowTitle: {
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
    emptyText: {
        fontSize: 14,
        color: '#888',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 20,
    },

});

export default FlowList;
