import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useSms } from '../hooks/useSms';

const SimpleSmsExample = () => {
    const {
        messages,
        loading,
        error,
        hasPermission,
        requestPermissions,
        getUnread,
        getTransactions,
        deleteSms,
    } = useSms();

    useEffect(() => {
        // Request permissions on mount
        requestPermissions();
    }, []);

    const handleGetUnread = async () => {
        try {
            await getUnread(20);
            Alert.alert('Success', `Retrieved ${messages.length} unread messages`);
        } catch (err) {
            Alert.alert('Error', err.message);
        }
    };

    const handleGetTransactions = async () => {
        try {
            const txns = await getTransactions(30);
            Alert.alert('Success', `Found ${txns.length} transaction messages`);
        } catch (err) {
            Alert.alert('Error', err.message);
        }
    };

    const handleDelete = async (messageId) => {
        Alert.alert(
            'Confirm Delete',
            'Delete this message?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteSms(messageId);
                            Alert.alert('Success', 'Message deleted');
                        } catch (err) {
                            Alert.alert('Error', err.message);
                        }
                    },
                },
            ]
        );
    };

    const renderMessage = ({ item }) => (
        <View style={styles.messageCard}>
            <View style={styles.messageHeader}>
                <Text style={styles.sender}>{item.address}</Text>
                <Text style={styles.date}>
                    {new Date(item.date).toLocaleDateString()}
                </Text>
            </View>
            <Text style={styles.body} numberOfLines={2}>
                {item.body}
            </Text>
            <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item._id)}
            >
                <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
        </View>
    );

    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>SMS Permissions Required</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermissions}>
                    <Text style={styles.buttonText}>Grant Permissions</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>SMS Messages</Text>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleGetUnread}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Loading...' : 'Get Unread'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleGetTransactions}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Loading...' : 'Get Transactions'}
                    </Text>
                </TouchableOpacity>
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <FlatList
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item._id.toString()}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        No messages. Tap a button above to load messages.
                    </Text>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    button: {
        flex: 1,
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    secondaryButton: {
        backgroundColor: '#34C759',
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    errorContainer: {
        backgroundColor: '#FFE5E5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FF3B30',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 14,
    },
    listContainer: {
        paddingBottom: 16,
    },
    messageCard: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    sender: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
    },
    date: {
        fontSize: 12,
        color: '#999',
    },
    body: {
        fontSize: 14,
        color: '#333',
        marginBottom: 8,
    },
    deleteBtn: {
        alignSelf: 'flex-end',
        backgroundColor: '#FF3B30',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    deleteBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 14,
        marginTop: 32,
    },
});

export default SimpleSmsExample;
