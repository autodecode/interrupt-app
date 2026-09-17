package com.interrupt.app.protection;

public final class ProtectionState {

    private final boolean enabled;
    private final long changedAt;

    public ProtectionState(
            boolean enabled,
            long changedAt
    ) {
        this.enabled = enabled;
        this.changedAt = changedAt;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public long getChangedAt() {
        return changedAt;
    }

    public static ProtectionState enabled() {
        return new ProtectionState(
                true,
                System.currentTimeMillis()
        );
    }

    public static ProtectionState disabled() {
        return new ProtectionState(
                false,
                System.currentTimeMillis()
        );
    }
}
