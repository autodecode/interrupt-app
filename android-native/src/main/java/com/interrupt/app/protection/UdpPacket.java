package com.interrupt.app.protection;

public final class UdpPacket {

    public static final int HEADER_LENGTH = 8;

    private final byte[] packet;
    private final int offset;
    private final int length;

    private final int sourcePort;
    private final int destinationPort;

    private final int udpLength;
    private final int payloadOffset;
    private final int payloadLength;


    private UdpPacket(
            byte[] packet,
            int offset,
            int length,
            int sourcePort,
            int destinationPort,
            int udpLength,
            int payloadOffset,
            int payloadLength
    ) {

        this.packet = packet;
        this.offset = offset;
        this.length = length;
        this.sourcePort = sourcePort;
        this.destinationPort = destinationPort;
        this.udpLength = udpLength;
        this.payloadOffset = payloadOffset;
        this.payloadLength = payloadLength;
    }


    public static UdpPacket parse(
            byte[] packet,
            int offset,
            int length
    ) {

        if (
                packet == null
                ||
                offset < 0
                ||
                length < HEADER_LENGTH
                ||
                offset + length > packet.length
        ) {
            return null;
        }


        int sourcePort =
                unsignedShort(
                        packet,
                        offset
                );


        int destinationPort =
                unsignedShort(
                        packet,
                        offset + 2
                );


        int udpLength =
                unsignedShort(
                        packet,
                        offset + 4
                );


        /*
         * UDP length includes the UDP header itself.
         */
        if (
                udpLength < HEADER_LENGTH
                ||
                udpLength > length
        ) {
            return null;
        }


        int payloadOffset =
                offset + HEADER_LENGTH;


        int payloadLength =
                udpLength - HEADER_LENGTH;


        return new UdpPacket(
                packet,
                offset,
                length,
                sourcePort,
                destinationPort,
                udpLength,
                payloadOffset,
                payloadLength
        );
    }


    public int getSourcePort() {
        return sourcePort;
    }


    public int getDestinationPort() {
        return destinationPort;
    }


    public int getUdpLength() {
        return udpLength;
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


    public boolean isDnsRequest() {

        return (
                sourcePort == 53
                ||
                destinationPort == 53
        );
    }


    public byte[] copyPacket() {

        byte[] result =
                new byte[udpLength];


        System.arraycopy(
                packet,
                offset,
                result,
                0,
                udpLength
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
}
