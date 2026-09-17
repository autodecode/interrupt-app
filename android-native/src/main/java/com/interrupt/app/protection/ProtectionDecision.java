package com.interrupt.app.protection;

public final class ProtectionDecision {

    public enum Action {
        ALLOW,
        BLOCK
    }

    private final Action action;
    private final String category;
    private final String hostname;


    private ProtectionDecision(
            Action action,
            String category,
            String hostname
    ) {

        this.action = action;
        this.category = category;
        this.hostname = hostname;
    }


    public static ProtectionDecision allow(
            String hostname
    ) {

        return new ProtectionDecision(
                Action.ALLOW,
                null,
                normalize(hostname)
        );
    }


    public static ProtectionDecision block(
            String category,
            String hostname
    ) {

        return new ProtectionDecision(
                Action.BLOCK,
                category,
                normalize(hostname)
        );
    }


    public Action getAction() {
        return action;
    }


    public boolean isAllowed() {
        return action == Action.ALLOW;
    }


    public boolean isBlocked() {
        return action == Action.BLOCK;
    }


    public String getCategory() {
        return category;
    }


    public String getHostname() {
        return hostname;
    }


    private static String normalize(
            String hostname
    ) {

        if (hostname == null) {
            return "";
        }

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
