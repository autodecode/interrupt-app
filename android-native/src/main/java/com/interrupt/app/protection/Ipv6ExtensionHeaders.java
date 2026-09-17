package com.interrupt.app.protection;

public final class Ipv6ExtensionHeaders {

    private static final int HOP_BY_HOP = 0;
    private static final int ROUTING = 43;
    private static final int FRAGMENT = 44;
    private static final int ESP = 50;
    private static final int AH = 51;
    private static final int DESTINATION_OPTIONS = 60;
    private static final int NO_NEXT_HEADER = 59;

    private static final int MAX_EXTENSION_HEADERS = 16;


    private Ipv6ExtensionHeaders() {
    }


    public static Result parse(
            byte[] packet,
            int offset,
            int length,
            int initialNextHeader
    ) {

        if (
                packet == null
                ||
                offset < 0
                ||
                length < offset
                ||
                length > packet.length
        ) {
            return null;
        }


        int position =
                offset;

        int remaining =
                length - offset;

        int nextHeader =
                initialNextHeader;


        int headerCount = 0;


        while (
                isExtensionHeader(nextHeader)
        ) {

            if (
                    headerCount++ >=
                            MAX_EXTENSION_HEADERS
            ) {
                return null;
            }


            /*
             * ESP payload is encrypted/authenticated.
             * We cannot inspect transport information after it.
             */
            if (nextHeader == ESP) {
                return null;
            }


            /*
             * Fragmented IPv6 traffic must not be inspected
             * as though the current fragment contained a
             * complete UDP datagram.
             */
            if (nextHeader == FRAGMENT) {

                if (remaining < 8) {
                    return null;
                }


                int followingHeader =
                        packet[position] & 0xFF;


                int fragmentField =
                        unsignedShort(
                                packet,
                                position + 2
                        );


                int fragmentOffset =
                        (fragmentField >>> 3)
                                & 0x1FFF;


                boolean moreFragments =
                        (
                                fragmentField
                                        & 0x0001
                        ) != 0;


                if (
                        fragmentOffset != 0
                        ||
                        moreFragments
                ) {
                    return null;
                }


                /*
                 * An unfragmented IPv6 fragment header is
                 * still an extension header, but contains
                 * no additional payload bytes beyond its
                 * fixed eight-byte structure.
                 */
                position += 8;
                remaining -= 8;

                nextHeader =
                        followingHeader;

                continue;
            }


            if (remaining < 2) {
                return null;
            }


            int followingHeader =
                    packet[position] & 0xFF;


            int extensionLength;


            if (
                    nextHeader == AH
            ) {

                /*
                 * AH length is measured in 32-bit words,
                 * excluding the first two words.
                 *
                 * Total length = (payload_len + 2) * 4
                 */
                int payloadLength =
                        packet[position + 1]
                                & 0xFF;


                extensionLength =
                        (payloadLength + 2) * 4;

            } else {

                /*
                 * Hop-by-Hop, Routing and Destination
                 * Options use an 8-octet unit and the
                 * length byte excludes the first 8 octets.
                 */
                int lengthUnits =
                        packet[position + 1]
                                & 0xFF;


                extensionLength =
                        (lengthUnits + 1) * 8;
            }


            if (
                    extensionLength < 8
                    ||
                    extensionLength > remaining
            ) {
                return null;
            }


            position +=
                    extensionLength;

            remaining -=
                    extensionLength;

            nextHeader =
                    followingHeader;
        }


        if (
                nextHeader == NO_NEXT_HEADER
        ) {
            return null;
        }


        return new Result(
                nextHeader,
                position,
                remaining
        );
    }


    private static boolean isExtensionHeader(
            int nextHeader
    ) {

        return (
                nextHeader == HOP_BY_HOP
                ||
                nextHeader == ROUTING
                ||
                nextHeader == FRAGMENT
                ||
                nextHeader == DESTINATION_OPTIONS
                ||
                nextHeader == AH
                ||
                nextHeader == ESP
        );
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


    public static final class Result {

        private final int transportProtocol;
        private final int payloadOffset;
        private final int payloadLength;


        private Result(
                int transportProtocol,
                int payloadOffset,
                int payloadLength
        ) {

            this.transportProtocol =
                    transportProtocol;

            this.payloadOffset =
                    payloadOffset;

            this.payloadLength =
                    payloadLength;
        }


        public int getTransportProtocol() {
            return transportProtocol;
        }


        public int getPayloadOffset() {
            return payloadOffset;
        }


        public int getPayloadLength() {
            return payloadLength;
        }


        public boolean isUdp() {

            return transportProtocol ==
                    Ipv6Packet.NEXT_HEADER_UDP;
        }


        public boolean isTcp() {

            return transportProtocol ==
                    Ipv6Packet.NEXT_HEADER_TCP;
        }
    }
}
