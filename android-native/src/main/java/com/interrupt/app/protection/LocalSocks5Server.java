package com.interrupt.app.protection;

import android.net.VpnService;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class LocalSocks5Server {

    private static final String LISTEN_ADDRESS =
            "127.0.0.1";

    private static final int LISTEN_PORT =
            1080;

    private static final int SOCKS_VERSION =
            0x05;

    private static final int NO_AUTH =
            0x00;

    private static final int CMD_CONNECT =
            0x01;

    private static final int CMD_UDP_ASSOCIATE =
            0x03;

    private static final int ATYP_IPV4 =
            0x01;

    private static final int ATYP_DOMAIN =
            0x03;

    private static final int ATYP_IPV6 =
            0x04;

    private static final int REP_SUCCESS =
            0x00;

    private static final int REP_GENERAL_FAILURE =
            0x01;

    private static final int REP_RULESET_DENIED =
            0x02;

    private static final int REP_COMMAND_NOT_SUPPORTED =
            0x07;

    private static final int MAX_DOMAIN_LENGTH =
            255;

    private static final int MAX_UDP_PACKET_SIZE =
            65535;

    private static final int CONNECT_TIMEOUT_MS =
            10000;

    private static final int HANDSHAKE_TIMEOUT_MS =
            15000;

    private static final int UDP_TIMEOUT_MS =
            3000;

    private final VpnService vpnService;

    private final ProtectionController protectionController;

    private final ExecutorService executor =
            Executors.newCachedThreadPool();

    private volatile boolean running;

    private volatile ServerSocket serverSocket;


    public LocalSocks5Server(
            VpnService vpnService,
            ProtectionController protectionController
    ) {

        if (vpnService == null) {
            throw new IllegalArgumentException(
                    "VpnService cannot be null"
            );
        }

        if (protectionController == null) {
            throw new IllegalArgumentException(
                    "ProtectionController cannot be null"
            );
        }

        this.vpnService =
                vpnService;

        this.protectionController =
                protectionController;
    }


    public synchronized boolean start() {

        if (running) {
            return true;
        }

        try {

            ServerSocket socket =
                    new ServerSocket();

            socket.setReuseAddress(true);

            socket.bind(
                    new InetSocketAddress(
                            LISTEN_ADDRESS,
                            LISTEN_PORT
                    )
            );

            serverSocket =
                    socket;

            running = true;

            executor.execute(
                    new Runnable() {
                        @Override
                        public void run() {
                            acceptLoop();
                        }
                    }
            );

            return true;

        } catch (Exception error) {

            running = false;

            ServerSocket current =
                    serverSocket;

            serverSocket = null;

            if (current != null) {

                try {
                    current.close();
                } catch (Exception ignored) {
                }
            }

            return false;
        }
    }


    public synchronized void stop() {

        running = false;

        ServerSocket current =
                serverSocket;

        serverSocket = null;

        if (current != null) {

            try {
                current.close();
            } catch (Exception ignored) {
            }
        }

        executor.shutdownNow();
    }


    public boolean isRunning() {

        return running;
    }


    private void acceptLoop() {

        while (running) {

            ServerSocket current =
                    serverSocket;

            if (current == null) {
                break;
            }

            try {

                final Socket client =
                        current.accept();

                executor.execute(
                        new Runnable() {
                            @Override
                            public void run() {
                                handleClient(client);
                            }
                        }
                );

            } catch (SocketException error) {

                if (!running) {
                    break;
                }

            } catch (IOException error) {

                if (!running) {
                    break;
                }
            }
        }
    }


    private void handleClient(
            Socket client
    ) {

        try (Socket socket = client) {

            socket.setSoTimeout(
                    HANDSHAKE_TIMEOUT_MS
            );

            DataInputStream input =
                    new DataInputStream(
                            new BufferedInputStream(
                                    socket.getInputStream()
                            )
                    );

            DataOutputStream output =
                    new DataOutputStream(
                            new BufferedOutputStream(
                                    socket.getOutputStream()
                            )
                    );

            if (!performHandshake(
                    input,
                    output
            )) {
                return;
            }

            SocksRequest request =
                    readRequest(input);

            if (request == null) {
                return;
            }

            if (
                    request.command
                            == CMD_CONNECT
            ) {

                handleConnect(
                        socket,
                        output,
                        request
                );

                return;
            }

            if (
                    request.command
                            == CMD_UDP_ASSOCIATE
            ) {

                handleUdpAssociate(
                        socket,
                        input,
                        output
                );

                return;
            }

            sendReply(
                    output,
                    REP_COMMAND_NOT_SUPPORTED,
                    null,
                    0
            );

        } catch (Exception ignored) {
        }
    }


    private boolean performHandshake(
            DataInputStream input,
            DataOutputStream output
    ) throws IOException {

        int version =
                input.readUnsignedByte();

        if (version != SOCKS_VERSION) {
            return false;
        }

        int methodCount =
                input.readUnsignedByte();

        if (
                methodCount <= 0
                ||
                methodCount > 255
        ) {
            return false;
        }

        boolean noAuthSupported =
                false;

        for (
                int i = 0;
                i < methodCount;
                i++
        ) {

            int method =
                    input.readUnsignedByte();

            if (method == NO_AUTH) {
                noAuthSupported = true;
            }
        }

        if (!noAuthSupported) {

            output.writeByte(
                    SOCKS_VERSION
            );

            output.writeByte(
                    0xFF
            );

            output.flush();

            return false;
        }

        output.writeByte(
                SOCKS_VERSION
        );

        output.writeByte(
                NO_AUTH
        );

        output.flush();

        return true;
    }


    private SocksRequest readRequest(
            DataInputStream input
    ) throws IOException {

        int version =
                input.readUnsignedByte();

        if (version != SOCKS_VERSION) {
            return null;
        }

        int command =
                input.readUnsignedByte();

        input.readUnsignedByte();

        int addressType =
                input.readUnsignedByte();

        String hostname = null;

        InetAddress address = null;

        if (addressType == ATYP_IPV4) {

            byte[] bytes =
                    new byte[4];

            input.readFully(bytes);

            address =
                    InetAddress.getByAddress(
                            bytes
                    );

        } else if (
                addressType
                        == ATYP_DOMAIN
        ) {

            int length =
                    input.readUnsignedByte();

            if (
                    length <= 0
                    ||
                    length > MAX_DOMAIN_LENGTH
            ) {
                return null;
            }

            byte[] bytes =
                    new byte[length];

            input.readFully(bytes);

            hostname =
                    new String(
                            bytes,
                            StandardCharsets.UTF_8
                    )
                            .trim()
                            .toLowerCase();

            if (hostname.isEmpty()) {
                return null;
            }

        } else if (
                addressType
                        == ATYP_IPV6
        ) {

            byte[] bytes =
                    new byte[16];

            input.readFully(bytes);

            address =
                    InetAddress.getByAddress(
                            bytes
                    );

        } else {

            return null;
        }

        int port =
                input.readUnsignedShort();

        return new SocksRequest(
                command,
                addressType,
                hostname,
                address,
                port
        );
    }


    private void handleConnect(
            Socket client,
            DataOutputStream output,
            SocksRequest request
    ) throws IOException {

        /*
         * When HEV MapDNS is working correctly, a hostname
         * request should arrive here as SOCKS5 ATYP_DOMAIN.
         *
         * Check the real hostname before any DNS resolution.
         */
        if (request.hostname != null) {

            String category =
                    protectionController
                            .getCategoryForDomain(
                                    request.hostname
                            );

            if (category != null) {

                protectionController
                        .recordBlockedDomain(
                                request.hostname
                        );

                sendReply(
                        output,
                        REP_RULESET_DENIED,
                        null,
                        0
                );

                return;
            }
        }

        Socket upstream =
                new Socket();

        try {

            /*
             * IMPORTANT:
             *
             * Protect the socket BEFORE connect().
             *
             * This prevents the upstream connection from
             * being captured again by INTERRUPT's VPN.
             *
             * For hostname connections this also allows the
             * socket's network context to be used for the
             * hostname resolution rather than resolving the
             * HEV MapDNS fake address and reconnecting to it.
             */
            if (
                    !vpnService.protect(
                            upstream
                    )
            ) {

                throw new IOException(
                        "Unable to protect upstream socket"
                );
            }

            if (request.hostname != null) {

                upstream.connect(
                        new InetSocketAddress(
                                request.hostname,
                                request.port
                        ),
                        CONNECT_TIMEOUT_MS
                );

            } else if (
                    request.address != null
            ) {

                upstream.connect(
                        new InetSocketAddress(
                                request.address,
                                request.port
                        ),
                        CONNECT_TIMEOUT_MS
                );

            } else {

                throw new IOException(
                        "Missing destination address"
                );
            }

            sendReply(
                    output,
                    REP_SUCCESS,
                    upstream.getLocalAddress(),
                    upstream.getLocalPort()
            );

            client.setSoTimeout(0);
            upstream.setSoTimeout(0);

            relay(
                    client,
                    upstream
            );

        } catch (IOException error) {

            try {

                sendReply(
                        output,
                        REP_GENERAL_FAILURE,
                        null,
                        0
                );

            } catch (Exception ignored) {
            }

        } finally {

            try {
                upstream.close();
            } catch (Exception ignored) {
            }
        }
    }


    private void handleUdpAssociate(
            Socket controlSocket,
            DataInputStream input,
            DataOutputStream output
    ) throws IOException {

        DatagramSocket relaySocket =
                new DatagramSocket(
                        new InetSocketAddress(
                                LISTEN_ADDRESS,
                                0
                        )
                );

        try {

            /*
             * The UDP relay itself must bypass the VPN.
             */
            if (
                    !vpnService.protect(
                            relaySocket
                    )
            ) {

                throw new IOException(
                        "Unable to protect UDP socket"
                );
            }

            InetAddress bindAddress =
                    InetAddress.getByName(
                            LISTEN_ADDRESS
                    );

            sendReply(
                    output,
                    REP_SUCCESS,
                    bindAddress,
                    relaySocket.getLocalPort()
            );

            output.flush();

            relaySocket.setSoTimeout(
                    1000
            );

            InetAddress clientAddress =
                    controlSocket.getInetAddress();

            executor.execute(
                    new Runnable() {
                        @Override
                        public void run() {

                            udpRelayLoop(
                                    relaySocket,
                                    clientAddress
                            );
                        }
                    }
            );

            /*
             * Keep the SOCKS5 control connection alive.
             */
            while (running) {

                try {

                    int value =
                            input.read();

                    if (value < 0) {
                        break;
                    }

                } catch (
                        SocketTimeoutException ignored
                ) {
                    /*
                     * Normal keep-alive period.
                     */
                }
            }

        } finally {

            relaySocket.close();
        }
    }


    private void udpRelayLoop(
            DatagramSocket relaySocket,
            InetAddress clientAddress
    ) {

        byte[] buffer =
                new byte[
                        MAX_UDP_PACKET_SIZE
                ];

        while (
                running
                &&
                !relaySocket.isClosed()
        ) {

            DatagramPacket packet =
                    new DatagramPacket(
                            buffer,
                            buffer.length
                    );

            try {

                relaySocket.receive(
                        packet
                );

                if (
                        clientAddress != null
                        &&
                        !clientAddress.equals(
                                packet.getAddress()
                        )
                ) {
                    continue;
                }

                handleUdpPacket(
                        relaySocket,
                        packet
                );

            } catch (
                    SocketTimeoutException ignored
            ) {

            } catch (Exception error) {

                if (!running) {
                    break;
                }
            }
        }
    }


    private void handleUdpPacket(
            DatagramSocket relaySocket,
            DatagramPacket packet
    ) throws IOException {

        byte[] data =
                packet.getData();

        int length =
                packet.getLength();

        if (length < 4) {
            return;
        }

        int position = 0;

        int reserved =
                ((data[position] & 0xFF) << 8)
                        |
                (data[position + 1] & 0xFF);

        position += 2;

        if (reserved != 0) {
            return;
        }

        int fragment =
                data[position++] & 0xFF;

        if (fragment != 0) {
            return;
        }

        int addressType =
                data[position++] & 0xFF;

        String hostname = null;

        InetAddress destination = null;

        if (addressType == ATYP_IPV4) {

            if (position + 4 > length) {
                return;
            }

            byte[] bytes =
                    new byte[4];

            System.arraycopy(
                    data,
                    position,
                    bytes,
                    0,
                    4
            );

            position += 4;

            destination =
                    InetAddress.getByAddress(
                            bytes
                    );

        } else if (
                addressType
                        == ATYP_IPV6
        ) {

            if (position + 16 > length) {
                return;
            }

            byte[] bytes =
                    new byte[16];

            System.arraycopy(
                    data,
                    position,
                    bytes,
                    0,
                    16
            );

            position += 16;

            destination =
                    InetAddress.getByAddress(
                            bytes
                    );

        } else if (
                addressType
                        == ATYP_DOMAIN
        ) {

            if (position >= length) {
                return;
            }

            int domainLength =
                    data[position++] & 0xFF;

            if (
                    domainLength <= 0
                    ||
                    domainLength > MAX_DOMAIN_LENGTH
                    ||
                    position + domainLength > length
            ) {
                return;
            }

            hostname =
                    new String(
                            data,
                            position,
                            domainLength,
                            StandardCharsets.UTF_8
                    )
                            .trim()
                            .toLowerCase();

            position += domainLength;

        } else {

            return;
        }

        if (position + 2 > length) {
            return;
        }

        int port =
                ((data[position] & 0xFF) << 8)
                        |
                (data[position + 1] & 0xFF);

        position += 2;

        /*
         * Domain filtering happens before any resolution.
         */
        if (hostname != null) {

            String category =
                    protectionController
                            .getCategoryForDomain(
                                    hostname
                            );

            if (category != null) {

                protectionController
                        .recordBlockedDomain(
                                hostname
                        );

                return;
            }
        }

        if (destination == null) {

            if (hostname == null) {
                return;
            }

            try {

                destination =
                        InetAddress.getByName(
                                hostname
                        );

            } catch (Exception error) {

                return;
            }
        }

        int payloadLength =
                length - position;

        if (payloadLength < 0) {
            return;
        }

        byte[] payload =
                new byte[payloadLength];

        System.arraycopy(
                data,
                position,
                payload,
                0,
                payloadLength
        );

        DatagramSocket upstream =
                new DatagramSocket();

        try {

            /*
             * Protect BEFORE sending so the upstream UDP
             * packet does not re-enter the VPN.
             */
            if (
                    !vpnService.protect(
                            upstream
                    )
            ) {
                return;
            }

            DatagramPacket outgoing =
                    new DatagramPacket(
                            payload,
                            payload.length,
                            destination,
                            port
                    );

            upstream.setSoTimeout(
                    UDP_TIMEOUT_MS
            );

            upstream.send(
                    outgoing
            );

            byte[] responseBuffer =
                    new byte[
                            MAX_UDP_PACKET_SIZE
                    ];

            DatagramPacket response =
                    new DatagramPacket(
                            responseBuffer,
                            responseBuffer.length
                    );

            upstream.receive(
                    response
            );

            byte[] socksResponse =
                    buildUdpResponse(
                            addressType,
                            hostname,
                            destination,
                            port,
                            response.getData(),
                            response.getLength()
                    );

            DatagramPacket clientResponse =
                    new DatagramPacket(
                            socksResponse,
                            socksResponse.length,
                            packet.getAddress(),
                            packet.getPort()
                    );

            relaySocket.send(
                    clientResponse
            );

        } catch (
                SocketTimeoutException ignored
        ) {

        } finally {

            upstream.close();
        }
    }


    private byte[] buildUdpResponse(
            int addressType,
            String hostname,
            InetAddress destination,
            int port,
            byte[] payload,
            int payloadLength
    ) {

        int addressLength;

        if (addressType == ATYP_IPV4) {

            addressLength = 4;

        } else if (
                addressType == ATYP_IPV6
        ) {

            addressLength = 16;

        } else {

            byte[] domain =
                    hostname == null
                            ? new byte[0]
                            : hostname.getBytes(
                                    StandardCharsets.UTF_8
                            );

            addressLength =
                    1 + domain.length;
        }

        byte[] result =
                new byte[
                        4
                                + addressLength
                                + 2
                                + payloadLength
                ];

        int position = 0;

        result[position++] = 0;
        result[position++] = 0;
        result[position++] = 0;
        result[position++] =
                (byte) addressType;

        if (addressType == ATYP_DOMAIN) {

            byte[] domain =
                    hostname.getBytes(
                            StandardCharsets.UTF_8
                    );

            result[position++] =
                    (byte) domain.length;

            System.arraycopy(
                    domain,
                    0,
                    result,
                    position,
                    domain.length
            );

            position += domain.length;

        } else {

            byte[] address =
                    destination.getAddress();

            System.arraycopy(
                    address,
                    0,
                    result,
                    position,
                    address.length
            );

            position += address.length;
        }

        result[position++] =
                (byte) (
                        (port >>> 8)
                                & 0xFF
                );

        result[position++] =
                (byte) (
                        port & 0xFF
                );

        System.arraycopy(
                payload,
                0,
                result,
                position,
                payloadLength
        );

        return result;
    }


    private void relay(
            Socket client,
            Socket remote
    ) {

        Thread clientToRemote =
                new Thread(
                        new Runnable() {
                            @Override
                            public void run() {

                                copy(
                                        client,
                                        remote
                                );
                            }
                        },
                        "interrupt-socks-c2r"
                );

        Thread remoteToClient =
                new Thread(
                        new Runnable() {
                            @Override
                            public void run() {

                                copy(
                                        remote,
                                        client
                                );
                            }
                        },
                        "interrupt-socks-r2c"
                );

        clientToRemote.start();
        remoteToClient.start();

        try {

            clientToRemote.join();

        } catch (InterruptedException ignored) {

            Thread.currentThread().interrupt();
        }

        try {

            remoteToClient.join();

        } catch (InterruptedException ignored) {

            Thread.currentThread().interrupt();
        }
    }


    private void copy(
            Socket source,
            Socket destination
    ) {

        try {

            byte[] buffer =
                    new byte[16384];

            BufferedInputStream input =
                    new BufferedInputStream(
                            source.getInputStream()
                    );

            BufferedOutputStream output =
                    new BufferedOutputStream(
                            destination.getOutputStream()
                    );

            int length;

            while (
                    (
                            length =
                                    input.read(buffer)
                    )
                    != -1
            ) {

                output.write(
                        buffer,
                        0,
                        length
                );

                output.flush();
            }

        } catch (IOException ignored) {

        } finally {

            try {
                source.shutdownInput();
            } catch (Exception ignored) {
            }

            try {
                destination.shutdownOutput();
            } catch (Exception ignored) {
            }
        }
    }


    private void sendReply(
            DataOutputStream output,
            int reply,
            InetAddress address,
            int port
    ) throws IOException {

        output.writeByte(
                SOCKS_VERSION
        );

        output.writeByte(
                reply
        );

        output.writeByte(0);

        if (address != null
                && address.getAddress().length == 16) {

            output.writeByte(
                    ATYP_IPV6
            );

            output.write(
                    address.getAddress()
            );

        } else {

            output.writeByte(
                    ATYP_IPV4
            );

            if (address == null) {

                output.write(
                        new byte[]{
                                0,
                                0,
                                0,
                                0
                        }
                );

            } else {

                byte[] bytes =
                        address.getAddress();

                if (bytes.length != 4) {

                    output.write(
                            new byte[]{
                                    0,
                                    0,
                                    0,
                                    0
                            }
                    );

                } else {

                    output.write(
                            bytes
                    );
                }
            }
        }

        output.writeShort(
                port
        );

        output.flush();
    }


    private static final class SocksRequest {

        final int command;

        final int addressType;

        final String hostname;

        final InetAddress address;

        final int port;


        SocksRequest(
                int command,
                int addressType,
                String hostname,
                InetAddress address,
                int port
        ) {

            this.command =
                    command;

            this.addressType =
                    addressType;

            this.hostname =
                    hostname;

            this.address =
                    address;

            this.port =
                    port;
        }
    }
}
