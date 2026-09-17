package com.interrupt.app.protection;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public final class ProtectionConfig {

    private ProtectionConfig() {
    }

    /*
     * Protection categories used by INTERRUPT.
     *
     * These names intentionally match the protection
     * categories already used by the web application.
     */
    public static final String CATEGORY_GAMBLING = "gambling";
    public static final String CATEGORY_PORNOGRAPHY = "pornography";


    /*
     * Protection is enabled by default only for domains
     * explicitly belonging to a configured category.
     *
     * The lists are kept separate so that the native layer
     * can later receive/update them from the INTERRUPT app
     * without changing the VPN engine.
     */
    private static final Set<String> GAMBLING_DOMAINS =
            Collections.unmodifiableSet(
                    new HashSet<>(Arrays.asList(
                            "example-gambling.invalid"
                    ))
            );


    private static final Set<String> PORNOGRAPHY_DOMAINS =
            Collections.unmodifiableSet(
                    new HashSet<>(Arrays.asList(
                            "example-pornography.invalid"
                    ))
            );


    public static Set<String> getDomainsForCategory(
            String category
    ) {

        if (CATEGORY_GAMBLING.equals(category)) {
            return GAMBLING_DOMAINS;
        }

        if (CATEGORY_PORNOGRAPHY.equals(category)) {
            return PORNOGRAPHY_DOMAINS;
        }

        return Collections.emptySet();
    }


    public static boolean isProtectedDomain(
            String hostname
    ) {

        if (hostname == null) {
            return false;
        }


        String normalized =
                normalizeHostname(hostname);


        if (normalized.isEmpty()) {
            return false;
        }


        return matchesDomain(
                normalized,
                GAMBLING_DOMAINS
        )
                ||
                matchesDomain(
                        normalized,
                        PORNOGRAPHY_DOMAINS
                );
    }


    public static String getCategoryForDomain(
            String hostname
    ) {

        if (hostname == null) {
            return null;
        }


        String normalized =
                normalizeHostname(hostname);


        if (matchesDomain(
                normalized,
                GAMBLING_DOMAINS
        )) {
            return CATEGORY_GAMBLING;
        }


        if (matchesDomain(
                normalized,
                PORNOGRAPHY_DOMAINS
        )) {
            return CATEGORY_PORNOGRAPHY;
        }


        return null;
    }


    private static boolean matchesDomain(
            String hostname,
            Set<String> domains
    ) {

        for (String domain : domains) {

            if (
                    hostname.equals(domain)
                    ||
                    hostname.endsWith("." + domain)
            ) {
                return true;
            }
        }


        return false;
    }


    private static String normalizeHostname(
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
