importScripts(
  "../core/protection.js",
  "../core/events.js"
);

const BLOCK_PAGE = chrome.runtime.getURL("blocked.html");
const pendingBlocks = new Map();
const allowedOnce = new Map();

async function getSettings() {
  const result = await chrome.storage.local.get("settings");

  const settings =
    INTERRUPT_PROTECTION.normalizeSettings(
      result.settings
    );

  if (!result.settings) {
    await chrome.storage.local.set({
      settings
    });
  }

  return settings;
}

function isBlockPage(url) {
  return String(url || "").startsWith(BLOCK_PAGE);
}

function getAllowKey(tabId, host) {
  return `${tabId}:${INTERRUPT_PROTECTION.normalizeDomain(host)}`;
}

function hasAllowedOnce(tabId, host) {
  const key = getAllowKey(tabId, host);
  const expires = allowedOnce.get(key);

  if (!expires) {
    return false;
  }

  if (Date.now() > expires) {
    allowedOnce.delete(key);
    return false;
  }

  return true;
}

function allowOnce(tabId, host) {
  allowedOnce.set(
    getAllowKey(tabId, host),
    Date.now() + 5 * 60 * 1000
  );
}

function clearTabState(tabId) {
  pendingBlocks.delete(tabId);

  for (const key of allowedOnce.keys()) {
    if (key.startsWith(`${tabId}:`)) {
      allowedOnce.delete(key);
    }
  }
}

async function inspect(url, tabId = null) {
  const settings = await getSettings();

  const result =
    INTERRUPT_PROTECTION.inspectUrl(
      url,
      settings
    );

  if (!result) {
    return null;
  }

  if (
    tabId !== null &&
    hasAllowedOnce(tabId, result.host)
  ) {
    return null;
  }

  return result;
}

async function recordEvent(data) {
  const result =
    await chrome.storage.local.get(
      "protectionEvents"
    );

  const events =
    INTERRUPT_EVENTS.append(
      result.protectionEvents,
      data
    );

  await chrome.storage.local.set({
    protectionEvents: events
  });
}

async function redirectToBlockPage(tabId, result) {
  const existing = pendingBlocks.get(tabId);

  if (
    existing &&
    existing.url === result.url
  ) {
    return;
  }

  pendingBlocks.set(tabId, {
    url: result.url,
    host: result.host,
    category: result.category,
    timestamp: Date.now()
  });

  await recordEvent({
    type: "blocked",
    source: "protection",
    category: result.category,
    host: result.host,
    url: result.url,
    mode: result.mode,
    action: "block"
  });

  const target =
    `${BLOCK_PAGE}?category=${encodeURIComponent(result.category)}` +
    `&host=${encodeURIComponent(result.host)}` +
    `&url=${encodeURIComponent(result.url)}` +
    `&mode=${encodeURIComponent(result.mode)}`;

  try {
    await chrome.tabs.update(tabId, {
      url: target
    });
  } catch {
    pendingBlocks.delete(tabId);
  }
}

async function handleNavigation(details) {
  if (details.frameId !== 0) {
    return;
  }

  const tabId = details.tabId;

  if (tabId < 0) {
    return;
  }

  if (isBlockPage(details.url)) {
    pendingBlocks.delete(tabId);
    return;
  }

  const result = await inspect(
    details.url,
    tabId
  );

  if (!result) {
    return;
  }

  await redirectToBlockPage(
    tabId,
    result
  );
}

chrome.webNavigation.onBeforeNavigate.addListener(
  handleNavigation,
  {
    url: [
      {
        schemes: [
          "http",
          "https"
        ]
      }
    ]
  }
);

chrome.tabs.onRemoved.addListener(
  tabId => {
    clearTabState(tabId);
  }
);

chrome.tabs.onUpdated.addListener(
  (tabId, changeInfo) => {
    if (
      changeInfo.status === "loading" &&
      changeInfo.url
    ) {
      const pending =
        pendingBlocks.get(tabId);

      if (
        pending &&
        changeInfo.url !== pending.url &&
        !isBlockPage(changeInfo.url)
      ) {
        pendingBlocks.delete(tabId);
      }
    }
  }
);

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {

    if (message?.type === "getSettings") {
      getSettings().then(sendResponse);
      return true;
    }

    if (message?.type === "setSettings") {
      getSettings().then(async current => {
        const settings =
          INTERRUPT_PROTECTION.normalizeSettings({
            ...current,
            ...(message.settings || {}),
            categories: {
              ...current.categories,
              ...(message.settings?.categories || {})
            }
          });

        await chrome.storage.local.set({
          settings
        });

        sendResponse({
          ok: true,
          settings
        });
      });

      return true;
    }

    if (message?.type === "checkUrl") {
      const tabId =
        sender.tab?.id ?? null;

      inspect(
        message.url,
        tabId
      ).then(sendResponse);

      return true;
    }

    if (message?.type === "spaNavigation") {
      const tabId =
        sender.tab?.id;

      if (typeof tabId !== "number") {
        sendResponse({
          ok: false
        });

        return false;
      }

      inspect(
        message.url,
        tabId
      ).then(async result => {
        if (result) {
          await redirectToBlockPage(
            tabId,
            result
          );
        }

        sendResponse({
          ok: true,
          blocked: Boolean(result)
        });
      });

      return true;
    }

    if (message?.type === "allowOnce") {
      const tabId =
        sender.tab?.id;

      if (
        typeof tabId === "number" &&
        message.host
      ) {
        allowOnce(
          tabId,
          message.host
        );
      }

      sendResponse({
        ok: true
      });

      return false;
    }

    if (message?.type === "getProtectionEvents") {
      chrome.storage.local
        .get("protectionEvents")
        .then(result => {
          sendResponse({
            events:
              Array.isArray(
                result.protectionEvents
              )
                ? result.protectionEvents
                : []
          });
        });

      return true;
    }

    if (message?.type === "clearProtectionEvents") {
      chrome.storage.local
        .set({
          protectionEvents: []
        })
        .then(() => {
          sendResponse({
            ok: true
          });
        });

      return true;
    }

    return false;
  }
);

chrome.runtime.onInstalled.addListener(
  async () => {
    const result =
      await chrome.storage.local.get([
        "settings",
        "protectionEvents"
      ]);

    if (!result.settings) {
      await chrome.storage.local.set({
        settings:
          INTERRUPT_PROTECTION.DEFAULT_SETTINGS
      });
    }

    if (!Array.isArray(result.protectionEvents)) {
      await chrome.storage.local.set({
        protectionEvents: []
      });
    }
  }
);
