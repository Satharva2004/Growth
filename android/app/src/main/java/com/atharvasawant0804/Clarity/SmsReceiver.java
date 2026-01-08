package com.atharvasawant0804.Clarity;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import android.util.Log;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.HeadlessJsTaskService;

public class SmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
            try {
                for (SmsMessage smsMessage : Telephony.Sms.Intents.getMessagesFromIntent(intent)) {
                    String messageBody = smsMessage.getMessageBody();
                    String sender = smsMessage.getOriginatingAddress();
                    long timestamp = smsMessage.getTimestampMillis();

                    Log.d("DirectSmsReceiver", "SMS received from: " + sender);

                    // Prepare data for both Foreground and Background
                    WritableMap params = Arguments.createMap();
                    params.putString("originatingAddress", sender);
                    params.putString("body", messageBody);
                    params.putDouble("timestamp", (double) timestamp);

                    ReactApplicationContext reactContext = SmsModule.getReactContext();

                    if (reactContext != null && reactContext.hasActiveCatalystInstance()) {
                        // App is in foreground (or at least Javascript is running)
                        Log.d("DirectSmsReceiver", "Emitting event to foreground JS");
                        reactContext
                                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                                .emit("onDirectSmsReceived", params);
                    } else {
                        // App is in background or killed -> Start Headless Service
                        Log.d("DirectSmsReceiver", "Starting Headless Service");
                        Intent serviceIntent = new Intent(context, SmsHeadlessTaskService.class);
                        serviceIntent.putExtra("originatingAddress", sender);
                        serviceIntent.putExtra("body", messageBody);
                        serviceIntent.putExtra("timestamp", timestamp);
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                            context.startForegroundService(serviceIntent);
                        } else {
                            context.startService(serviceIntent);
                        }
                        HeadlessJsTaskService.acquireWakeLockNow(context);
                    }
                }
            } catch (Exception e) {
                Log.e("DirectSmsReceiver", "Error processing SMS", e);
            }
        }
    }
}
