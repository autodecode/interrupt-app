package com.interrupt.app.protection;

import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;

public final class Ipv6Packet {

    public static final int BASE_HEADER_LENGTH = 40;

    public static final int NEXT_HEADER_TCP = 6;
    public static final int NEXT_HEADER_UDP = 17;

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


        int declaredPayloadLength =
                unsignedShort(
                        packet,
                        4
                );


        /*
         * IPv6 supports a payload length of zero for
         * certain jumbogram configurations. Those are
         * deliberately not handled by this packet engine.
         */
        if (
                declaredPayloadLength == 0
                ||
                BASE_HEADER_LENGTH
                        + declaredPayloadLength
                        > length
        ) {
            return null;
        }


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


        int initialNextHeader =
                packet[6] & 0xFF;


        int payloadEnd =
                BASE_HEADER_LENGTH
                        + declaredPayloadLength;


        Ipv6ExtensionHeaders.Result extensionResult =
                Ipv6ExtensionHeaders.parse(
                        packet,
                        BASE_HEADER_LENGTH,
                        payloadEnd,
                        initialNextHeader
                );


        if (extensionResult == null) {
            return null;
        }


        return new Ipv6Packet(
                packet,
                length,
                extensionResult
                        .getPayloadOffset(),
                extensionResult
                        .getPayloadLength(),
                extensionResult
                        .getTransportProtocol(),
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

        byte[] result =
                new byte[length];


        System.arraycopy(
                packet,
                0,
                result,
                0,
                length
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
