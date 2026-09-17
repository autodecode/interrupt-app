package com.interrupt.app.protection;

import android.content.Context;
import android.content.SharedPreferences;

public final class ProtectionStateStore {

    private static final String PREFERENCES_NAME =
            "interrupt_protection";

    private static final String ENABLED_KEY =
            "protection_enabled";

    private static final String CHANGED_AT_KEY =
            "protection_changed_at";


    private final SharedPreferences preferences;


    public ProtectionStateStore(
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


    public synchronized ProtectionState getState() {

        boolean enabled =
                preferences.getBoolean(
                        ENABLED_KEY,
                        false
                );

        long changedAt =
                preferences.getLong(
                        CHANGED_AT_KEY,
                        0L
                );

        return new ProtectionState(
                enabled,
                changedAt
        );
    }


    public synchronized ProtectionState setEnabled(
            boolean enabled
    ) {

        long changedAt =
                System.currentTimeMillis();

        boolean saved =
                preferences
                        .edit()
                        .putBoolean(
                                ENABLED_KEY,
                                enabled
                        )
                        .putLong(
                                CHANGED_AT_KEY,
                                changedAt
                        )
                        .commit();

        if (!saved) {
            return getState();
        }

        return new ProtectionState(
                enabled,
                changedAt
        );
    }


    public synchronized boolean isEnabled() {

        return preferences.getBoolean(
                ENABLED_KEY,
                false
        );
    }


    public synchronized void reset() {

        preferences
                .edit()
                .remove(ENABLED_KEY)
                .remove(CHANGED_AT_KEY)
                .commit();
    }
}
