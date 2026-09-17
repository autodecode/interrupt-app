package com.interrupt.app.protection;

public final class ProtectionDecisionEngine {

    private final ProtectionController controller;


    public ProtectionDecisionEngine(
            ProtectionController controller
    ) {

        if (controller == null) {
            throw new IllegalArgumentException(
                    "ProtectionController cannot be null"
            );
        }

        this.controller = controller;
    }


    public ProtectionDecision evaluate(
            String hostname
    ) {

        if (
                hostname == null
                ||
                hostname.trim().isEmpty()
        ) {
            return ProtectionDecision.allow(
                    hostname
            );
        }


        String normalized =
                normalize(hostname);


        if (!controller.isEnabled()) {

            return ProtectionDecision.allow(
                    normalized
            );
        }


        String category =
                controller.getCategoryForDomain(
                        normalized
                );


        if (category == null) {

            return ProtectionDecision.allow(
                    normalized
            );
        }


        return ProtectionDecision.block(
                category,
                normalized
        );
    }


    public ProtectionEvent recordDecision(
            ProtectionDecision decision
    ) {

        if (
                decision == null
                ||
                !decision.isBlocked()
        ) {
            return null;
        }


        return controller.recordBlockedDomain(
                decision.getHostname()
        );
    }


    private static String normalize(
            String hostname
    ) {

        String normalized =
                hostname.trim().toLowerCase();


        while (
                normalized.startsWith(".")
        ) {
            normalized =
                    normalized.substring(1);
        }


        while (
                normalized.endsWith(".")
        ) {
            normalized =
                    normalized.substring(
                            0,
                            normalized.length() - 1
                    );
        }


        return normalized;
    }
}
