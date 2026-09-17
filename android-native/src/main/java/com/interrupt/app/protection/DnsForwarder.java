package com.interrupt.app.protection;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.util.Arrays;

public final class DnsForwarder {

    private static final int DEFAULT_PORT = 53;

    private static final int DEFAULT_TIMEOUT_MS = 3000;

    private static final int MAX_DNS_PACKET_SIZE = 4096;


    private final InetAddress resolverAddress;
    private final int resolverPort;
    private final int timeoutMs;


    public DnsForwarder(
            String resolverAddress
    ) throws IOException {

        this(
                resolverAddress,
                DEFAULT_PORT,
                DEFAULT_TIMEOUT_MS
        );
    }


    public DnsForwarder(
            String resolverAddress,
            int resolverPort,
            int timeoutMs
    ) throws IOException {

        if (
                resolverAddress == null
                ||
                resolverAddress.trim().isEmpty()
        ) {
            throw new IllegalArgumentException(
                    "Resolver address cannot be empty"
            );
        }


        if (
                resolverPort < 1
                ||
                resolverPort > 65535
        ) {
            throw new IllegalArgumentException(
                    "Invalid resolver port"
            );
        }


        if (timeoutMs <= 0) {
            throw new IllegalArgumentException(
                    "Timeout must be positive"
            );
        }


        resolverAddress =
                resolverAddress.trim();


        this.resolverAddress =
                InetAddress.getByName(
                        resolverAddress
                );

        this.resolverPort =
                resolverPort;

        this.timeoutMs =
                timeoutMs;
    }


    public byte[] forward(
            byte[] request,
            int length
    ) throws IOException {

        if (
                request == null
                ||
                length <= 0
                ||
                length > request.length
                ||
                length > MAX_DNS_PACKET_SIZE
        ) {
            throw new IllegalArgumentException(
                    "Invalid DNS request"
            );
        }


        byte[] payload =
                Arrays.copyOf(
                        request,
                        length
                );


        try (
                DatagramSocket socket =
                        new DatagramSocket()
        ) {

            socket.setSoTimeout(
                    timeoutMs
            );


            DatagramPacket outgoing =
                    new DatagramPacket(
                            payload,
                            payload.length,
                            resolverAddress,
                            resolverPort
                    );


            socket.send(
                    outgoing
            );


            byte[] responseBuffer =
                    new byte[
                            MAX_DNS_PACKET_SIZE
                    ];


            DatagramPacket incoming =
                    new DatagramPacket(
                            responseBuffer,
                            responseBuffer.length
                    );


            socket.receive(
                    incoming
            );


            if (
                    incoming.getLength() <= 0
                    ||
                    incoming.getLength()
                            > MAX_DNS_PACKET_SIZE
            ) {
                return null;
            }


            return Arrays.copyOf(
                    incoming.getData(),
                    incoming.getLength()
            );
        }
        catch (SocketTimeoutException ignored) {

            return null;
        }
    }
}
