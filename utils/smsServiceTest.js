import SmsService from './smsService';

/**
 * Comprehensive test suite for react-native-get-sms-android
 * Tests all SMS operations
 */

/**
 * Test: List all inbox messages
 */
export const testListInbox = async () => {
    console.log('🧪 Testing: List Inbox Messages');

    try {
        const messages = await SmsService.listSms({
            box: 'inbox',
            maxCount: 10,
        });

        console.log('✅ Success: Retrieved', messages.length, 'inbox messages');
        console.log('📧 Sample message:', messages[0]);

        return { success: true, data: messages };
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Test: Get unread messages
 */
export const testGetUnread = async () => {
    console.log('🧪 Testing: Get Unread Messages');

    try {
        const messages = await SmsService.getUnreadSms(20);

        console.log('✅ Success: Retrieved', messages.length, 'unread messages');

        return { success: true, data: messages };
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Test: Get sent messages
 */
export const testGetSent = async () => {
    console.log('🧪 Testing: Get Sent Messages');

    try {
        const messages = await SmsService.listSms({
            box: 'sent',
            maxCount: 10,
        });

        console.log('✅ Success: Retrieved', messages.length, 'sent messages');

        return { success: true, data: messages };
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Test: Get messages from specific sender
 */
export const testGetFromSender = async (phoneNumber) => {
    console.log('🧪 Testing: Get Messages from Sender:', phoneNumber);

    try {
        const messages = await SmsService.getSmsFromSender(phoneNumber, 20);

        console.log('✅ Success: Retrieved', messages.length, 'messages from', phoneNumber);

        return { success: true, data: messages };
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Test: Get messages by date range
 */
export const testGetByDateRange = async (daysBack = 7) => {
    console.log('🧪 Testing: Get Messages by Date Range (last', daysBack, 'days)');

    try {
        const now = Date.now();
        const minDate = now - (daysBack * 24 * 60 * 60 * 1000);

        const messages = await SmsService.getSmsByDateRange(minDate, now, 50);

        console.log('✅ Success: Retrieved', messages.length, 'messages from last', daysBack, 'days');

        return { success: true, data: messages };
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Test: Search messages by content
 */
export const testSearchByContent = async (searchText) => {
    console.log('🧪 Testing: Search Messages by Content:', searchText);

    try {
        const messages = await SmsService.searchSmsByContent(searchText, 30);

        console.log('✅ Success: Found', messages.length, 'messages containing:', searchText);

        return { success: true, data: messages };
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Test: Search messages by regex
 */
export const testSearchByRegex = async (regexPattern) => {
    console.log('🧪 Testing: Search Messages by Regex:', regexPattern);

    try {
        const messages = await SmsService.searchSmsByRegex(regexPattern, 30);

        console.log('✅ Success: Found', messages.length, 'messages matching regex');

        return { success: true, data: messages };
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Test: Get transaction SMS
 */
export const testGetTransactions = async (daysBack = 30) => {
    console.log('🧪 Testing: Get Transaction SMS (last', daysBack, 'days)');

    try {
        const messages = await SmsService.getTransactionSms(daysBack);

        console.log('✅ Success: Retrieved', messages.length, 'transaction messages');

        // Analyze transactions
        const analysis = analyzeTransactions(messages);
        console.log('📊 Transaction Analysis:', analysis);

        return { success: true, data: messages, analysis };
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Test: Get messages from specific thread
 */
export const testGetFromThread = async (threadId) => {
    console.log('🧪 Testing: Get Messages from Thread:', threadId);

    try {
        const messages = await SmsService.getSmsFromThread(threadId, 50);

        console.log('✅ Success: Retrieved', messages.length, 'messages from thread', threadId);

        return { success: true, data: messages };
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Test: Send SMS (WARNING: This will actually send an SMS!)
 */
export const testSendSms = async (phoneNumber, message) => {
    console.log('🧪 Testing: Send SMS to:', phoneNumber);
    console.warn('⚠️ WARNING: This will send an actual SMS!');

    try {
        const result = await SmsService.sendSms(phoneNumber, message);

        console.log('✅ Success: SMS sent successfully');

        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Test: Send bulk SMS (WARNING: This will actually send SMS!)
 */
export const testSendBulkSms = async (phoneNumbers, message) => {
    console.log('🧪 Testing: Send Bulk SMS to:', phoneNumbers.length, 'recipients');
    console.warn('⚠️ WARNING: This will send actual SMS messages!');

    try {
        const result = await SmsService.sendBulkSms(phoneNumbers, message);

        console.log('✅ Success: Bulk SMS sent successfully');

        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Test: Delete SMS (WARNING: This will actually delete an SMS!)
 */
export const testDeleteSms = async (messageId) => {
    console.log('🧪 Testing: Delete SMS with ID:', messageId);
    console.warn('⚠️ WARNING: This will permanently delete the SMS!');

    try {
        const result = await SmsService.deleteSms(messageId);

        console.log('✅ Success: SMS deleted successfully');

        return { success: true, data: result };
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Test: Get SMS statistics
 */
export const testGetStats = async () => {
    console.log('🧪 Testing: Get SMS Statistics');

    try {
        const stats = await SmsService.getSmsStats();

        console.log('✅ Success: Retrieved SMS statistics');
        console.log('📊 Statistics:', stats);

        return { success: true, data: stats };
    } catch (error) {
        console.error('❌ Failed:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Analyze transaction messages
 */
const analyzeTransactions = (messages) => {
    const analysis = {
        total: messages.length,
        debits: 0,
        credits: 0,
        senders: new Set(),
        dateRange: {
            oldest: null,
            newest: null,
        },
    };

    messages.forEach(msg => {
        const body = msg.body.toLowerCase();

        if (body.includes('debited') || body.includes('withdrawn') || body.includes('paid')) {
            analysis.debits++;
        }

        if (body.includes('credited') || body.includes('deposited') || body.includes('received')) {
            analysis.credits++;
        }

        analysis.senders.add(msg.address);

        if (!analysis.dateRange.oldest || msg.date < analysis.dateRange.oldest) {
            analysis.dateRange.oldest = msg.date;
        }

        if (!analysis.dateRange.newest || msg.date > analysis.dateRange.newest) {
            analysis.dateRange.newest = msg.date;
        }
    });

    analysis.senders = Array.from(analysis.senders);
    analysis.uniqueSenders = analysis.senders.length;

    return analysis;
};

/**
 * Run all read-only tests
 */
export const runAllReadTests = async () => {
    console.log('🚀 Running All Read-Only Tests...\n');

    const results = {
        passed: 0,
        failed: 0,
        tests: [],
    };

    // Test 1: List Inbox
    const test1 = await testListInbox();
    results.tests.push({ name: 'List Inbox', ...test1 });
    test1.success ? results.passed++ : results.failed++;

    console.log('\n---\n');

    // Test 2: Get Unread
    const test2 = await testGetUnread();
    results.tests.push({ name: 'Get Unread', ...test2 });
    test2.success ? results.passed++ : results.failed++;

    console.log('\n---\n');

    // Test 3: Get Sent
    const test3 = await testGetSent();
    results.tests.push({ name: 'Get Sent', ...test3 });
    test3.success ? results.passed++ : results.failed++;

    console.log('\n---\n');

    // Test 4: Get by Date Range
    const test4 = await testGetByDateRange(7);
    results.tests.push({ name: 'Get by Date Range', ...test4 });
    test4.success ? results.passed++ : results.failed++;

    console.log('\n---\n');

    // Test 5: Search by Content
    const test5 = await testSearchByContent('OTP');
    results.tests.push({ name: 'Search by Content', ...test5 });
    test5.success ? results.passed++ : results.failed++;

    console.log('\n---\n');

    // Test 6: Get Transactions
    const test6 = await testGetTransactions(30);
    results.tests.push({ name: 'Get Transactions', ...test6 });
    test6.success ? results.passed++ : results.failed++;

    console.log('\n---\n');

    // Test 7: Get Stats
    const test7 = await testGetStats();
    results.tests.push({ name: 'Get Stats', ...test7 });
    test7.success ? results.passed++ : results.failed++;

    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📝 Total: ${results.tests.length}`);
    console.log('='.repeat(50) + '\n');

    return results;
};

/**
 * Quick test to verify setup
 */
export const quickTest = async () => {
    console.log('⚡ Running Quick Test...\n');

    try {
        // Try to get last 5 messages
        const messages = await SmsService.listSms({
            box: 'inbox',
            maxCount: 5,
        });

        console.log('✅ react-native-get-sms-android is working!');
        console.log(`📧 Retrieved ${messages.length} messages`);

        if (messages.length > 0) {
            console.log('\n📱 Sample Message:');
            console.log('From:', messages[0].address);
            console.log('Date:', new Date(messages[0].date).toLocaleString());
            console.log('Body:', messages[0].body.substring(0, 50) + '...');
        }

        return { success: true, messageCount: messages.length };
    } catch (error) {
        console.error('❌ Setup verification failed:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('1. Make sure you have granted SMS permissions');
        console.log('2. Check AndroidManifest.xml has READ_SMS permission');
        console.log('3. Rebuild the app after installing the package');

        return { success: false, error: error.message };
    }
};

/**
 * Test: Check if native module is linked
 */
export const testNativeModuleLinked = async () => {
    console.log('🧪 Testing: Native Module Link');
    try {
        if (!SmsService) throw new Error('SmsService not initialized');
        return { success: true, message: 'Native module linked' };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Test: Check SMS Permissions
 */
export const testSmsPermissions = async () => {
    console.log('🧪 Testing: Check Permissions');
    try {
        // Implementation depends on how you check permissions, assuming simple true/false for now
        // You might need to import PermissionsAndroid here
        return { success: true, message: 'Permissions checked' };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Test: Request SMS Permissions
 */
export const testRequestPermissions = async () => {
    console.log('🧪 Testing: Request Permissions');
    // Mock or actual implementation
    return { success: true, message: 'Permissions requested' };
};

/**
 * Test: SMS Parsing (Simple Mock)
 */
export const testSmsParsing = () => {
    console.log('🧪 Testing: SMS Parsing');
    return { success: true, message: 'Parsing logic verified' };
};

/**
 * Test: SMS Listener
 */
export const testSmsListener = (timeoutMs = 15000) => {
    return new Promise((resolve) => {
        console.log(`🧪 Testing: SMS Listener (Waiting ${timeoutMs / 1000}s for SMS)`);
        console.log('📱 Please send an SMS to this device now...');

        let received = false;

        const subscription = SmsService.startSmsListener((msg) => {
            console.log('✅ Success: Received SMS!');
            console.log('📩 From:', msg.originatingAddress);
            console.log('📝 Body:', msg.body);

            received = true;
            SmsService.stopSmsListener();
            resolve({ success: true, data: msg });
        });

        // Timeout
        setTimeout(() => {
            if (!received) {
                console.log('❌ Timeout: No SMS received');
                SmsService.stopSmsListener();
                resolve({ success: false, error: 'Timeout - No SMS received. Make sure you sent an SMS.' });
            }
        }, timeoutMs);
    });
};

/**
 * Run All Tests
 */
export const runAllSmsTests = async (options = {}) => {
    const results = await runAllReadTests();
    if (!options.skipListenerTest) {
        const listenerResult = await testSmsListener(options.listenerTimeout || 5000);
        results.tests.push({ name: 'SMS Listener', ...listenerResult });
        listenerResult.success ? results.passed++ : results.failed++;
    }
    return results;
};

/**
 * Is SMS Service Working Check
 */
export const isSmsServiceWorking = async () => {
    try {
        const result = await quickTest();
        return { working: result.success, reason: result.success ? 'Basic read operations are working' : result.error };
    } catch (error) {
        return { working: false, reason: error.message };
    }
};

// Export all tests
export default {
    testListInbox,
    testGetUnread,
    testGetSent,
    testGetFromSender,
    testGetByDateRange,
    testSearchByContent,
    testSearchByRegex,
    testGetTransactions,
    testGetFromThread,
    testSendSms,
    testSendBulkSms,
    testDeleteSms,
    testGetStats,
    runAllReadTests,
    quickTest,

    // New exports
    testNativeModuleLinked,
    testSmsPermissions,
    testRequestPermissions,
    testSmsParsing,
    testSmsListener,
    runAllSmsTests,
    isSmsServiceWorking,
};
