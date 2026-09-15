/* =========================================================
   INTERRUPT — v0.1
   Application logic
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const SUPPORTED_LANGUAGES = {
    en: {
        code: "EN",
        flag: "🇬🇧",
        file: "locales/en.json"
    },
    ro: {
        code: "RO",
        flag: "🇷🇴",
        file: "locales/ro.json"
    },
    fr: {
        code: "FR",
        flag: "🇫🇷",
        file: "locales/fr.json"
    },
    de: {
        code: "DE",
        flag: "🇩🇪",
        file: "locales/de.json"
    },
    es: {
        code: "ES",
        flag: "🇪🇸",
        file: "locales/es.json"
    },
    it: {
        code: "IT",
        flag: "🇮🇹",
        file: "locales/it.json"
    }
};

const DEFAULT_LANGUAGE = "en";
const LANGUAGE_STORAGE_KEY = "interrupt_language";
const SESSION_STORAGE_KEY = "interrupt_sessions";


/* =========================================================
   APPLICATION STATE
   ========================================================= */

const state = {

    language: DEFAULT_LANGUAGE,

    translations: {},

    currentScreen: "home",

    session: {
        id: null,

        behavior: null,
        behaviorLabel: null,

        intensityBefore: null,
        intensityAfter: null,

        expectation: null,
        expectationLabel: null,

        trigger: null,

        intervention: null,
        interventionAttempts: [],

        outcome: null,

        startedAt: null,
        completedAt: null
    },

    timer: {
        interval: null,
        remaining: 0
    }
};


/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => Array.from(
    document.querySelectorAll(selector)
);


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", init);

async function init() {

    setupEventListeners();

    loadSavedLanguage();

    await loadTranslations(state.language);

    updateLanguageUI();

    showScreen("home");
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

    /* Home */

    $("#startButton").addEventListener("click", startSession);

    $("#logoButton").addEventListener("click", () => {
        resetSession();
        showScreen("home");
    });


    /* Language */

    $("#languageButton").addEventListener(
        "click",
        toggleLanguageMenu
    );

    $$(".language-option").forEach(button => {

        button.addEventListener("click", async () => {

            const language = button.dataset.language;

            await changeLanguage(language);

            closeLanguageMenu();
        });
    });


    document.addEventListener("click", (event) => {

        const wrapper = $(".language-wrapper");

        if (
            wrapper &&
            !wrapper.contains(event.target)
        ) {
            closeLanguageMenu();
        }
    });


    /* Behavior */

    $$(".choice-button[data-behavior]").forEach(button => {

        button.addEventListener("click", () => {

            selectBehavior(button.dataset.behavior);

        });

    });


    $("#behaviorContinueButton").addEventListener(
        "click",
        continueFromBehavior
    );


    /* Intensity */

    $("#intensitySlider").addEventListener(
        "input",
        updateIntensityDisplay
    );

    $("#intensityContinueButton").addEventListener(
        "click",
        continueFromIntensity
    );


    /* Expectation */

    $$(".choice-button[data-expectation]").forEach(button => {

        button.addEventListener("click", () => {

            selectExpectation(
                button.dataset.expectation
            );

        });

    });


    $("#expectationContinueButton").addEventListener(
        "click",
        continueFromExpectation
    );


    /* Reassessment */

    $("#reassessSlider").addEventListener(
        "input",
        updateReassessDisplay
    );

    $("#reassessContinueButton").addEventListener(
        "click",
        completeReassessment
    );


    /* Outcomes */

    $$(".outcome-button").forEach(button => {

        button.addEventListener("click", () => {

            selectOutcome(button.dataset.outcome);

        });

    });


    /* Result */

    $("#finishButton").addEventListener(
        "click",
        finishSession
    );

    $("#anotherInterventionButton").addEventListener(
        "click",
        tryAnotherIntervention
    );


    /* Back buttons */

    $$("[data-back]").forEach(button => {

        button.addEventListener("click", () => {

            const target = button.dataset.back;

            showScreen(target);

        });

    });
}


/* =========================================================
   LANGUAGE SYSTEM
   ========================================================= */

function loadSavedLanguage() {

    const saved = localStorage.getItem(
        LANGUAGE_STORAGE_KEY
    );

    if (
        saved &&
        SUPPORTED_LANGUAGES[saved]
    ) {
        state.language = saved;
        return;
    }

    const browserLanguage =
        navigator.language
            ? navigator.language
                .substring(0, 2)
                .toLowerCase()
            : null;

    if (
        browserLanguage &&
        SUPPORTED_LANGUAGES[browserLanguage]
    ) {
        state.language = browserLanguage;
        return;
    }

    state.language = DEFAULT_LANGUAGE;
}


async function loadTranslations(language) {

    const languageConfig =
        SUPPORTED_LANGUAGES[language] ||
        SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];

    try {

        const response = await fetch(
            languageConfig.file,
            {
                cache: "no-cache"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Translation file failed: ${response.status}`
            );
        }

        state.translations = await response.json();

    } catch (error) {

        console.error(
            "Could not load translations:",
            error
        );

        /*
         * If the selected language fails,
         * try English as the final fallback.
         */

        if (language !== DEFAULT_LANGUAGE) {

            try {

                const response = await fetch(
                    SUPPORTED_LANGUAGES.en.file,
                    {
                        cache: "no-cache"
                    }
                );

                state.translations =
                    await response.json();

            } catch (fallbackError) {

                console.error(
                    "English fallback failed:",
                    fallbackError
                );

                state.translations = {};

            }

        } else {

            state.translations = {};

        }
    }

    applyTranslations();
}


async function changeLanguage(language) {

    if (!SUPPORTED_LANGUAGES[language]) {
        return;
    }

    state.language = language;

    localStorage.setItem(
        LANGUAGE_STORAGE_KEY,
        language
    );

    await loadTranslations(language);

    updateLanguageUI();

    /*
     * If the user is currently inside an intervention,
     * rebuild it in the new language.
     */

    if (
        state.currentScreen === "intervention" &&
        state.session.intervention
    ) {
        renderIntervention(
            state.session.intervention
        );
    }
}


function applyTranslations() {

    $$("[data-i18n]").forEach(element => {

        const key = element.dataset.i18n;

        const value = translate(key);

        if (value !== null) {
            element.textContent = value;
        }
    });


    $$("[data-i18n-placeholder]").forEach(
        element => {

            const key =
                element.dataset.i18nPlaceholder;

            const value = translate(key);

            if (value !== null) {
                element.placeholder = value;
            }

        }
    );
}


function translate(key, fallback = null) {

    const parts = key.split(".");

    let value = state.translations;

    for (const part of parts) {

        if (
            value === null ||
            value === undefined ||
            typeof value !== "object" ||
            !(part in value)
        ) {
            return fallback !== null
                ? fallback
                : key;
        }

        value = value[part];
    }

    return typeof value === "string"
        ? value
        : fallback !== null
            ? fallback
            : key;
}


function updateLanguageUI() {

    const config =
        SUPPORTED_LANGUAGES[state.language];

    if (!config) return;

    $("#currentLanguageFlag").textContent =
        config.flag;

    $("#currentLanguageCode").textContent =
        config.code;

    document.documentElement.lang =
        state.language;
}


function toggleLanguageMenu() {

    const menu = $("#languageMenu");
    const button = $("#languageButton");

    const isHidden = menu.hasAttribute("hidden");

    if (isHidden) {

        menu.removeAttribute("hidden");

        button.setAttribute(
            "aria-expanded",
            "true"
        );

    } else {

        closeLanguageMenu();
    }
}


function closeLanguageMenu() {

    const menu = $("#languageMenu");
    const button = $("#languageButton");

    menu.setAttribute("hidden", "");

    button.setAttribute(
        "aria-expanded",
        "false"
    );
}


/* =========================================================
   SCREEN NAVIGATION
   ========================================================= */

function showScreen(screenName) {

    $$(".screen").forEach(screen => {

        screen.classList.remove(
            "screen-active"
        );

    });


    const target =
        $(`#screen-${screenName}`);

    if (!target) {
        console.error(
            `Screen not found: ${screenName}`
        );
        return;
    }


    target.classList.add("screen-active");

    state.currentScreen = screenName;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   SESSION MANAGEMENT
   ========================================================= */

function startSession() {

    stopTimer();

    state.session = {

        id:
            Date.now().toString() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 9),

        behavior: null,
        behaviorLabel: null,

        intensityBefore: null,
        intensityAfter: null,

        expectation: null,
        expectationLabel: null,

        trigger: null,

        intervention: null,
        interventionAttempts: [],

        outcome: null,

        startedAt:
            new Date().toISOString(),

        completedAt: null
    };


    clearBehaviorSelection();

    showScreen("behavior");
}


function resetSession() {

    stopTimer();

    state.session = {

        id: null,

        behavior: null,
        behaviorLabel: null,

        intensityBefore: null,
        intensityAfter: null,

        expectation: null,
        expectationLabel: null,

        trigger: null,

        intervention: null,
        interventionAttempts: [],

        outcome: null,

        startedAt: null,
        completedAt: null
    };


    clearBehaviorSelection();
    clearExpectationSelection();

    $("#intensitySlider").value = 5;
    $("#intensityValue").textContent = "5";

    $("#reassessSlider").value = 5;
    $("#reassessValue").textContent = "5";

    showScreen("home");
}


/* =========================================================
   BEHAVIOR
   ========================================================= */

function selectBehavior(behavior) {

    $$(".choice-button[data-behavior]").forEach(
        button => {

            button.classList.toggle(
                "selected",
                button.dataset.behavior === behavior
            );

        }
    );


    state.session.behavior = behavior;


    if (behavior === "other") {

        $("#otherBehaviorContainer")
            .removeAttribute("hidden");

        $("#otherBehaviorInput").focus();

    } else {

        $("#otherBehaviorContainer")
            .setAttribute("hidden", "");

        const button =
            $(
                `.choice-button[data-behavior="${behavior}"]`
            );

        state.session.behaviorLabel =
            button
                ?.querySelector("span:last-child")
                ?.textContent
                ?.trim() || behavior;
    }


    updateBehaviorContinueState();
}


function updateBehaviorContinueState() {

    const button =
        $("#behaviorContinueButton");

    if (!state.session.behavior) {

        button.disabled = true;
        return;
    }


    if (
        state.session.behavior === "other"
    ) {

        const value =
            $("#otherBehaviorInput")
                .value
                .trim();

        button.disabled =
            value.length === 0;

    } else {

        button.disabled = false;
    }
}


$("#otherBehaviorInput")?.addEventListener(
    "input",
    updateBehaviorContinueState
);


function continueFromBehavior() {

    if (!state.session.behavior) {
        return;
    }


    if (
        state.session.behavior === "other"
    ) {

        const value =
            $("#otherBehaviorInput")
                .value
                .trim();

        if (!value) return;

        state.session.behaviorLabel =
            value;
    }


    showScreen("intensity");
}


function clearBehaviorSelection() {

    $$(".choice-button[data-behavior]")
        .forEach(button => {

            button.classList.remove(
                "selected"
            );

        });


    $("#otherBehaviorContainer")
        .setAttribute("hidden", "");

    $("#otherBehaviorInput").value = "";

    $("#behaviorContinueButton")
        .disabled = true;
}


/* =========================================================
   INTENSITY
   ========================================================= */

function updateIntensityDisplay() {

    const value =
        Number($("#intensitySlider").value);

    $("#intensityValue").textContent =
        value;
}


function continueFromIntensity() {

    const value =
        Number($("#intensitySlider").value);

    state.session.intensityBefore =
        value;

    showScreen("expectation");
}


/* =========================================================
   EXPECTATION
   ========================================================= */

function selectExpectation(expectation) {

    $$(".choice-button[data-expectation]")
        .forEach(button => {

            button.classList.toggle(
                "selected",
                button.dataset.expectation ===
                    expectation
            );

        });


    state.session.expectation =
        expectation;


    const button =
        $(
            `.choice-button[data-expectation="${expectation}"]`
        );


    state.session.expectationLabel =
        button
            ?.querySelector("span")
            ?.textContent
            ?.trim() || expectation;


    updateExpectationContinueState();
}


function updateExpectationContinueState() {

    $("#expectationContinueButton")
        .disabled =
        !state.session.expectation;
}


function continueFromExpectation() {

    if (!state.session.expectation) {
        return;
    }


    /*
     * The intervention engine chooses
     * an intervention based on the
     * current session data.
     */

    const intervention =
        chooseIntervention();


    state.session.intervention =
        intervention.id;


    renderIntervention(intervention.id);

    showScreen("intervention");
}


function clearExpectationSelection() {

    $$(".choice-button[data-expectation]")
        .forEach(button => {

            button.classList.remove(
                "selected"
            );

        });


    state.session.expectation = null;
    state.session.expectationLabel = null;

    $("#expectationContinueButton")
        .disabled = true;
}


/* =========================================================
   INTERVENTION ENGINE
   ========================================================= */

const INTERVENTIONS = {

    name_it: {
        id: "name_it",
        category: "defusion",
        titleKey: "interventions.nameIt.title"
    },

    promise: {
        id: "promise",
        category: "cognitive",
        titleKey: "interventions.promise.title"
    },

    wave: {
        id: "wave",
        category: "urge_surfing",
        titleKey: "interventions.wave.title"
    },

    delay: {
        id: "delay",
        category: "delay",
        titleKey: "interventions.delay.title"
    },

    fast_forward: {
        id: "fast_forward",
        category: "future",
        titleKey: "interventions.fastForward.title"
    },

    change_scene: {
        id: "change_scene",
        category: "environment",
        titleKey: "interventions.changeScene.title"
    },

    actual_need: {
        id: "actual_need",
        category: "need",
        titleKey: "interventions.actualNeed.title"
    },

    break_chain: {
        id: "break_chain",
        category: "trigger",
        titleKey: "interventions.breakChain.title"
    },

    two_futures: {
        id: "two_futures",
        category: "future",
        titleKey: "interventions.twoFutures.title"
    },

    switch_90: {
        id: "switch_90",
        category: "attention",
        titleKey: "interventions.switch90.title"
    },

    reality_check: {
        id: "reality_check",
        category: "cognitive",
        titleKey: "interventions.realityCheck.title"
    },

    previous_success: {
        id: "previous_success",
        category: "personal",
        titleKey: "interventions.previousSuccess.title"
    }
};


/*
 * Initial rule-based engine.
 *
 * This is intentionally NOT AI.
 *
 * Later we can replace this function
 * with a personalized scoring system.
 */

function chooseIntervention() {

    const session =
        state.session;


    /*
     * If the user has successfully used
     * an intervention before for a similar
     * situation, prioritize it.
     */

    const personal =
        findBestPreviousIntervention();


    if (personal) {
        return INTERVENTIONS[personal];
    }


    /*
     * High-intensity urges:
     * first break automaticity.
     */

    if (
        session.intensityBefore >= 8
    ) {

        return INTERVENTIONS.change_scene;
    }


    /*
     * Gambling / shopping / behavior
     * associated with reward expectations.
     */

    if (
        session.expectation === "reward" ||
        session.expectation === "excitement" ||
        session.expectation === "control"
    ) {

        return INTERVENTIONS.promise;
    }


    /*
     * Relief / escape:
     * explore what is actually needed.
     */

    if (
        session.expectation === "relief" ||
        session.expectation === "escape" ||
        session.expectation === "comfort"
    ) {

        return INTERVENTIONS.actual_need;
    }


    /*
     * Pleasure / stimulation:
     * switch attention or break the scene.
     */

    if (
        session.expectation === "pleasure" ||
        session.expectation === "something_to_do"
    ) {

        return INTERVENTIONS.switch_90;
    }


    /*
     * Unknown:
     * start with defusion.
     */

    if (
        session.expectation === "unknown"
    ) {

        return INTERVENTIONS.name_it;
    }


    return INTERVENTIONS.delay;
}


/* =========================================================
   PERSONALIZATION
   ========================================================= */

function findBestPreviousIntervention() {

    const sessions =
        getStoredSessions();

    if (!sessions.length) {
        return null;
    }


    const relevant =
        sessions.filter(session => {

            if (
                !session.interventionAttempts ||
                !session.interventionAttempts.length
            ) {
                return false;
            }

            if (
                session.behavior !==
                state.session.behavior
            ) {
                return false;
            }

            return true;
        });


    if (!relevant.length) {
        return null;
    }


    const scores = {};


    relevant.forEach(session => {

        session.interventionAttempts
            .forEach(attempt => {

                if (
                    typeof attempt.before !==
                        "number" ||
                    typeof attempt.after !==
                        "number"
                ) {
                    return;
                }


                const improvement =
                    attempt.before -
                    attempt.after;


                if (
                    !scores[attempt.id]
                ) {

                    scores[attempt.id] = {
                        total: 0,
                        count: 0
                    };

                }


                scores[attempt.id].total +=
                    improvement;

                scores[attempt.id].count +=
                    1;

            });

    });


    let bestId = null;
    let bestAverage = 0;


    Object.entries(scores)
        .forEach(([id, score]) => {

            if (score.count < 1) {
                return;
            }

            const average =
                score.total /
                score.count;


            if (
                average > bestAverage
            ) {

                bestAverage = average;
                bestId = id;

            }

        });


    return bestId;
}


/* =========================================================
   INTERVENTION RENDERING
   ========================================================= */

function renderIntervention(id) {

    const intervention =
        INTERVENTIONS[id];

    if (!intervention) {
        return;
    }


    $("#interventionTitle")
        .textContent =
        translate(
            intervention.titleKey,
            id
        );


    $("#interventionCategory")
        .textContent =
        translate(
            `interventions.categories.${intervention.category}`,
            intervention.category
        );


    const content =
        $("#interventionContent");

    const actions =
        $("#interventionActions");


    content.innerHTML = "";
    actions.innerHTML = "";


    switch (id) {

        case "name_it":
            renderNameIt(content, actions);
            break;

        case "promise":
            renderPromise(content, actions);
            break;

        case "wave":
            renderWave(content, actions);
            break;

        case "delay":
            renderDelay(content, actions);
            break;

        case "fast_forward":
            renderFastForward(content, actions);
            break;

        case "change_scene":
            renderChangeScene(content, actions);
            break;

        case "actual_need":
            renderActualNeed(content, actions);
            break;

        case "break_chain":
            renderBreakChain(content, actions);
            break;

        case "two_futures":
            renderTwoFutures(content, actions);
            break;

        case "switch_90":
            renderSwitch90(content, actions);
            break;

        case "reality_check":
            renderRealityCheck(content, actions);
            break;

        case "previous_success":
            renderPreviousSuccess(content, actions);
            break;

        default:
            renderGenericIntervention(
                content,
                actions
            );
    }
}


/* =========================================================
   INTERVENTION HELPERS
   ========================================================= */

function createParagraph(
    parent,
    text
) {

    const p =
        document.createElement("p");

    p.textContent = text;

    parent.appendChild(p);

    return p;
}


function createInput(
    parent,
    placeholder = "",
    multiline = true
) {

    const input =
        document.createElement(
            multiline
                ? "textarea"
                : "input"
        );

    input.className =
        "intervention-input";

    if (placeholder) {
        input.placeholder = placeholder;
    }

    parent.appendChild(input);

    return input;
}


function createAction(
    parent,
    label,
    callback,
    primary = true
) {

    const button =
        document.createElement("button");

    button.type = "button";

    button.className =
        "intervention-action-button" +
        (primary ? " primary" : "");

    button.textContent = label;

    button.addEventListener(
        "click",
        callback
    );

    parent.appendChild(button);

    return button;
}


function interventionText(
    key,
    fallback
) {

    return translate(
        `interventions.${key}`,
        fallback
    );
}


/* =========================================================
   01 — NAME IT
   ========================================================= */

function renderNameIt(
    content,
    actions
) {

    createParagraph(
        content,
        interventionText(
            "nameIt.instruction",
            "Let's separate the urge from you."
        )
    );


    createParagraph(
        content,
        interventionText(
            "nameIt.firstPrompt",
            "Complete this: “I am having the urge to…”"
        )
    );


    const first =
        createInput(
            content,
            interventionText(
                "nameIt.placeholder",
                "I am having the urge to..."
            )
        );


    createParagraph(
        content,
        interventionText(
            "nameIt.secondPrompt",
            "Now try this: “My brain is telling me to…”"
        )
    );


    const second =
        createInput(
            content,
            interventionText(
                "nameIt.placeholder2",
                "My brain is telling me to..."
            )
        );


    createAction(
        actions,
        translate(
            "common.done",
            "DONE"
        ),
        () => {

            if (
                !first.value.trim() ||
                !second.value.trim()
            ) {
                first.focus();
                return;
            }

            completeIntervention();

        }
    );
}


/* =========================================================
   02 — THE PROMISE
   ========================================================= */

function renderPromise(
    content,
    actions
) {

    const expectation =
        state.session.expectationLabel ||
        "";


    createParagraph(
        content,
        interventionText(
            "promise.intro",
            "Your brain is making you an offer."
        )
    );


    createParagraph(
        content,
        `${interventionText(
            "promise.expected",
            "Right now it expects:"
        )} ${expectation}.`
    );


    createParagraph(
        content,
        interventionText(
            "promise.durationQuestion",
            "If you do it, how long do you expect the feeling to last?"
        )
    );


    const input =
        createInput(
            content,
            interventionText(
                "promise.durationPlaceholder",
                "A few minutes, an hour, most of the day..."
            )
        );


    createParagraph(
        content,
        interventionText(
            "promise.afterQuestion",
            "And what usually happens after that?"
        )
    );


    const after =
        createInput(
            content,
            interventionText(
                "promise.afterPlaceholder",
                "What happens next?"
            )
        );


    createAction(
        actions,
        translate(
            "common.continue",
            "CONTINUE"
        ),
        () => {

            if (
                !input.value.trim() ||
                !after.value.trim()
            ) {
                if (!input.value.trim()) {
                    input.focus();
                } else {
                    after.focus();
                }

                return;
            }

            completeIntervention();

        }
    );
}


/* =========================================================
   03 — RIDE THE WAVE
   ========================================================= */

function renderWave(
    content,
    actions
) {

    createParagraph(
        content,
        interventionText(
            "wave.instruction",
            "Don't fight the urge. Watch it."
        )
    );


    createParagraph(
        content,
        interventionText(
            "wave.locationPrompt",
            "Where do you feel it?"
        )
    );


    const locations = [
        "Chest",
        "Stomach",
        "Head",
        "Hands",
        "Everywhere"
    ];


    locations.forEach(location => {

        createAction(
            actions,
            interventionText(
                `wave.locations.${location.toLowerCase()}`,
                location
            ),
            () => startWaveTimer(
                content,
                actions
            ),
            false
        );

    });
}


function startWaveTimer(
    content,
    actions
) {

    content.innerHTML = "";
    actions.innerHTML = "";


    createParagraph(
        content,
        interventionText(
            "wave.timerIntro",
            "Stay with the sensation for 60 seconds."
        )
    );


    const timerBox =
        document.createElement("div");

    timerBox.className =
        "intervention-timer";


    const timerValue =
        document.createElement("div");

    timerValue.className =
        "timer-value";

    timerValue.textContent =
        "1:00";


    timerBox.appendChild(timerValue);

    content.appendChild(timerBox);


    startTimer(
        60,
        timerValue,
        () => {

            actions.innerHTML = "";

            createParagraph(
                content,
                interventionText(
                    "wave.finished",
                    "Did anything change?"
                )
            );


            createAction(
                actions,
                interventionText(
                    "wave.weaker",
                    "It got weaker"
                ),
                completeIntervention
            );


            createAction(
                actions,
                interventionText(
                    "wave.changed",
                    "It changed"
                ),
                completeIntervention,
                false
            );


            createAction(
                actions,
                interventionText(
                    "wave.same",
                    "It stayed the same"
                ),
                completeIntervention,
                false
            );


            createAction(
                actions,
                interventionText(
                    "wave.stronger",
                    "It got stronger"
                ),
                completeIntervention,
                false
            );

        }
    );
}


/* =========================================================
   04 — NOT NOW
   ========================================================= */

function renderDelay(
    content,
    actions
) {

    createParagraph(
        content,
        interventionText(
            "delay.instruction",
            "You don't have to decide forever."
        )
    );


    createParagraph(
        content,
        interventionText(
            "delay.promise",
            "Just don't do it for the next 10 minutes."
        )
    );


    createAction(
        actions,
        interventionText(
            "delay.start",
            "START 10:00"
        ),
        () => startDelayTimer(
            content,
            actions
        )
    );
}


function startDelayTimer(
    content,
    actions
) {

    content.innerHTML = "";
    actions.innerHTML = "";


    const timerBox =
        document.createElement("div");

    timerBox.className =
        "intervention-timer";


    const timerValue =
        document.createElement("div");

    timerValue.className =
        "timer-value";

    timerValue.textContent =
        "10:00";


    timerBox.appendChild(timerValue);

    content.appendChild(timerBox);


    createParagraph(
        content,
        interventionText(
            "delay.waiting",
            "You don't have to do anything. Just let the ten minutes pass."
        )
    );


    startTimer(
        600,
        timerValue,
        () => {

            actions.innerHTML = "";

            createParagraph(
                content,
                interventionText(
                    "delay.finished",
                    "The ten minutes are over."
                )
            );


            createAction(
                actions,
                interventionText(
                    "delay.stillWant",
                    "I still want it"
                ),
                completeIntervention
            );


            createAction(
                actions,
                interventionText(
                    "delay.weaker",
                    "It's weaker"
                ),
                completeIntervention,
                false
            );


            createAction(
                actions,
                interventionText(
                    "delay.gone",
                    "It's gone"
                ),
                completeIntervention,
                false
            );


            createAction(
                actions,
                interventionText(
                    "delay.alreadyDid",
                    "I already did it"
                ),
                completeIntervention,
                false
            );

        }
    );
}


/* =========================================================
   05 — FAST FORWARD
   ========================================================= */

function renderFastForward(
    content,
    actions
) {

    createParagraph(
        content,
        interventionText(
            "fastForward.intro",
            "Imagine you've already done it."
        )
    );


    createParagraph(
        content,
        interventionText(
            "fastForward.tenMinutes",
            "10 minutes later..."
        )
    );


    const first =
        createInput(
            content,
            interventionText(
                "fastForward.tenPlaceholder",
                "How do you feel?"
            )
        );


    createParagraph(
        content,
        interventionText(
            "fastForward.tomorrow",
            "Tomorrow..."
        )
    );


    const second =
        createInput(
            content,
            interventionText(
                "fastForward.tomorrowPlaceholder",
                "How do you feel tomorrow?"
            )
        );


    createParagraph(
        content,
        interventionText(
            "fastForward.next",
            "What happens next?"
        )
    );


    const third =
        createInput(
            content,
            interventionText(
                "fastForward.nextPlaceholder",
                "What happens after that?"
            )
        );


    createAction(
        actions,
        translate(
            "common.continue",
            "CONTINUE"
        ),
        () => {

            if (
                !first.value.trim() ||
                !second.value.trim() ||
                !third.value.trim()
            ) {
                return;
            }

            completeIntervention();

        }
    );
}


/* =========================================================
   06 — CHANGE THE SCENE
   ========================================================= */

function renderChangeScene(
    content,
    actions
) {

    const steps = [
        interventionText(
            "changeScene.step1",
            "Stand up."
        ),
        interventionText(
            "changeScene.step2",
            "Put the device or object down."
        ),
        interventionText(
            "changeScene.step3",
            "Go somewhere different."
        ),
        interventionText(
            "changeScene.step4",
            "Stay there for two minutes."
        )
    ];


    steps.forEach(
        (step, index) => {

            createParagraph(
                content,
                `${index + 1}. ${step}`
            );

        }
    );


    createAction(
        actions,
        interventionText(
            "changeScene.ready",
            "I'M SOMEWHERE ELSE"
        ),
        () => {

            content.innerHTML = "";
            actions.innerHTML = "";

            createParagraph(
                content,
                interventionText(
                    "changeScene.wait",
                    "Stay here for two minutes."
                )
            );


            const timerBox =
                document.createElement("div");

            timerBox.className =
                "intervention-timer";


            const timerValue =
                document.createElement("div");

            timerValue.className =
                "timer-value";

            timerValue.textContent =
                "2:00";


            timerBox.appendChild(
                timerValue
            );

            content.appendChild(
                timerBox
            );


            startTimer(
                120,
                timerValue,
                () => {

                    actions.innerHTML = "";

                    createAction(
                        actions,
                        translate(
                            "common.continue",
                            "CONTINUE"
                        ),
                        completeIntervention
                    );

                }
            );

        }
    );
}


/* =========================================================
   07 — ACTUAL NEED
   ========================================================= */

function renderActualNeed(
    content,
    actions
) {

    createParagraph(
        content,
        interventionText(
            "actualNeed.intro",
            "Forget the behavior for a second."
        )
    );


    createParagraph(
        content,
        interventionText(
            "actualNeed.question",
            "What do you actually need?"
        )
    );


    const needs = [
        "stimulation",
        "relief",
        "comfort",
        "escape",
        "connection",
        "control",
        "rest",
        "unknown"
    ];


    needs.forEach(need => {

        createAction(
            actions,
            interventionText(
                `actualNeed.options.${need}`,
                need
            ),
            () => {

                state.session.actualNeed =
                    need;

                showNeedSuggestion(
                    content,
                    actions,
                    need
                );

            },
            false
        );

    });
}


function showNeedSuggestion(
    content,
    actions,
    need
) {

    content.innerHTML = "";
    actions.innerHTML = "";


    const suggestions = {

        stimulation:
            interventionText(
                "actualNeed.suggestions.stimulation",
                "Give your brain something new for 90 seconds."
            ),

        relief:
            interventionText(
                "actualNeed.suggestions.relief",
                "Take a slow breath and deliberately relax your shoulders."
            ),

        comfort:
            interventionText(
                "actualNeed.suggestions.comfort",
                "Move somewhere physically comfortable and give yourself two quiet minutes."
            ),

        escape:
            interventionText(
                "actualNeed.suggestions.escape",
                "Step away from the situation for two minutes."
            ),

        connection:
            interventionText(
                "actualNeed.suggestions.connection",
                "Send one simple message to someone you trust."
            ),

        control:
            interventionText(
                "actualNeed.suggestions.control",
                "Choose one small thing around you that you can control right now."
            ),

        rest:
            interventionText(
                "actualNeed.suggestions.rest",
                "Put everything down for two minutes and let yourself stop."
            ),

        unknown:
            interventionText(
                "actualNeed.suggestions.unknown",
                "You don't need to know yet. Just create two minutes of distance."
            )
    };


    createParagraph(
        content,
        suggestions[need] ||
        suggestions.unknown
    );


    createAction(
        actions,
        translate(
            "common.done",
            "DONE"
        ),
        completeIntervention
    );
}


/* =========================================================
   08 — BREAK THE CHAIN
   ========================================================= */

function renderBreakChain(
    content,
    actions
) {

    createParagraph(
        content,
        interventionText(
            "breakChain.question",
            "What happened right before the urge?"
        )
    );


    const triggers = [
        "boredom",
        "stress",
        "something_seen",
        "argument",
        "alone",
        "phone",
        "habit",
        "nothing_obvious"
    ];


    triggers.forEach(trigger => {

        createAction(
            actions,
            interventionText(
                `breakChain.options.${trigger}`,
                trigger
            ),
            () => {

                state.session.trigger =
                    trigger;


                content.innerHTML = "";
                actions.innerHTML = "";


                createParagraph(
                    content,
                    interventionText(
                        "breakChain.result",
                        "That's useful. Now interrupt the chain here."
                    )
                );


                createAction(
                    actions,
                    interventionText(
                        "breakChain.changeScene",
                        "CHANGE MY SCENE"
                    ),
                    completeIntervention
                );

            },
            false
        );

    });
}


/* =========================================================
   09 — TWO FUTURES
   ========================================================= */

function renderTwoFutures(
    content,
    actions
) {

    createParagraph(
        content,
        interventionText(
            "twoFutures.intro",
            "Look at the two paths without judging either one."
        )
    );


    createParagraph(
        content,
        interventionText(
            "twoFutures.act",
            "IF I ACT"
        )
    );


    const act =
        createInput(
            content,
            interventionText(
                "twoFutures.actPlaceholder",
                "What happens?"
            )
        );


    createParagraph(
        content,
        interventionText(
            "twoFutures.dont",
            "IF I DON'T"
        )
    );


    const dont =
        createInput(
            content,
            interventionText(
                "twoFutures.dontPlaceholder",
                "What happens instead?"
            )
        );


    createAction(
        actions,
        translate(
            "common.continue",
            "CONTINUE"
        ),
        () => {

            if (
                !act.value.trim() ||
                !dont.value.trim()
            ) {
                return;
            }

            completeIntervention();

        }
    );
}


/* =========================================================
   10 — 90 SECOND SWITCH
   ========================================================= */

function renderSwitch90(
    content,
    actions
) {

    createParagraph(
        content,
        interventionText(
            "switch90.instruction",
            "No thinking. Just do something else for 90 seconds."
        )
    );


    const tasks = [
        interventionText(
            "switch90.task1",
            "Find five things around you that are blue."
        ),
        interventionText(
            "switch90.task2",
            "Wash one cup."
        ),
        interventionText(
            "switch90.task3",
            "Stand up and walk around."
        ),
        interventionText(
            "switch90.task4",
            "Count ten objects around you."
        )
    ];


    const randomTask =
        tasks[
            Math.floor(
                Math.random() *
                tasks.length
            )
        ];


    createParagraph(
        content,
        randomTask
    );


    createAction(
        actions,
        interventionText(
            "switch90.start",
            "START 90 SECONDS"
        ),
        () => {

            content.innerHTML = "";
            actions.innerHTML = "";


            createParagraph(
                content,
                randomTask
            );


            const timerBox =
                document.createElement("div");

            timerBox.className =
                "intervention-timer";


            const timerValue =
                document.createElement("div");

            timerValue.className =
                "timer-value";

            timerValue.textContent =
                "1:30";


            timerBox.appendChild(
                timerValue
            );

            content.appendChild(
                timerBox
            );


            startTimer(
                90,
                timerValue,
                () => {

                    actions.innerHTML = "";

                    createAction(
                        actions,
                        translate(
                            "common.continue",
                            "CONTINUE"
                        ),
                        completeIntervention
                    );

                }
            );

        }
    );
}


/* =========================================================
   11 — REALITY CHECK
   ========================================================= */

function renderRealityCheck(
    content,
    actions
) {

    createParagraph(
        content,
        interventionText(
            "realityCheck.question",
            "What do you think will happen if you do it?"
        )
    );


    const prediction =
        createInput(
            content,
            interventionText(
                "realityCheck.placeholder",
                "I think..."
            )
        );


    createParagraph(
        content,
        interventionText(
            "realityCheck.certainty",
            "How certain are you?"
        )
    );


    const certainty =
        document.createElement("input");

    certainty.type = "range";
    certainty.min = "0";
    certainty.max = "100";
    certainty.value = "50";
    certainty.className =
        "intervention-range";

    content.appendChild(
        certainty
    );


    const certaintyValue =
        document.createElement("p");

    certaintyValue.textContent =
        "50%";

    content.appendChild(
        certaintyValue
    );


    certainty.addEventListener(
        "input",
        () => {

            certaintyValue.textContent =
                `${certainty.value}%`;

        }
    );


    createParagraph(
        content,
        interventionText(
            "realityCheck.past",
            "Has this actually happened consistently before?"
        )
    );


    createAction(
        actions,
        interventionText(
            "realityCheck.yes",
            "YES"
        ),
        completeIntervention
    );


    createAction(
        actions,
        interventionText(
            "realityCheck.no",
            "NO"
        ),
        completeIntervention,
        false
    );


    createAction(
        actions,
        interventionText(
            "realityCheck.sometimes",
            "SOMETIMES"
        ),
        completeIntervention,
        false
    );
}


/* =========================================================
   12 — PREVIOUS SUCCESS
   ========================================================= */

function renderPreviousSuccess(
    content,
    actions
) {

    const best =
        findBestPreviousIntervention();


    if (!best) {

        renderGenericIntervention(
            content,
            actions
        );

        return;
    }


    const title =
        translate(
            INTERVENTIONS[best].titleKey,
            best
        );


    createParagraph(
        content,
        interventionText(
            "previousSuccess.intro",
            "You've been here before."
        )
    );


    createParagraph(
        content,
        interventionText(
            "previousSuccess.message",
            `Last time, ${title} helped reduce the urge.`
        )
    );


    createAction(
        actions,
        interventionText(
            "previousSuccess.try",
            "TRY IT AGAIN"
        ),
        () => {

            state.session.intervention =
                best;

            renderIntervention(
                best
            );

        }
    );
}


/* =========================================================
   GENERIC INTERVENTION
   ========================================================= */

function renderGenericIntervention(
    content,
    actions
) {

    createParagraph(
        content,
        interventionText(
            "generic.instruction",
            "Create some distance between the urge and the action."
        )
    );


    createAction(
        actions,
        translate(
            "common.done",
            "DONE"
        ),
        completeIntervention
    );
}


/* =========================================================
   INTERVENTION COMPLETION
   ========================================================= */

function completeIntervention() {

    stopTimer();

    showScreen("reassess");


    $("#reassessSlider").value =
        state.session.intensityBefore;

    $("#reassessValue").textContent =
        state.session.intensityBefore;
}


function updateReassessDisplay() {

    const value =
        Number(
            $("#reassessSlider").value
        );

    $("#reassessValue")
        .textContent = value;
}


function completeReassessment() {

    const before =
        Number(
            state.session.intensityBefore
        );

    const after =
        Number(
            $("#reassessSlider").value
        );


    state.session.intensityAfter =
        after;


    state.session.interventionAttempts
        .push({

            id:
                state.session.intervention,

            before,
            after,

            timestamp:
                new Date().toISOString()

        });


    showScreen("outcome");
}


/* =========================================================
   OUTCOME
   ========================================================= */

function selectOutcome(outcome) {

    state.session.outcome =
        outcome;

    state.session.completedAt =
        new Date().toISOString();


    saveSession();

    renderResult();

    showScreen("result");
}


/* =========================================================
   RESULT
   ========================================================= */

function renderResult() {

    const before =
        Number(
            state.session.intensityBefore
        );

    const after =
        Number(
            state.session.intensityAfter
        );


    $("#resultBefore")
        .textContent = before;

    $("#resultAfter")
        .textContent = after;


    const change =
        before > 0
            ? Math.round(
                ((before - after) /
                    before) *
                100
            )
            : 0;


    const signedChange =
        change > 0
            ? `−${change}%`
            : change < 0
                ? `+${Math.abs(change)}%`
                : "0%";


    $("#resultChange")
        .textContent =
        signedChange;


    $("#resultBehavior")
        .textContent =
        state.session.behaviorLabel ||
        state.session.behavior ||
        "—";


    const intervention =
        INTERVENTIONS[
            state.session.intervention
        ];


    $("#resultIntervention")
        .textContent =
        intervention
            ? translate(
                intervention.titleKey,
                state.session.intervention
            )
            : "—";


    let message;


    if (after < before) {

        message =
            translate(
                "result.messages.lower",
                "The urge got quieter."
            );

    } else if (after === before) {

        message =
            translate(
                "result.messages.same",
                "The urge didn't move this time."
            );

    } else {

        message =
            translate(
                "result.messages.higher",
                "The urge got stronger. That is useful information too."
            );
    }


    $("#resultMessage")
        .textContent = message;


    if (
        state.session.outcome ===
        "interrupted"
    ) {

        $("#resultTitle")
            .textContent =
            translate(
                "result.interruptedTitle",
                "You interrupted the moment."
            );

    } else if (
        state.session.outcome ===
        "delayed"
    ) {

        $("#resultTitle")
            .textContent =
            translate(
                "result.delayedTitle",
                "You created some distance."
            );

    } else if (
        state.session.outcome ===
        "acted"
    ) {

        $("#resultTitle")
            .textContent =
            translate(
                "result.actedTitle",
                "The urge won this time."
            );

    } else {

        $("#resultTitle")
            .textContent =
            translate(
                "result.unsureTitle",
                "The moment passed."
            );
    }
}


/* =========================================================
   TRY ANOTHER INTERVENTION
   ========================================================= */

function tryAnotherIntervention() {

    /*
     * Exclude interventions already attempted
     * in the current session.
     */

    const used =
        new Set(
            state.session.interventionAttempts
                .map(attempt => attempt.id)
        );


    const available =
        Object.keys(INTERVENTIONS)
            .filter(id => !used.has(id));


    if (!available.length) {

        showScreen("outcome");

        return;
    }


    const next =
        chooseAlternativeIntervention(
            available
        );


    state.session.intervention =
        next;


    renderIntervention(next);

    showScreen("intervention");
}


function chooseAlternativeIntervention(
    available
) {

    /*
     * Prefer a different mechanism
     * from the last attempt.
     */

    const last =
        state.session.interventionAttempts
            .at(-1);


    if (last) {

        const lastCategory =
            INTERVENTIONS[last.id]
                ?.category;


        const different =
            available.filter(id => {

                return (
                    INTERVENTIONS[id]
                        ?.category !==
                    lastCategory
                );

            });


        if (different.length) {

            return different[
                Math.floor(
                    Math.random() *
                    different.length
                )
            ];

        }

    }


    return available[
        Math.floor(
            Math.random() *
            available.length
        )
    ];
}


/* =========================================================
   TIMER
   ========================================================= */

function startTimer(
    seconds,
    display,
    onComplete
) {

    stopTimer();

    state.timer.remaining =
        seconds;


    updateTimerDisplay(
        display,
        state.timer.remaining
    );


    state.timer.interval =
        setInterval(() => {

            state.timer.remaining--;

            updateTimerDisplay(
                display,
                state.timer.remaining
            );


            if (
                state.timer.remaining <= 0
            ) {

                stopTimer();

                if (
                    typeof onComplete ===
                    "function"
                ) {
                    onComplete();
                }

            }

        }, 1000);
}


function updateTimerDisplay(
    display,
    seconds
) {

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        seconds % 60;


    display.textContent =
        `${minutes}:${String(
            remainingSeconds
        ).padStart(2, "0")}`;
}


function stopTimer() {

    if (state.timer.interval) {

        clearInterval(
            state.timer.interval
        );

        state.timer.interval = null;
    }
}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function getStoredSessions() {

    try {

        const raw =
            localStorage.getItem(
                SESSION_STORAGE_KEY
            );


        if (!raw) {
            return [];
        }


        const sessions =
            JSON.parse(raw);


        return Array.isArray(sessions)
            ? sessions
            : [];

    } catch (error) {

        console.error(
            "Could not read sessions:",
            error
        );

        return [];
    }
}


function saveSession() {

    try {

        const sessions =
            getStoredSessions();


        sessions.push(
            JSON.parse(
                JSON.stringify(
                    state.session
                )
            )
        );


        /*
         * Keep the first MVP lightweight.
         * We keep the most recent 250 sessions.
         */

        const trimmed =
            sessions.slice(-250);


        localStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify(trimmed)
        );

    } catch (error) {

        console.error(
            "Could not save session:",
            error
        );
    }
}


/* =========================================================
   FINISH
   ========================================================= */

function finishSession() {

    resetSession();

    showScreen("home");
}


/* =========================================================
   UTILITY: DEBUG
   ========================================================= */

/*
 * Available in browser console:
 *
 * INTERRUPT_DEBUG.getSessions()
 * INTERRUPT_DEBUG.clearSessions()
 * INTERRUPT_DEBUG.state()
 */

window.INTERRUPT_DEBUG = {

    getSessions() {
        return getStoredSessions();
    },

    clearSessions() {
        localStorage.removeItem(
            SESSION_STORAGE_KEY
        );
        console.log(
            "INTERRUPT sessions cleared."
        );
    },

    state() {
        return state;
    }

};
