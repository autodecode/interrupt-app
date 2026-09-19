package com.interrupt.app.protection;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.VpnService;
import android.os.Build;
import android.os.IBinder;
import android.os.ParcelFileDescriptor;

public final class InterruptVpnService extends VpnService {

    public static final String ACTION_START =
            "com.interrupt.app.protection.START";

    public static final String ACTION_STOP =
            "com.interrupt.app.protection.STOP";

    private static final String CHANNEL_ID =
            "interrupt_protection";

    private static final int NOTIFICATION_ID =
            4101;

    private ParcelFileDescriptor vpnInterface;

    private HevTunnelController hevController;

    private ProtectionController protectionController;

    private volatile boolean running;


    @Override
    public int onStartCommand(
            Intent intent,
            int flags,
            int startId
    ) {

        if (
                intent != null
                &&
                ACTION_STOP.equals(
                        intent.getAction()
                )
        ) {

            stopProtection();

            stopSelf();

            return START_NOT_STICKY;
        }

        startProtectionForeground();

        if (!running) {
            startProtection();
        }

        return START_STICKY;
    }


    private void startProtectionForeground() {

        createNotificationChannel();

        Notification notification =
                new Notification.Builder(
                        this,
                        CHANNEL_ID
                )
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
                Build.VERSION.SDK_INT
                        <
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


    private synchronized void startProtection() {

        if (running) {
            return;
        }

        try {

            protectionController =
                    ProtectionController
                            .getInstance(this);

            if (
                    !protectionController.isEnabled()
            ) {

                stopSelf();

                return;
            }

            /*
             * The Capacitor plugin normally handles the VPN
             * permission request before starting this service.
             *
             * Keep this check here as a safety guard in case
             * the service is started through another path.
             */
            Intent prepareIntent =
                    VpnService.prepare(this);

            if (prepareIntent != null) {

                stopSelf();

                return;
            }

            VpnService.Builder builder =
                    new VpnService.Builder()
                            .setSession(
                                    "INTERRUPT Protection"
                            )
                            .setMtu(
                                    VpnConfiguration.MTU
                            )
                            .setBlocking(false);

            /*
             * TUN IPv4 address.
             */
            builder.addAddress(
                    VpnConfiguration.IPV4_ADDRESS,
                    VpnConfiguration.IPV4_PREFIX_LENGTH
            );

            /*
             * TUN IPv6 address.
             */
            builder.addAddress(
                    VpnConfiguration.IPV6_ADDRESS,
                    VpnConfiguration.IPV6_PREFIX_LENGTH
            );

            /*
             * Full IPv4 tunnel.
             */
            builder.addRoute(
                    VpnConfiguration.IPV4_ROUTE,
                    VpnConfiguration.IPV4_ROUTE_PREFIX_LENGTH
            );

            /*
             * Full IPv6 tunnel.
             */
            builder.addRoute(
                    VpnConfiguration.IPV6_ROUTE,
                    VpnConfiguration.IPV6_ROUTE_PREFIX_LENGTH
            );

            /*
             * HEV MapDNS is exposed through the IPv4 VPN
             * address 10.111.0.1.
             *
             * Do not advertise an IPv6 DNS address because
             * the current HEV MapDNS configuration does not
             * provide an IPv6 DNS listener.
             */
            builder.addDnsServer(
                    VpnConfiguration.IPV4_DNS
            );

            vpnInterface =
                    builder.establish();

            if (vpnInterface == null) {

                stopSelf();

                return;
            }

            /*
             * Start HEV and the local Java SOCKS5 policy
             * server against the established TUN interface.
             */
            hevController =
                    new HevTunnelController(
                            this
                    );

            if (
                    !hevController.start(
                            vpnInterface
                    )
            ) {

                stopProtection();

                stopSelf();

                return;
            }

            running = true;

        } catch (Exception error) {

            stopProtection();

            stopSelf();
        }
    }


    private synchronized void stopProtection() {

        running = false;

        if (hevController != null) {

            hevController.stop();

            hevController = null;
        }

        ParcelFileDescriptor currentInterface =
                vpnInterface;

        vpnInterface = null;

        if (currentInterface != null) {

            try {
                currentInterface.close();
            } catch (Exception ignored) {
            }
        }

        protectionController = null;
    }


    @Override
    public void onDestroy() {

        stopProtection();

        super.onDestroy();
    }


    @Override
    public void onRevoke() {

        stopProtection();

        super.onRevoke();
    }


    @Override
    public IBinder onBind(
            Intent intent
    ) {

        return super.onBind(intent);
    }
}
