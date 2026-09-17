package com.interrupt.app.protection;

import java.io.IOException;

public final class VpnPacketProcessor {

    private static final int IPV4 = 4;
    private static final int IPV6 = 6;

    private final Ipv4TrafficProcessor ipv4Processor;
    private final Ipv6TrafficProcessor ipv6Processor;


    public VpnPacketProcessor(
            Ipv4TrafficProcessor ipv4Processor,
            Ipv6TrafficProcessor ipv6Processor
    ) {

        if (ipv4Processor == null) {
            throw new IllegalArgumentException(
                    "Ipv4TrafficProcessor cannot be null"
            );
        }

        if (ipv6Processor == null) {
            throw new IllegalArgumentException(
                    "Ipv6TrafficProcessor cannot be null"
            );
        }

        this.ipv4Processor =
                ipv4Processor;

        this.ipv6Processor =
                ipv6Processor;
    }


    public byte[] process(
            byte[] packet,
            int length
    ) throws IOException {

        if (
                packet == null
                ||
                length <= 0
                ||
                length > packet.length
        ) {
            return null;
        }


        int version =
                (packet[0] >>> 4) & 0x0F;


        switch (version) {

            case IPV4:

                return ipv4Processor.process(
                        packet,
                        length
                );


            case IPV6:

                return ipv6Processor.process(
                        packet,
                        length
                );


            default:

                /*
                 * Unknown network protocol.
                 *
                 * It is deliberately not consumed by
                 * Protection.
                 */
                return null;
        }
    }
}
