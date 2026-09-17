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
import java.io.FileOutputStream;
import java.io.IOException;

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

    private Thread packetThread;

    private volatile boolean running;

    private ProtectionController protectionController;

    private VpnPacketProcessor packetProcessor;


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


    private synchronized void startVpn() {

        if (running) {
            return;
        }


        try {

            protectionController =
                    ProtectionController
                            .getInstance(this);


            /*
             * The native VPN must only run while Protection
             * is explicitly enabled.
             */
            if (!protectionController.isEnabled()) {

                stopSelf();

                return;
            }


            ProtectionDecisionEngine decisionEngine =
                    new ProtectionDecisionEngine(
                            protectionController
                    );


            DnsForwarder dnsForwarder =
                    new DnsForwarder(
                            VpnConfiguration.UPSTREAM_DNS,
                            VpnConfiguration.UPSTREAM_DNS_PORT,
                            VpnConfiguration.DNS_TIMEOUT_MS,
                            this
                    );


            DnsProtectionEngine dnsProtectionEngine =
                    new DnsProtectionEngine(
                            decisionEngine,
                            dnsForwarder
                    );


            Ipv4TrafficProcessor ipv4Processor =
                    new Ipv4TrafficProcessor(
                            dnsProtectionEngine
                    );


            Ipv6TrafficProcessor ipv6Processor =
                    new Ipv6TrafficProcessor(
                            dnsProtectionEngine
                    );


            packetProcessor =
                    new VpnPacketProcessor(
                            ipv4Processor,
                            ipv6Processor
                    );


            VpnService.Builder builder =
                    new VpnService.Builder()
                            .setSession(
                                    "INTERRUPT Protection"
                            )
                            .setMtu(
                                    VpnConfiguration.MTU
                            );


            /*
             * Virtual IPv4 interface.
             */
            builder.addAddress(
                    VpnConfiguration.IPV4_ADDRESS,
                    VpnConfiguration.IPV4_PREFIX_LENGTH
            );


            /*
             * Virtual IPv6 interface.
             */
            builder.addAddress(
                    VpnConfiguration.IPV6_ADDRESS,
                    VpnConfiguration.IPV6_PREFIX_LENGTH
            );


            /*
             * Full-tunnel IPv4 routing.
             */
            builder.addRoute(
                    VpnConfiguration.IPV4_ROUTE,
                    VpnConfiguration.IPV4_ROUTE_PREFIX_LENGTH
            );


            /*
             * Full-tunnel IPv6 routing.
             */
            builder.addRoute(
                    VpnConfiguration.IPV6_ROUTE,
                    VpnConfiguration.IPV6_ROUTE_PREFIX_LENGTH
            );


            /*
             * DNS endpoints exposed inside the VPN.
             */
            builder.addDnsServer(
                    VpnConfiguration.IPV4_DNS
            );


            builder.addDnsServer(
                    VpnConfiguration.IPV6_DNS
            );


            vpnInterface =
                    builder.establish();


            if (vpnInterface == null) {

                packetProcessor = null;

                stopSelf();

                return;
            }


            running = true;


            packetThread =
                    new Thread(
                            this::processPackets,
                            "interrupt-vpn"
                    );


            packetThread.start();


        } catch (Exception error) {

            stopVpn();

            stopSelf();
        }
    }


    private void processPackets() {

        ParcelFileDescriptor currentInterface =
                vpnInterface;


        if (currentInterface == null) {
            return;
        }


        byte[] buffer =
                new byte[
                        VpnConfiguration.PACKET_BUFFER_SIZE
                ];


        try (
                FileInputStream input =
                        new FileInputStream(
                                currentInterface
                                        .getFileDescriptor()
                        );

                FileOutputStream output =
                        new FileOutputStream(
                                currentInterface
                                        .getFileDescriptor()
                        )
        ) {

            while (running) {

                int length =
                        input.read(buffer);


                if (length <= 0) {
                    continue;
                }


                handlePacket(
                        buffer,
                        length,
                        output
                );
            }


        } catch (IOException ignored) {

            /*
             * Closing the ParcelFileDescriptor during
             * shutdown normally terminates the blocking read.
             */
        }
    }


    private void handlePacket(
            byte[] packet,
            int length,
            FileOutputStream output
    ) {

        if (
                packet == null
                ||
                length <= 0
                ||
                length > packet.length
                ||
                packetProcessor == null
        ) {
            return;
        }


        try {

            byte[] response =
                    packetProcessor.process(
                            packet,
                            length
                    );


            /*
             * A non-null response means the packet was
             * actually handled by the Protection packet
             * layer, currently DNS interception.
             */
            if (response != null) {

                output.write(
                        response
                );

                output.flush();
            }


        } catch (IOException ignored) {

            /*
             * A malformed/failed packet must not terminate
             * the VPN service itself.
             */
        }
    }


    private synchronized void stopVpn() {

        running = false;


        Thread currentThread =
                packetThread;


        packetThread = null;


        if (
                currentThread != null
                &&
                currentThread != Thread.currentThread()
        ) {

            currentThread.interrupt();
        }


        ParcelFileDescriptor currentInterface =
                vpnInterface;


        vpnInterface = null;


        if (currentInterface != null) {

            try {

                currentInterface.close();

            } catch (IOException ignored) {
            }
        }


        packetProcessor = null;

        protectionController = null;
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
