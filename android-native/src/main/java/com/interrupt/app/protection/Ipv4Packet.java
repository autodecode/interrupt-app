package com.interrupt.app.protection;

import java.net.InetAddress;
import java.net.UnknownHostException;

public final class Ipv4Packet {

    public static final int MIN_HEADER_LENGTH = 20;

    public static final int PROTOCOL_TCP = 6;
    public static final int PROTOCOL_UDP = 17;


    private final byte[] packet;
    private final int length;

    private final int headerLength;
    private final int totalLength;

    private final int protocol;

    private final byte[] sourceAddress;
    private final byte[] destinationAddress;

    private final int payloadOffset;
    private final int payloadLength;


    private Ipv4Packet(
            byte[] packet,
            int length,
            int headerLength,
            int totalLength,
            int protocol,
            byte[] sourceAddress,
            byte[] destinationAddress,
            int payloadOffset,
            int payloadLength
    ) {

        this.packet = packet;
        this.length = length;
        this.headerLength = headerLength;
        this.totalLength = totalLength;
        this.protocol = protocol;
        this.sourceAddress = sourceAddress;
        this.destinationAddress = destinationAddress;
        this.payloadOffset = payloadOffset;
        this.payloadLength = payloadLength;
    }


    public static Ipv4Packet parse(
            byte[] packet,
            int length
    ) {

        if (
                packet == null
                ||
                length < MIN_HEADER_LENGTH
                ||
                length > packet.length
        ) {
            return null;
        }


        int version =
                (packet[0] >>> 4) & 0x0F;


        if (version != 4) {
            return null;
        }


        int headerLength =
                (packet[0] & 0x0F) * 4;


        if (
                headerLength < MIN_HEADER_LENGTH
                ||
                headerLength > length
        ) {
            return null;
        }


        int totalLength =
                unsignedShort(
                        packet,
                        2
                );


        if (
                totalLength < headerLength
                ||
                totalLength > length
        ) {
            return null;
        }


        int fragmentField =
                unsignedShort(
                        packet,
                        6
                );


        /*
         * We intentionally do not process fragmented
         * packets here. DNS interception requires the
         * complete UDP datagram and fragmented DNS
         * packets need reassembly before inspection.
         */
        int fragmentOffset =
                fragmentField & 0x1FFF;


        boolean moreFragments =
                (fragmentField & 0x2000) != 0;


        if (
                fragmentOffset != 0
                ||
                moreFragments
        ) {
            return null;
        }


        int protocol =
                packet[9] & 0xFF;


        byte[] sourceAddress =
                new byte[4];


        byte[] destinationAddress =
                new byte[4];


        System.arraycopy(
                packet,
                12,
                sourceAddress,
                0,
                4
        );


        System.arraycopy(
                packet,
                16,
                destinationAddress,
                0,
                4
        );


        int payloadOffset =
                headerLength;


        int payloadLength =
                totalLength - headerLength;


        return new Ipv4Packet(
                packet,
                length,
                headerLength,
                totalLength,
                protocol,
                sourceAddress,
                destinationAddress,
                payloadOffset,
                payloadLength
        );
    }


    public int getHeaderLength() {
        return headerLength;
    }


    public int getTotalLength() {
        return totalLength;
    }


    public int getProtocol() {
        return protocol;
    }


    public boolean isUdp() {
        return protocol == PROTOCOL_UDP;
    }


    public boolean isTcp() {
        return protocol == PROTOCOL_TCP;
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


    public int getPayloadOffset() {
        return payloadOffset;
    }


    public int getPayloadLength() {
        return payloadLength;
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
                new byte[totalLength];


        System.arraycopy(
                packet,
                0,
                result,
                0,
                totalLength
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

            return InetAddress
                    .getByAddress(address)
                    .getHostAddress();

        } catch (UnknownHostException ignored) {

            return "";
        }
    }
}
