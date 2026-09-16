const LANGUAGES = {
    en: { file: "locales/en.json", flag: "🇬🇧", code: "EN" },
    ro: { file: "locales/ro.json", flag: "🇷🇴", code: "RO" },
    fr: { file: "locales/fr.json", flag: "🇫🇷", code: "FR" },
    de: { file: "locales/de.json", flag: "🇩🇪", code: "DE" },
    es: { file: "locales/es.json", flag: "🇪🇸", code: "ES" },
    it: { file: "locales/it.json", flag: "🇮🇹", code: "IT" }
};

const STORAGE = {
    language: "interrupt_language",
    sessions: "interrupt_sessions"
};

const INTERVENTIONS = [
    "nameIt",
    "promise",
    "wave",
    "delay",
    "fastForward",
    "changeScene",
    "actualNeed",
    "breakChain",
    "twoFutures",
    "switch90",
    "realityCheck"
];

const INTERVENTION_RULES = {
    gamble: {
        money: ["fastForward", "realityCheck", "delay", "promise"],
        excitement: ["delay", "wave", "changeScene", "switch90"],
        escape: ["actualNeed", "changeScene", "nameIt", "delay"],
        relief: ["actualNeed", "delay", "wave", "changeScene"],
        default: ["fastForward", "realityCheck", "delay", "nameIt"]
    },

    scroll: {
        something_to_do: ["switch90", "changeScene", "delay"],
        escape: ["changeScene", "actualNeed", "delay", "nameIt"],
        excitement: ["switch90", "changeScene", "delay"],
        default: ["changeScene", "switch90", "delay", "nameIt"]
    },

    smoke: {
        relief: ["delay", "wave", "actualNeed", "changeScene"],
        comfort: ["actualNeed", "wave", "delay"],
        escape: ["changeScene", "delay", "actualNeed"],
        default: ["delay", "wave", "changeScene", "nameIt"]
    },

    eat: {
        comfort: ["actualNeed", "delay", "wave", "nameIt"],
        pleasure: ["delay", "actualNeed", "wave"],
        relief: ["actualNeed", "delay", "changeScene"],
        default: ["wave", "delay", "actualNeed", "nameIt"]
    },

    buy: {
        money: ["fastForward", "delay", "realityCheck", "twoFutures"],
        excitement: ["delay", "fastForward", "realityCheck"],
        comfort: ["actualNeed", "delay", "twoFutures"],
        default: ["delay", "fastForward", "realityCheck", "nameIt"]
    },

    watch: {
        escape: ["changeScene", "actualNeed", "delay", "switch90"],
        something_to_do: ["switch90", "changeScene", "delay"],
        default: ["delay", "switch90", "changeScene", "nameIt"]
    },

    check: {
        relief: ["delay", "nameIt", "realityCheck", "changeScene"],
        control: ["realityCheck", "delay", "nameIt"],
        default: ["nameIt", "delay", "realityCheck", "changeScene"]
    },

    other: {
        default: ["nameIt", "delay", "changeScene", "actualNeed"]
    }
};

let translations = {};
let currentLanguage = "en";

let session = {
    id: null,
    behavior: null,
    behaviorLabel: null,
    intensityBefore: 5,
    intensityAfter: null,
    expectation: null,
    expectationLabel: null,
    intervention: null,
    interventionAttempts: [],
    outcome: null,
    startedAt: null,
    completedAt: null
};

const $ = id => document.getElementById(id);

function getPath(object, path) {
    return path.split(".").reduce((value, key) => value?.[key], object);
}

function t(key, fallback = key) {
    return getPath(translations, key) ?? fallback;
}

function getSavedSessions() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE.sessions) || "[]");
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveSessions(sessions) {
    localStorage.setItem(STORAGE.sessions, JSON.stringify(sessions));
}

function createSession() {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        behavior: null,
        behaviorLabel: null,
        intensityBefore: 5,
        intensityAfter: null,
        expectation: null,
        expectationLabel: null,
        intervention: null,
        interventionAttempts: [],
        outcome: null,
        startedAt: new Date().toISOString(),
        completedAt: null
    };
}

function resetSession() {
    session = createSession();

    $("intensitySlider").value = 5;
    $("intensityValue").textContent = "5";

    $("reassessSlider").value = 5;
    $("reassessValue").textContent = "5";

    clearSelections();

    $("otherBehaviorContainer").hidden = true;
    $("otherExpectationContainer").hidden = true;

    $("otherBehaviorInput").value = "";
    $("otherExpectationInput").value = "";

    $("behaviorContinueButton").disabled = true;
    $("expectationContinueButton").disabled = true;
}

function clearSelections() {
    document.querySelectorAll(".choice-button.selected").forEach(button => {
        button.classList.remove("selected");
    });

    document.querySelectorAll(".outcome-button.selected").forEach(button => {
        button.classList.remove("selected");
    });
}

function showScreen(name) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("screen-active");
    });

    const target = $(`screen-${name}`);

    if (target) {
        target.classList.add("screen-active");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

async function loadLanguage(language) {
    if (!LANGUAGES[language]) {
        language = "en";
    }

    try {
        const response = await fetch(LANGUAGES[language].file, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        translations = await response.json();
        currentLanguage = language;

        localStorage.setItem(STORAGE.language, language);

        updateLanguageUI();
        applyTranslations();
    } catch (error) {
        if (language !== "en") {
            await loadLanguage("en");
        } else {
            console.error("Could not load language:", error);
        }
    }
}

function updateLanguageUI() {
    const language = LANGUAGES[currentLanguage];

    $("currentLanguageFlag").textContent = language.flag;
    $("currentLanguageCode").textContent = language.code;

    document.querySelectorAll(".language-option").forEach(option => {
        option.classList.toggle(
            "selected",
            option.dataset.language === currentLanguage
        );
    });

    document.documentElement.lang = currentLanguage;
}

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(element => {
        const key = element.dataset.i18n;
        const value = t(key);

        if (value !== key) {
            element.textContent = value;
        }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
        const key = element.dataset.i18nPlaceholder;
        const value = t(key);

        if (value !== key) {
            element.placeholder = value;
        }
    });

    updateDynamicIntervention();
}

function toggleLanguageMenu(force) {
    const menu = $("languageMenu");
    const button = $("languageButton");

    const open = typeof force === "boolean"
        ? force
        : menu.hidden;

    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
}

function selectBehavior(button) {
    document.querySelectorAll("#behaviorOptions .choice-button").forEach(item => {
        item.classList.remove("selected");
    });

    button.classList.add("selected");

    const value = button.dataset.behavior;

    session.behavior = value;

    if (value === "other") {
        $("otherBehaviorContainer").hidden = false;
        $("otherBehaviorInput").focus();
        session.behaviorLabel = "";
        $("behaviorContinueButton").disabled = true;
    } else {
        $("otherBehaviorContainer").hidden = true;
        session.behaviorLabel = button.querySelector("[data-i18n]")?.textContent.trim() || value;
        $("behaviorContinueButton").disabled = false;
    }
}

function validateOtherBehavior() {
    const value = $("otherBehaviorInput").value.trim();

    if (session.behavior === "other") {
        session.behaviorLabel = value;
        $("behaviorContinueButton").disabled = value.length === 0;
    }
}

function selectExpectation(button) {
    document.querySelectorAll("#expectationOptions .choice-button").forEach(item => {
        item.classList.remove("selected");
    });

    button.classList.add("selected");

    const value = button.dataset.expectation;

    session.expectation = value;

    if (value === "other") {
        $("otherExpectationContainer").hidden = false;
        $("otherExpectationInput").focus();
        session.expectationLabel = "";
        $("expectationContinueButton").disabled = true;
    } else {
        $("otherExpectationContainer").hidden = true;
        session.expectationLabel =
            button.querySelector("[data-i18n]")?.textContent.trim() || value;

        $("expectationContinueButton").disabled = false;
    }
}

function validateOtherExpectation() {
    const value = $("otherExpectationInput").value.trim();

    if (session.expectation === "other") {
        session.expectationLabel = value;
        $("expectationContinueButton").disabled = value.length === 0;
    }
}

function updateSliderValue(slider, output) {
    output.textContent = slider.value;
}

function getRelevantHistory() {
    const sessions = getSavedSessions();

    return sessions.filter(item => {
        if (!item || !item.intervention) {
            return false;
        }

        if (
            session.behavior &&
            session.behavior !== "other" &&
            item.behavior !== session.behavior
        ) {
            return false;
        }

        if (
            session.expectation &&
            session.expectation !== "unknown" &&
            item.expectation &&
            item.expectation !== session.expectation
        ) {
            return false;
        }

        return typeof item.intensityBefore === "number" &&
            typeof item.intensityAfter === "number";
    });
}

function calculateInterventionStats() {
    const history = getRelevantHistory();
    const stats = {};

    history.forEach(item => {
        if (!stats[item.intervention]) {
            stats[item.intervention] = {
                uses: 0,
                totalImpact: 0,
                positive: 0
            };
        }

        const impact = item.intensityBefore - item.intensityAfter;

        stats[item.intervention].uses++;
        stats[item.intervention].totalImpact += impact;

        if (impact > 0) {
            stats[item.intervention].positive++;
        }
    });

    Object.values(stats).forEach(stat => {
        stat.averageImpact = stat.totalImpact / stat.uses;
        stat.successRate = stat.positive / stat.uses;
    });

    return stats;
}

function scoreIntervention(intervention, stats, preferredOrder, intensity) {
    let score = 0;

    const preferredIndex = preferredOrder.indexOf(intervention);

    if (preferredIndex !== -1) {
        score += (preferredOrder.length - preferredIndex) * 3;
    }

    if (stats[intervention]) {
        score += stats[intervention].averageImpact * 5;
        score += stats[intervention].successRate * 3;
        score += Math.min(stats[intervention].uses, 5);
    }

    if (intensity >= 8) {
        if (["delay", "fastForward", "realityCheck", "changeScene"].includes(intervention)) {
            score += 2;
        }
    }

    if (intensity <= 3) {
        if (["nameIt", "wave", "actualNeed"].includes(intervention)) {
            score += 1;
        }
    }

    return score;
}

function chooseIntervention() {
    const attempted = new Set(session.interventionAttempts);
    const stats = calculateInterventionStats();

    const behaviorRules =
        INTERVENTION_RULES[session.behavior] ||
        INTERVENTION_RULES.other;

    const preferred =
        behaviorRules[session.expectation] ||
        behaviorRules.default;

    let candidates = INTERVENTIONS.filter(
        intervention => !attempted.has(intervention)
    );

    if (!candidates.length) {
        session.interventionAttempts = [];
        candidates = [...INTERVENTIONS];
    }

    candidates.sort((a, b) => {
        const scoreA = scoreIntervention(
            a,
            stats,
            preferred,
            session.intensityBefore
        );

        const scoreB = scoreIntervention(
            b,
            stats,
            preferred,
            session.intensityBefore
        );

        return scoreB - scoreA;
    });

    return candidates[0];
}

function interventionTitle(id) {
    return t(`interventions.${id}.title`, id);
}

function interventionCategory(id) {
    const map = {
        nameIt: "defusion",
        promise: "cognitive",
        wave: "urge_surfing",
        delay: "delay",
        fastForward: "future",
        changeScene: "environment",
        actualNeed: "need",
        breakChain: "trigger",
        twoFutures: "future",
        switch90: "attention",
        realityCheck: "cognitive",
        previousSuccess: "personal"
    };

    return t(
        `interventions.categories.${map[id] || "cognitive"}`,
        ""
    );
}

function updateDynamicIntervention() {
    if (!session.intervention) {
        return;
    }

    $("interventionCategory").textContent =
        interventionCategory(session.intervention);

    $("interventionTitle").textContent =
        interventionTitle(session.intervention);

    renderIntervention(session.intervention);
}

function renderIntervention(id) {
    const content = $("interventionContent");
    const actions = $("interventionActions");

    content.innerHTML = "";
    actions.innerHTML = "";

    const renderers = {
        nameIt: renderNameIt,
        promise: renderPromise,
        wave: renderWave,
        delay: renderDelay,
        fastForward: renderFastForward,
        changeScene: renderChangeScene,
        actualNeed: renderActualNeed,
        breakChain: renderBreakChain,
        twoFutures: renderTwoFutures,
        switch90: renderSwitch90,
        realityCheck: renderRealityCheck
    };

    if (renderers[id]) {
        renderers[id](content, actions);
    } else {
        renderGeneric(content, actions);
    }
}

function addActionButton(container, text, callback, className = "primary-button") {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", callback);

    container.appendChild(button);

    return button;
}

function finishIntervention() {
    $("reassessSlider").value = session.intensityBefore;
    $("reassessValue").textContent = session.intensityBefore;

    showScreen("reassess");
}

function renderNameIt(content, actions) {
    const box = document.createElement("div");
    box.className = "intervention-box";

    box.innerHTML = `
        <p>${t("interventions.nameIt.instruction")}</p>
        <p class="intervention-prompt">${t("interventions.nameIt.firstPrompt")}</p>
        <input class="intervention-input" type="text"
            placeholder="${t("interventions.nameIt.placeholder")}"
            autocomplete="off">
        <p class="intervention-prompt">${t("interventions.nameIt.secondPrompt")}</p>
        <input class="intervention-input" type="text"
            placeholder="${t("interventions.nameIt.placeholder2")}"
            autocomplete="off">
    `;

    content.appendChild(box);

    addActionButton(
        actions,
        t("common.continue", "CONTINUE"),
        finishIntervention
    );
}

function renderPromise(content, actions) {
    const box = document.createElement("div");
    box.className = "intervention-box";

    const expected = session.expectationLabel || session.expectation || "";

    box.innerHTML = `
        <p>${t("interventions.promise.intro")}</p>
        <p class="intervention-highlight">${t("interventions.promise.expected")} ${expected}</p>
        <p class="intervention-prompt">${t("interventions.promise.durationQuestion")}</p>
        <input class="intervention-input"
            type="text"
            placeholder="${t("interventions.promise.durationPlaceholder")}"
            autocomplete="off">
        <p class="intervention-prompt">${t("interventions.promise.afterQuestion")}</p>
        <input class="intervention-input"
            type="text"
            placeholder="${t("interventions.promise.afterPlaceholder")}"
            autocomplete="off">
    `;

    content.appendChild(box);

    addActionButton(
        actions,
        t("common.continue", "CONTINUE"),
        finishIntervention
    );
}

function renderWave(content, actions) {
    const box = document.createElement("div");
    box.className = "intervention-box";

    box.innerHTML = `
        <p>${t("interventions.wave.instruction")}</p>
        <p class="intervention-prompt">${t("interventions.wave.locationPrompt")}</p>
        <div class="wave-locations">
            ${["chest", "stomach", "head", "hands", "everywhere"].map(
                key => `<button type="button" class="choice-button wave-location" data-location="${key}">
                    ${t(`interventions.wave.locations.${key}`)}
                </button>`
            ).join("")}
        </div>
        <div class="wave-timer" hidden>
            <p>${t("interventions.wave.timerIntro")}</p>
            <div class="timer-value">60</div>
        </div>
    `;

    content.appendChild(box);

    const timerBox = box.querySelector(".wave-timer");
    const timerValue = box.querySelector(".timer-value");

    box.querySelectorAll(".wave-location").forEach(button => {
        button.addEventListener("click", () => {
            box.querySelectorAll(".wave-location").forEach(item => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");
            timerBox.hidden = false;

            let remaining = 60;
            timerValue.textContent = remaining;

            const interval = setInterval(() => {
                remaining--;
                timerValue.textContent = remaining;

                if (remaining <= 0) {
                    clearInterval(interval);
                    timerValue.textContent = "0";

                    addWaveFinishOptions(box, actions);
                }
            }, 1000);
        });
    });
}

function addWaveFinishOptions(box, actions) {
    if (box.querySelector(".wave-finish")) {
        return;
    }

    const finish = document.createElement("div");
    finish.className = "wave-finish";

    finish.innerHTML = `
        <p>${t("interventions.wave.finished")}</p>
        <div class="wave-results">
            ${["weaker", "changed", "same", "stronger"].map(
                key => `<button type="button" class="choice-button" data-wave-result="${key}">
                    ${t(`interventions.wave.${key}`)}
                </button>`
            ).join("")}
        </div>
    `;

    box.appendChild(finish);

    finish.querySelectorAll("[data-wave-result]").forEach(button => {
        button.addEventListener("click", () => {
            finish.querySelectorAll(".choice-button").forEach(item => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");

            actions.innerHTML = "";

            addActionButton(
                actions,
                t("common.continue", "CONTINUE"),
                finishIntervention
            );
        });
    });
}

function renderDelay(content, actions) {
    const box = document.createElement("div");
    box.className = "intervention-box";

    box.innerHTML = `
        <p>${t("interventions.delay.instruction")}</p>
        <p class="intervention-highlight">${t("interventions.delay.promise")}</p>
        <div class="delay-timer">10:00</div>
    `;

    content.appendChild(box);

    const timer = box.querySelector(".delay-timer");

    addActionButton(
        actions,
        t("interventions.delay.start"),
        () => {
            actions.innerHTML = "";
            let remaining = 600;

            const interval = setInterval(() => {
                remaining--;

                const minutes = Math.floor(remaining / 60);
                const seconds = remaining % 60;

                timer.textContent =
                    `${minutes}:${String(seconds).padStart(2, "0")}`;

                if (remaining <= 0) {
                    clearInterval(interval);
                    timer.textContent = "0:00";

                    const result = document.createElement("div");
                    result.className = "delay-result";

                    result.innerHTML = `
                        <p>${t("interventions.delay.finished")}</p>
                        <div class="option-grid">
                            <button type="button" class="choice-button">${t("interventions.delay.stillWant")}</button>
                            <button type="button" class="choice-button">${t("interventions.delay.weaker")}</button>
                            <button type="button" class="choice-button">${t("interventions.delay.gone")}</button>
                            <button type="button" class="choice-button">${t("interventions.delay.alreadyDid")}</button>
                        </div>
                    `;

                    box.appendChild(result);

                    result.querySelectorAll(".choice-button").forEach(button => {
                        button.addEventListener("click", () => {
                            result.querySelectorAll(".choice-button").forEach(item => {
                                item.classList.remove("selected");
                            });

                            button.classList.add("selected");

                            actions.innerHTML = "";

                            addActionButton(
                                actions,
                                t("common.continue", "CONTINUE"),
                                finishIntervention
                            );
                        });
                    });
                }
            }, 1000);
        }
    );
}

function renderFastForward(content, actions) {
    const box = document.createElement("div");
    box.className = "intervention-box";

    box.innerHTML = `
        <p>${t("interventions.fastForward.intro")}</p>
        <p class="intervention-prompt">${t("interventions.fastForward.tenMinutes")}</p>
        <textarea class="intervention-textarea"
            placeholder="${t("interventions.fastForward.tenPlaceholder")}"></textarea>
        <p class="intervention-prompt">${t("interventions.fastForward.tomorrow")}</p>
        <textarea class="intervention-textarea"
            placeholder="${t("interventions.fastForward.tomorrowPlaceholder")}"></textarea>
        <p class="intervention-prompt">${t("interventions.fastForward.next")}</p>
        <textarea class="intervention-textarea"
            placeholder="${t("interventions.fastForward.nextPlaceholder")}"></textarea>
    `;

    content.appendChild(box);

    addActionButton(
        actions,
        t("common.continue", "CONTINUE"),
        finishIntervention
    );
}

function renderChangeScene(content, actions) {
    const box = document.createElement("div");
    box.className = "intervention-box";

    box.innerHTML = `
        <ol class="intervention-steps">
            <li>${t("interventions.changeScene.step1")}</li>
            <li>${t("interventions.changeScene.step2")}</li>
            <li>${t("interventions.changeScene.step3")}</li>
            <li>${t("interventions.changeScene.step4")}</li>
        </ol>
        <div class="scene-timer"></div>
    `;

    content.appendChild(box);

    const timer = box.querySelector(".scene-timer");

    addActionButton(
        actions,
        t("interventions.changeScene.ready"),
        () => {
            actions.innerHTML = "";

            let remaining = 120;
            timer.textContent = remaining;

            const interval = setInterval(() => {
                remaining--;
                timer.textContent = remaining;

                if (remaining <= 0) {
                    clearInterval(interval);
                    timer.textContent = "0";

                    addActionButton(
                        actions,
                        t("common.continue", "CONTINUE"),
                        finishIntervention
                    );
                }
            }, 1000);
        }
    );
}

function renderActualNeed(content, actions) {
    const box = document.createElement("div");
    box.className = "intervention-box";

    box.innerHTML = `
        <p>${t("interventions.actualNeed.intro")}</p>
        <p class="intervention-prompt">${t("interventions.actualNeed.question")}</p>
        <div class="option-grid">
            ${Object.keys(t("interventions.actualNeed.options", {})).map(
                key => `<button type="button" class="choice-button" data-need="${key}">
                    ${t(`interventions.actualNeed.options.${key}`)}
                </button>`
            ).join("")}
        </div>
        <div class="need-suggestion" hidden></div>
    `;

    content.appendChild(box);

    const suggestion = box.querySelector(".need-suggestion");

    box.querySelectorAll("[data-need]").forEach(button => {
        button.addEventListener("click", () => {
            box.querySelectorAll("[data-need]").forEach(item => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");

            const key = button.dataset.need;

            suggestion.hidden = false;
            suggestion.textContent =
                t(`interventions.actualNeed.suggestions.${key}`);

            actions.innerHTML = "";

            addActionButton(
                actions,
                t("common.continue", "CONTINUE"),
                finishIntervention
            );
        });
    });
}

function renderBreakChain(content, actions) {
    const box = document.createElement("div");
    box.className = "intervention-box";

    box.innerHTML = `
        <p>${t("interventions.breakChain.question")}</p>
        <div class="option-grid">
            ${Object.keys(t("interventions.breakChain.options", {})).map(
                key => `<button type="button" class="choice-button" data-trigger="${key}">
                    ${t(`interventions.breakChain.options.${key}`)}
                </button>`
            ).join("")}
        </div>
        <p class="trigger-result" hidden></p>
    `;

    content.appendChild(box);

    const result = box.querySelector(".trigger-result");

    box.querySelectorAll("[data-trigger]").forEach(button => {
        button.addEventListener("click", () => {
            box.querySelectorAll("[data-trigger]").forEach(item => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");

            session.trigger = button.dataset.trigger;

            result.hidden = false;
            result.textContent = t("interventions.breakChain.result");

            actions.innerHTML = "";

            addActionButton(
                actions,
                t("interventions.breakChain.changeScene"),
                finishIntervention
            );
        });
    });
}

function renderTwoFutures(content, actions) {
    const box = document.createElement("div");
    box.className = "intervention-box";

    box.innerHTML = `
        <p>${t("interventions.twoFutures.intro")}</p>
        <p class="intervention-prompt">${t("interventions.twoFutures.act")}</p>
        <textarea class="intervention-textarea"
            placeholder="${t("interventions.twoFutures.actPlaceholder")}"></textarea>
        <p class="intervention-prompt">${t("interventions.twoFutures.dont")}</p>
        <textarea class="intervention-textarea"
            placeholder="${t("interventions.twoFutures.dontPlaceholder")}"></textarea>
    `;

    content.appendChild(box);

    addActionButton(
        actions,
        t("common.continue", "CONTINUE"),
        finishIntervention
    );
}

function renderSwitch90(content, actions) {
    const tasks = [
        t("interventions.switch90.task1"),
        t("interventions.switch90.task2"),
        t("interventions.switch90.task3"),
        t("interventions.switch90.task4")
    ];

    const task = tasks[Math.floor(Math.random() * tasks.length)];

    const box = document.createElement("div");
    box.className = "intervention-box";

    box.innerHTML = `
        <p>${t("interventions.switch90.instruction")}</p>
        <p class="intervention-highlight">${task}</p>
        <div class="switch-timer">90</div>
    `;

    content.appendChild(box);

    const timer = box.querySelector(".switch-timer");

    addActionButton(
        actions,
        t("interventions.switch90.start"),
        () => {
            actions.innerHTML = "";

            let remaining = 90;
            timer.textContent = remaining;

            const interval = setInterval(() => {
                remaining--;
                timer.textContent = remaining;

                if (remaining <= 0) {
                    clearInterval(interval);
                    timer.textContent = "0";

                    addActionButton(
                        actions,
                        t("common.continue", "CONTINUE"),
                        finishIntervention
                    );
                }
            }, 1000);
        }
    );
}

function renderRealityCheck(content, actions) {
    const box = document.createElement("div");
    box.className = "intervention-box";

    box.innerHTML = `
        <p>${t("interventions.realityCheck.question")}</p>
        <textarea class="intervention-textarea"
            placeholder="${t("interventions.realityCheck.placeholder")}"></textarea>

        <p class="intervention-prompt">${t("interventions.realityCheck.certainty")}</p>
        <input class="intervention-range" type="range" min="0" max="100" value="50">
        <div class="certainty-value">50%</div>

        <p class="intervention-prompt">${t("interventions.realityCheck.past")}</p>
        <div class="option-grid">
            <button type="button" class="choice-button">${t("interventions.realityCheck.yes")}</button>
            <button type="button" class="choice-button">${t("interventions.realityCheck.no")}</button>
            <button type="button" class="choice-button">${t("interventions.realityCheck.sometimes")}</button>
        </div>
    `;

    content.appendChild(box);

    const range = box.querySelector(".intervention-range");
    const value = box.querySelector(".certainty-value");

    range.addEventListener("input", () => {
        value.textContent = `${range.value}%`;
    });

    box.querySelectorAll(".choice-button").forEach(button => {
        button.addEventListener("click", () => {
            box.querySelectorAll(".choice-button").forEach(item => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");

            actions.innerHTML = "";

            addActionButton(
                actions,
                t("common.continue", "CONTINUE"),
                finishIntervention
            );
        });
    });

    addActionButton(
        actions,
        t("common.continue", "CONTINUE"),
        finishIntervention
    );
}

function renderGeneric(content, actions) {
    const box = document.createElement("div");
    box.className = "intervention-box";

    box.innerHTML = `
        <p>${t("interventions.generic.instruction")}</p>
    `;

    content.appendChild(box);

    addActionButton(
        actions,
        t("common.continue", "CONTINUE"),
        finishIntervention
    );
}

function startIntervention() {
    const intervention = chooseIntervention();

    session.intervention = intervention;

    if (!session.interventionAttempts.includes(intervention)) {
        session.interventionAttempts.push(intervention);
    }

    $("interventionCategory").textContent =
        interventionCategory(intervention);

    $("interventionTitle").textContent =
        interventionTitle(intervention);

    renderIntervention(intervention);

    showScreen("intervention");
}

function reassess() {
    session.intensityAfter =
        Number($("reassessSlider").value);

    showScreen("outcome");
}

function selectOutcome(button) {
    document.querySelectorAll(".outcome-button").forEach(item => {
        item.classList.remove("selected");
    });

    button.classList.add("selected");

    session.outcome = button.dataset.outcome;

    completeSession();
}

function completeSession() {
    session.completedAt = new Date().toISOString();

    const sessions = getSavedSessions();

    const existingIndex = sessions.findIndex(
        item => item.id === session.id
    );

    const snapshot = JSON.parse(JSON.stringify(session));

    if (existingIndex >= 0) {
        sessions[existingIndex] = snapshot;
    } else {
        sessions.push(snapshot);
    }

    saveSessions(sessions);

    showResult();
}

function showResult() {
    const before = Number(session.intensityBefore);
    const after = Number(session.intensityAfter);

    $("resultBefore").textContent = before;
    $("resultAfter").textContent = after;

    const difference = before - after;

    let percentage = 0;

    if (before > 0) {
        percentage = Math.round((difference / before) * 100);
    }

    if (difference > 0) {
        $("resultChange").textContent = `−${percentage}%`;
        $("resultMessage").textContent =
            t("result.messages.lower");
    } else if (difference < 0) {
        $("resultChange").textContent = `+${Math.abs(percentage)}%`;
        $("resultMessage").textContent =
            t("result.messages.higher");
    } else {
        $("resultChange").textContent = "0%";
        $("resultMessage").textContent =
            t("result.messages.same");
    }

    const titles = {
        interrupted: "interruptedTitle",
        delayed: "delayedTitle",
        acted: "actedTitle",
        unsure: "unsureTitle"
    };

    $("resultTitle").textContent =
        t(`result.${titles[session.outcome] || "interruptedTitle"}`);

    $("resultIntervention").textContent =
        interventionTitle(session.intervention);

    $("resultBehavior").textContent =
        session.behaviorLabel || session.behavior || "—";

    showScreen("result");
}

function tryAnotherIntervention() {
    const next = chooseIntervention();

    session.intervention = next;

    if (!session.interventionAttempts.includes(next)) {
        session.interventionAttempts.push(next);
    }

    $("interventionCategory").textContent =
        interventionCategory(next);

    $("interventionTitle").textContent =
        interventionTitle(next);

    renderIntervention(next);

    showScreen("intervention");
}

function finishAndReset() {
    resetSession();
    showScreen("home");
}

function goBack(target) {
    showScreen(target);
}

function renderInsights() {
    const sessions = getSavedSessions()
        .filter(item =>
            typeof item.intensityBefore === "number" &&
            typeof item.intensityAfter === "number"
        )
        .sort((a, b) =>
            new Date(b.completedAt || b.startedAt) -
            new Date(a.completedAt || a.startedAt)
        );

    const total = sessions.length;

    const interrupted = sessions.filter(item =>
        item.outcome === "interrupted"
    ).length;

    let totalBefore = 0;
    let totalAfter = 0;

    sessions.forEach(item => {
        totalBefore += item.intensityBefore;
        totalAfter += item.intensityAfter;
    });

    let reduction = 0;

    if (totalBefore > 0) {
        reduction = Math.round(
            ((totalBefore - totalAfter) / totalBefore) * 100
        );
    }

    const stats = {};

    sessions.forEach(item => {
        if (!item.intervention) {
            return;
        }

        if (!stats[item.intervention]) {
            stats[item.intervention] = {
                uses: 0,
                impact: 0
            };
        }

        stats[item.intervention].uses++;
        stats[item.intervention].impact +=
            item.intensityBefore - item.intensityAfter;
    });

    let best = null;

    Object.entries(stats).forEach(([id, data]) => {
        const average = data.impact / data.uses;

        if (
            !best ||
            average > best.average
        ) {
            best = {
                id,
                average,
                uses: data.uses
            };
        }
    });

    const triggerCounts = {};

    sessions.forEach(item => {
        if (!item.trigger) {
            return;
        }

        triggerCounts[item.trigger] =
            (triggerCounts[item.trigger] || 0) + 1;
    });

    let commonTrigger = null;

    Object.entries(triggerCounts).forEach(([trigger, count]) => {
        if (!commonTrigger || count > commonTrigger.count) {
            commonTrigger = {
                trigger,
                count
            };
        }
    });

    $("insightTotal").textContent = total;
    $("insightInterrupted").textContent = interrupted;
    $("insightReduction").textContent =
        `${reduction > 0 ? "−" : ""}${Math.abs(reduction)}%`;

    $("insightBest").textContent =
        best
            ? interventionTitle(best.id)
            : "—";

    $("insightTrigger").textContent =
        commonTrigger
            ? t(
                `interventions.breakChain.options.${commonTrigger.trigger}`,
                commonTrigger.trigger
            )
            : "—";

    const recent = $("recentSessions");

    recent.innerHTML = "";

    sessions.slice(0, 5).forEach(item => {
        const row = document.createElement("div");
        row.className = "recent-session";

        const difference =
            item.intensityBefore - item.intensityAfter;

        const change =
            difference > 0
                ? `−${difference}`
                : difference < 0
                    ? `+${Math.abs(difference)}`
                    : "0";

        row.innerHTML = `
            <div class="recent-session-main">
                <div class="recent-session-behavior">
                    ${escapeHTML(item.behaviorLabel || item.behavior || "—")}
                </div>
                <div class="recent-session-intervention">
                    ${escapeHTML(interventionTitle(item.intervention))}
                </div>
            </div>
            <div class="recent-session-change">
                ${item.intensityBefore} → ${item.intensityAfter}
                (${change})
            </div>
        `;

        recent.appendChild(row);
    });

    if (!sessions.length) {
        const empty = document.createElement("p");
        empty.textContent =
            t("insights.empty", "No sessions yet.");
        recent.appendChild(empty);
    }
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function initializeEvents() {
    $("logoButton").addEventListener("click", () => {
        finishAndReset();
    });

    $("languageButton").addEventListener("click", event => {
        event.stopPropagation();
        toggleLanguageMenu();
    });

    $("insightsButton").addEventListener("click", () => {
    renderInsights();
    showScreen("insights");
});

    $("insightsDoneButton").addEventListener("click", () => {
    showScreen("home");
});

    document.querySelectorAll(".language-option").forEach(option => {
        option.addEventListener("click", async () => {
            await loadLanguage(option.dataset.language);
            toggleLanguageMenu(false);
        });
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".language-wrapper")) {
            toggleLanguageMenu(false);
        }
    });

    $("startButton").addEventListener("click", () => {
        resetSession();
        showScreen("behavior");
    });

    document.querySelectorAll("#behaviorOptions .choice-button").forEach(button => {
        button.addEventListener("click", () => {
            selectBehavior(button);
        });
    });

    $("otherBehaviorInput").addEventListener("input", validateOtherBehavior);

    $("behaviorContinueButton").addEventListener("click", () => {
        if (!session.behaviorLabel) {
            return;
        }

        showScreen("intensity");
    });

    $("intensitySlider").addEventListener("input", () => {
        updateSliderValue(
            $("intensitySlider"),
            $("intensityValue")
        );
    });

    $("intensityContinueButton").addEventListener("click", () => {
        session.intensityBefore =
            Number($("intensitySlider").value);

        showScreen("expectation");
    });

    document.querySelectorAll("#expectationOptions .choice-button").forEach(button => {
        button.addEventListener("click", () => {
            selectExpectation(button);
        });
    });

    $("otherExpectationInput").addEventListener(
        "input",
        validateOtherExpectation
    );

    $("expectationContinueButton").addEventListener("click", () => {
        if (!session.expectationLabel) {
            return;
        }

        startIntervention();
    });

    $("reassessSlider").addEventListener("input", () => {
        updateSliderValue(
            $("reassessSlider"),
            $("reassessValue")
        );
    });

    $("reassessContinueButton").addEventListener(
        "click",
        reassess
    );

    document.querySelectorAll(".outcome-button").forEach(button => {
        button.addEventListener("click", () => {
            selectOutcome(button);
        });
    });

    $("finishButton").addEventListener("click", finishAndReset);

    $("anotherInterventionButton").addEventListener(
        "click",
        tryAnotherIntervention
    );

    document.querySelectorAll(".back-button").forEach(button => {
        button.addEventListener("click", () => {
            goBack(button.dataset.back);
        });
    });
}

function exposeDebug() {
    window.INTERRUPT_DEBUG = {
        getSession: () => session,
        getSessions: getSavedSessions,
        getStats: calculateInterventionStats,
        resetData: () => {
            localStorage.removeItem(STORAGE.sessions);
            console.log("INTERRUPT session data cleared.");
        },
        language: () => currentLanguage
    };
}

async function initialize() {
    initializeEvents();
    exposeDebug();

    const savedLanguage =
        localStorage.getItem(STORAGE.language) || "en";

    resetSession();

    await loadLanguage(savedLanguage);
}

document.addEventListener("DOMContentLoaded", initialize);
