import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Dimensions, Keyboard } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useGetFlowsAndFoldersQuery } from '../redux/services/apis/flowApi';
import { useAppSelector } from '../hooks/hooks';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const SearchOverlay = ({ onClose }: { onClose: () => void }) => {
    const [query, setQuery] = useState('');
    const { currentOrgId } = useAppSelector((state) => ({
        currentOrgId: state.userInfo.currentOrgId,
    }));
    const { data, error, isLoading } = useGetFlowsAndFoldersQuery(currentOrgId);

    const navigation = useNavigation();

    const filteredData = data?.flows
        .filter((item) =>
            item?.title?.toLowerCase().includes(query?.toLowerCase())
        );


    const renderItem = ({ item }: { item: { title: string, id: string, project_id: string } | undefined }) => {
        const isRootLevelFlow = item?.project_id === `proj${currentOrgId}`
        let projectName = null
        if (!isRootLevelFlow) {
            projectName = data?.projects?.find((project) => project?.id === item?.project_id)?.title
        }
        const handlePress = () => {
            if (item?.id) {
                navigation.navigate('FlowPreview', { flowId: item.id });
                onClose();
            }
        };

        return (
            <TouchableOpacity style={styles.card} onPress={handlePress}>
                <Text style={styles.cardTitle}>{item?.title || 'Untitled Flow'}</Text>
                {isRootLevelFlow ? null :
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="folder" size={18} color="#777" style={{ marginRight: 4 }} />
                        <Text style={styles.cardSubtitle}>{projectName}</Text>
                    </View>
                }
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.overlay}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose}>
                    <MaterialIcons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Search Flows"
                    placeholderTextColor="#999"
                    value={query}
                    onChangeText={setQuery}
                    autoFocus
                />
            </View>

            {isLoading ? (
                <View style={styles.centeredContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        We encountered an issue. Please restart the app and try again.
                    </Text>
                </View>
            ) : filteredData.length === 0 ? (
                <View style={styles.centeredContainer}>
                    <Text style={styles.errorText}>No Pages found</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    onScrollBeginDrag={Keyboard.dismiss}
                />
            )}
        </View>
    );
};

export default SearchOverlay;

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        backgroundColor: '#fff',
        zIndex: 10,
        paddingTop: 20,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    input: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginLeft: 8,
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
        borderWidth: 0.5,
        borderColor: '#ccc',
    },
    cardTitle: {
        fontSize: 16,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#777',
    },
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
});
