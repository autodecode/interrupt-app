const $ = id => document.getElementById(id);

const defaults = {
  enabled: true,
  categories: {
    gambling: true,
    pornography: true,
    socialMedia: true
  },
  mode: "medium",
  customDomains: []
};

async function getSettings() {
  const result =
    await chrome.storage.local.get("settings");

  return {
    ...defaults,
    ...result.settings,
    categories: {
      ...defaults.categories,
      ...(result.settings?.categories || {})
    },
    customDomains:
      Array.isArray(
        result.settings?.customDomains
      )
        ? result.settings.customDomains
        : []
  };
}

function updateStatus() {
  const active =
    $("enabled").checked;

  const status =
    $(".status");

  if (!status) {
    return;
  }

  status.classList.toggle(
    "active",
    active
  );

  $("statusText").textContent =
    active
      ? "Protection is active"
      : "Protection is off";
}

async function load() {
  const settings =
    await getSettings();

  $("enabled").checked =
    Boolean(settings.enabled);

  $("gambling").checked =
    Boolean(settings.categories.gambling);

  $("pornography").checked =
    Boolean(settings.categories.pornography);

  $("socialMedia").checked =
    Boolean(settings.categories.socialMedia);

  $("mode").value =
    settings.mode || "medium";

  updateStatus();

  const result =
    await chrome.storage.local.get(
      "protectionEvents"
    );

  const events =
    Array.isArray(
      result.protectionEvents
    )
      ? result.protectionEvents
      : [];

  const count = events.length;

  $("eventCount").textContent =
    `${count} interruption${count === 1 ? "" : "s"} recorded`;
}

async function save() {
  const settings = {
    enabled:
      $("enabled").checked,

    categories: {
      gambling:
        $("gambling").checked,

      pornography:
        $("pornography").checked,

      socialMedia:
        $("socialMedia").checked
    },

    mode:
      $("mode").value,

    customDomains: []
  };

  await chrome.storage.local.set({
    settings
  });

  $("message").textContent =
    "Settings saved.";

  updateStatus();

  setTimeout(() => {
    $("message").textContent = "";
  }, 1800);
}

$("enabled").addEventListener(
  "change",
  updateStatus
);

$("save").addEventListener(
  "click",
  save
);

load();
