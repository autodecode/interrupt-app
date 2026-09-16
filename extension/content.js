(() => {
  let lastUrl =
    location.href;

  const PROTECTION_EVENT_KEY =
    "interrupt_protection_events";

  function mergeProtectionEvents(
    extensionEvents
  ) {
    if (
      !Array.isArray(
        extensionEvents
      )
    ) {
      return;
    }

    let pageEvents = [];

    try {
      const raw =
        localStorage.getItem(
          PROTECTION_EVENT_KEY
        );

      const parsed =
        raw
          ? JSON.parse(raw)
          : [];

      if (Array.isArray(parsed)) {
        pageEvents = parsed;
      }
    } catch {
      pageEvents = [];
    }

    const byId =
      new Map();

    for (
      const event of pageEvents
    ) {
      if (event?.id) {
        byId.set(
          event.id,
          event
        );
      }
    }

    for (
      const event of extensionEvents
    ) {
      if (!event?.id) {
        continue;
      }

      byId.set(
        event.id,
        event
      );
    }

    const merged =
      Array.from(
        byId.values()
      )
        .sort(
          (a, b) =>
            new Date(
              a.timestamp || 0
            ).getTime() -
            new Date(
              b.timestamp || 0
            ).getTime()
        )
        .slice(-500);

    try {
      localStorage.setItem(
        PROTECTION_EVENT_KEY,
        JSON.stringify(
          merged
        )
      );
    } catch {}
  }

  async function syncProtectionEvents() {
    try {
      const result =
        await chrome.storage.local.get(
          "protectionEvents"
        );

      mergeProtectionEvents(
        result.protectionEvents
      );
    } catch {}
  }

  function reportNavigation() {
    const url =
      location.href;

    if (url === lastUrl) {
      return;
    }

    lastUrl =
      url;

    chrome.runtime
      .sendMessage({
        type: "spaNavigation",
        url
      })
      .catch(() => {});

    syncProtectionEvents();
  }

  const originalPushState =
    history.pushState;

  const originalReplaceState =
    history.replaceState;

  history.pushState =
    function (...args) {
      const result =
        originalPushState.apply(
          this,
          args
        );

      reportNavigation();

      return result;
    };

  history.replaceState =
    function (...args) {
      const result =
        originalReplaceState.apply(
          this,
          args
        );

      reportNavigation();

      return result;
    };

  window.addEventListener(
    "popstate",
    reportNavigation
  );

  window.addEventListener(
    "hashchange",
    reportNavigation
  );

  if (
    chrome.storage?.onChanged
  ) {
    chrome.storage.onChanged.addListener(
      changes => {
        if (
          changes.protectionEvents
        ) {
          mergeProtectionEvents(
            changes.protectionEvents.newValue
          );
        }
      }
    );
  }

  syncProtectionEvents();

  setInterval(() => {
    reportNavigation();
    syncProtectionEvents();
  }, 800);
})();
