package com.interrupt.app.protection;

import org.json.JSONObject;

import java.util.UUID;

public final class ProtectionEvent {

    public static final String TYPE_BLOCKED =
            "blocked";

    public static final String TYPE_ALLOWED =
            "allowed";

    private final String id;
    private final String type;
    private final String category;
    private final String hostname;
    private final long timestamp;


    public ProtectionEvent(
            String type,
            String category,
            String hostname
    ) {

        this.id =
                UUID.randomUUID().toString();

        this.type =
                type;

        this.category =
                category;

        this.hostname =
                hostname;

        this.timestamp =
                System.currentTimeMillis();
    }


    public String getId() {
        return id;
    }


    public String getType() {
        return type;
    }


    public String getCategory() {
        return category;
    }


    public String getHostname() {
        return hostname;
    }


    public long getTimestamp() {
        return timestamp;
    }


    public JSONObject toJson() {

        JSONObject json =
                new JSONObject();

        try {

            json.put(
                    "id",
                    id
            );

            json.put(
                    "type",
                    type
            );

            json.put(
                    "category",
                    category
            );

            json.put(
                    "hostname",
                    hostname
            );

            json.put(
                    "timestamp",
                    timestamp
            );

            json.put(
                    "source",
                    "android_protection"
            );

        } catch (Exception ignored) {
        }

        return json;
    }
}
