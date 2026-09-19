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
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class ProtectionConfigStore {

    /*
     * Remote configuration endpoint.
     *
     * This will point to the official INTERRUPT configuration
     * hosted by us. It is intentionally not user-configurable.
     */
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
     * These are only the bootstrap values.
     *
     * Once the first valid remote configuration is downloaded,
     * the cached remote configuration replaces them.
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


    public boolean refresh() {

        HttpURLConnection connection = null;

        try {

            URL url =
                    new URL(CONFIG_URL);

            connection =
                    (HttpURLConnection)
                            url.openConnection();

            connection.setRequestMethod("GET");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            connection.setUseCaches(false);
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


            InputStream inputStream =
                    connection.getInputStream();

            String response =
                    readResponse(
                            inputStream
                    );

            if (
                    response == null
                    ||
                    response.trim().isEmpty()
            ) {
                return false;
            }


            JSONObject config =
                    new JSONObject(response);


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


            JSONArray gambling =
                    categories.optJSONArray(
                            ProtectionConfig.CATEGORY_GAMBLING
                    );

            JSONArray pornography =
                    categories.optJSONArray(
                            ProtectionConfig.CATEGORY_PORNOGRAPHY
                    );


            Set<String> gamblingDomains =
                    parseDomains(
                            gambling
                    );

            Set<String> pornographyDomains =
                    parseDomains(
                            pornography
                    );


            /*
             * Never replace a valid cached configuration
             * with an empty or malformed configuration.
             */
            if (
                    gamblingDomains.isEmpty()
                    &&
                    pornographyDomains.isEmpty()
            ) {
                return false;
            }


            saveDomains(
                    KEY_GAMBLING_DOMAINS,
                    gamblingDomains
            );

            saveDomains(
                    KEY_PORNOGRAPHY_DOMAINS,
                    pornographyDomains
            );

            preferences
                    .edit()
                    .putString(
                            KEY_CONFIG_VERSION,
                            String.valueOf(version)
                    )
                    .apply();

            return true;

        } catch (Exception ignored) {

            /*
             * Network failure is deliberately non-fatal.
             *
             * The previously cached configuration remains
             * active.
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
                domains.add(normalized);
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
                value.split("\\n");


        for (String entry : entries) {

            String normalized =
                    normalizeHostname(
                            entry
                    );

            if (!normalized.isEmpty()) {
                domains.add(normalized);
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
                normalized.add(value);
            }
        }


        saveDomains(
                key,
                normalized
        );
    }


    private void saveDomains(
            String key,
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


        preferences
                .edit()
                .putString(
                        key,
                        value.toString()
                )
                .apply();
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

                response.append(line);
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
