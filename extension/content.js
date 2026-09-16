(() => {
  let lastUrl = location.href;

  function reportNavigation() {
    const url = location.href;

    if (url === lastUrl) {
      return;
    }

    lastUrl = url;

    chrome.runtime.sendMessage({
      type: "spaNavigation",
      url
    }).catch(() => {});
  }

  const originalPushState =
    history.pushState;

  const originalReplaceState =
    history.replaceState;

  history.pushState = function (...args) {
    const result =
      originalPushState.apply(
        this,
        args
      );

    reportNavigation();

    return result;
  };

  history.replaceState = function (...args) {
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

  setInterval(() => {
    reportNavigation();
  }, 800);
})();
