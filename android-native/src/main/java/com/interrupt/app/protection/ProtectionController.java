package com.interrupt.app.protection;

import android.content.Context;

import org.json.JSONObject;

import java.util.List;

public final class ProtectionController {

    private static volatile ProtectionController instance;

    private final Context context;
    private final ProtectionStateStore stateStore;
    private final ProtectionEventStore eventStore;


    private ProtectionController(
            Context context
    ) {

        this.context =
                context.getApplicationContext();

        /*
         * Initialize the protection configuration before
         * any protection decision can be evaluated.
         */
        ProtectionConfig.initialize(
                this.context
        );

        this.stateStore =
                new ProtectionStateStore(
                        this.context
                );

        this.eventStore =
                new ProtectionEventStore(
                        this.context
                );
    }


    public static ProtectionController getInstance(
            Context context
    ) {

        if (context == null) {
            throw new IllegalArgumentException(
                    "Context cannot be null"
            );
        }

        if (instance == null) {

            synchronized (
                    ProtectionController.class
            ) {

                if (instance == null) {

                    instance =
                            new ProtectionController(
                                    context
                            );
                }
            }
        }

        return instance;
    }


    public ProtectionState getState() {

        return stateStore.getState();
    }


    public boolean isEnabled() {

        return stateStore.isEnabled();
    }


    public ProtectionState enable() {

        return stateStore.setEnabled(true);
    }


    public ProtectionState disable() {

        return stateStore.setEnabled(false);
    }


    public ProtectionEvent recordBlockedDomain(
            String hostname
    ) {

        if (
                hostname == null
                ||
                hostname.trim().isEmpty()
        ) {
            return null;
        }

        String normalized =
                hostname
                        .trim()
                        .toLowerCase();

        String category =
                ProtectionConfig
                        .getCategoryForDomain(
                                normalized
                        );

        if (category == null) {
            return null;
        }

        ProtectionEvent event =
                new ProtectionEvent(
                        ProtectionEvent.TYPE_BLOCKED,
                        category,
                        normalized
                );

        if (
                !eventStore.append(event)
        ) {
            return null;
        }

        return event;
    }


    public boolean isProtectedDomain(
            String hostname
    ) {

        return ProtectionConfig
                .isProtectedDomain(
                        hostname
                );
    }


    public String getCategoryForDomain(
            String hostname
    ) {

        return ProtectionConfig
                .getCategoryForDomain(
                        hostname
                );
    }


    public List<JSONObject> getEvents() {

        return eventStore.getEvents();
    }


    public List<JSONObject> getUnconsumedEvents() {

        return eventStore.getUnconsumedEvents();
    }


    public boolean markEventConsumed(
            String eventId
    ) {

        return eventStore.markEventConsumed(
                eventId
        );
    }


    public int getEventCount() {

        return eventStore.size();
    }


    public boolean clearEvents() {

        return eventStore.clear();
    }


    public void reset() {

        stateStore.reset();
        eventStore.clear();
    }
}
