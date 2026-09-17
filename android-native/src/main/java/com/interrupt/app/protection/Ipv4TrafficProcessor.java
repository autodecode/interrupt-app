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
         * At this layer we only inspect UDP traffic.
         *
         * TCP and other protocols are intentionally left
         * untouched and will be handled by the VPN transport
         * layer.
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


        /*
         * Do not assume that every UDP packet on port 53
         * contains a DNS query. DnsProtectionEngine performs
         * the actual DNS packet validation.
         */
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
         * The response travels in the opposite direction:
         *
         * request source      -> request destination
         * response source    <- request destination
         * response destination<- request source
         *
         * The UDP ports are reversed in exactly the same way.
         */
        byte[] responseSource =
                ipv4.getDestinationAddress();


        byte[] responseDestination =
                ipv4.getSourceAddress();


        int responseSourcePort =
                udp.getDestinationPort();


        int responseDestinationPort =
                udp.getSourcePort();


        /*
         * Rebuild a complete IPv4 + UDP packet.
         *
         * UdpIpv4PacketBuilder calculates both:
         *
         * - IPv4 header checksum
         * - UDP checksum including the IPv4 pseudo-header
         */
        return UdpIpv4PacketBuilder.buildResponse(
                responseSource,
                responseDestination,
                responseSourcePort,
                responseDestinationPort,
                dnsResponse
        );
    }
}
