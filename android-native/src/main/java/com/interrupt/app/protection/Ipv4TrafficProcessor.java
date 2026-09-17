package com.interrupt.app.protection;

import java.io.IOException;

public final class Ipv4TrafficProcessor {

    private final DnsProtectionEngine dnsProtectionEngine;


    public Ipv4TrafficProcessor(
            DnsProtectionEngine dnsProtectionEngine
    ) {

        if (dnsProtectionEngine == null) {
            throw new IllegalArgumentException(
                    "DnsProtectionEngine cannot be null"
            );
        }

        this.dnsProtectionEngine =
                dnsProtectionEngine;
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


        Ipv4Packet ipv4 =
                Ipv4Packet.parse(
                        packet,
                        length
                );


        if (ipv4 == null) {
            return null;
        }


        /*
         * Only UDP traffic can currently contain the
         * DNS queries handled by DnsProtectionEngine.
         *
         * TCP and all other IPv4 protocols are deliberately
         * not consumed here. The VPN transport layer will
         * decide how unsupported traffic is handled.
         */
        if (!ipv4.isUdp()) {
            return null;
        }


        UdpPacket udp =
                UdpPacket.parse(
                        packet,
                        ipv4.getPayloadOffset(),
                        ipv4.getPayloadLength()
                );


        if (udp == null) {
            return null;
        }


        if (!udp.isDnsRequest()) {
            return null;
        }


        byte[] dnsPayload =
                udp.getPayload();


        byte[] dnsResponse =
                dnsProtectionEngine.process(
                        dnsPayload,
                        dnsPayload.length
                );


        if (dnsResponse == null) {
            return null;
        }


        /*
         * At this stage we have a DNS response payload,
         * but it cannot simply be written back as-is.
         *
         * The next networking layer will construct the
         * corresponding UDP/IP response packet and fix
         * the checksums before writing it to the TUN device.
         */
        return dnsResponse;
    }
}
