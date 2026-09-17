package com.interrupt.app.protection;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class ProtectionEventStore {

    private static final String PREFERENCES_NAME =
            "interrupt_protection";

    private static final String EVENTS_KEY =
            "events";

    private static final int MAX_EVENTS =
            500;


    private final SharedPreferences preferences;


    public ProtectionEventStore(
            Context context
    ) {

        if (context == null) {
            throw new IllegalArgumentException(
                    "Context cannot be null"
            );
        }

        preferences =
                context.getApplicationContext()
                        .getSharedPreferences(
                                PREFERENCES_NAME,
                                Context.MODE_PRIVATE
                        );
    }


    public synchronized boolean append(
            ProtectionEvent event
    ) {

        if (event == null) {
            return false;
        }

        try {

            JSONArray events =
                    readEvents();

            events.put(
                    event.toJson()
            );

            trimToLimit(events);

            return writeEvents(events);

        } catch (Exception ignored) {

            return false;
        }
    }


    public synchronized List<JSONObject> getEvents() {

        try {

            JSONArray events =
                    readEvents();

            List<JSONObject> result =
                    new ArrayList<>();

            for (
                    int i = 0;
                    i < events.length();
                    i++
            ) {

                JSONObject event =
                        events.optJSONObject(i);

                if (event != null) {

                    result.add(
                            new JSONObject(
                                    event.toString()
                            )
                    );
                }
            }

            return result;

        } catch (Exception ignored) {

            return Collections.emptyList();
        }
    }


    public synchronized List<JSONObject> getUnconsumedEvents() {

        try {

            JSONArray events =
                    readEvents();

            List<JSONObject> result =
                    new ArrayList<>();

            for (
                    int i = 0;
                    i < events.length();
                    i++
            ) {

                JSONObject event =
                        events.optJSONObject(i);

                if (
                        event != null
                        &&
                        !event.optBoolean(
                                "consumed",
                                false
                        )
                ) {

                    result.add(
                            new JSONObject(
                                    event.toString()
                            )
                    );
                }
            }

            return result;

        } catch (Exception ignored) {

            return Collections.emptyList();
        }
    }


    public synchronized boolean markConsumed(
            String eventId
    ) {

        if (
                eventId == null
                ||
                eventId.trim().isEmpty()
        ) {
            return false;
        }

        try {

            JSONArray events =
                    readEvents();

            boolean changed =
                    false;

            for (
                    int i = 0;
                    i < events.length();
                    i++
            ) {

                JSONObject event =
                        events.optJSONObject(i);

                if (event == null) {
                    continue;
                }

                if (
                        eventId.equals(
                                event.optString(
                                        "id",
                                        ""
                                )
                        )
                ) {

                    event.put(
                            "consumed",
                            true
                    );

                    event.put(
                            "consumedAt",
                            System.currentTimeMillis()
                    );

                    changed = true;

                    break;
                }
            }

            if (!changed) {
                return false;
            }

            return writeEvents(events);

        } catch (Exception ignored) {

            return false;
        }
    }


    public synchronized boolean clear() {

        try {

            return preferences
                    .edit()
                    .remove(EVENTS_KEY)
                    .commit();

        } catch (Exception ignored) {

            return false;
        }
    }


    public synchronized int size() {

        try {

            return readEvents().length();

        } catch (Exception ignored) {

            return 0;
        }
    }


    private JSONArray readEvents() {

        String raw =
                preferences.getString(
                        EVENTS_KEY,
                        "[]"
                );

        if (
                raw == null
                ||
                raw.trim().isEmpty()
        ) {
            return new JSONArray();
        }

        try {

            return new JSONArray(raw);

        } catch (Exception ignored) {

            return new JSONArray();
        }
    }


    private boolean writeEvents(
            JSONArray events
    ) {

        try {

            return preferences
                    .edit()
                    .putString(
                            EVENTS_KEY,
                            events.toString()
                    )
                    .commit();

        } catch (Exception ignored) {

            return false;
        }
    }


    private void trimToLimit(
            JSONArray events
    ) {

        while (
                events.length() > MAX_EVENTS
        ) {

            JSONArray trimmed =
                    new JSONArray();

            for (
                    int i = 1;
                    i < events.length();
                    i++
            ) {

                JSONObject event =
                        events.optJSONObject(i);

                if (event != null) {

                    trimmed.put(event);
                }
            }

            while (
                    events.length() > 0
            ) {

                events.remove(0);
            }

            for (
                    int i = 0;
                    i < trimmed.length();
                    i++
            ) {

                JSONObject event =
                        trimmed.optJSONObject(i);

                if (event != null) {

                    events.put(event);
                }
            }
        }
    }
}
