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
}
