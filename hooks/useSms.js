import { useState, useEffect, useCallback } from 'react';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import SmsService from '../utils/smsService';

/**
 * Custom hook for SMS operations
 * Provides easy-to-use SMS functionality with permission handling
 */
export const useSms = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [deliveryStatus, setDeliveryStatus] = useState(null);

    /**
     * Request SMS permissions
     */
    const requestPermissions = useCallback(async () => {
        if (Platform.OS !== 'android') {
            setError('SMS features are only available on Android');
            return false;
        }

        try {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.READ_SMS,
                PermissionsAndroid.PERMISSIONS.SEND_SMS,
                PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
                PermissionsAndroid.PERMISSIONS.WRITE_SMS,
            ]);

            const allGranted = Object.values(granted).every(
                (permission) => permission === PermissionsAndroid.RESULTS.GRANTED
            );

            setHasPermission(allGranted);

            if (!allGranted) {
                setError('SMS permissions not granted');
            }

            return allGranted;
        } catch (err) {
            console.error('Permission request error:', err);
            setError('Failed to request permissions');
            return false;
        }
    }, []);

    /**
     * Check if permissions are already granted
     */
    const checkPermissions = useCallback(async () => {
        if (Platform.OS !== 'android') {
            return false;
        }

        try {
            const readSms = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.READ_SMS
            );
            const sendSms = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.SEND_SMS
            );

            const granted = readSms && sendSms;
            setHasPermission(granted);
            return granted;
        } catch (err) {
            console.error('Permission check error:', err);
            return false;
        }
    }, []);

    /**
     * Setup delivery listener on mount
     */
    useEffect(() => {
        SmsService.setupDeliveryListener((status) => {
            setDeliveryStatus(status);
        });

        checkPermissions();

        return () => {
            SmsService.removeDeliveryListener();
        };
    }, [checkPermissions]);

    /**
     * List SMS messages
     */
    const listSms = useCallback(async (filter = {}) => {
        setLoading(true);
        setError(null);

        try {
            const permitted = hasPermission || await requestPermissions();
            if (!permitted) {
                throw new Error('SMS permissions not granted');
            }

            const sms = await SmsService.listSms(filter);
            setMessages(sms);
            return sms;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [hasPermission, requestPermissions]);

    /**
     * Get unread messages
     */
    const getUnread = useCallback(async (maxCount = 50) => {
        setLoading(true);
        setError(null);

        try {
            const permitted = hasPermission || await requestPermissions();
            if (!permitted) {
                throw new Error('SMS permissions not granted');
            }

            const sms = await SmsService.getUnreadSms(maxCount);
            setMessages(sms);
            return sms;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [hasPermission, requestPermissions]);

    /**
     * Get transaction SMS
     */
    const getTransactions = useCallback(async (daysBack = 30) => {
        setLoading(true);
        setError(null);

        try {
            const permitted = hasPermission || await requestPermissions();
            if (!permitted) {
                throw new Error('SMS permissions not granted');
            }

            const sms = await SmsService.getTransactionSms(daysBack);
            setMessages(sms);
            return sms;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [hasPermission, requestPermissions]);

    /**
     * Search messages
     */
    const searchMessages = useCallback(async (query, maxCount = 50) => {
        setLoading(true);
        setError(null);

        try {
            const permitted = hasPermission || await requestPermissions();
            if (!permitted) {
                throw new Error('SMS permissions not granted');
            }

            const sms = await SmsService.searchSmsByContent(query, maxCount);
            setMessages(sms);
            return sms;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [hasPermission, requestPermissions]);

    /**
     * Get messages from sender
     */
    const getFromSender = useCallback(async (phoneNumber, maxCount = 50) => {
        setLoading(true);
        setError(null);

        try {
            const permitted = hasPermission || await requestPermissions();
            if (!permitted) {
                throw new Error('SMS permissions not granted');
            }

            const sms = await SmsService.getSmsFromSender(phoneNumber, maxCount);
            setMessages(sms);
            return sms;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [hasPermission, requestPermissions]);

    /**
     * Send SMS
     */
    const sendSms = useCallback(async (phoneNumber, message) => {
        setLoading(true);
        setError(null);

        try {
            const permitted = hasPermission || await requestPermissions();
            if (!permitted) {
                throw new Error('SMS permissions not granted');
            }

            const result = await SmsService.sendSms(phoneNumber, message);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [hasPermission, requestPermissions]);

    /**
     * Send bulk SMS
     */
    const sendBulkSms = useCallback(async (phoneNumbers, message) => {
        setLoading(true);
        setError(null);

        try {
            const permitted = hasPermission || await requestPermissions();
            if (!permitted) {
                throw new Error('SMS permissions not granted');
            }

            const result = await SmsService.sendBulkSms(phoneNumbers, message);
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [hasPermission, requestPermissions]);

    /**
     * Delete SMS
     */
    const deleteSms = useCallback(async (messageId) => {
        setLoading(true);
        setError(null);

        try {
            const permitted = hasPermission || await requestPermissions();
            if (!permitted) {
                throw new Error('SMS permissions not granted');
            }

            const result = await SmsService.deleteSms(messageId);

            // Remove from local state
            setMessages(prev => prev.filter(msg => msg._id !== messageId));

            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [hasPermission, requestPermissions]);

    /**
     * Get SMS statistics
     */
    const getStats = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const permitted = hasPermission || await requestPermissions();
            if (!permitted) {
                throw new Error('SMS permissions not granted');
            }

            const stats = await SmsService.getSmsStats();
            return stats;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [hasPermission, requestPermissions]);

    /**
     * Clear messages from state
     */
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    /**
     * Clear error
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        // State
        messages,
        loading,
        error,
        hasPermission,
        deliveryStatus,

        // Methods
        requestPermissions,
        checkPermissions,
        listSms,
        getUnread,
        getTransactions,
        searchMessages,
        getFromSender,
        sendSms,
        sendBulkSms,
        deleteSms,
        getStats,
        clearMessages,
        clearError,
    };
};

export default useSms;
