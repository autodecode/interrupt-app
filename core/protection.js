const INTERRUPT_PROTECTION = (() => {

    const STORAGE_KEY = "interrupt_protection";
    const EVENT_STORAGE_KEY = "interrupt_protection_events";
    const MAX_EVENTS = 500;

    const DEFAULT_SETTINGS = {
        enabled: true,
        categories: {
            gambling: true,
            pornography: true,
            socialMedia: true,
            custom: true
        },
        mode: "medium",
        customDomains: []
    };

    const CATEGORY_BEHAVIOR = {
        gambling: "gamble",
        pornography: "watch",
        socialMedia: "scroll",
        custom: "other"
    };

    const MODES = {
        light: {
            seconds: 15,
            allowContinue: true
        },

        medium: {
            seconds: 60,
            allowContinue: true
        },

        strong: {
            seconds: 300,
            allowContinue: false
        }
    };

    const DOMAINS = {
        gambling: [
            "bet365.com",
            "betfair.com",
            "pokerstars.com",
            "williamhill.com",
            "888.com",
            "betway.com",
            "bwin.com",
            "unibet.com",
            "draftkings.com",
            "fanduel.com"
        ],

        pornography: [
            "pornhub.com",
            "xvideos.com",
            "xnxx.com",
            "xhamster.com",
            "redtube.com",
            "youporn.com",
            "spankbang.com",
            "onlyfans.com"
        ],

        socialMedia: [
            "facebook.com",
            "instagram.com",
            "tiktok.com",
            "x.com",
            "twitter.com",
            "reddit.com",
            "snapchat.com",
            "pinterest.com",
            "threads.net"
        ]
    };


    /* =========================================================
       DOMAIN NORMALIZATION
       ========================================================= */

    function normalizeDomain(domain) {
        return String(domain || "")
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .split("/")[0]
            .split("?")[0]
            .split("#")[0]
            .replace(/\.$/, "");
    }


    /* =========================================================
       SETTINGS
       ========================================================= */

    function normalizeSettings(settings) {
        const source = settings || {};

        return {
            enabled: source.enabled !== false,

            categories: {
                ...DEFAULT_SETTINGS.categories,
                ...(source.categories || {})
            },

            mode: MODES[source.mode]
                ? source.mode
                : DEFAULT_SETTINGS.mode,

            customDomains: Array.isArray(source.customDomains)
                ? [
                    ...new Set(
                        source.customDomains
                            .map(normalizeDomain)
                            .filter(Boolean)
                    )
                ]
                : []
        };
    }


    function readSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);

            return normalizeSettings(
                raw
                    ? JSON.parse(raw)
                    : DEFAULT_SETTINGS
            );

        } catch (error) {
            console.warn(
                "INTERRUPT protection settings read failed:",
                error
            );

            return normalizeSettings(DEFAULT_SETTINGS);
        }
    }


    function saveSettings(settings) {
        const normalized = normalizeSettings(settings);

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(normalized)
            );

            return true;

        } catch (error) {
            console.warn(
                "INTERRUPT protection settings save failed:",
                error
            );

            return false;
        }
    }


    function updateSettings(patch) {
        const current = readSettings();

        return saveSettings({
            ...current,
            ...(patch || {}),

            categories: {
                ...current.categories,
                ...(
                    patch &&
                    patch.categories
                        ? patch.categories
                        : {}
                )
            }
        });
    }


    function resetSettings() {
        return saveSettings(DEFAULT_SETTINGS);
    }


    function setEnabled(enabled) {
        return updateSettings({
            enabled: enabled !== false
        });
    }


    function setMode(mode) {
        if (!MODES[mode]) {
            return false;
        }

        return updateSettings({
            mode
        });
    }


    function setCategoryEnabled(category, enabled) {
        if (
            !Object.prototype.hasOwnProperty.call(
                DEFAULT_SETTINGS.categories,
                category
            )
        ) {
            return false;
        }

        const settings = readSettings();

        settings.categories[category] =
            enabled !== false;

        return saveSettings(settings);
    }


    /* =========================================================
       CATEGORY / BEHAVIOR MAPPING
       ========================================================= */

    function getBehavior(category) {
        return CATEGORY_BEHAVIOR[category] || "other";
    }


    function getCategoryMapping() {
        return {
            ...CATEGORY_BEHAVIOR
        };
    }


    /* =========================================================
       DOMAIN MATCHING
       ========================================================= */

    function domainMatches(host, domain) {
        const normalizedHost =
            normalizeDomain(host);

        const normalizedDomain =
            normalizeDomain(domain);

        if (
            !normalizedHost ||
            !normalizedDomain
        ) {
            return false;
        }

        return (
            normalizedHost === normalizedDomain ||
            normalizedHost.endsWith(
                `.${normalizedDomain}`
            )
        );
    }


    function getCategory(host, settings) {
        const normalizedSettings =
            normalizeSettings(
                settings || readSettings()
            );


        /*
         * Built-in categories
         */

        for (const category of Object.keys(DOMAINS)) {

            if (
                !normalizedSettings
                    .categories[category]
            ) {
                continue;
            }

            if (
                DOMAINS[category].some(
                    domain =>
                        domainMatches(
                            host,
                            domain
                        )
                )
            ) {
                return category;
            }
        }


        /*
         * Custom domains
         */

        if (
            normalizedSettings.categories.custom &&
            normalizedSettings.customDomains.some(
                domain =>
                    domainMatches(
                        host,
                        domain
                    )
            )
        ) {
            return "custom";
        }


        return null;
    }


    /* =========================================================
       URL / HOST INSPECTION
       ========================================================= */

    function inspectUrl(url, settings) {
        if (!url) {
            return null;
        }

        let parsed;

        try {
            parsed = new URL(url);

        } catch {
            return null;
        }


        if (
            parsed.protocol !== "http:" &&
            parsed.protocol !== "https:"
        ) {
            return null;
        }


        const normalizedSettings =
            normalizeSettings(
                settings || readSettings()
            );


        if (!normalizedSettings.enabled) {
            return null;
        }


        const host =
            normalizeDomain(
                parsed.hostname
            );


        const category =
            getCategory(
                host,
                normalizedSettings
            );


        if (!category) {
            return null;
        }


        const mode =
            MODES[
                normalizedSettings.mode
            ];


        return {
            blocked: true,

            category,

            behavior:
                getBehavior(category),

            host,

            url:
                parsed.href,

            mode:
                normalizedSettings.mode,

            seconds:
                mode.seconds,

            allowContinue:
                mode.allowContinue
        };
    }


    function inspectHost(host, settings) {
        const normalizedHost =
            normalizeDomain(host);

        if (!normalizedHost) {
            return null;
        }


        const normalizedSettings =
            normalizeSettings(
                settings || readSettings()
            );


        if (!normalizedSettings.enabled) {
            return null;
        }


        const category =
            getCategory(
                normalizedHost,
                normalizedSettings
            );


        if (!category) {
            return null;
        }


        const mode =
            MODES[
                normalizedSettings.mode
            ];


        return {
            blocked: true,

            category,

            behavior:
                getBehavior(category),

            host:
                normalizedHost,

            mode:
                normalizedSettings.mode,

            seconds:
                mode.seconds,

            allowContinue:
                mode.allowContinue
        };
    }


    /* =========================================================
       CUSTOM DOMAINS
       ========================================================= */

    function addCustomDomain(domain) {
        const normalized =
            normalizeDomain(domain);

        if (!normalized) {
            return false;
        }


        const settings =
            readSettings();


        if (
            !settings.customDomains.includes(
                normalized
            )
        ) {
            settings.customDomains.push(
                normalized
            );
        }


        settings.categories.custom = true;


        return saveSettings(settings);
    }


    function removeCustomDomain(domain) {
        const normalized =
            normalizeDomain(domain);

        if (!normalized) {
            return false;
        }


        const settings =
            readSettings();


        const next =
            settings.customDomains.filter(
                item =>
                    item !== normalized
            );


        if (
            next.length ===
            settings.customDomains.length
        ) {
            return false;
        }


        settings.customDomains =
            next;


        return saveSettings(settings);
    }


    function getCustomDomains() {
        return [
            ...readSettings()
                .customDomains
        ];
    }


    function getDomains(category) {

        if (category === "custom") {
            return getCustomDomains();
        }


        if (
            !Array.isArray(
                DOMAINS[category]
            )
        ) {
            return [];
        }


        return [
            ...DOMAINS[category]
        ];
    }


    /* =========================================================
       PROTECTION EVENTS
       ========================================================= */

    function createEvent(data = {}) {
        const now =
            new Date().toISOString();


        return {
            id:
                data.id ||
                `${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,

            type:
                data.type ||
                "protection",

            category:
                data.category ||
                null,

            behavior:
                data.behavior ||
                getBehavior(
                    data.category
                ),

            host:
                data.host ||
                null,

            url:
                data.url ||
                null,

            mode:
                data.mode ||
                readSettings().mode,

            action:
                data.action ||
                null,

            intensityBefore:
                typeof data.intensityBefore === "number"
                    ? data.intensityBefore
                    : null,

            intensityAfter:
                typeof data.intensityAfter === "number"
                    ? data.intensityAfter
                    : null,

            startedAt:
                data.startedAt ||
                now,

            completedAt:
                data.completedAt ||
                now,

            timestamp:
                data.timestamp ||
                now
        };
    }


    function getEvents() {
        try {
            const raw =
                localStorage.getItem(
                    EVENT_STORAGE_KEY
                );


            const events =
                raw
                    ? JSON.parse(raw)
                    : [];


            if (!Array.isArray(events)) {
                return [];
            }


            return events.slice(
                -MAX_EVENTS
            );

        } catch (error) {
            console.warn(
                "INTERRUPT protection events read failed:",
                error
            );

            return [];
        }
    }


    function saveEvents(events) {
        if (!Array.isArray(events)) {
            return false;
        }


        try {
            localStorage.setItem(
                EVENT_STORAGE_KEY,
                JSON.stringify(
                    events.slice(
                        -MAX_EVENTS
                    )
                )
            );

            return true;

        } catch (error) {
            console.warn(
                "INTERRUPT protection events save failed:",
                error
            );

            return false;
        }
    }


    function appendEvent(data) {
        const events =
            getEvents();


        events.push(
            createEvent(data)
        );


        return saveEvents(events);
    }


    function clearEvents() {
        try {
            localStorage.removeItem(
                EVENT_STORAGE_KEY
            );

            return true;

        } catch (error) {
            console.warn(
                "INTERRUPT protection events clear failed:",
                error
            );

            return false;
        }
    }


    /* =========================================================
       OUTCOME HELPERS
       ========================================================= */

    function calculateReduction(
        intensityBefore,
        intensityAfter
    ) {
        if (
            typeof intensityBefore !== "number" ||
            typeof intensityAfter !== "number"
        ) {
            return null;
        }


        return (
            intensityBefore -
            intensityAfter
        );
    }


    function isSuccessful(
        intensityBefore,
        intensityAfter
    ) {
        const reduction =
            calculateReduction(
                intensityBefore,
                intensityAfter
            );


        return (
            reduction !== null &&
            reduction > 0
        );
    }


    function getMode(mode) {
        return (
            MODES[mode] ||
            MODES.medium
        );
    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    return {

        STORAGE_KEY,

        EVENT_STORAGE_KEY,

        DEFAULT_SETTINGS,

        MODES,

        DOMAINS,

        CATEGORY_BEHAVIOR,


        normalizeDomain,

        normalizeSettings,


        readSettings,

        saveSettings,

        updateSettings,

        resetSettings,

        setEnabled,

        setMode,

        setCategoryEnabled,


        domainMatches,

        getCategory,

        getBehavior,

        getCategoryMapping,


        inspectUrl,

        inspectHost,


        addCustomDomain,

        removeCustomDomain,

        getCustomDomains,

        getDomains,

        getSettings: readSettings,
        addDomain: addCustomDomain,
        removeDomain: removeCustomDomain,


        createEvent,

        getEvents,

        saveEvents,

        appendEvent,

        clearEvents,


        calculateReduction,

        isSuccessful,

        getMode
    };

})();
