package com.interrupt.app.protection;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.VpnService;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(
        name = "InterruptProtection"
)
public class InterruptProtectionPlugin extends Plugin {

    private static final int VPN_REQUEST_CODE = 4102;

    @PluginMethod
    public void getStatus(
            PluginCall call
    ) {

        ProtectionController controller =
                ProtectionController.getInstance(
                        getContext()
                );

        JSObject result =
                new JSObject();

        result.put(
                "enabled",
                controller.isEnabled()
        );

        result.put(
                "running",
                isVpnServiceRunning()
        );

        call.resolve(result);
    }

    @PluginMethod
    public void enable(
            PluginCall call
    ) {

        Activity activity =
                getActivity();

        if (activity == null) {

            call.reject(
                    "INTERRUPT activity is not available"
            );

            return;
        }

        ProtectionController controller =
                ProtectionController.getInstance(
                        getContext()
                );

        controller.enable();

        Intent prepareIntent =
                VpnService.prepare(
                        activity
                );

        if (prepareIntent != null) {

            pendingEnableCall = call;

            startActivityForResult(
                    call,
                    prepareIntent,
                    VPN_REQUEST_CODE
            );

            return;
        }

        if (startProtectionService()) {

            JSObject result =
                    new JSObject();

            result.put(
                    "enabled",
                    true
            );

            result.put(
                    "running",
                    true
            );

            call.resolve(result);

        } else {

            controller.disable();

            call.reject(
                    "Unable to start INTERRUPT Protection"
            );
        }
    }

    @PluginMethod
    public void disable(
            PluginCall call
    ) {

        ProtectionController controller =
                ProtectionController.getInstance(
                        getContext()
                );

        controller.disable();

        Intent intent =
                new Intent(
                        getContext(),
                        InterruptVpnService.class
                );

        intent.setAction(
                InterruptVpnService.ACTION_STOP
        );

        getContext().startService(intent);

        JSObject result =
                new JSObject();

        result.put(
                "enabled",
                false
        );

        result.put(
                "running",
                false
        );

        call.resolve(result);
    }

    private PluginCall pendingEnableCall;

    @Override
    protected void handleOnActivityResult(
            int requestCode,
            int resultCode,
            Intent data
    ) {

        super.handleOnActivityResult(
                requestCode,
                resultCode,
                data
        );

        if (
                requestCode
                        !=
                VPN_REQUEST_CODE
        ) {
            return;
        }

        PluginCall call =
                pendingEnableCall;

        pendingEnableCall = null;

        if (call == null) {
            return;
        }

        if (
                resultCode
                        !=
                Activity.RESULT_OK
        ) {

            ProtectionController controller =
                    ProtectionController.getInstance(
                            getContext()
                    );

            controller.disable();

            call.reject(
                    "VPN permission was not granted"
            );

            return;
        }

        if (!startProtectionService()) {

            ProtectionController controller =
                    ProtectionController.getInstance(
                            getContext()
                    );

            controller.disable();

            call.reject(
                    "Unable to start INTERRUPT Protection"
            );

            return;
        }

        JSObject result =
                new JSObject();

        result.put(
                "enabled",
                true
        );

        result.put(
                "running",
                true
        );

        call.resolve(result);
    }

    private boolean startProtectionService() {

        Context context =
                getContext();

        Intent intent =
                new Intent(
                        context,
                        InterruptVpnService.class
                );

        intent.setAction(
                InterruptVpnService.ACTION_START
        );

        try {

            if (
                    Build.VERSION.SDK_INT
                            >=
                    Build.VERSION_CODES.O
            ) {

                context.startForegroundService(
                        intent
                );

            } else {

                context.startService(
                        intent
                );
            }

            return true;

        } catch (Exception error) {

            return false;
        }
    }

    private boolean isVpnServiceRunning() {

        ProtectionController controller =
                ProtectionController.getInstance(
                        getContext()
                );

        return controller.isEnabled();
    }
}
