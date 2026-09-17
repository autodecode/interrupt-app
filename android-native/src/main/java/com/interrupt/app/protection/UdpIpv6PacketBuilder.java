package com.interrupt.app.protection;

public final class UdpIpv6PacketBuilder {

    private static final int IPV6_HEADER_LENGTH = 40;
    private static final int UDP_HEADER_LENGTH = 8;
    private static final int NEXT_HEADER_UDP = 17;

    private UdpIpv6PacketBuilder() {
    }


    public static byte[] buildResponse(
            byte[] sourceAddress,
            byte[] destinationAddress,
            int sourcePort,
            int destinationPort,
            byte[] payload
    ) {

        if (
                !isIpv6Address(sourceAddress)
                ||
                !isIpv6Address(destinationAddress)
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


        if (udpLength > 65535) {
            return null;
        }


        int totalLength =
                IPV6_HEADER_LENGTH
                        + udpLength;


        byte[] packet =
                new byte[totalLength];


        /*
         * IPv6 Version = 6.
         *
         * Traffic Class and Flow Label remain zero.
         */
        packet[0] =
                0x60;

        packet[1] =
                0;

        packet[2] =
                0;

        packet[3] =
                0;


        /*
         * IPv6 Payload Length includes the UDP header
         * and UDP payload, but not the 40-byte IPv6 header.
         */
        writeUnsignedShort(
                packet,
                4,
                udpLength
        );


        /*
         * Next Header = UDP.
         */
        packet[6] =
                NEXT_HEADER_UDP;


        /*
         * Hop Limit.
         */
        packet[7] =
                64;


        System.arraycopy(
                sourceAddress,
                0,
                packet,
                8,
                16
        );


        System.arraycopy(
                destinationAddress,
                0,
                packet,
                24,
                16
        );


        int udpOffset =
                IPV6_HEADER_LENGTH;


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
         * Checksum must be zero while calculating it.
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


        int checksum =
                udpChecksum(
                        sourceAddress,
                        destinationAddress,
                        packet,
                        udpOffset,
                        udpLength
                );


        /*
         * UDP checksum is mandatory for IPv6.
         */
        if (checksum == 0) {
            checksum = 0xFFFF;
        }


        writeUnsignedShort(
                packet,
                udpOffset + 6,
                checksum
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
         * IPv6 pseudo-header:
         *
         * Source Address     16 bytes
         * Destination       16 bytes
         * UDP length          4 bytes
         * Zero                3 bytes
         * Next Header         1 byte
         */


        sum =
                addAddress(
                        sum,
                        sourceAddress
                );


        sum =
                addAddress(
                        sum,
                        destinationAddress
                );


        /*
         * UDP length is encoded as a 32-bit value.
         */
        sum +=
                (udpLength >>> 16)
                        & 0xFFFF;


        sum +=
                udpLength
                        & 0xFFFF;


        /*
         * Three zero bytes followed by UDP protocol 17.
         */
        sum += NEXT_HEADER_UDP;


        sum =
                addChecksumWords(
                        sum,
                        packet,
                        udpOffset,
                        udpLength
                );


        return finalizeChecksum(sum);
    }


    private static long addAddress(
            long sum,
            byte[] address
    ) {

        for (
                int i = 0;
                i < address.length;
                i += 2
        ) {

            sum +=
                    (
                            (address[i] & 0xFF)
                                    << 8
                    )
                    |
                    (
                            address[i + 1]
                                    & 0xFF
                    );


            sum =
                    foldCarry(sum);
        }


        return sum;
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


    private static boolean isIpv6Address(
            byte[] address
    ) {

        return address != null
                &&
                address.length == 16;
    }
}
