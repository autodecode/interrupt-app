package com.interrupt.app.protection;

public final class UdpIpv4PacketBuilder {

    private static final int IPV4_HEADER_LENGTH = 20;
    private static final int UDP_HEADER_LENGTH = 8;

    private UdpIpv4PacketBuilder() {
    }


    public static byte[] buildResponse(
            byte[] sourceAddress,
            byte[] destinationAddress,
            int sourcePort,
            int destinationPort,
            byte[] payload
    ) {

        if (
                !isIpv4Address(sourceAddress)
                ||
                !isIpv4Address(destinationAddress)
                ||
                sourcePort < 0
                ||
                sourcePort > 65535
                ||
                destinationPort < 0
                ||
                destinationPort > 65535
                ||
                payload == null
        ) {
            return null;
        }


        int udpLength =
                UDP_HEADER_LENGTH
                        + payload.length;


        int totalLength =
                IPV4_HEADER_LENGTH
                        + udpLength;


        if (totalLength > 65535) {
            return null;
        }


        byte[] packet =
                new byte[totalLength];


        /*
         * IPv4 header
         *
         * Version = 4
         * IHL = 5
         * DSCP/ECN = 0
         */
        packet[0] =
                0x45;

        packet[1] =
                0;


        writeUnsignedShort(
                packet,
                2,
                totalLength
        );


        /*
         * Identification.
         *
         * This packet is not fragmented, so a local
         * monotonically changing value is sufficient.
         */
        int identification =
                (int) (
                        System.nanoTime()
                                & 0xFFFF
                );


        writeUnsignedShort(
                packet,
                4,
                identification
        );


        /*
         * Flags:
         * DF = 1
         * Fragment offset = 0
         */
        writeUnsignedShort(
                packet,
                6,
                0x4000
        );


        /*
         * TTL
         */
        packet[8] =
                64;


        /*
         * UDP
         */
        packet[9] =
                17;


        System.arraycopy(
                sourceAddress,
                0,
                packet,
                12,
                4
        );


        System.arraycopy(
                destinationAddress,
                0,
                packet,
                16,
                4
        );


        /*
         * IPv4 header checksum is calculated after
         * all IPv4 header fields are populated.
         */
        writeUnsignedShort(
                packet,
                10,
                0
        );


        int ipChecksum =
                checksum(
                        packet,
                        0,
                        IPV4_HEADER_LENGTH
                );


        writeUnsignedShort(
                packet,
                10,
                ipChecksum
        );


        /*
         * UDP header
         */
        int udpOffset =
                IPV4_HEADER_LENGTH;


        writeUnsignedShort(
                packet,
                udpOffset,
                sourcePort
        );


        writeUnsignedShort(
                packet,
                udpOffset + 2,
                destinationPort
        );


        writeUnsignedShort(
                packet,
                udpOffset + 4,
                udpLength
        );


        /*
         * UDP checksum is calculated over:
         *
         * IPv4 pseudo-header
         * UDP header
         * UDP payload
         */
        writeUnsignedShort(
                packet,
                udpOffset + 6,
                0
        );


        System.arraycopy(
                payload,
                0,
                packet,
                udpOffset + UDP_HEADER_LENGTH,
                payload.length
        );


        int udpChecksum =
                udpChecksum(
                        sourceAddress,
                        destinationAddress,
                        packet,
                        udpOffset,
                        udpLength
                );


        /*
         * A calculated UDP checksum of zero is transmitted
         * as 0xFFFF for IPv4 UDP.
         */
        if (udpChecksum == 0) {
            udpChecksum = 0xFFFF;
        }


        writeUnsignedShort(
                packet,
                udpOffset + 6,
                udpChecksum
        );


        return packet;
    }


    private static int udpChecksum(
            byte[] sourceAddress,
            byte[] destinationAddress,
            byte[] packet,
            int udpOffset,
            int udpLength
    ) {

        long sum = 0;


        /*
         * IPv4 pseudo-header source address.
         */
        sum += unsignedByte(
                sourceAddress[0]
        ) << 8;

        sum += unsignedByte(
                sourceAddress[1]
        );

        sum += unsignedByte(
                sourceAddress[2]
        ) << 8;

        sum += unsignedByte(
                sourceAddress[3]
        );


        /*
         * IPv4 pseudo-header destination address.
         */
        sum += unsignedByte(
                destinationAddress[0]
        ) << 8;

        sum += unsignedByte(
                destinationAddress[1]
        );

        sum += unsignedByte(
                destinationAddress[2]
        ) << 8;

        sum += unsignedByte(
                destinationAddress[3]
        );


        /*
         * Reserved byte + protocol.
         */
        sum += 17;


        /*
         * UDP length.
         */
        sum +=
                ((udpLength >>> 8) & 0xFF) << 8;

        sum +=
                udpLength & 0xFF;


        sum =
                addChecksumWords(
                        sum,
                        packet,
                        udpOffset,
                        udpLength
                );


        return finalizeChecksum(sum);
    }


    private static int checksum(
            byte[] data,
            int offset,
            int length
    ) {

        long sum =
                addChecksumWords(
                        0,
                        data,
                        offset,
                        length
                );


        return finalizeChecksum(sum);
    }


    private static long addChecksumWords(
            long sum,
            byte[] data,
            int offset,
            int length
    ) {

        int end =
                offset + length;


        int position =
                offset;


        while (
                position + 1 < end
        ) {

            sum +=
                    (
                            (data[position] & 0xFF)
                                    << 8
                    )
                    |
                    (
                            data[position + 1]
                                    & 0xFF
                    );


            sum =
                    foldCarry(sum);


            position += 2;
        }


        if (position < end) {

            sum +=
                    (
                            data[position]
                                    & 0xFF
                    )
                    << 8;


            sum =
                    foldCarry(sum);
        }


        return sum;
    }


    private static long foldCarry(
            long value
    ) {

        while (
                (value >>> 16) != 0
        ) {

            value =
                    (value & 0xFFFF)
                            +
                    (value >>> 16);
        }


        return value;
    }


    private static int finalizeChecksum(
            long value
    ) {

        value =
                foldCarry(value);


        return (
                ~((int) value)
        ) & 0xFFFF;
    }


    private static void writeUnsignedShort(
            byte[] data,
            int offset,
            int value
    ) {

        data[offset] =
                (byte) (
                        (value >>> 8)
                                & 0xFF
                );


        data[offset + 1] =
                (byte) (
                        value & 0xFF
                );
    }


    private static int unsignedByte(
            byte value
    ) {

        return value & 0xFF;
    }


    private static boolean isIpv4Address(
            byte[] address
    ) {

        return address != null
                &&
                address.length == 4;
    }
}
