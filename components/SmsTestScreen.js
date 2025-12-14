/**
 * SMS Service Test Screen
 * 
 * A simple screen to test SMS service functionality.
 * Add this to your navigation or import directly for testing.
 * 
 * Usage in your app:
 *   import SmsTestScreen from '../components/SmsTestScreen';
 *   // Then use <SmsTestScreen /> in your navigation or render directly
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Platform,
    TextInput,
} from 'react-native';

import {
    testNativeModuleLinked,
    testSmsPermissions,
    testRequestPermissions,
    testSmsParsing,
    testSmsListener,
    runAllSmsTests,
    isSmsServiceWorking,
} from '../utils/smsServiceTest';

import {
    testSmsFlow,
    simulateSms,
    testApiConnection,
    quickTest,
} from '../utils/testSmsFlow';

const TestCard = ({ result }) => {
    if (!result) return null;

    return (
        <View style={[styles.testCard, result.passed ? styles.cardPass : styles.cardFail]}>
            <View style={styles.cardHeader}>
                <Text style={styles.testIcon}>{result.passed ? '✅' : '❌'}</Text>
                <Text style={styles.testName}>{result.name}</Text>
            </View>
            <Text style={styles.testMessage}>{result.message}</Text>
            {result.details && (
                <Text style={styles.testDetails}>
                    {JSON.stringify(result.details, null, 2)}
                </Text>
            )}
        </View>
    );
};

const SmsTestScreen = () => {
    const [loading, setLoading] = useState(false);
    const [testResults, setTestResults] = useState([]);
    const [quickCheck, setQuickCheck] = useState(null);
    const [customSms, setCustomSms] = useState('Rs.500 debited from A/c XX1234 at TESTSTORE. Ref: TEST123');
    const [flowResult, setFlowResult] = useState(null);

    const runQuickCheck = useCallback(async () => {
        setLoading(true);
        try {
            const result = await isSmsServiceWorking();
            setQuickCheck(result);

            if (result.working) {
                Alert.alert('✅ SMS Service Working', result.reason);
            } else {
                Alert.alert('❌ SMS Service Not Working', result.reason);
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const runTest = useCallback(async (testFn, testName) => {
        setLoading(true);
        try {
            const result = testFn.constructor.name === 'AsyncFunction'
                ? await testFn()
                : testFn();

            setTestResults(prev => [...prev, result]);
        } catch (error) {
            Alert.alert(`${testName} Failed`, error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const runFullSuite = useCallback(async () => {
        setLoading(true);
        setTestResults([]);
        try {
            const results = await runAllSmsTests({
                skipListenerTest: false,
                listenerTimeout: 10000
            });
            setTestResults(results.tests);

            const { passed, failed, total } = results.summary;
            Alert.alert(
                'Test Results',
                `${passed}/${total} tests passed\n${failed > 0 ? `${failed} tests failed` : 'All tests passed! 🎉'}`
            );
        } catch (error) {
            Alert.alert('Test Error', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Flow Test Functions
    const runFlowTest = useCallback(async () => {
        setLoading(true);
        setFlowResult(null);
        try {
            console.log('🧪 Running full SMS → Transaction flow test...');
            const result = await testSmsFlow();
            setFlowResult(result);

            if (result.flowResult?.success) {
                Alert.alert(
                    '🎉 Flow Test Passed!',
                    'SMS was parsed and transaction was created in the API successfully!'
                );
            } else {
                Alert.alert(
                    '❌ Flow Test Failed',
                    result.flowResult?.error || 'Check console for details'
                );
            }
        } catch (error) {
            Alert.alert('Flow Test Error', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const runSimulateSms = useCallback(async () => {
        if (!customSms.trim()) {
            Alert.alert('Error', 'Please enter an SMS message to simulate');
            return;
        }

        setLoading(true);
        setFlowResult(null);
        try {
            console.log('📱 Simulating SMS:', customSms);
            const result = await simulateSms(customSms);
            setFlowResult({ flowResult: result });

            if (result.success) {
                Alert.alert(
                    '🎉 Transaction Created!',
                    `Amount: ₹${result.transaction?.amount}\nType: ${result.transaction?.type}\nVendor: ${result.transaction?.vendor}`
                );
            } else {
                Alert.alert('❌ Failed', result.error);
            }
        } catch (error) {
            Alert.alert('Simulate Error', error.message);
        } finally {
            setLoading(false);
        }
    }, [customSms]);

    const runApiTest = useCallback(async () => {
        setLoading(true);
        try {
            const result = await testApiConnection();
            if (result.success) {
                Alert.alert('✅ API Connected', 'Successfully connected to the transactions API');
            } else {
                Alert.alert('❌ API Failed', result.error);
            }
        } catch (error) {
            Alert.alert('API Test Error', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const clearResults = useCallback(() => {
        setTestResults([]);
        setQuickCheck(null);
        setFlowResult(null);
    }, []);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>📱 SMS Service Test</Text>
                <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>
            </View>

            {/* Quick Check Result */}
            {quickCheck && (
                <View style={[styles.quickCheckCard, quickCheck.working ? styles.cardPass : styles.cardFail]}>
                    <Text style={styles.quickCheckTitle}>
                        {quickCheck.working ? '✅ Service Working' : '❌ Service Not Working'}
                    </Text>
                    <Text style={styles.quickCheckReason}>{quickCheck.reason}</Text>
                </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.primaryButton]}
                    onPress={runQuickCheck}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>Quick Check</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.successButton]}
                    onPress={runFullSuite}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>Run All Tests</Text>
                </TouchableOpacity>
            </View>

            {/* Individual Test Buttons */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Individual Tests</Text>

                <TouchableOpacity
                    style={[styles.button, styles.outlineButton]}
                    onPress={() => runTest(testNativeModuleLinked, 'Native Module')}
                    disabled={loading}
                >
                    <Text style={styles.outlineButtonText}>Test Native Module</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.outlineButton]}
                    onPress={() => runTest(testSmsPermissions, 'Permissions')}
                    disabled={loading}
                >
                    <Text style={styles.outlineButtonText}>Check Permissions</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.outlineButton]}
                    onPress={() => runTest(testRequestPermissions, 'Request Permissions')}
                    disabled={loading}
                >
                    <Text style={styles.outlineButtonText}>Request Permissions</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.outlineButton]}
                    onPress={() => runTest(testSmsParsing, 'Parsing')}
                    disabled={loading}
                >
                    <Text style={styles.outlineButtonText}>Test SMS Parsing</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.outlineButton]}
                    onPress={() => runTest(() => testSmsListener(10000), 'Listener')}
                    disabled={loading}
                >
                    <Text style={styles.outlineButtonText}>Test SMS Listener (10s)</Text>
                </TouchableOpacity>
            </View>

            {/* Flow Test Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔄 SMS → Transaction Flow Test</Text>
                <Text style={styles.sectionSubtitle}>
                    Test the complete flow: Parse SMS → Create Transaction via API
                </Text>

                <TouchableOpacity
                    style={[styles.button, styles.flowButton]}
                    onPress={runApiTest}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>🌐 Test API Connection</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.flowButton]}
                    onPress={runFlowTest}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>🧪 Run Full Flow Test</Text>
                </TouchableOpacity>

                <Text style={[styles.inputLabel, { marginTop: 15 }]}>Custom SMS to Simulate:</Text>
                <TextInput
                    style={styles.textInput}
                    value={customSms}
                    onChangeText={setCustomSms}
                    placeholder="Enter SMS text to simulate..."
                    placeholderTextColor="#666"
                    multiline
                    numberOfLines={3}
                />

                <TouchableOpacity
                    style={[styles.button, styles.simulateButton]}
                    onPress={runSimulateSms}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>📱 Simulate This SMS → Create Transaction</Text>
                </TouchableOpacity>

                {/* Flow Result */}
                {flowResult && (
                    <View style={[styles.flowResultCard, flowResult.flowResult?.success ? styles.cardPass : styles.cardFail]}>
                        <Text style={styles.flowResultTitle}>
                            {flowResult.flowResult?.success ? '✅ Flow Successful!' : '❌ Flow Failed'}
                        </Text>
                        {flowResult.flowResult?.transaction && (
                            <View style={styles.flowResultDetails}>
                                <Text style={styles.flowResultText}>Amount: ₹{flowResult.flowResult.transaction.amount}</Text>
                                <Text style={styles.flowResultText}>Type: {flowResult.flowResult.transaction.type}</Text>
                                <Text style={styles.flowResultText}>Vendor: {flowResult.flowResult.transaction.vendor}</Text>
                            </View>
                        )}
                        {flowResult.flowResult?.error && (
                            <Text style={styles.flowResultError}>Error: {flowResult.flowResult.error}</Text>
                        )}
                    </View>
                )}
            </View>

            {/* Loading Indicator */}
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Running tests...</Text>
                </View>
            )}

            {/* Test Results */}
            {testResults.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.resultsHeader}>
                        <Text style={styles.sectionTitle}>Test Results</Text>
                        <TouchableOpacity onPress={clearResults}>
                            <Text style={styles.clearButton}>Clear</Text>
                        </TouchableOpacity>
                    </View>

                    {testResults.map((result, index) => (
                        <TestCard key={index} result={result} />
                    ))}
                </View>
            )}

            {/* Info Section */}
            <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>ℹ️ Troubleshooting Tips</Text>
                <Text style={styles.infoText}>
                    • If "Native Module" test fails, rebuild with: npx expo run:android{'\n'}
                    • If "Permissions" test fails, grant SMS permissions in device settings{'\n'}
                    • The "SMS Listener" test waits for an incoming SMS to verify functionality{'\n'}
                    • SMS reading only works on Android devices
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f23',
    },
    header: {
        padding: 20,
        paddingTop: 50,
        backgroundColor: '#1a1a2e',
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a4e',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    subtitle: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 5,
    },
    quickCheckCard: {
        margin: 15,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
    },
    quickCheckTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    quickCheckReason: {
        fontSize: 14,
        color: '#d1d5db',
        marginTop: 5,
    },
    buttonContainer: {
        flexDirection: 'row',
        padding: 15,
        gap: 10,
    },
    button: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        backgroundColor: '#6366f1',
    },
    successButton: {
        backgroundColor: '#10b981',
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#6366f1',
        marginVertical: 5,
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
    outlineButtonText: {
        color: '#6366f1',
        fontWeight: '600',
        fontSize: 14,
    },
    section: {
        padding: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 10,
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    clearButton: {
        color: '#ef4444',
        fontWeight: '500',
    },
    loadingContainer: {
        padding: 30,
        alignItems: 'center',
    },
    loadingText: {
        color: '#9ca3af',
        marginTop: 10,
    },
    testCard: {
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
    },
    cardPass: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: '#10b981',
    },
    cardFail: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: '#ef4444',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    testIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    testName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    testMessage: {
        fontSize: 14,
        color: '#d1d5db',
        marginTop: 5,
    },
    testDetails: {
        fontSize: 12,
        color: '#9ca3af',
        marginTop: 10,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 10,
        borderRadius: 8,
    },
    infoSection: {
        margin: 15,
        padding: 15,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#6366f1',
        marginBottom: 50,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 10,
    },
    infoText: {
        fontSize: 13,
        color: '#d1d5db',
        lineHeight: 22,
    },
    // Flow Test Styles
    sectionSubtitle: {
        fontSize: 13,
        color: '#9ca3af',
        marginBottom: 15,
    },
    flowButton: {
        backgroundColor: '#8b5cf6',
        marginVertical: 5,
    },
    simulateButton: {
        backgroundColor: '#f59e0b',
        marginTop: 10,
    },
    inputLabel: {
        fontSize: 14,
        color: '#d1d5db',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#1f2937',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#374151',
        padding: 12,
        color: '#ffffff',
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    flowResultCard: {
        marginTop: 15,
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
    },
    flowResultTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 10,
    },
    flowResultDetails: {
        marginTop: 5,
    },
    flowResultText: {
        fontSize: 14,
        color: '#d1d5db',
        marginBottom: 3,
    },
    flowResultError: {
        fontSize: 14,
        color: '#ef4444',
        marginTop: 5,
    },
});

export default SmsTestScreen;
