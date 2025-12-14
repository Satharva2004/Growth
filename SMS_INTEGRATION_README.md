# react-native-get-sms-android Integration Guide

This project integrates `react-native-get-sms-android` for comprehensive SMS operations on Android.

## 📦 Package Information

**Package**: `react-native-get-sms-android`  
**Version**: 2.1.0  
**Features**:
- ✅ Read SMS messages (inbox, sent, draft, etc.)
- ✅ Send SMS (single and bulk)
- ✅ Delete SMS messages
- ✅ Filter and search messages
- ✅ SMS delivery tracking

## 🚀 Installation

The package has already been installed in this project:

```bash
npm install react-native-get-sms-android --save
```

## ⚙️ Configuration

### 1. Android Permissions

The following permissions have been added to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_SMS"/>
<uses-permission android:name="android.permission.WRITE_SMS"/>
<uses-permission android:name="android.permission.SEND_SMS"/>
<uses-permission android:name="android.permission.RECEIVE_SMS"/>
```

### 2. Auto-linking

Since you're using React Native 0.81.4 with Expo, the package is automatically linked. No manual linking required!

### 3. Rebuild Required

After installation, rebuild your app:

```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npm run android
```

## 📁 Project Structure

```
MyApp/
├── utils/
│   ├── smsService.js          # Main SMS service wrapper
│   └── smsServiceTest.js      # Comprehensive test suite
├── hooks/
│   └── useSms.js              # React hook for SMS operations
├── components/
│   ├── SmsDemo.js             # Full-featured demo component
│   └── SimpleSmsExample.js    # Simple usage example
```

## 🎯 Usage Examples

### Option 1: Using the Custom Hook (Recommended)

```javascript
import React, { useEffect } from 'react';
import { View, Button, Text } from 'react-native';
import { useSms } from './hooks/useSms';

const MyComponent = () => {
  const {
    messages,
    loading,
    error,
    hasPermission,
    requestPermissions,
    getUnread,
    getTransactions,
    sendSms,
  } = useSms();

  useEffect(() => {
    requestPermissions();
  }, []);

  const handleGetUnread = async () => {
    try {
      const unreadMessages = await getUnread(20);
      console.log('Unread messages:', unreadMessages);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleSendMessage = async () => {
    try {
      await sendSms('+1234567890', 'Hello from React Native!');
      console.log('Message sent!');
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <View>
      <Button title="Get Unread" onPress={handleGetUnread} />
      <Button title="Send SMS" onPress={handleSendMessage} />
      {loading && <Text>Loading...</Text>}
      {error && <Text>Error: {error}</Text>}
    </View>
  );
};
```

### Option 2: Using the Service Directly

```javascript
import SmsService from './utils/smsService';

// List inbox messages
const messages = await SmsService.listSms({
  box: 'inbox',
  maxCount: 50,
});

// Get unread messages
const unread = await SmsService.getUnreadSms(20);

// Get transaction SMS
const transactions = await SmsService.getTransactionSms(30);

// Search messages
const results = await SmsService.searchSmsByContent('OTP', 50);

// Send SMS
await SmsService.sendSms('+1234567890', 'Hello!');

// Send bulk SMS
await SmsService.sendBulkSms(['+1111111111', '+2222222222'], 'Bulk message');

// Delete SMS
await SmsService.deleteSms(messageId);

// Get statistics
const stats = await SmsService.getSmsStats();
```

## 🧪 Testing

### Quick Test

Run a quick test to verify the setup:

```javascript
import { quickTest } from './utils/smsServiceTest';

// In your component or console
quickTest();
```

### Run All Tests

```javascript
import { runAllReadTests } from './utils/smsServiceTest';

// Run comprehensive test suite
runAllReadTests();
```

### Individual Tests

```javascript
import SmsTests from './utils/smsServiceTest';

// Test specific functionality
await SmsTests.testListInbox();
await SmsTests.testGetUnread();
await SmsTests.testGetTransactions();
await SmsTests.testSearchByContent('OTP');
```

## 📱 Demo Components

### Full-Featured Demo

Import and use the comprehensive demo:

```javascript
import SmsDemo from './components/SmsDemo';

// In your app
<SmsDemo />
```

### Simple Example

For a minimal implementation:

```javascript
import SimpleSmsExample from './components/SimpleSmsExample';

// In your app
<SimpleSmsExample />
```

## 🔍 Available Filter Options

When listing SMS messages, you can use these filters:

```javascript
{
  box: 'inbox',              // 'inbox', 'sent', 'draft', 'outbox', 'failed', 'queued', ''
  read: 0,                   // 0 = unread, 1 = read
  minDate: 1234567890000,    // timestamp in milliseconds
  maxDate: 1234567890000,    // timestamp in milliseconds
  bodyRegex: '(.*)(OTP)(.*)', // regex pattern
  address: '+1234567890',    // sender's phone number
  body: 'search text',       // exact text match
  thread_id: 12,             // conversation thread ID
  _id: 1234,                 // specific message ID
  indexFrom: 0,              // pagination start
  maxCount: 50,              // number of messages to retrieve
}
```

## 📊 SMS Message Object Structure

Each SMS message contains:

```javascript
{
  _id: 1234,                    // Message ID
  thread_id: 3,                 // Conversation thread ID
  address: "+1234567890",       // Sender/recipient phone number
  person: -1,                   // Contact ID
  date: 1365053816196,          // Timestamp (milliseconds)
  date_sent: 0,                 // Sent timestamp
  protocol: 0,                  // Protocol identifier
  read: 1,                      // 0 = unread, 1 = read
  status: -1,                   // Status code
  type: 1,                      // Message type
  body: "Message content",      // SMS text content
  service_center: "+60162999922", // Service center number
  locked: 0,                    // Lock status
  error_code: -1,               // Error code if any
  sub_id: -1,                   // Subscription ID
  seen: 1,                      // Seen status
  deletable: 0,                 // Can be deleted
  sim_slot: 0,                  // SIM card slot
  // ... additional device-specific fields
}
```

## 🎨 Service Methods

### SmsService Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `listSms(filter)` | List SMS with filters | `filter` object |
| `getUnreadSms(maxCount)` | Get unread messages | `maxCount` (default: 50) |
| `getSmsFromSender(phone, maxCount)` | Get messages from sender | `phone`, `maxCount` |
| `getSmsByDateRange(min, max, maxCount)` | Get messages by date | `minDate`, `maxDate`, `maxCount` |
| `searchSmsByContent(text, maxCount)` | Search by content | `searchText`, `maxCount` |
| `searchSmsByRegex(pattern, maxCount)` | Search by regex | `regexPattern`, `maxCount` |
| `getSmsFromThread(threadId, maxCount)` | Get thread messages | `threadId`, `maxCount` |
| `sendSms(phone, message)` | Send SMS | `phoneNumber`, `message` |
| `sendBulkSms(phones, message)` | Send bulk SMS | `phoneNumbers[]`, `message` |
| `deleteSms(messageId)` | Delete SMS | `messageId` |
| `getTransactionSms(daysBack)` | Get transaction SMS | `daysBack` (default: 30) |
| `getSmsStats()` | Get SMS statistics | none |
| `setupDeliveryListener(callback)` | Setup delivery events | `callback` function |
| `removeDeliveryListener()` | Remove delivery listener | none |

## ⚠️ Important Notes

### Deleting SMS Messages

For Android > 5, only the default SMS handler app can delete messages. If your app is not set as the default SMS handler, delete operations will fail.

### Permissions

You must request permissions at runtime:

```javascript
import { PermissionsAndroid } from 'react-native';

const granted = await PermissionsAndroid.requestMultiple([
  PermissionsAndroid.PERMISSIONS.READ_SMS,
  PermissionsAndroid.PERMISSIONS.SEND_SMS,
  PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
  PermissionsAndroid.PERMISSIONS.WRITE_SMS,
]);
```

The `useSms` hook handles this automatically!

### SMS Delivery Events

Listen for SMS delivery status:

```javascript
import { DeviceEventEmitter } from 'react-native';

DeviceEventEmitter.addListener('sms_onDelivery', (msg) => {
  console.log('Delivery status:', msg);
  // msg will be "SMS delivered" or "SMS not delivered"
});
```

## 🔧 Troubleshooting

### Package not found

1. Make sure the package is installed: `npm install react-native-get-sms-android`
2. Clear cache: `npm start -- --reset-cache`
3. Rebuild: `npm run android`

### Permission denied

1. Check `AndroidManifest.xml` has all required permissions
2. Request permissions at runtime
3. Check Android settings that permissions are granted

### Module not linked

1. For Expo with custom dev client: `npx expo prebuild --clean`
2. Rebuild the app: `npm run android`

### SMS not sending

1. Verify `SEND_SMS` permission is granted
2. Check phone number format
3. Ensure device has network connectivity

## 📚 Additional Resources

- [GitHub Repository](https://github.com/briankabiro/react-native-get-sms-android)
- [Android SMS Provider Documentation](https://developer.android.com/reference/android/provider/Telephony.Sms)

## 🎉 Quick Start Checklist

- [x] Package installed
- [x] Permissions added to AndroidManifest.xml
- [x] Service wrapper created (`utils/smsService.js`)
- [x] React hook created (`hooks/useSms.js`)
- [x] Test suite created (`utils/smsServiceTest.js`)
- [x] Demo components created
- [ ] Rebuild app: `npm run android`
- [ ] Request permissions at runtime
- [ ] Test with `quickTest()` function

## 💡 Pro Tips

1. **Always request permissions** before using any SMS functionality
2. **Use the hook** for easier state management in React components
3. **Test with read operations first** before trying send/delete
4. **Use filters** to reduce the number of messages retrieved
5. **Handle errors gracefully** - SMS operations can fail for various reasons
6. **Monitor delivery status** for sent messages using event listeners

---

**Ready to use!** Start by running the quick test or importing one of the demo components.
