package com.interrupt.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import com.interrupt.app.protection.InterruptProtectionPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(
            Bundle savedInstanceState
    ) {

        registerPlugin(
                InterruptProtectionPlugin.class
        );

        super.onCreate(
                savedInstanceState
        );
    }
}
