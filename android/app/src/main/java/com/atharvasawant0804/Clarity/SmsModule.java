package com.atharvasawant0804.Clarity;

import android.util.Log;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class SmsModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;

    public SmsModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    public static ReactApplicationContext getReactContext() {
        return reactContext;
    }

    @Override
    public String getName() {
        return "DirectSmsModule";
    }

    @ReactMethod
    public void startMonitoring() {
        Log.d("DirectSmsModule", "SMS Monitoring initialized from JS");
    }

    @ReactMethod
    public void createNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            String CHANNEL_ID = "CLARITY_INTERACTIVE";
            android.app.NotificationChannel channel = new android.app.NotificationChannel(
                    CHANNEL_ID,
                    "Interactive Notifications",
                    android.app.NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Channel for Interactive Clarity Notifications");

            android.app.NotificationManager notificationManager = (android.app.NotificationManager) getReactApplicationContext()
                    .getSystemService(android.content.Context.NOTIFICATION_SERVICE);
            notificationManager.createNotificationChannel(channel);
        }
    }

    @ReactMethod
    public void showInteractiveNotification(String title, String message) {
        android.content.Context context = getReactApplicationContext();
        String CHANNEL_ID = "CLARITY_INTERACTIVE";
        int NOTIFICATION_ID = 101;

        // Intent for Accept
        android.content.Intent acceptIntent = new android.content.Intent(context, ActionReceiver.class);
        acceptIntent.setAction("ACCEPT");
        acceptIntent.putExtra("notificationId", NOTIFICATION_ID);
        acceptIntent.putExtra("action", "ACCEPT");

        android.app.PendingIntent acceptPendingIntent = android.app.PendingIntent.getBroadcast(
                context, 1, acceptIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);

        // Intent for Reject
        android.content.Intent rejectIntent = new android.content.Intent(context, ActionReceiver.class);
        rejectIntent.setAction("REJECT");
        rejectIntent.putExtra("notificationId", NOTIFICATION_ID);
        rejectIntent.putExtra("action", "REJECT");

        android.app.PendingIntent rejectPendingIntent = android.app.PendingIntent.getBroadcast(
                context, 2, rejectIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);

        // Build Notification
        // Note: Using android.app.Notification.Builder for simplicity without AndroidX
        // compat if unnecessary,
        // but user example used Compat. Check imports.
        // We will use standard Android Builder for < Android X or just standard if SDK
        // is high enough,
        // typically React Native apps use AndroidX.
        // Assuming AndroidX is available might be risky if I don't see it in imports.
        // I will use android.app.Notification.Builder (SDK 26+) structure since we
        // check SDK for channel.

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            android.app.Notification.Builder builder = new android.app.Notification.Builder(context, CHANNEL_ID)
                    .setSmallIcon(
                            context.getResources().getIdentifier("ic_launcher", "mipmap", context.getPackageName()))
                    .setContentTitle(title)
                    .setContentText(message)
                    .setAutoCancel(true)
                    .addAction(new android.app.Notification.Action.Builder(
                            0, "Accept", acceptPendingIntent).build())
                    .addAction(new android.app.Notification.Action.Builder(
                            0, "Reject", rejectPendingIntent).build());

            android.app.NotificationManager notificationManager = (android.app.NotificationManager) context
                    .getSystemService(android.content.Context.NOTIFICATION_SERVICE);

            notificationManager.notify(NOTIFICATION_ID, builder.build());
        }
    }
}
