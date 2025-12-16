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
}
