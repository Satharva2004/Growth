package com.atharvasawant0804.Clarity;

import android.content.Intent;
import android.os.Bundle;
import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import com.facebook.react.bridge.Arguments;
import javax.annotation.Nullable;

public class SmsHeadlessTaskService extends HeadlessJsTaskService {
    @Override
    protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        Bundle extras = intent.getExtras();
        if (extras != null) {
            return new HeadlessJsTaskConfig(
                    "SmsHeadlessTask",
                    Arguments.fromBundle(extras),
                    5000, // Timeout for the task
                    true // Allowed in foreground
            );
        }
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            String CHANNEL_ID = "SMS_BACKGROUND_CHANNEL";
            android.app.NotificationChannel channel = new android.app.NotificationChannel(
                    CHANNEL_ID,
                    "Background SMS Service",
                    android.app.NotificationManager.IMPORTANCE_LOW);
            getSystemService(android.app.NotificationManager.class).createNotificationChannel(channel);

            android.app.Notification.Builder notification = new android.app.Notification.Builder(this, CHANNEL_ID)
                    .setContentTitle("Processing SMS")
                    .setContentText("Clarity is analyzing a new transaction...")
                    .setSmallIcon(R.mipmap.ic_launcher); // Ensure this resource exists or use a default android one

            startForeground(1, notification.build());
        }
    }
}
