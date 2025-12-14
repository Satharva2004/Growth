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

public class SmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
            ReactApplicationContext reactContext = SmsModule.getReactContext();
            if (reactContext != null) {
                try {
                    for (SmsMessage smsMessage : Telephony.Sms.Intents.getMessagesFromIntent(intent)) {
                        String messageBody = smsMessage.getMessageBody();
                        String sender = smsMessage.getOriginatingAddress();
                        long timestamp = smsMessage.getTimestampMillis();

                        Log.d("DirectSmsReceiver", "SMS received from: " + sender);

                        WritableMap params = Arguments.createMap();
                        params.putString("originatingAddress", sender);
                        params.putString("body", messageBody);
                        params.putDouble("timestamp", (double) timestamp);

                        reactContext
                                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                                .emit("onDirectSmsReceived", params);
                    }
                } catch (Exception e) {
                    Log.e("DirectSmsReceiver", "Error processing SMS", e);
                }
            } else {
                Log.w("DirectSmsReceiver", "React Context is null, cannot emit event");
            }
        }
    }
}
