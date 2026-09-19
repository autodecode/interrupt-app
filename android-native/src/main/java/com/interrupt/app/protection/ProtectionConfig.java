package com.interrupt.app.protection;

import android.content.Context;

import java.util.Collections;
import java.util.Set;

public final class ProtectionConfig {

    /*
     * Protection categories used by INTERRUPT.
     */
    public static final String CATEGORY_GAMBLING =
            "gambling";

    public static final String CATEGORY_PORNOGRAPHY =
            "pornography";


    private static volatile ProtectionConfigStore store;


    private ProtectionConfig() {
    }


    /*
     * Initializes the runtime configuration store.
     *
     * This must be called once by the native application
     * before protection decisions are evaluated.
     */
    public static void initialize(
            Context context
    ) {

        if (context == null) {
            throw new IllegalArgumentException(
                    "Context cannot be null"
            );
        }

        if (store != null) {
            return;
        }

        synchronized (
                ProtectionConfig.class
        ) {

            if (store == null) {

                store =
                        new ProtectionConfigStore(
                                context
                        );
            }
        }
    }


    private static ProtectionConfigStore getStore() {

        ProtectionConfigStore current =
                store;

        if (current == null) {

            throw new IllegalStateException(
                    "ProtectionConfig has not been initialized"
            );
        }

        return current;
    }


    /*
     * Downloads the latest configuration.
     *
     * Failure is deliberately non-fatal.
     * ProtectionConfigStore keeps using the last valid
     * cached configuration when the network is unavailable.
     */
    public static boolean refresh() {

        return getStore().refresh();
    }


    public static String getConfigVersion() {

        return getStore()
                .getConfigVersion();
    }


    public static Set<String> getDomainsForCategory(
            String category
    ) {

        if (
                CATEGORY_GAMBLING.equals(
                        category
                )
        ) {

            return getStore()
                    .getGamblingDomains();
        }


        if (
                CATEGORY_PORNOGRAPHY.equals(
                        category
                )
        ) {

            return getStore()
                    .getPornographyDomains();
        }


        return Collections.emptySet();
    }


    public static boolean isProtectedDomain(
            String hostname
    ) {

        return getCategoryForDomain(
                hostname
        ) != null;
    }


    public static String getCategoryForDomain(
            String hostname
    ) {

        if (hostname == null) {
            return null;
        }


        String normalized =
                normalizeHostname(
                        hostname
                );


        if (normalized.isEmpty()) {
            return null;
        }


        if (
                matchesDomain(
                        normalized,
                        getStore()
                                .getGamblingDomains()
                )
        ) {

            return CATEGORY_GAMBLING;
        }


        if (
                matchesDomain(
                        normalized,
                        getStore()
                                .getPornographyDomains()
                )
        ) {

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
                    hostname.equals(
                            domain
                    )
                    ||
                    hostname.endsWith(
                            "." + domain
                    )
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
                hostname
                        .trim()
                        .toLowerCase();


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
