package com.interrupt.app.protection;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.VpnService;
import android.os.Build;
import android.os.ParcelFileDescriptor;

import java.io.FileInputStream;
import java.io.IOException;

public class InterruptVpnService extends VpnService {

    public static final String ACTION_START =
            "com.interrupt.app.protection.START";

    public static final String ACTION_STOP =
            "com.interrupt.app.protection.STOP";

    private static final String CHANNEL_ID =
            "interrupt_protection";

    private static final int NOTIFICATION_ID = 4101;

    private ParcelFileDescriptor vpnInterface;

    private Thread packetThread;

    private volatile boolean running = false;


    @Override
    public int onStartCommand(
            Intent intent,
            int flags,
            int startId
    ) {

        if (
                intent != null &&
                ACTION_STOP.equals(intent.getAction())
        ) {
            stopVpn();

            stopSelf();

            return START_NOT_STICKY;
        }


        startProtectionForeground();


        if (!running) {
            startVpn();
        }


        return START_STICKY;
    }


    private void startProtectionForeground() {

        createNotificationChannel();


        Notification notification =
                new Notification.Builder(this, CHANNEL_ID)
                        .setContentTitle(
                                "INTERRUPT Protection"
                        )
                        .setContentText(
                                "Protection is active"
                        )
                        .setSmallIcon(
                                android.R.drawable.ic_lock_lock
                        )
                        .setOngoing(true)
                        .build();


        startForeground(
                NOTIFICATION_ID,
                notification
        );
    }


    private void createNotificationChannel() {

        if (
                Build.VERSION.SDK_INT <
                Build.VERSION_CODES.O
        ) {
            return;
        }


        NotificationChannel channel =
                new NotificationChannel(
                        CHANNEL_ID,
                        "INTERRUPT Protection",
                        NotificationManager.IMPORTANCE_LOW
                );


        channel.setDescription(
                "INTERRUPT Protection status"
        );


        NotificationManager manager =
                (NotificationManager)
                        getSystemService(
                                Context.NOTIFICATION_SERVICE
                        );


        if (manager != null) {
            manager.createNotificationChannel(
                    channel
            );
        }
    }


    private synchronized void startVpn() {

        if (running) {
            return;
        }


        try {

            VpnService.Builder builder =
                    new VpnService.Builder()
                            .setSession(
                                    "INTERRUPT Protection"
                            )
                            .setMtu(1500)
                            .addAddress(
                                    "10.111.0.2",
                                    32
                            );


            /*
             * First prototype:
             *
             * Everything is routed through the VPN.
             *
             * We are not doing real packet forwarding yet.
             *
             * Packets are therefore discarded.
             *
             * This gives us the basic native Protection
             * infrastructure before implementing the
             * actual domain filtering engine.
             */

            builder.addRoute(
                    "0.0.0.0",
                    0
            );


            vpnInterface =
                    builder.establish();


            if (vpnInterface == null) {

                stopSelf();

                return;
            }


            running = true;


            packetThread =
                    new Thread(
                            this::discardPackets,
                            "interrupt-vpn"
                    );


            packetThread.start();


        } catch (Exception error) {

            stopVpn();

            stopSelf();
        }
    }


    private void discardPackets() {

        if (vpnInterface == null) {
            return;
        }


        byte[] buffer =
                new byte[32767];


        try (
                FileInputStream input =
                        new FileInputStream(
                                vpnInterface.getFileDescriptor()
                        )
        ) {

            while (running) {

                int length =
                        input.read(buffer);


                if (length < 0) {
                    break;
                }


                /*
                 * Intentionally discard packet.
                 *
                 * This is only the first native
                 * Protection prototype.
                 */
            }


        } catch (IOException ignored) {

            /*
             * Closing the VPN interface during
             * shutdown is expected.
             */
        }
    }


    private synchronized void stopVpn() {

        running = false;


        if (packetThread != null) {

            packetThread.interrupt();

            packetThread = null;
        }


        if (vpnInterface != null) {

            try {
                vpnInterface.close();
            } catch (IOException ignored) {
            }


            vpnInterface = null;
        }
    }


    @Override
    public void onDestroy() {

        stopVpn();

        super.onDestroy();
    }


    @Override
    public void onRevoke() {

        stopVpn();

        super.onRevoke();
    }
}
