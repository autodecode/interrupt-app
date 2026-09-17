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
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.SocketException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public class InterruptVpnService extends VpnService {

    public static final String ACTION_START =
            "com.interrupt.app.protection.START";

    public static final String ACTION_STOP =
            "com.interrupt.app.protection.STOP";

    private static final String CHANNEL_ID =
            "interrupt_protection";

    private static final int NOTIFICATION_ID = 4101;

    private static final String VPN_ADDRESS =
            "10.111.0.2";

    private static final int VPN_PREFIX =
            24;

    private static final String DNS_ADDRESS =
            "10.111.0.1";

    private static final String UPSTREAM_DNS =
            "1.1.1.1";

    private static final int DNS_PORT =
            53;

    private static final int BUFFER_SIZE =
            32767;

    private ParcelFileDescriptor vpnInterface;

    private Thread packetThread;

    private volatile boolean running;

    private DatagramSocket dnsSocket;


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

            VpnService.Builder builder =
                    new VpnService.Builder()
                            .setSession(
                                    "INTERRUPT Protection"
                            )
                            .setMtu(1500)
                            .addAddress(
                                    VPN_ADDRESS,
                                    VPN_PREFIX
                            )
                            .addRoute(
                                    "0.0.0.0",
                                    0
                            )
                            .addDnsServer(
                                    DNS_ADDRESS
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

        if (vpnInterface == null) {
            return;
        }


        byte[] buffer =
                new byte[BUFFER_SIZE];


        try (
                FileInputStream input =
                        new FileInputStream(
                                vpnInterface
                                        .getFileDescriptor()
                        );

                FileOutputStream output =
                        new FileOutputStream(
                                vpnInterface
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
             * Expected when the VPN interface
             * is closed during shutdown.
             */
        }
    }


    private void handlePacket(
            byte[] packet,
            int length,
            FileOutputStream output
    ) {

        if (length < 20) {
            return;
        }


        int version =
                (packet[0] >> 4) & 0x0F;


        if (version != 4) {

            /*
             * IPv6 handling will be implemented
             * together with the complete packet
             * forwarding layer.
             */
            return;
        }


        int headerLength =
                (packet[0] & 0x0F) * 4;


        if (
                headerLength < 20
                ||
                headerLength > length
        ) {
            return;
        }


        int protocol =
                packet[9] & 0xFF;


        /*
         * UDP
         */
        if (protocol != 17) {
            return;
        }


        if (length < headerLength + 8) {
            return;
        }


        int sourcePort =
                readUnsignedShort(
                        packet,
                        headerLength
                );


        int destinationPort =
                readUnsignedShort(
                        packet,
                        headerLength + 2
                );


        /*
         * DNS query.
         */
        if (
                destinationPort == DNS_PORT
        ) {

            handleDnsPacket(
                    packet,
                    length,
                    headerLength,
                    sourcePort,
                    output
            );
        }
    }


    private void handleDnsPacket(
            byte[] packet,
            int length,
            int ipHeaderLength,
            int sourcePort,
            FileOutputStream output
    ) {

        int udpHeader =
                ipHeaderLength;


        int dnsOffset =
                udpHeader + 8;


        if (dnsOffset >= length) {
            return;
        }


        int dnsLength =
                length - dnsOffset;


        byte[] dnsRequest =
                new byte[dnsLength];


        System.arraycopy(
                packet,
                dnsOffset,
                dnsRequest,
                0,
                dnsLength
        );


        DnsPacket.Query query =
                DnsPacket.parseQuery(
                        dnsRequest,
                        dnsRequest.length
                );


        if (query == null) {
            return;
        }


        if (
                ProtectionConfig
                        .isProtectedDomain(
                                query.hostname
                        )
        ) {

            byte[] response =
                    DnsPacket
                            .buildNxDomainResponse(
                                    dnsRequest,
                                    dnsRequest.length
                            );


            if (response != null) {

                sendDnsResponse(
                        packet,
                        ipHeaderLength,
                        sourcePort,
                        response,
                        output
                );
            }


            return;
        }


        forwardDnsQuery(
                packet,
                ipHeaderLength,
                sourcePort,
                dnsRequest,
                output
        );
    }


    private void forwardDnsQuery(
            byte[] originalPacket,
            int ipHeaderLength,
            int sourcePort,
            byte[] dnsRequest,
            FileOutputStream output
    ) {

        DatagramSocket socket =
                null;


        try {

            socket =
                    new DatagramSocket();


            protect(socket);


            InetAddress upstream =
                    InetAddress.getByName(
                            UPSTREAM_DNS
                    );


            DatagramPacket request =
                    new DatagramPacket(
                            dnsRequest,
                            dnsRequest.length,
                            upstream,
                            DNS_PORT
                    );


            socket.setSoTimeout(3000);


            socket.send(request);


            byte[] responseBuffer =
                    new byte[4096];


            DatagramPacket response =
                    new DatagramPacket(
                            responseBuffer,
                            responseBuffer.length
                    );


            socket.receive(response);


            byte[] dnsResponse =
                    new byte[
                            response.getLength()
                    ];


            System.arraycopy(
                    response.getData(),
                    response.getOffset(),
                    dnsResponse,
                    0,
                    response.getLength()
            );


            sendDnsResponse(
                    originalPacket,
                    ipHeaderLength,
                    sourcePort,
                    dnsResponse,
                    output
            );


        } catch (IOException ignored) {

            /*
             * DNS timeout/failure.
             *
             * The request is simply not returned
             * to the application.
             */

        } finally {

            if (socket != null) {
                socket.close();
            }
        }
    }


    private void sendDnsResponse(
            byte[] requestPacket,
            int ipHeaderLength,
            int destinationPort,
            byte[] dnsResponse,
            FileOutputStream output
    ) {

        /*
         * The application originally sent:
         *
         * source = application
         * destination = DNS
         *
         * The response must therefore be:
         *
         * source = DNS
         * destination = application
         */

        int udpLength =
                8 + dnsResponse.length;


        int ipLength =
                20 + udpLength;


        byte[] response =
                new byte[ipLength];


        ByteBuffer buffer =
                ByteBuffer.wrap(response)
                        .order(
                                ByteOrder.BIG_ENDIAN
                        );


        /*
         * IPv4 header.
         */
        buffer.put(
                (byte) 0x45
        );


        buffer.put(
                (byte) 0
        );


        buffer.putShort(
                (short) ipLength
        );


        buffer.putShort(
                (short) 0
        );


        buffer.putShort(
                (short) 0x4000
        );


        buffer.put(
                (byte) 64
        );


        buffer.put(
                (byte) 17
        );


        buffer.putShort(
                (short) 0
        );


        /*
         * Source:
         * virtual DNS server.
         */
        putIpv4Address(
                buffer,
                DNS_ADDRESS
        );


        /*
         * Destination:
         * original application source address.
         */
        buffer.put(
                requestPacket,
                12,
                4
        );


        /*
         * UDP header.
         */
        buffer.putShort(
                (short) DNS_PORT
        );


        buffer.putShort(
                (short) destinationPort
        );


        buffer.putShort(
                (short) udpLength
        );


        buffer.putShort(
                (short) 0
        );


        buffer.put(
                dnsResponse
        );


        /*
         * IPv4 checksum.
         */
        int ipChecksum =
                checksum(
                        response,
                        0,
                        20
                );


        response[10] =
                (byte) (ipChecksum >> 8);

        response[11] =
                (byte) ipChecksum;


        /*
         * UDP checksum is optional for IPv4.
         * Zero is valid.
         */


        try {

            output.write(
                    response
            );

            output.flush();

        } catch (IOException ignored) {
        }
    }


    private static void putIpv4Address(
            ByteBuffer buffer,
            String address
    ) throws IOException {

        byte[] bytes =
                InetAddress
                        .getByName(address)
                        .getAddress();


        buffer.put(bytes);
    }


    private static int readUnsignedShort(
            byte[] data,
            int offset
    ) {

        return (
                ((data[offset] & 0xFF) << 8)
                |
                (data[offset + 1] & 0xFF)
        );
    }


    private static int checksum(
            byte[] data,
            int offset,
            int length
    ) {

        long sum = 0;


        int end =
                offset + length;


        for (
                int i = offset;
                i < end - 1;
                i += 2
        ) {

            sum +=
                    ((data[i] & 0xFF) << 8)
                    |
                    (data[i + 1] & 0xFF);


            while ((sum >> 16) != 0) {
                sum =
                        (sum & 0xFFFF)
                        +
                        (sum >> 16);
            }
        }


        if ((length & 1) != 0) {

            sum +=
                    (data[end - 1] & 0xFF) << 8;


            while ((sum >> 16) != 0) {
                sum =
                        (sum & 0xFFFF)
                        +
                        (sum >> 16);
            }
        }


        return (int) (~sum) & 0xFFFF;
    }


    private synchronized void stopVpn() {

        running = false;


        if (packetThread != null) {

            packetThread.interrupt();

            packetThread = null;
        }


        if (dnsSocket != null) {

            dnsSocket.close();

            dnsSocket = null;
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


    private void protect(
            DatagramSocket socket
    ) {

        super.protect(
                socket
        );
    }
}
