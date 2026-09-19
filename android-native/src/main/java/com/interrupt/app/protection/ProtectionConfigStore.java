package com.interrupt.app.protection;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public final class ProtectionConfigStore {

    private static final String CONFIG_URL =
            "https://raw.githubusercontent.com/autodecode/interrupt-app/main/config/protection.json";

    private static final String PREFS_NAME =
            "interrupt_protection_config";

    private static final String KEY_GAMBLING_DOMAINS =
            "gambling_domains";

    private static final String KEY_PORNOGRAPHY_DOMAINS =
            "pornography_domains";

    private static final String KEY_CONFIG_VERSION =
            "config_version";


    /*
     * Bootstrap configuration.
     *
     * These values are used until the first valid remote
     * configuration has been downloaded successfully.
     */
    private static final String[] DEFAULT_GAMBLING_DOMAINS = {
            "superbet.ro",
            "betano.ro",
            "fortuna.ro",
            "unibet.com",
            "bet365.com",
            "pokerstars.com"
    };


    private static final String[] DEFAULT_PORNOGRAPHY_DOMAINS = {
            "example-pornography.invalid"
    };


    private final SharedPreferences preferences;


    public ProtectionConfigStore(
            Context context
    ) {

        if (context == null) {
            throw new IllegalArgumentException(
                    "Context cannot be null"
            );
        }

        preferences =
                context
                        .getApplicationContext()
                        .getSharedPreferences(
                                PREFS_NAME,
                                Context.MODE_PRIVATE
                        );

        initializeDefaults();
    }


    private void initializeDefaults() {

        if (
                !preferences.contains(
                        KEY_GAMBLING_DOMAINS
                )
        ) {

            saveDomains(
                    KEY_GAMBLING_DOMAINS,
                    DEFAULT_GAMBLING_DOMAINS
            );
        }


        if (
                !preferences.contains(
                        KEY_PORNOGRAPHY_DOMAINS
                )
        ) {

            saveDomains(
                    KEY_PORNOGRAPHY_DOMAINS,
                    DEFAULT_PORNOGRAPHY_DOMAINS
            );
        }
    }


    public Set<String> getGamblingDomains() {

        return getDomains(
                KEY_GAMBLING_DOMAINS
        );
    }


    public Set<String> getPornographyDomains() {

        return getDomains(
                KEY_PORNOGRAPHY_DOMAINS
        );
    }


    public String getConfigVersion() {

        return preferences.getString(
                KEY_CONFIG_VERSION,
                "local-default"
        );
    }


    public synchronized boolean refresh() {

        HttpURLConnection connection =
                null;

        try {

            URL url =
                    new URL(CONFIG_URL);

            connection =
                    (HttpURLConnection)
                            url.openConnection();

            connection.setRequestMethod(
                    "GET"
            );

            connection.setConnectTimeout(
                    10000
            );

            connection.setReadTimeout(
                    10000
            );

            connection.setUseCaches(
                    false
            );

            connection.setRequestProperty(
                    "Accept",
                    "application/json"
            );

            int responseCode =
                    connection.getResponseCode();

            if (
                    responseCode < 200
                    ||
                    responseCode >= 300
            ) {
                return false;
            }

            String response;

            try (
                    InputStream inputStream =
                            connection.getInputStream()
            ) {

                response =
                        readResponse(
                                inputStream
                        );
            }

            if (
                    response == null
                    ||
                    response.trim().isEmpty()
            ) {
                return false;
            }


            JSONObject config =
                    new JSONObject(
                            response
                    );


            int version =
                    config.optInt(
                            "version",
                            -1
                    );

            if (version < 1) {
                return false;
            }


            JSONObject categories =
                    config.optJSONObject(
                            "categories"
                    );

            if (categories == null) {
                return false;
            }


            /*
             * Both supported categories are required.
             *
             * We do not accept a partial configuration because
             * replacing only one category could silently disable
             * protection from the other category.
             */
            JSONArray gambling =
                    categories.optJSONArray(
                            ProtectionConfig
                                    .CATEGORY_GAMBLING
                    );

            JSONArray pornography =
                    categories.optJSONArray(
                            ProtectionConfig
                                    .CATEGORY_PORNOGRAPHY
                    );

            if (
                    gambling == null
                    ||
                    pornography == null
            ) {
                return false;
            }


            Set<String> gamblingDomains =
                    parseDomains(
                            gambling
                    );

            Set<String> pornographyDomains =
                    parseDomains(
                            pornography
                    );


            /*
             * A valid configuration must contain at least one
             * usable domain across the supported categories.
             *
             * An empty configuration is rejected so a malformed
             * remote file can never wipe the local protection
             * rules.
             */
            if (
                    gamblingDomains.isEmpty()
                    &&
                    pornographyDomains.isEmpty()
            ) {
                return false;
            }


            /*
             * Commit the complete configuration together.
             *
             * If writing fails, the previous cached configuration
             * remains untouched.
             */
            boolean saved =
                    preferences
                            .edit()
                            .putString(
                                    KEY_GAMBLING_DOMAINS,
                                    serializeDomains(
                                            gamblingDomains
                                    )
                            )
                            .putString(
                                    KEY_PORNOGRAPHY_DOMAINS,
                                    serializeDomains(
                                            pornographyDomains
                                    )
                            )
                            .putString(
                                    KEY_CONFIG_VERSION,
                                    String.valueOf(
                                            version
                                    )
                            )
                            .commit();

            return saved;

        } catch (Exception ignored) {

            /*
             * Network, parsing and storage failures are
             * deliberately non-fatal.
             *
             * The previous valid cached configuration
             * remains active.
             */
            return false;

        } finally {

            if (connection != null) {
                connection.disconnect();
            }
        }
    }


    private Set<String> parseDomains(
            JSONArray array
    ) {

        if (array == null) {
            return Collections.emptySet();
        }

        Set<String> domains =
                new HashSet<>();

        for (
                int i = 0;
                i < array.length();
                i++
        ) {

            String domain =
                    array.optString(
                            i,
                            ""
                    );

            String normalized =
                    normalizeHostname(
                            domain
                    );

            if (!normalized.isEmpty()) {

                domains.add(
                        normalized
                );
            }
        }

        return domains;
    }


    private Set<String> getDomains(
            String key
    ) {

        String value =
                preferences.getString(
                        key,
                        ""
                );

        if (
                value == null
                ||
                value.isEmpty()
        ) {
            return Collections.emptySet();
        }

        Set<String> domains =
                new HashSet<>();

        String[] entries =
                value.split(
                        "\\n"
                );

        for (String entry : entries) {

            String normalized =
                    normalizeHostname(
                            entry
                    );

            if (!normalized.isEmpty()) {

                domains.add(
                        normalized
                );
            }
        }

        return Collections.unmodifiableSet(
                domains
        );
    }


    private void saveDomains(
            String key,
            String[] domains
    ) {

        Set<String> normalized =
                new HashSet<>();

        for (String domain : domains) {

            String value =
                    normalizeHostname(
                            domain
                    );

            if (!value.isEmpty()) {

                normalized.add(
                        value
                );
            }
        }

        preferences
                .edit()
                .putString(
                        key,
                        serializeDomains(
                                normalized
                        )
                )
                .commit();
    }


    private String serializeDomains(
            Set<String> domains
    ) {

        StringBuilder value =
                new StringBuilder();

        for (String domain : domains) {

            if (value.length() > 0) {
                value.append('\n');
            }

            value.append(domain);
        }

        return value.toString();
    }


    private String readResponse(
            InputStream inputStream
    ) throws Exception {

        StringBuilder response =
                new StringBuilder();

        try (
                BufferedReader reader =
                        new BufferedReader(
                                new InputStreamReader(
                                        inputStream,
                                        StandardCharsets.UTF_8
                                )
                        )
        ) {

            String line;

            while (
                    (line = reader.readLine())
                            != null
            ) {

                response.append(
                        line
                );
            }
        }

        return response.toString();
    }


    private static String normalizeHostname(
            String hostname
    ) {

        if (hostname == null) {
            return "";
        }

        String normalized =
                hostname
                        .trim()
                        .toLowerCase();

        while (
                normalized.startsWith(".")
        ) {

            normalized =
                    normalized.substring(
                            1
                    );
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
