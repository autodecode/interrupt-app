package com.interrupt.app.protection;

import android.content.Context;

import org.json.JSONObject;

import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public final class ProtectionController {

    private static volatile ProtectionController instance;

    private static final long CONFIG_REFRESH_HOURS = 6;

    private final Context context;
    private final ProtectionStateStore stateStore;
    private final ProtectionEventStore eventStore;
    private final ScheduledExecutorService configExecutor;


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

        this.configExecutor =
                Executors.newSingleThreadScheduledExecutor();

        startConfigurationRefresh();
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


    private void startConfigurationRefresh() {

        /*
         * Download the latest configuration immediately,
         * then refresh it every six hours.
         *
         * Network work never runs on the main thread.
         */
        configExecutor.scheduleWithFixedDelay(
                new Runnable() {
                    @Override
                    public void run() {

                        try {
                            ProtectionConfig.refresh();
                        } catch (Exception ignored) {
                            /*
                             * The configuration store keeps
                             * the last valid cached configuration.
                             */
                        }
                    }
                },
                0,
                CONFIG_REFRESH_HOURS,
                TimeUnit.HOURS
        );
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
