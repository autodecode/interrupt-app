package com.interrupt.app.protection;

import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;

public final class Ipv6Packet {

    public static final int BASE_HEADER_LENGTH = 40;

    public static final int NEXT_HEADER_TCP = 6;
    public static final int NEXT_HEADER_UDP = 17;

    public static final int NEXT_HEADER_FRAGMENT = 44;

    private final byte[] packet;
    private final int length;

    private final int payloadOffset;
    private final int payloadLength;

    private final int nextHeader;

    private final byte[] sourceAddress;
    private final byte[] destinationAddress;


    private Ipv6Packet(
            byte[] packet,
            int length,
            int payloadOffset,
            int payloadLength,
            int nextHeader,
            byte[] sourceAddress,
            byte[] destinationAddress
    ) {

        this.packet = packet;
        this.length = length;
        this.payloadOffset = payloadOffset;
        this.payloadLength = payloadLength;
        this.nextHeader = nextHeader;
        this.sourceAddress = sourceAddress;
        this.destinationAddress = destinationAddress;
    }


    public static Ipv6Packet parse(
            byte[] packet,
            int length
    ) {

        if (
                packet == null
                ||
                length < BASE_HEADER_LENGTH
                ||
                length > packet.length
        ) {
            return null;
        }


        int version =
                (packet[0] >>> 4) & 0x0F;


        if (version != 6) {
            return null;
        }


        int payloadLength =
                unsignedShort(
                        packet,
                        4
                );


        if (
                payloadLength < 0
                ||
                BASE_HEADER_LENGTH + payloadLength
                        > length
        ) {
            return null;
        }


        int nextHeader =
                packet[6] & 0xFF;


        byte[] sourceAddress =
                new byte[16];


        byte[] destinationAddress =
                new byte[16];


        System.arraycopy(
                packet,
                8,
                sourceAddress,
                0,
                16
        );


        System.arraycopy(
                packet,
                24,
                destinationAddress,
                0,
                16
        );


        /*
         * Extension headers change where the transport
         * payload begins.
         *
         * We do not guess through arbitrary extension
         * chains here. The VPN layer will treat packets
         * requiring extension-header traversal separately.
         *
         * Fragment headers are especially important because
         * inspecting an incomplete fragment as DNS would be
         * unsafe.
         */
        if (
                nextHeader == NEXT_HEADER_FRAGMENT
        ) {
            return null;
        }


        int payloadOffset =
                BASE_HEADER_LENGTH;


        return new Ipv6Packet(
                packet,
                length,
                payloadOffset,
                payloadLength,
                nextHeader,
                sourceAddress,
                destinationAddress
        );
    }


    public int getPayloadOffset() {
        return payloadOffset;
    }


    public int getPayloadLength() {
        return payloadLength;
    }


    public int getNextHeader() {
        return nextHeader;
    }


    public boolean isUdp() {

        return nextHeader ==
                NEXT_HEADER_UDP;
    }


    public boolean isTcp() {

        return nextHeader ==
                NEXT_HEADER_TCP;
    }


    public byte[] getSourceAddress() {

        return sourceAddress.clone();
    }


    public byte[] getDestinationAddress() {

        return destinationAddress.clone();
    }


    public String getSourceAddressString() {

        return toAddressString(
                sourceAddress
        );
    }


    public String getDestinationAddressString() {

        return toAddressString(
                destinationAddress
        );
    }


    public byte[] getPayload() {

        byte[] payload =
                new byte[payloadLength];


        System.arraycopy(
                packet,
                payloadOffset,
                payload,
                0,
                payloadLength
        );


        return payload;
    }


    public byte[] copyPacket() {

        int packetLength =
                BASE_HEADER_LENGTH
                        + payloadLength;


        byte[] result =
                new byte[packetLength];


        System.arraycopy(
                packet,
                0,
                result,
                0,
                packetLength
        );


        return result;
    }


    private static int unsignedShort(
            byte[] packet,
            int offset
    ) {

        return (
                ((packet[offset] & 0xFF) << 8)
                |
                (packet[offset + 1] & 0xFF)
        );
    }


    private static String toAddressString(
            byte[] address
    ) {

        try {

            InetAddress inetAddress =
                    InetAddress.getByAddress(
                            address
                    );


            if (
                    inetAddress
                            instanceof Inet6Address
            ) {

                return inetAddress
                        .getHostAddress();
            }


            return inetAddress
                    .getHostAddress();

        } catch (UnknownHostException ignored) {

            return "";
        }
    }
}
