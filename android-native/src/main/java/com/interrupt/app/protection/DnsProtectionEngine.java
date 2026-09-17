package com.interrupt.app.protection;

import java.io.IOException;

public final class DnsProtectionEngine {

    private final ProtectionDecisionEngine decisionEngine;
    private final DnsForwarder forwarder;


    public DnsProtectionEngine(
            ProtectionDecisionEngine decisionEngine,
            DnsForwarder forwarder
    ) {

        if (decisionEngine == null) {
            throw new IllegalArgumentException(
                    "ProtectionDecisionEngine cannot be null"
            );
        }

        if (forwarder == null) {
            throw new IllegalArgumentException(
                    "DnsForwarder cannot be null"
            );
        }

        this.decisionEngine =
                decisionEngine;

        this.forwarder =
                forwarder;
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


        if (
                !DnsPacket.isDnsQuery(
                        packet,
                        length
                )
        ) {
            return null;
        }


        DnsPacket.Query query =
                DnsPacket.parseQuery(
                        packet,
                        length
                );


        if (query == null) {
            return null;
        }


        ProtectionDecision decision =
                decisionEngine.evaluate(
                        query.hostname
                );


        if (decision.isBlocked()) {

            ProtectionEvent event =
                    decisionEngine.recordDecision(
                            decision
                    );

            /*
             * The event is persisted before the DNS
             * response is returned. This guarantees that
             * a successful protection interception is
             * recorded even if the UI is not currently open.
             */

            return DnsPacket.buildNxDomainResponse(
                    packet,
                    length
            );
        }


        return forwarder.forward(
                packet,
                length
        );
    }
}
