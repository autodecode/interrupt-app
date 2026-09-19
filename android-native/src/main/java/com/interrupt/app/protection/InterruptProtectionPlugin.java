package com.interrupt.app.protection;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.VpnService;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(
        name = "InterruptProtection"
)
public class InterruptProtectionPlugin extends Plugin {

    private static final int VPN_REQUEST_CODE = 4102;

    private PluginCall pendingEnableCall;


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
                InterruptVpnService.isRunning()
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

        /*
         * Android requires explicit VPN consent the first
         * time the application attempts to establish the VPN.
         */
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

        if (!startProtectionService()) {

            controller.disable();

            call.reject(
                    "Unable to start INTERRUPT Protection"
            );

            return;
        }

        resolveEnableCall(
                call
        );
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

        Context context =
                getContext();

        Intent intent =
                new Intent(
                        context,
                        InterruptVpnService.class
                );

        /*
         * The service performs its complete cleanup from
         * onDestroy(), including HEV and the TUN interface.
         */
        context.stopService(
                intent
        );

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

        resolveEnableCall(
                call
        );
    }


    private void resolveEnableCall(
            PluginCall call
    ) {

        JSObject result =
                new JSObject();

        ProtectionController controller =
                ProtectionController.getInstance(
                        getContext()
                );

        result.put(
                "enabled",
                controller.isEnabled()
        );

        result.put(
                "running",
                InterruptVpnService.isRunning()
        );

        call.resolve(
                result
        );
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
}
