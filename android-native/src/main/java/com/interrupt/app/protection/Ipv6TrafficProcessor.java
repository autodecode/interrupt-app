package com.interrupt.app.protection;

import java.io.IOException;

public final class Ipv6TrafficProcessor {

    private final DnsProtectionEngine dnsProtectionEngine;


    public Ipv6TrafficProcessor(
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


        Ipv6Packet ipv6 =
                Ipv6Packet.parse(
                        packet,
                        length
                );


        if (ipv6 == null) {
            return null;
        }


        /*
         * DNS inspection currently applies only to UDP.
         */
        if (!ipv6.isUdp()) {
            return null;
        }


        UdpPacket udp =
                UdpPacket.parse(
                        packet,
                        ipv6.getPayloadOffset(),
                        ipv6.getPayloadLength()
                );


        if (udp == null) {
            return null;
        }


        if (!udp.isDnsRequest()) {
            return null;
        }


        byte[] dnsRequest =
                udp.getPayload();


        byte[] dnsResponse =
                dnsProtectionEngine.process(
                        dnsRequest,
                        dnsRequest.length
                );


        if (dnsResponse == null) {
            return null;
        }


        /*
         * IPv6 has no header checksum.
         *
         * The response builder must nevertheless calculate
         * the UDP checksum using the IPv6 pseudo-header.
         */
        return UdpIpv6PacketBuilder.buildResponse(
                ipv6.getDestinationAddress(),
                ipv6.getSourceAddress(),
                udp.getDestinationPort(),
                udp.getSourcePort(),
                dnsResponse
        );
    }
}
