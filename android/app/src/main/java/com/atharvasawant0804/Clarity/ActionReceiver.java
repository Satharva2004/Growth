package com.atharvasawant0804.Clarity;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.ReactApplicationContext;

public class ActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getStringExtra("action");
        Log.d("ActionReceiver", "Action received: " + action);

        // Try to send to React Native
        ReactApplicationContext reactContext = SmsModule.getReactContext();
        if (reactContext != null && reactContext.hasActiveCatalystInstance()) {
            WritableMap params = Arguments.createMap();
            params.putString("action", action);
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onNotificationAction", params);
        } else {
            Log.w("ActionReceiver", "React Context is null or inactive. Cannot send event to JS.");
            // Handle background logic here if needed, or restart app
        }

        // Dismiss notification if needed?
        // Typically the intent should also handle closing the notification panel
        // or updating the notification.
        // For 'Accept/Reject', we usually dismiss it.
        int notificationId = intent.getIntExtra("notificationId", -1);
        if (notificationId != -1) {
            android.app.NotificationManager notificationManager = (android.app.NotificationManager) context
                    .getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.cancel(notificationId);
        }
    }
}
