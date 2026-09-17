const LANGUAGES={en:{file:"locales/en.json",flag:"🇬🇧",code:"EN"},ro:{file:"locales/ro.json",flag:"🇷🇴",code:"RO"},fr:{file:"locales/fr.json",flag:"🇫🇷",code:"FR"},de:{file:"locales/de.json",flag:"🇩🇪",code:"DE"},es:{file:"locales/es.json",flag:"🇪🇸",code:"ES"},it:{file:"locales/it.json",flag:"🇮🇹",code:"IT"}};
const STORAGE={language:"interrupt_language",sessions:"interrupt_sessions"};
const INTERVENTIONS=["nameIt","promise","wave","delay","fastForward","changeScene","actualNeed","breakChain","twoFutures","switch90","realityCheck"];
const INTERVENTION_RULES={
gamble:{money:["fastForward","realityCheck","delay","promise"],excitement:["delay","wave","changeScene","switch90"],escape:["actualNeed","changeScene","nameIt","delay"],relief:["actualNeed","delay","wave","changeScene"],default:["fastForward","realityCheck","delay","nameIt"]},
scroll:{something_to_do:["switch90","changeScene","delay"],escape:["changeScene","actualNeed","delay","nameIt"],excitement:["switch90","changeScene","delay"],default:["changeScene","switch90","delay","nameIt"]},
smoke:{relief:["delay","wave","actualNeed","changeScene"],comfort:["actualNeed","wave","delay"],escape:["changeScene","delay","actualNeed"],default:["delay","wave","changeScene","nameIt"]},
eat:{comfort:["actualNeed","delay","wave","nameIt"],pleasure:["delay","actualNeed","wave"],relief:["actualNeed","delay","changeScene"],default:["wave","delay","actualNeed","nameIt"]},
buy:{money:["fastForward","delay","realityCheck","twoFutures"],excitement:["delay","fastForward","realityCheck"],comfort:["actualNeed","delay","twoFutures"],default:["delay","fastForward","realityCheck","nameIt"]},
watch:{escape:["changeScene","actualNeed","delay","switch90"],something_to_do:["switch90","changeScene","delay"],default:["delay","switch90","changeScene","nameIt"]},
check:{relief:["delay","nameIt","realityCheck","changeScene"],control:["realityCheck","delay","nameIt"],default:["nameIt","delay","realityCheck","changeScene"]},
other:{default:["nameIt","delay","changeScene","actualNeed"]}
};
const PROTECTION_BEHAVIOR={gambling:"gamble",pornography:"watch",socialMedia:"scroll",custom:"other"};
const PROTECTION_LABELS={
en:{gambling:"Gambling",pornography:"Pornography",socialMedia:"Social media",custom:"Custom"},
ro:{gambling:"Jocuri de noroc",pornography:"Pornografie",socialMedia:"Social media",custom:"Personalizat"},
fr:{gambling:"Jeux d'argent",pornography:"Pornographie",socialMedia:"Réseaux sociaux",custom:"Personnalisé"},
de:{gambling:"Glücksspiel",pornography:"Pornografie",socialMedia:"Soziale Medien",custom:"Benutzerdefiniert"},
es:{gambling:"Apuestas",pornography:"Pornografía",socialMedia:"Redes sociales",custom:"Personalizado"},
it:{gambling:"Gioco d'azzardo",pornography:"Pornografia",socialMedia:"Social media",custom:"Personalizzato"}
};
let translations={},englishTranslations={},currentLanguage="en";
let session={id:null,behavior:null,behaviorLabel:null,intensityBefore:5,intensityAfter:null,expectation:null,expectationLabel:null,intervention:null,interventionAttempts:[],attemptHistory:[],attemptIntensityBefore:5,attemptStartedAt:null,outcome:null,trigger:null,startedAt:null,completedAt:null,protectionCategory:null,protectionDomain:null,protectionMode:null,protectionEventId:null};
const $=id=>document.getElementById(id);

function getEntitlements(){return typeof INTERRUPT_ENTITLEMENTS!=="undefined"?INTERRUPT_ENTITLEMENTS:null}
function hasFeature(feature){const e=getEntitlements();return !!(e&&typeof e.hasFeature==="function"&&e.hasFeature(feature))}
function isPro(){const e=getEntitlements();return !!(e&&typeof e.isPro==="function"&&e.isPro())}

function createProButton(className="primary-button"){
const button=document.createElement("button");
button.type="button";
button.className=className;
button.textContent=t("insights.proTitle","INTERRUPT Pro");
button.addEventListener("click",showProMessage);
return button
}

function createProGate(title,text){
const box=document.createElement("div");
box.className="insight-section pro-gate";
box.innerHTML=`<h3>${escapeHTML(title)}</h3><p>${escapeHTML(text)}</p>`;
box.appendChild(createProButton("primary-button pro-gate-button"));
return box
}

function showProMessage(){
if(isPro()){
alert(`${t("insights.proTitle","INTERRUPT Pro")}\n\n${t("insights.proMessage","Pro will turn your history into deeper personal patterns and show you what consistently works for you.")}`);
return
}
const existing=$("proOverlay");
if(existing){existing.hidden=false;return}

const overlay=document.createElement("div");
overlay.id="proOverlay";
overlay.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box";

const panel=document.createElement("div");
panel.style.cssText="width:min(100%,520px);max-height:90vh;overflow:auto;background:var(--background,#111);color:var(--text,#fff);border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:26px;box-sizing:border-box;box-shadow:0 20px 60px rgba(0,0,0,.45)";

panel.innerHTML=`
<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:20px">
<h2 style="margin:0">${escapeHTML(t("insights.proTitle","INTERRUPT Pro"))}</h2>
<button type="button" class="pro-close" aria-label="Close" style="border:0;background:none;color:inherit;font-size:28px;cursor:pointer;line-height:1">×</button>
</div>
<p style="font-size:1.05rem;line-height:1.6;margin-top:0">${escapeHTML(t("insights.proMessage","Pro will turn your history into deeper personal patterns and show you what consistently works for you."))}</p>
<div style="margin:24px 0">
<div style="padding:16px 0;border-top:1px solid rgba(255,255,255,.1)">
<strong>${escapeHTML(t("insights.bestOverall","Overall performance"))}</strong>
<p style="margin-bottom:0;opacity:.78">${escapeHTML(t("insights.proOverall","Unlock long-term performance insights from your history."))}</p>
</div>
<div style="padding:16px 0;border-top:1px solid rgba(255,255,255,.1)">
<strong>${escapeHTML(t("insights.pattern","YOUR STRONGEST PATTERN"))}</strong>
<p style="margin-bottom:0;opacity:.78">${escapeHTML(t("insights.proPattern","Unlock deeper patterns across behavior, expectation and intensity."))}</p>
</div>
<div style="padding:16px 0;border-top:1px solid rgba(255,255,255,.1)">
<strong>${escapeHTML(t("insights.proTitle","INTERRUPT Pro"))}</strong>
<p style="margin-bottom:0;opacity:.78">${escapeHTML(t("insights.proProtection","Unlock advanced Protection learning and context patterns."))}</p>
</div>
</div>
<div style="display:flex;gap:10px;flex-wrap:wrap">
<button type="button" class="primary-button pro-coming-soon">${escapeHTML(t("common.learnMore","Learn more"))}</button>
</div>
<p style="font-size:.82rem;opacity:.55;margin:18px 0 0">${escapeHTML(t("insights.proComingSoon","Pro access will be available soon."))}</p>
`;

overlay.appendChild(panel);
document.body.appendChild(overlay);

panel.querySelector(".pro-close").addEventListener("click",()=>overlay.remove());
overlay.addEventListener("click",event=>{if(event.target===overlay)overlay.remove()});
panel.querySelector(".pro-coming-soon").addEventListener("click",()=>{
alert(`${t("insights.proTitle","INTERRUPT Pro")}\n\n${t("insights.proComingSoon","Pro access will be available soon.")}`)
});
}

function getPath(object,path){if(!object||!path)return undefined;return path.split(".").reduce((value,key)=>value?.[key],object)}
function interpolate(value,params={}){if(typeof value!=="string")return value;return value.replace(/\{(\w+)\}/g,(_,key)=>params[key]??"")}
function t(key,fallback=key,params={}){let value=getPath(translations,key);if(value===undefined)value=getPath(englishTranslations,key);if(value===undefined)value=fallback;return interpolate(value,params)}
function escapeHTML(value){return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function getSavedSessions(){if(typeof INTERRUPT_STORAGE!=="undefined"&&typeof INTERRUPT_STORAGE.getSessions==="function")return INTERRUPT_STORAGE.getSessions();try{const data=JSON.parse(localStorage.getItem(STORAGE.sessions)||"[]");return Array.isArray(data)?data:[]}catch{return[]}}
function saveSessions(sessions){if(typeof INTERRUPT_STORAGE!=="undefined"&&typeof INTERRUPT_STORAGE.saveSessions==="function")return INTERRUPT_STORAGE.saveSessions(sessions);try{localStorage.setItem(STORAGE.sessions,JSON.stringify(sessions));return true}catch{return false}}
function createSession(){return{id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,behavior:null,behaviorLabel:null,intensityBefore:5,intensityAfter:null,expectation:null,expectationLabel:null,intervention:null,interventionAttempts:[],attemptHistory:[],attemptIntensityBefore:5,attemptStartedAt:null,outcome:null,trigger:null,startedAt:new Date().toISOString(),completedAt:null,protectionCategory:null,protectionDomain:null,protectionMode:null,protectionEventId:null}}
function resetSession(){session=createSession();$("intensitySlider").value=5;$("intensityValue").textContent="5";$("reassessSlider").value=5;$("reassessValue").textContent="5";clearSelections();$("otherBehaviorContainer").hidden=true;$("otherExpectationContainer").hidden=true;$("otherBehaviorInput").value="";$("otherExpectationInput").value="";$("behaviorContinueButton").disabled=true;$("expectationContinueButton").disabled=true}
function clearSelections(){document.querySelectorAll(".choice-button.selected").forEach(button=>button.classList.remove("selected"));document.querySelectorAll(".outcome-button.selected").forEach(button=>button.classList.remove("selected"))}
function showScreen(name){document.querySelectorAll(".screen").forEach(screen=>screen.classList.remove("screen-active"));const target=$(`screen-${name}`);if(target){target.classList.add("screen-active");window.scrollTo({top:0,behavior:"smooth"})}}
function goBack(name){if(name)showScreen(name)}
async function fetchJSON(file){const response=await fetch(file,{cache:"no-store"});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()}
async function loadLanguage(language){if(!LANGUAGES[language])language="en";try{if(!Object.keys(englishTranslations).length)englishTranslations=await fetchJSON(LANGUAGES.en.file);if(language==="en")translations=englishTranslations;else try{translations=await fetchJSON(LANGUAGES[language].file)}catch(error){console.warn(`Could not load ${language}. Falling back to English.`,error);translations=englishTranslations;language="en"}currentLanguage=language;localStorage.setItem(STORAGE.language,language);updateLanguageUI();applyTranslations()}catch(error){console.error("Could not load translations:",error);if(language!=="en"&&Object.keys(englishTranslations).length){translations=englishTranslations;currentLanguage="en";updateLanguageUI();applyTranslations()}}}
function updateLanguageUI(){const language=LANGUAGES[currentLanguage]||LANGUAGES.en;$("currentLanguageFlag").textContent=language.flag;$("currentLanguageCode").textContent=language.code;document.querySelectorAll(".language-option").forEach(option=>option.classList.toggle("selected",option.dataset.language===currentLanguage));document.documentElement.lang=currentLanguage}
function applyTranslations(){document.querySelectorAll("[data-i18n]").forEach(element=>{const value=t(element.dataset.i18n);if(typeof value==="string")element.textContent=value});document.querySelectorAll("[data-i18n-placeholder]").forEach(element=>{const value=t(element.dataset.i18nPlaceholder);if(typeof value==="string")element.placeholder=value});updateDynamicIntervention();updateProEntryPoints();if($("screen-insights")?.classList.contains("screen-active"))renderInsights()}
function toggleLanguageMenu(force){const menu=$("languageMenu"),button=$("languageButton");const open=typeof force==="boolean"?force:menu.hidden;menu.hidden=!open;button.setAttribute("aria-expanded",String(open))}

function updateProEntryPoints(){
const existing=$("homeProButton");
if(existing){existing.textContent=t("insights.proTitle","INTERRUPT Pro");existing.hidden=isPro()}
const insightsButton=$("insightsButton");
if(insightsButton&&!$("insightsProButton")){
const button=createProButton("secondary-button");
button.id="insightsProButton";
button.style.marginTop="12px";
insightsButton.insertAdjacentElement("afterend",button)
}
const insightsProButton=$("insightsProButton");
if(insightsProButton){insightsProButton.textContent=t("insights.proTitle","INTERRUPT Pro");insightsProButton.hidden=isPro()}
}

function selectBehavior(button){document.querySelectorAll("#behaviorOptions .choice-button").forEach(item=>item.classList.remove("selected"));button.classList.add("selected");const value=button.dataset.behavior;session.behavior=value;if(value==="other"){$("otherBehaviorContainer").hidden=false;$("otherBehaviorInput").focus();session.behaviorLabel="";$("behaviorContinueButton").disabled=true}else{$("otherBehaviorContainer").hidden=true;session.behaviorLabel=button.querySelector("[data-i18n]")?.textContent.trim()||value;$("behaviorContinueButton").disabled=false}}
function validateOtherBehavior(){const value=$("otherBehaviorInput").value.trim();if(session.behavior==="other"){session.behaviorLabel=value;$("behaviorContinueButton").disabled=!value.length}}
function selectExpectation(button){document.querySelectorAll("#expectationOptions .choice-button").forEach(item=>item.classList.remove("selected"));button.classList.add("selected");const value=button.dataset.expectation;session.expectation=value;if(value==="other"){$("otherExpectationContainer").hidden=false;$("otherExpectationInput").focus();session.expectationLabel="";$("expectationContinueButton").disabled=true}else{$("otherExpectationContainer").hidden=true;session.expectationLabel=button.querySelector("[data-i18n]")?.textContent.trim()||value;$("expectationContinueButton").disabled=false}}
function validateOtherExpectation(){const value=$("otherExpectationInput").value.trim();if(session.expectation==="other"){session.expectationLabel=value;$("expectationContinueButton").disabled=!value.length}}
function updateSliderValue(slider,output){output.textContent=slider.value}

function getProtection(){return typeof INTERRUPT_PROTECTION!=="undefined"?INTERRUPT_PROTECTION:null}
function protectionCall(method,...args){const protection=getProtection();return protection&&typeof protection[method]==="function"?protection[method](...args):null}
function getProtectionEvents(){const protection=getProtection();if(!protection)return[];try{if(typeof protection.getEvents==="function"){const result=protection.getEvents();if(Array.isArray(result))return result}const raw=localStorage.getItem("interrupt_protection_events");const data=JSON.parse(raw||"[]");return Array.isArray(data)?data:[]}catch{return[]}}
function initProtection(){try{protectionCall("getSettings");inspectCurrentProtection()}catch(error){console.warn("Protection initialization failed:",error)}}
function inspectCurrentProtection(){const protection=getProtection();if(!protection)return null;try{const result=protection.inspectUrl?protection.inspectUrl(location.href):protection.inspectHost?protection.inspectHost(location.hostname):null;if(!result||!result.category)return null;session.protectionCategory=result.category;session.protectionDomain=result.host||result.domain||location.hostname;session.protectionMode=result.mode||protectionCall("getSettings")?.mode||"medium";const behavior=PROTECTION_BEHAVIOR[result.category];if(behavior&&(!session.behavior||session.behavior==="other"))session.behavior=behavior;return result}catch(error){console.warn("Protection inspection failed:",error);return null}}
function recordProtectionEvent(data={}){const protection=getProtection();if(!protection)return null;try{return protectionCall("appendEvent",{...data,sessionId:data.sessionId||session.id,behavior:data.behavior||session.behavior,category:data.category||session.protectionCategory,host:data.host||data.domain||session.protectionDomain,mode:data.mode||session.protectionMode,timestamp:data.timestamp||new Date().toISOString()})}catch(error){console.warn("Protection event failed:",error);return null}}
function inspectProtectionUrl(url){const result=protectionCall("inspectUrl",url);if(result?.category){session.protectionCategory=result.category;session.protectionDomain=result.host||result.domain||null;session.protectionMode=result.mode||protectionCall("getSettings")?.mode||"medium";const behavior=PROTECTION_BEHAVIOR[result.category];if(behavior)session.behavior=behavior;recordProtectionEvent({type:"inspect",url,host:session.protectionDomain,category:result.category})}return result}
function getProtectionSettings(){return protectionCall("getSettings")}
function setProtectionEnabled(value){return protectionCall("setEnabled",!!value)}
function setProtectionMode(mode){const result=protectionCall("setMode",mode);session.protectionMode=mode;return result}
function setProtectionCategory(category,value){return protectionCall("setCategoryEnabled",category,!!value)}
function addProtectionDomain(domain,category="custom"){return protectionCall("addDomain",domain,category)}
function removeProtectionDomain(domain){return protectionCall("removeDomain",domain)}
function getProtectionDomains(){return protectionCall("getDomains")||[]}

function getProtectionStats(){
const events=getProtectionEvents(),saved=getSavedSessions(),outcomeEvents=events.filter(e=>e?.type==="reassess"&&Number.isFinite(Number(e.intensityBefore))&&Number.isFinite(Number(e.intensityAfter))),attempts=[],attemptKeys=new Set(),categories={},domains={},modes={};
const addAttempt=(item,key)=>{if(!item||!Number.isFinite(Number(item.intensityBefore))||!Number.isFinite(Number(item.intensityAfter)))return;const id=key||item.id||`${item.sessionId||""}|${item.intervention||""}|${item.intensityBefore}|${item.intensityAfter}|${item.timestamp||item.completedAt||""}`;if(attemptKeys.has(id))return;attemptKeys.add(id);attempts.push(item)};
outcomeEvents.forEach(e=>addAttempt(e,`event:${e.id||`${e.sessionId||""}|${e.timestamp||""}`}`));
if(!outcomeEvents.length)saved.forEach(item=>(item.attemptHistory||[]).forEach(a=>{if(a?.protectionCategory||item.protectionCategory)addAttempt({...a,protectionCategory:a.protectionCategory||item.protectionCategory,protectionDomain:a.protectionDomain||item.protectionDomain,protectionMode:a.protectionMode||item.protectionMode},`attempt:${item.id}|${a.id||""}`)}));
const protectedSessionIds=new Set();
attempts.forEach(a=>{const category=a.category||a.protectionCategory,domain=a.host||a.domain||a.protectionDomain,mode=a.mode||a.protectionMode;if(a.sessionId)protectedSessionIds.add(a.sessionId);if(category)categories[category]=(categories[category]||0)+1;if(domain)domains[domain]=(domains[domain]||0)+1;if(mode)modes[mode]=(modes[mode]||0)+1});
saved.forEach(item=>{if(item?.protectionCategory){protectedSessionIds.add(item.id);const c=item.protectionCategory,d=item.protectionDomain,m=item.protectionMode;if(c&&!Object.keys(categories).includes(c))categories[c]=(categories[c]||0)+1;if(d&&!Object.keys(domains).includes(d))domains[d]=(domains[d]||0)+1;if(m&&!Object.keys(modes).includes(m))modes[m]=(modes[m]||0)+1}});
let reduced=0,totalBefore=0,totalAfter=0;
attempts.forEach(a=>{const before=Number(a.intensityBefore),after=Number(a.intensityAfter);totalBefore+=before;totalAfter+=after;if(after<before)reduced++});
return{events,sessions:saved.filter(item=>item?.protectionCategory),attempts,protectedSessions:protectedSessionIds.size,protectedAttempts:attempts.length,reduced,reduction:totalBefore>0?Math.round((totalBefore-totalAfter)/totalBefore*100):0,successRate:attempts.length?Math.round(reduced/attempts.length*100):0,categories:Object.entries(categories).sort((a,b)=>b[1]-a[1]),domains:Object.entries(domains).sort((a,b)=>b[1]-a[1]),modes:Object.entries(modes).sort((a,b)=>b[1]-a[1]),eventCount:events.length,reassessEvents:outcomeEvents.length,completedEvents:events.filter(e=>e?.type==="completed").length,interventionEvents:events.filter(e=>e?.type==="intervention").length};
}

function getProtectionInsightText(){
const copy={
en:{title:"PROTECTION LEARNING",none:"No protected activity has been recorded yet.",summary:(sessions,attempts,success,reduction)=>`${sessions} protected sessions and ${attempts} protected attempts recorded. ${success}% of attempts reduced intensity, with an overall reduction of ${reduction}%.`,category:(name,count)=>`Most frequent protected category: ${name} (${count} attempt${count===1?"":"s"}).`,domain:(name,count)=>`Most frequent protected domain: ${name} (${count} attempt${count===1?"":"s"}).`,mode:(name,count)=>`Most used protection mode: ${name} (${count} attempt${count===1?"":"s"}).`,events:count=>`${count} protection events recorded.`},
ro:{title:"CE ÎNVAȚĂ PROTECȚIA",none:"Nu există încă activitate protejată înregistrată.",summary:(sessions,attempts,success,reduction)=>`${sessions} sesiuni protejate și ${attempts} încercări protejate înregistrate. ${success}% dintre încercări au redus intensitatea, cu o reducere generală de ${reduction}%.`,category:(name,count)=>`Categoria protejată cel mai des: ${name} (${count} ${count===1?"încercare":"încercări"}).`,domain:(name,count)=>`Domeniul protejat cel mai des: ${name} (${count} ${count===1?"încercare":"încercări"}).`,mode:(name,count)=>`Cel mai folosit mod Protection: ${name} (${count} ${count===1?"încercare":"încercări"}).`,events:count=>`${count} evenimente Protection înregistrate.`},
fr:{title:"APPRENTISSAGE DE LA PROTECTION",none:"Aucune activité protégée n'a encore été enregistrée.",summary:(sessions,attempts,success,reduction)=>`${sessions} sessions protégées et ${attempts} tentatives protégées enregistrées. ${success}% des tentatives ont réduit l'intensité, avec une réduction globale de ${reduction}%.`,category:(name,count)=>`Catégorie protégée la plus fréquente : ${name} (${count} tentative${count===1?"":"s"}).`,domain:(name,count)=>`Domaine protégé le plus fréquent : ${name} (${count} tentative${count===1?"":"s"}).`,mode:(name,count)=>`Mode Protection le plus utilisé : ${name} (${count} tentative${count===1?"":"s"}).`,events:count=>`${count} événements Protection enregistrés.`},
de:{title:"SCHUTZ-LERNEN",none:"Noch keine geschützte Aktivität aufgezeichnet.",summary:(sessions,attempts,success,reduction)=>`${sessions} geschützte Sitzungen und ${attempts} geschützte Versuche aufgezeichnet. Bei ${success}% der Versuche sank die Intensität, mit einer Gesamtreduktion von ${reduction}%.`,category:(name,count)=>`Häufigste geschützte Kategorie: ${name} (${count} Versuch${count===1?"":"e"}).`,domain:(name,count)=>`Häufigste geschützte Domain: ${name} (${count} Versuch${count===1?"":"e"}).`,mode:(name,count)=>`Am häufigsten verwendeter Protection-Modus: ${name} (${count} Versuch${count===1?"":"e"}).`,events:count=>`${count} Protection-Ereignisse aufgezeichnet.`},
es:{title:"APRENDIZAJE DE PROTECCIÓN",none:"Todavía no hay actividad protegida registrada.",summary:(sessions,attempts,success,reduction)=>`${sessions} sesiones protegidas y ${attempts} intentos protegidos registrados. El ${success}% de los intentos redujo la intensidad, con una reducción general de ${reduction}%.`,category:(name,count)=>`Categoría protegida más frecuente: ${name} (${count} intento${count===1?"":"s"}).`,domain:(name,count)=>`Dominio protegido más frecuente: ${name} (${count} intento${count===1?"":"s"}).`,mode:(name,count)=>`Modo Protection más utilizado: ${name} (${count} intento${count===1?"":"s"}).`,events:count=>`${count} eventos de Protection registrados.`},
it:{title:"APPRENDIMENTO DELLA PROTEZIONE",none:"Non è ancora stata registrata alcuna attività protetta.",summary:(sessions,attempts,success,reduction)=>`${sessions} sessioni protette e ${attempts} tentativi protetti registrati. Il ${success}% dei tentativi ha ridotto l'intensità, con una riduzione complessiva di ${reduction}%.`,category:(name,count)=>`Categoria protetta più frequente: ${name} (${count} tentativ${count===1?"o":"i"}).`,domain:(name,count)=>`Dominio protetto più frequente: ${name} (${count} tentativ${count===1?"o":"i"}).`,mode:(name,count)=>`Modalità Protection più utilizzata: ${name} (${count} tentativ${count===1?"o":"i"}).`,events:count=>`${count} eventi Protection registrati.`}
};
return copy[currentLanguage]||copy.en;
}

function getEngineHistory(){
const history=[];
getSavedSessions().forEach(item=>{
if(!item)return;
if(Array.isArray(item.attemptHistory)&&item.attemptHistory.length){
item.attemptHistory.forEach(attempt=>{if(attempt&&attempt.intervention&&typeof attempt.intensityBefore==="number"&&typeof attempt.intensityAfter==="number")history.push({...item,...attempt,sessionId:item.id,behavior:item.behavior,behaviorLabel:item.behaviorLabel,expectation:item.expectation,expectationLabel:item.expectationLabel,trigger:attempt.trigger??item.trigger,protectionCategory:attempt.protectionCategory??item.protectionCategory,protectionDomain:attempt.protectionDomain??item.protectionDomain,protectionMode:attempt.protectionMode??item.protectionMode})});
return;
}
if(item.intervention&&typeof item.intensityBefore==="number"&&typeof item.intensityAfter==="number")history.push(item)
});
return history;
}
function getAdaptiveContext(){return{...session,intensityBefore:Number(session.attemptIntensityBefore??session.intensityBefore)}}
function getRelevantHistory(){return getEngineHistory().filter(item=>{if(session.behavior&&session.behavior!=="other"&&item.behavior!==session.behavior)return false;if(session.expectation&&session.expectation!=="unknown"&&item.expectation&&item.expectation!==session.expectation)return false;return true})}
function calculateInterventionStats(){return INTERRUPT_ADAPTIVE.buildStats(getRelevantHistory(),getAdaptiveContext())}
function getAdaptiveStats(){return INTERRUPT_ADAPTIVE.getAdaptiveStats(getEngineHistory(),getAdaptiveContext())}
function getLastSuccessful(intervention){return INTERRUPT_ADAPTIVE.getLastSuccessful(getEngineHistory(),getAdaptiveContext(),intervention)}
function getRecommendation(intervention){return INTERRUPT_ADAPTIVE.getRecommendation(getEngineHistory(),getAdaptiveContext(),intervention)}
function getPreviousSuccessRecommendation(){
const attempted=new Set(session.interventionAttempts||[]),history=getRelevantHistory(),stats=INTERRUPT_ADAPTIVE.buildStats(history,getAdaptiveContext()),intensity=Number(session.attemptIntensityBefore??session.intensityBefore),rules=INTERVENTION_RULES[session.behavior]||INTERVENTION_RULES.other,preferred=rules[session.expectation]||rules.default,candidates=[];
Object.entries(stats).forEach(([id,data])=>{if(attempted.has(id)||!data?.uses)return;const successful=history.filter(item=>item.intervention===id&&item.intensityAfter<item.intensityBefore).sort((a,b)=>new Date(b.completedAt||b.startedAt||0)-new Date(a.completedAt||a.startedAt||0));if(!successful.length)return;const last=successful[0],score=INTERRUPT_ADAPTIVE.scoreIntervention(id,stats,preferred,intensity),successStrength=(data.recencyWeightedSuccessRate||0)*8+(data.successRate||0)*4+Math.min(data.uses,6)*.7+Math.max(0,data.recencyWeightedImpact||0)*2+(successful.length>1?3:0);candidates.push({intervention:id,before:last.intensityBefore,after:last.intensityAfter,reduction:last.intensityBefore-last.intensityAfter,uses:data.uses,successes:successful.length,successRate:data.successRate,recencyWeightedSuccessRate:data.recencyWeightedSuccessRate,recencyWeightedImpact:data.recencyWeightedImpact,confidence:data.confidence,score:score+successStrength})});
if(!candidates.length)return null;candidates.sort((a,b)=>b.score-a.score);const best=candidates[0];if(best.reduction<=0)return null;return best;
}
function chooseIntervention(){
const attempted=new Set(session.interventionAttempts),adaptive=getAdaptiveStats(),stats=adaptive.stats,rules=INTERVENTION_RULES[session.behavior]||INTERVENTION_RULES.other,preferred=rules[session.expectation]||rules.default;
let candidates=INTERVENTIONS.filter(id=>!attempted.has(id));if(!candidates.length){session.interventionAttempts=[];candidates=[...INTERVENTIONS]}
const intensity=Number(session.attemptIntensityBefore??session.intensityBefore),previous=getPreviousSuccessRecommendation();
candidates.sort((a,b)=>{let scoreB=INTERRUPT_ADAPTIVE.scoreIntervention(b,stats,preferred,intensity),scoreA=INTERRUPT_ADAPTIVE.scoreIntervention(a,stats,preferred,intensity);if(previous){if(b===previous.intervention)scoreB+=previous.successes>1?10:5;if(a===previous.intervention)scoreA+=previous.successes>1?10:5}return scoreB-scoreA});
return candidates[0];
}
function interventionTitle(id){return t(`interventions.${id}.title`,id)}
function interventionCategory(id){const map={nameIt:"defusion",promise:"cognitive",wave:"urge_surfing",delay:"delay",fastForward:"future",changeScene:"environment",actualNeed:"need",breakChain:"trigger",twoFutures:"future",switch90:"attention",realityCheck:"cognitive",previousSuccess:"personal"};return t(`interventions.categories.${map[id]||"cognitive"}`,"")}
function updateDynamicIntervention(){if(!session.intervention)return;$("interventionCategory").textContent=interventionCategory(session.intervention);$("interventionTitle").textContent=interventionTitle(session.intervention);renderIntervention(session.intervention)}

function getPersonalHistoryText(recommendation,intervention,before,after){
const languageTexts={
en:{title:"PERSONAL HISTORY",last:`Last time, this type of urge dropped from ${before} to ${after} with ${intervention}.`,repeat:`${intervention} has repeatedly reduced this type of urge for you.`,similar:`You have reduced a similar urge with ${intervention} before.`},
ro:{title:"ISTORIC PERSONAL",last:`Data trecută, acest tip de impuls a scăzut de la ${before} la ${after} cu ${intervention}.`,repeat:`${intervention} a redus în mod repetat acest tip de impuls pentru tine.`,similar:`Ai redus un impuls similar cu ${intervention} și înainte.`},
fr:{title:"HISTORIQUE PERSONNEL",last:`La dernière fois, ce type d'envie est passé de ${before} à ${after} avec ${intervention}.`,repeat:`${intervention} a réduit à plusieurs reprises ce type d'envie pour vous.`,similar:`Vous avez déjà réduit une envie similaire avec ${intervention}.`},
de:{title:"PERSÖNLICHER VERLAUF",last:`Beim letzten Mal ist dieser Drang mit ${intervention} von ${before} auf ${after} gesunken.`,repeat:`${intervention} hat diesen Drang bei dir wiederholt reduziert.`,similar:`Du hast einen ähnlichen Drang schon einmal mit ${intervention} reduziert.`},
es:{title:"HISTORIAL PERSONAL",last:`La última vez, este tipo de impulso bajó de ${before} a ${after} con ${intervention}.`,repeat:`${intervention} ha reducido este tipo de impulso varias veces.`,similar:`Ya has reducido un impulso similar con ${intervention}.`},
it:{title:"STORICO PERSONALE",last:`L'ultima volta, questo tipo di impulso è sceso da ${before} a ${after} con ${intervention}.`,repeat:`${intervention} ha ridotto più volte questo tipo di impulso.`,similar:`Hai già ridotto un impulso simile con ${intervention}.`}};
const text=languageTexts[currentLanguage]||languageTexts.en;let message;
if(recommendation.reduction>0){if(recommendation.successes===1)message=text.last;else if(recommendation.confidence==="high"||recommendation.recencyWeightedSuccessRate>=.7)message=text.repeat;else message=text.similar}
return{title:text.title,message};
}
function renderPersonalRecommendation(container){
const recommendation=getRecommendation(session.intervention);if(!recommendation||recommendation.reduction<=0)return;
const box=document.createElement("div");box.className="insight-section";const before=recommendation.last?.intensityBefore??recommendation.before,after=recommendation.last?.intensityAfter??recommendation.after,intervention=interventionTitle(session.intervention),text=getPersonalHistoryText(recommendation,intervention,before,after),title=document.createElement("h3"),paragraph=document.createElement("p");title.textContent=text.title;paragraph.textContent=text.message;box.append(title,paragraph);container.appendChild(box);
}

function renderIntervention(id){
const content=$("interventionContent"),actions=$("interventionActions");content.innerHTML="";actions.innerHTML="";
const renderers={nameIt:renderNameIt,promise:renderPromise,wave:renderWave,delay:renderDelay,fastForward:renderFastForward,changeScene:renderChangeScene,actualNeed:renderActualNeed,breakChain:renderBreakChain,twoFutures:renderTwoFutures,realityCheck:renderRealityCheck,switch90:renderSwitch90};
if(renderers[id])renderers[id](content,actions);else renderGeneric(content,actions);renderPersonalRecommendation(content);
}
function addActionButton(container,text,callback,className="primary-button"){const button=document.createElement("button");button.type="button";button.className=className;button.textContent=text;button.addEventListener("click",callback);container.appendChild(button);return button}
function finishIntervention(){$("reassessSlider").value=Number(session.attemptIntensityBefore??session.intensityBefore);$("reassessValue").textContent=$("reassessSlider").value;showScreen("reassess")}

function renderNameIt(content,actions){const box=document.createElement("div");box.className="intervention-box";box.innerHTML=`<p>${t("interventions.nameIt.instruction")}</p><p class="intervention-prompt">${t("interventions.nameIt.firstPrompt")}</p><input class="intervention-input" type="text" placeholder="${escapeHTML(t("interventions.nameIt.placeholder"))}" autocomplete="off"><p class="intervention-prompt">${t("interventions.nameIt.secondPrompt")}</p><input class="intervention-input" type="text" placeholder="${escapeHTML(t("interventions.nameIt.placeholder2"))}" autocomplete="off">`;content.appendChild(box);addActionButton(actions,t("common.continue","CONTINUE"),finishIntervention)}
function renderPromise(content,actions){const box=document.createElement("div");box.className="intervention-box";const expected=session.expectationLabel||session.expectation||"";box.innerHTML=`<p>${t("interventions.promise.intro")}</p><p class="intervention-highlight">${t("interventions.promise.expected")} ${escapeHTML(expected)}</p><p class="intervention-prompt">${t("interventions.promise.durationQuestion")}</p><input class="intervention-input" type="text" placeholder="${escapeHTML(t("interventions.promise.durationPlaceholder"))}" autocomplete="off"><p class="intervention-prompt">${t("interventions.promise.afterQuestion")}</p><input class="intervention-input" type="text" placeholder="${escapeHTML(t("interventions.promise.afterPlaceholder"))}" autocomplete="off">`;content.appendChild(box);addActionButton(actions,t("common.continue","CONTINUE"),finishIntervention)}
function renderWave(content,actions){const box=document.createElement("div");box.className="intervention-box";box.innerHTML=`<p>${t("interventions.wave.instruction")}</p><p class="intervention-prompt">${t("interventions.wave.locationPrompt")}</p><div class="wave-locations">${["chest","stomach","head","hands","everywhere"].map(key=>`<button type="button" class="choice-button wave-location" data-location="${key}">${t(`interventions.wave.locations.${key}`)}</button>`).join("")}</div><div class="wave-timer" hidden><p>${t("interventions.wave.timerIntro")}</p><div class="timer-value">60</div></div>`;content.appendChild(box);const timerBox=box.querySelector(".wave-timer"),timerValue=box.querySelector(".timer-value");box.querySelectorAll(".wave-location").forEach(button=>button.addEventListener("click",()=>{box.querySelectorAll(".wave-location").forEach(item=>item.classList.remove("selected"));button.classList.add("selected");timerBox.hidden=false;let remaining=60;timerValue.textContent=remaining;const interval=setInterval(()=>{remaining--;timerValue.textContent=remaining;if(remaining<=0){clearInterval(interval);timerValue.textContent="0";addWaveFinishOptions(box,actions)}},1000)}))}
function addWaveFinishOptions(box,actions){if(box.querySelector(".wave-finish"))return;const finish=document.createElement("div");finish.className="wave-finish";finish.innerHTML=`<p>${t("interventions.wave.finished")}</p><div class="wave-results">${["weaker","changed","same","stronger"].map(key=>`<button type="button" class="choice-button" data-wave-result="${key}">${t(`interventions.wave.${key}`)}</button>`).join("")}</div>`;box.appendChild(finish);finish.querySelectorAll("[data-wave-result]").forEach(button=>button.addEventListener("click",()=>{finish.querySelectorAll(".choice-button").forEach(item=>item.classList.remove("selected"));button.classList.add("selected");actions.innerHTML="";addActionButton(actions,t("common.continue","CONTINUE"),finishIntervention)}))}
function renderDelay(content,actions){const box=document.createElement("div");box.className="intervention-box";box.innerHTML=`<p>${t("interventions.delay.instruction")}</p><p class="intervention-highlight">${t("interventions.delay.promise")}</p><div class="delay-timer">10:00</div>`;content.appendChild(box);const timer=box.querySelector(".delay-timer");addActionButton(actions,t("interventions.delay.start"),()=>{actions.innerHTML="";let remaining=600;const interval=setInterval(()=>{remaining--;timer.textContent=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,"0")}`;if(remaining<=0){clearInterval(interval);timer.textContent="0:00";const result=document.createElement("div");result.className="delay-result";result.innerHTML=`<p>${t("interventions.delay.finished")}</p><div class="option-grid"><button type="button" class="choice-button">${t("interventions.delay.stillWant")}</button><button type="button" class="choice-button">${t("interventions.delay.weaker")}</button><button type="button" class="choice-button">${t("interventions.delay.gone")}</button><button type="button" class="choice-button">${t("interventions.delay.alreadyDid")}</button></div>`;box.appendChild(result);result.querySelectorAll(".choice-button").forEach(button=>button.addEventListener("click",()=>{result.querySelectorAll(".choice-button").forEach(item=>item.classList.remove("selected"));button.classList.add("selected");actions.innerHTML="";addActionButton(actions,t("common.continue","CONTINUE"),finishIntervention)}))}},1000)})}
function renderFastForward(content,actions){const box=document.createElement("div");box.className="intervention-box";box.innerHTML=`<p>${t("interventions.fastForward.intro")}</p><p class="intervention-prompt">${t("interventions.fastForward.tenMinutes")}</p><textarea class="intervention-textarea" placeholder="${escapeHTML(t("interventions.fastForward.tenPlaceholder"))}"></textarea><p class="intervention-prompt">${t("interventions.fastForward.tomorrow")}</p><textarea class="intervention-textarea" placeholder="${escapeHTML(t("interventions.fastForward.tomorrowPlaceholder"))}"></textarea><p class="intervention-prompt">${t("interventions.fastForward.next")}</p><textarea class="intervention-textarea" placeholder="${escapeHTML(t("interventions.fastForward.nextPlaceholder"))}"></textarea>`;content.appendChild(box);addActionButton(actions,t("common.continue","CONTINUE"),finishIntervention)}
function renderChangeScene(content,actions){const box=document.createElement("div");box.className="intervention-box";box.innerHTML=`<ol class="intervention-steps"><li>${t("interventions.changeScene.step1")}</li><li>${t("interventions.changeScene.step2")}</li><li>${t("interventions.changeScene.step3")}</li><li>${t("interventions.changeScene.step4")}</li></ol><div class="scene-timer"></div>`;content.appendChild(box);const timer=box.querySelector(".scene-timer");addActionButton(actions,t("interventions.changeScene.ready"),()=>{actions.innerHTML="";let remaining=120;timer.textContent=remaining;const interval=setInterval(()=>{remaining--;timer.textContent=remaining;if(remaining<=0){clearInterval(interval);timer.textContent="0";addActionButton(actions,t("common.continue","CONTINUE"),finishIntervention)}},1000)})}
function renderActualNeed(content,actions){const box=document.createElement("div");box.className="intervention-box";const options=t("interventions.actualNeed.options",{}),keys=options&&typeof options==="object"?Object.keys(options):[];box.innerHTML=`<p>${t("interventions.actualNeed.intro")}</p><p class="intervention-prompt">${t("interventions.actualNeed.question")}</p><div class="option-grid">${keys.map(key=>`<button type="button" class="choice-button" data-need="${key}">${t(`interventions.actualNeed.options.${key}`)}</button>`).join("")}</div><div class="need-suggestion" hidden></div>`;content.appendChild(box);const suggestion=box.querySelector(".need-suggestion");box.querySelectorAll("[data-need]").forEach(button=>button.addEventListener("click",()=>{box.querySelectorAll("[data-need]").forEach(item=>item.classList.remove("selected"));button.classList.add("selected");suggestion.hidden=false;suggestion.textContent=t(`interventions.actualNeed.suggestions.${button.dataset.need}`);actions.innerHTML="";addActionButton(actions,t("common.continue","CONTINUE"),finishIntervention)}))}
function renderBreakChain(content,actions){const box=document.createElement("div");box.className="intervention-box";const options=t("interventions.breakChain.options",{}),keys=options&&typeof options==="object"?Object.keys(options):[];box.innerHTML=`<p>${t("interventions.breakChain.question")}</p><div class="option-grid">${keys.map(key=>`<button type="button" class="choice-button" data-trigger="${key}">${t(`interventions.breakChain.options.${key}`)}</button>`).join("")}</div><p class="trigger-result" hidden></p>`;content.appendChild(box);const result=box.querySelector(".trigger-result");box.querySelectorAll("[data-trigger]").forEach(button=>button.addEventListener("click",()=>{box.querySelectorAll("[data-trigger]").forEach(item=>item.classList.remove("selected"));button.classList.add("selected");session.trigger=button.dataset.trigger;result.hidden=false;result.textContent=t("interventions.breakChain.result");actions.innerHTML="";addActionButton(actions,t("interventions.breakChain.changeScene"),finishIntervention)}))}
function renderTwoFutures(content,actions){const box=document.createElement("div");box.className="intervention-box";box.innerHTML=`<p>${t("interventions.twoFutures.intro")}</p><p class="intervention-prompt">${t("interventions.twoFutures.act")}</p><textarea class="intervention-textarea" placeholder="${escapeHTML(t("interventions.twoFutures.actPlaceholder"))}"></textarea><p class="intervention-prompt">${t("interventions.twoFutures.dont")}</p><textarea class="intervention-textarea" placeholder="${escapeHTML(t("interventions.twoFutures.dontPlaceholder"))}"></textarea>`;content.appendChild(box);addActionButton(actions,t("common.continue","CONTINUE"),finishIntervention)}
function renderSwitch90(content,actions){const tasks=[t("interventions.switch90.task1"),t("interventions.switch90.task2"),t("interventions.switch90.task3"),t("interventions.switch90.task4")],task=tasks[Math.floor(Math.random()*tasks.length)],box=document.createElement("div");box.className="intervention-box";box.innerHTML=`<p>${t("interventions.switch90.instruction")}</p><p class="intervention-highlight">${task}</p><div class="switch-timer">90</div>`;content.appendChild(box);const timer=box.querySelector(".switch-timer");addActionButton(actions,t("interventions.switch90.start"),()=>{actions.innerHTML="";let remaining=90;timer.textContent=remaining;const interval=setInterval(()=>{remaining--;timer.textContent=remaining;if(remaining<=0){clearInterval(interval);timer.textContent="0";addActionButton(actions,t("common.continue","CONTINUE"),finishIntervention)}},1000)})}
function renderRealityCheck(content,actions){const box=document.createElement("div");box.className="intervention-box";box.innerHTML=`<p>${t("interventions.realityCheck.question")}</p><textarea class="intervention-textarea" placeholder="${escapeHTML(t("interventions.realityCheck.placeholder"))}"></textarea><p class="intervention-prompt">${t("interventions.realityCheck.certainty")}</p><input class="intervention-range" type="range" min="0" max="100" value="50"><div class="certainty-value">50%</div><p class="intervention-prompt">${t("interventions.realityCheck.past")}</p><div class="option-grid"><button type="button" class="choice-button">${t("interventions.realityCheck.yes")}</button><button type="button" class="choice-button">${t("interventions.realityCheck.no")}</button><button type="button" class="choice-button">${t("interventions.realityCheck.sometimes")}</button></div>`;content.appendChild(box);const range=box.querySelector(".intervention-range"),value=box.querySelector(".certainty-value");range.addEventListener("input",()=>value.textContent=`${range.value}%`);box.querySelectorAll(".choice-button").forEach(button=>button.addEventListener("click",()=>{box.querySelectorAll(".choice-button").forEach(item=>item.classList.remove("selected"));button.classList.add("selected");actions.innerHTML="";addActionButton(actions,t("common.continue","CONTINUE"),finishIntervention)}))}
function renderGeneric(content,actions){const box=document.createElement("div");box.className="intervention-box";box.innerHTML=`<p>${t("interventions.generic.instruction")}</p>`;content.appendChild(box);addActionButton(actions,t("common.continue","CONTINUE"),finishIntervention)}

function startIntervention(){
const intervention=chooseIntervention();session.intervention=intervention;session.attemptIntensityBefore=Number(session.intensityAfter??session.intensityBefore);session.attemptStartedAt=new Date().toISOString();if(!session.interventionAttempts.includes(intervention))session.interventionAttempts.push(intervention);
if(session.protectionCategory)recordProtectionEvent({type:"intervention",action:intervention,category:session.protectionCategory,host:session.protectionDomain,mode:session.protectionMode,intensityBefore:session.attemptIntensityBefore});
$("interventionCategory").textContent=interventionCategory(intervention);$("interventionTitle").textContent=interventionTitle(intervention);renderIntervention(intervention);showScreen("intervention");
}
function reassess(){
const before=Number(session.attemptIntensityBefore??session.intensityBefore),after=Number($("reassessSlider").value),now=new Date().toISOString();
if(!Array.isArray(session.attemptHistory))session.attemptHistory=[];
const attempt={id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,intervention:session.intervention,intensityBefore:before,intensityAfter:after,impact:before-after,behavior:session.behavior,behaviorLabel:session.behaviorLabel,expectation:session.expectation,expectationLabel:session.expectationLabel,trigger:session.trigger,startedAt:session.attemptStartedAt||now,completedAt:now,protectionCategory:session.protectionCategory,protectionDomain:session.protectionDomain,protectionMode:session.protectionMode};
session.attemptHistory.push(attempt);session.intensityAfter=after;session.attemptIntensityBefore=after;session.attemptStartedAt=null;
if(session.protectionCategory)recordProtectionEvent({type:"reassess",action:session.intervention,host:session.protectionDomain,intensityBefore:before,intensityAfter:after,impact:before-after,category:session.protectionCategory,mode:session.protectionMode});
showScreen("outcome");
}
function selectOutcome(button){document.querySelectorAll(".outcome-button").forEach(item=>item.classList.remove("selected"));button.classList.add("selected");session.outcome=button.dataset.outcome;completeSession()}
function completeSession(){
if(session.protectionCategory)recordProtectionEvent({type:"completed",action:session.intervention,host:session.protectionDomain,intensityBefore:session.intensityBefore,intensityAfter:session.intensityAfter,category:session.protectionCategory,mode:session.protectionMode,outcome:session.outcome});
session.completedAt=new Date().toISOString();const sessions=getSavedSessions(),index=sessions.findIndex(item=>item.id===session.id),snapshot=JSON.parse(JSON.stringify(session));if(index>=0)sessions[index]=snapshot;else sessions.push(snapshot);saveSessions(sessions);showResult();
}
function showResult(){
const before=Number(session.intensityBefore),after=Number(session.intensityAfter);$("resultBefore").textContent=before;$("resultAfter").textContent=after;const difference=before-after,percentage=before>0?Math.round(difference/before*100):0;
if(difference>0){$("resultChange").textContent=`−${percentage}%`;$("resultMessage").textContent=t("result.messages.lower")}else if(difference<0){$("resultChange").textContent=`+${Math.abs(percentage)}%`;$("resultMessage").textContent=t("result.messages.higher")}else{$("resultChange").textContent="0%";$("resultMessage").textContent=t("result.messages.same")}
const titles={interrupted:"interruptedTitle",delayed:"delayedTitle",acted:"actedTitle",unsure:"unsureTitle"};$("resultTitle").textContent=t(`result.${titles[session.outcome]||"interruptedTitle"}`,t("result.interruptedTitle","You created a gap."));$("resultIntervention").textContent=interventionTitle(session.intervention);$("resultBehavior").textContent=session.behaviorLabel||session.behavior||"—";showScreen("result");
}
function tryAnotherIntervention(){
const next=chooseIntervention();session.intervention=next;session.attemptIntensityBefore=Number(session.intensityAfter??session.intensityBefore);session.attemptStartedAt=new Date().toISOString();if(!session.interventionAttempts.includes(next))session.interventionAttempts.push(next);
if(session.protectionCategory)recordProtectionEvent({type:"intervention",action:next,category:session.protectionCategory,host:session.protectionDomain,mode:session.protectionMode,intensityBefore:session.attemptIntensityBefore});
$("interventionCategory").textContent=interventionCategory(next);$("interventionTitle").textContent=interventionTitle(next);renderIntervention(next);showScreen("intervention");
}
function finishAndReset(){resetSession();showScreen("home")}

function getCompletedSessions(){return getSavedSessions().filter(item=>typeof item.intensityBefore==="number"&&typeof item.intensityAfter==="number").sort((a,b)=>new Date(b.completedAt||b.startedAt)-new Date(a.completedAt||a.startedAt))}
function getLabel(type,value){if(!value)return"—";const paths={behavior:`behaviors.${value}`,expectation:`expectations.${value}`,trigger:`interventions.breakChain.options.${value}`};return t(paths[type]||value,value)}
function getRecentHistory(days=30){const cutoff=Date.now()-days*86400000;return getEngineHistory().filter(item=>new Date(item.completedAt||item.startedAt||0).getTime()>=cutoff)}
function getBestIntervention(history){if(!history.length)return null;const stats=INTERRUPT_ADAPTIVE.buildStats(history);let best=null;Object.entries(stats).forEach(([id,data])=>{if(!best||data.recencyWeightedImpact>best.recencyWeightedImpact)best={id,uses:data.uses,averageImpact:data.averageImpact,recencyWeightedImpact:data.recencyWeightedImpact,successRate:data.successRate,negativeRate:data.negativeRate,confidence:data.confidence}});return best}
function getMostCommon(history,key){const counts={};history.forEach(item=>{if(item[key])counts[item[key]]=(counts[item[key]]||0)+1});let best=null;Object.entries(counts).forEach(([value,count])=>{if(!best||count>best.count)best={value,count}});return best}
function getBestContextPattern(history){
if(!history.length)return null;const groups={};
history.forEach(item=>{if(!item.intervention||!item.behavior)return;const behavior=item.behavior,expectation=item.expectation||"unknown",band=INTERRUPT_ADAPTIVE.getIntensityBand(item.intensityBefore),key=`${behavior}|${expectation}|${band}`;if(!groups[key])groups[key]={behavior,expectation,band,count:0,impact:0,positive:0};const group=groups[key],impact=item.intensityBefore-item.intensityAfter;group.count++;group.impact+=impact;if(impact>0)group.positive++});
let best=null;Object.values(groups).forEach(group=>{if(group.count<2)return;group.averageImpact=group.impact/group.count;group.successRate=group.positive/group.count;if(!best||group.averageImpact>best.averageImpact||group.averageImpact===best.averageImpact&&group.count>best.count)best=group});return best;
}

function getInsightsCopy(){
const copy={
en:{learning:"WHAT INTERRUPT IS LEARNING",recent:"RECENT PERFORMANCE",pattern:"YOUR STRONGEST PATTERN",bestRecent:"Recent performance",bestOverall:"Overall performance",uses:"uses",success:"success",commonBehavior:"Most common behavior",commonExpectation:"Most common expectation",commonTrigger:"Most common trigger",noPattern:"Not enough repeated context yet. INTERRUPT will learn as you use it more.",patternText:(behavior,expectation,band,intervention,impact)=>`${intervention} has shown a ${impact>0?"positive":"mixed"} result when this type of urge is ${band} intensity.`,recentText:(name,reduction)=>`${name} has been your strongest recent approach, with an average reduction of ${reduction}.`,overallText:(name,reduction)=>`${name} has the strongest overall reduction in your recorded history: ${reduction}.`,none:"Not enough data yet.",proTitle:"INTERRUPT Pro",proOverall:"Unlock long-term performance insights from your history.",proPattern:"Unlock deeper patterns across behavior, expectation and intensity.",proProtection:"Unlock advanced Protection learning and context patterns."},
ro:{learning:"CE ÎNVAȚĂ INTERRUPT",recent:"PERFORMANȚĂ RECENTĂ",pattern:"CEL MAI PUTERNIC TIPAR",bestRecent:"Performanță recentă",bestOverall:"Performanță generală",uses:"utilizări",success:"succes",commonBehavior:"Comportamentul cel mai frecvent",commonExpectation:"Așteptarea cea mai frecventă",commonTrigger:"Declanșatorul cel mai frecvent",noPattern:"Încă nu există suficiente contexte repetate. INTERRUPT va învăța pe măsură ce îl folosești.",patternText:(behavior,expectation,band,intervention,impact)=>`${intervention} a arătat un rezultat ${impact>0?"pozitiv":"mixt"} când acest tip de impuls este de intensitate ${band}.`,recentText:(name,reduction)=>`${name} a fost cea mai eficientă abordare recentă, cu o reducere medie de ${reduction}.`,overallText:(name,reduction)=>`${name} are cea mai mare reducere medie din istoricul înregistrat: ${reduction}.`,none:"Încă nu există suficiente date.",proTitle:"INTERRUPT Pro",proOverall:"Deblochează informații pe termen lung despre performanța ta.",proPattern:"Deblochează tipare mai profunde între comportament, așteptare și intensitate.",proProtection:"Deblochează analiza avansată a Protection și a contextului."},
fr:{learning:"CE QU'INTERRUPT APPREND",recent:"PERFORMANCE RÉCENTE",pattern:"VOTRE MOTIF LE PLUS FORT",bestRecent:"Performance récente",bestOverall:"Performance globale",uses:"utilisations",success:"succès",commonBehavior:"Comportement le plus fréquent",commonExpectation:"Attente la plus fréquente",commonTrigger:"Déclencheur le plus fréquent",noPattern:"Pas encore assez de contexte répété. INTERRUPT apprendra avec votre utilisation.",patternText:(behavior,expectation,band,intervention,impact)=>`${intervention} montre un résultat ${impact>0?"positif":"mitigé"} lorsque ce type d'envie est d'intensité ${band}.`,recentText:(name,reduction)=>`${name} est votre approche récente la plus efficace, avec une réduction moyenne de ${reduction}.`,overallText:(name,reduction)=>`${name} présente la meilleure réduction moyenne de votre historique : ${reduction}.`,none:"Pas encore assez de données.",proTitle:"INTERRUPT Pro",proOverall:"Débloquez les informations de performance à long terme.",proPattern:"Débloquez des schémas plus profonds entre comportement, attente et intensité.",proProtection:"Débloquez l'apprentissage avancé de Protection et du contexte."},
de:{learning:"WAS INTERRUPT LERNT",recent:"AKTUELLE LEISTUNG",pattern:"IHR STÄRKSTES MUSTER",bestRecent:"Aktuelle Leistung",bestOverall:"Gesamtleistung",uses:"Anwendungen",success:"Erfolg",commonBehavior:"Häufigstes Verhalten",commonExpectation:"Häufigste Erwartung",commonTrigger:"Häufigster Auslöser",noPattern:"Noch gibt es nicht genug wiederholten Kontext. INTERRUPT lernt mit der Zeit.",patternText:(behavior,expectation,band,intervention,impact)=>`${intervention} zeigt ein ${impact>0?"positives":"gemischtes"} Ergebnis bei dieser Drangstärke: ${band}.`,recentText:(name,reduction)=>`${name} war zuletzt dein stärkster Ansatz mit einer durchschnittlichen Reduktion von ${reduction}.`,overallText:(name,reduction)=>`${name} hat in deinem bisherigen Verlauf die stärkste durchschnittliche Reduktion: ${reduction}.`,none:"Noch nicht genug Daten.",proTitle:"INTERRUPT Pro",proOverall:"Schalte langfristige Leistungsanalysen frei.",proPattern:"Schalte tiefere Muster zwischen Verhalten, Erwartung und Intensität frei.",proProtection:"Schalte erweitertes Protection-Lernen und Kontextanalysen frei."},
es:{learning:"LO QUE INTERRUPT ESTÁ APRENDIENDO",recent:"RENDIMIENTO RECIENTE",pattern:"TU PATRÓN MÁS FUERTE",bestRecent:"Rendimiento reciente",bestOverall:"Rendimiento general",uses:"usos",success:"éxito",commonBehavior:"Comportamiento más frecuente",commonExpectation:"Expectativa más frecuente",commonTrigger:"Desencadenante más frecuente",noPattern:"Todavía no hay suficiente contexto repetido. INTERRUPT aprenderá con el uso.",patternText:(behavior,expectation,band,intervention,impact)=>`${intervention} ha mostrado un resultado ${impact>0?"positivo":"mixto"} cuando este tipo de impulso tiene intensidad ${band}.`,recentText:(name,reduction)=>`${name} ha sido tu enfoque reciente más eficaz, con una reducción media de ${reduction}.`,overallText:(name,reduction)=>`${name} tiene la mayor reducción media de tu historial: ${reduction}.`,none:"Todavía no hay suficientes datos.",proTitle:"INTERRUPT Pro",proOverall:"Desbloquea información de rendimiento a largo plazo.",proPattern:"Desbloquea patrones más profundos entre comportamiento, expectativa e intensidad.",proProtection:"Desbloquea el aprendizaje avanzado de Protection y del contexto."},
it:{learning:"COSA STA IMPARANDO INTERRUPT",recent:"PRESTAZIONI RECENTI",pattern:"IL TUO SCHEMA PIÙ FORTE",bestRecent:"Prestazioni recenti",bestOverall:"Prestazioni complessive",uses:"utilizzi",success:"successo",commonBehavior:"Comportamento più frequente",commonExpectation:"Aspettativa più frequente",commonTrigger:"Trigger più frequente",noPattern:"Non c'è ancora abbastanza contesto ripetuto. INTERRUPT imparerà con l'utilizzo.",patternText:(behavior,expectation,band,intervention,impact)=>`${intervention} ha mostrato un risultato ${impact>0?"positivo":"misto"} quando questo tipo di impulso è di intensità ${band}.`,recentText:(name,reduction)=>`${name} è stato il tuo approccio recente più efficace, con una riduzione media di ${reduction}.`,overallText:(name,reduction)=>`${name} ha la riduzione media più forte nella tua cronologia: ${reduction}.`,none:"Non ci sono ancora abbastanza dati.",proTitle:"INTERRUPT Pro",proOverall:"Sblocca gli approfondimenti sulle prestazioni a lungo termine.",proPattern:"Sblocca schemi più profondi tra comportamento, aspettativa e intensità.",proProtection:"Sblocca l'apprendimento avanzato di Protection e del contesto."}};
return copy[currentLanguage]||copy.en;
}

function createInsightSection(title,text){const box=document.createElement("div");box.className="insight-section";const heading=document.createElement("h3"),paragraph=document.createElement("p");heading.textContent=title;paragraph.textContent=text;box.append(heading,paragraph);return box}

function renderProtectionInsights(container){
const stats=getProtectionStats(),copy=getProtectionInsightText();
if(!stats.protectedSessions&&!stats.protectedAttempts){container.appendChild(createInsightSection(copy.title,copy.none));return}
const box=document.createElement("div");box.className="insight-section";const title=document.createElement("h3");title.textContent=copy.title;box.appendChild(title);
const summary=document.createElement("p");summary.textContent=copy.summary(stats.protectedSessions,stats.protectedAttempts,stats.successRate,stats.reduction);box.appendChild(summary);
if(stats.categories.length){const c=stats.categories[0],name=(PROTECTION_LABELS[currentLanguage]||PROTECTION_LABELS.en)[c[0]]||c[0],p=document.createElement("p");p.textContent=copy.category(name,c[1]);box.appendChild(p)}
if(stats.domains.length){const d=stats.domains[0],p=document.createElement("p");p.textContent=copy.domain(d[0],d[1]);box.appendChild(p)}
if(stats.modes.length){const m=stats.modes[0],p=document.createElement("p");p.textContent=copy.mode(m[0],m[1]);box.appendChild(p)}
if(stats.eventCount){const p=document.createElement("p");p.textContent=copy.events(stats.eventCount);box.appendChild(p)}
container.appendChild(box);
}

function renderInsights(){
const sessions=getCompletedSessions(),history=getEngineHistory(),copy=getInsightsCopy(),total=sessions.length,interrupted=sessions.filter(item=>item.outcome==="interrupted").length;
let totalBefore=0,totalAfter=0;sessions.forEach(item=>{totalBefore+=Number(item.intensityBefore)||0;totalAfter+=Number(item.intensityAfter)||0});
const reduction=totalBefore>0?Math.round((totalBefore-totalAfter)/totalBefore*100):0,recentHistory=getRecentHistory(30),recentBest=getBestIntervention(recentHistory),overallBest=getBestIntervention(history),commonBehavior=getMostCommon(history,"behavior"),commonExpectation=getMostCommon(history,"expectation"),commonTrigger=getMostCommon(history,"trigger"),pattern=getBestContextPattern(history);
$("insightTotal").textContent=total;$("insightInterrupted").textContent=interrupted;$("insightReduction").textContent=`${reduction>0?"−":""}${Math.abs(reduction)}%`;$("insightBest").textContent=overallBest?interventionTitle(overallBest.id):"—";$("insightTrigger").textContent=commonTrigger?getLabel("trigger",commonTrigger.value):"—";
const recent=$("recentSessions");recent.innerHTML="";

if(!isPro()){
const proBanner=document.createElement("div");
proBanner.className="insight-section pro-banner";
const title=document.createElement("h3");
title.textContent=t("insights.proTitle","INTERRUPT Pro");
const text=document.createElement("p");
text.textContent=t("insights.proMessage","Pro will turn your history into deeper personal patterns and show you what consistently works for you.");
proBanner.append(title,text,createProButton("primary-button"));
recent.appendChild(proBanner);
}

if(!sessions.length){
const empty=document.createElement("p");
empty.textContent=t("insights.empty",copy.none);
recent.appendChild(empty);
if(hasFeature("advancedContext"))renderProtectionInsights(recent);
return
}

if(recentBest){
const reductionText=recentBest.recencyWeightedImpact>0?`−${recentBest.recencyWeightedImpact.toFixed(1)}`:recentBest.recencyWeightedImpact.toFixed(1);
recent.appendChild(createInsightSection(copy.recent,copy.recentText(interventionTitle(recentBest.id),reductionText)))
}

if(hasFeature("longTermInsights")){
if(overallBest){
const reductionText=overallBest.averageImpact>0?`−${overallBest.averageImpact.toFixed(1)}`:overallBest.averageImpact.toFixed(1);
recent.appendChild(createInsightSection(copy.learning,copy.overallText(interventionTitle(overallBest.id),reductionText)))
}
}else recent.appendChild(createProGate(copy.bestOverall,copy.proOverall));

if(hasFeature("deepPatterns")){
if(pattern){
const matching=history.filter(item=>item.behavior===pattern.behavior&&(item.expectation||"unknown")===pattern.expectation&&INTERRUPT_ADAPTIVE.getIntensityBand(item.intensityBefore)===pattern.band),patternStats=INTERRUPT_ADAPTIVE.buildStats(matching),intervention=Object.entries(patternStats).sort((a,b)=>b[1].recencyWeightedImpact-a[1].recencyWeightedImpact)[0]?.[0]||overallBest?.id;
recent.appendChild(createInsightSection(copy.pattern,copy.patternText(getLabel("behavior",pattern.behavior),getLabel("expectation",pattern.expectation),pattern.band,intervention?interventionTitle(intervention):"—",pattern.averageImpact)))
}else recent.appendChild(createInsightSection(copy.pattern,copy.noPattern));
}else recent.appendChild(createProGate(copy.pattern,copy.proPattern));

const facts=document.createElement("div");facts.className="insights-facts";
[[copy.commonBehavior,commonBehavior?getLabel("behavior",commonBehavior.value):"—"],[copy.commonExpectation,commonExpectation?getLabel("expectation",commonExpectation.value):"—"],[copy.commonTrigger,commonTrigger?getLabel("trigger",commonTrigger.value):"—"]].forEach(([label,value])=>{const row=document.createElement("div");row.className="recent-session";row.innerHTML=`<div class="recent-session-main"><div class="recent-session-behavior">${escapeHTML(label)}</div><div class="recent-session-intervention">${escapeHTML(value)}</div></div>`;facts.appendChild(row)});
recent.appendChild(facts);

if(hasFeature("advancedContext"))renderProtectionInsights(recent);

const title=document.createElement("h3");
title.textContent=t("insights.recentTitle","RECENT SESSIONS");
recent.appendChild(title);

sessions.slice(0,5).forEach(item=>{
const row=document.createElement("div");
row.className="recent-session";
const difference=Number(item.intensityBefore)-Number(item.intensityAfter),change=difference>0?`−${difference}`:difference<0?`+${Math.abs(difference)}`:"0";
row.innerHTML=`<div class="recent-session-main"><div class="recent-session-behavior">${escapeHTML(item.behaviorLabel||item.behavior||"—")}</div><div class="recent-session-intervention">${escapeHTML(interventionTitle(item.intervention))}</div></div><div class="recent-session-change">${item.intensityBefore} → ${item.intensityAfter} (${change})</div>`;
recent.appendChild(row)
})
}

function initializeEvents(){
$("logoButton").addEventListener("click",finishAndReset);
$("languageButton").addEventListener("click",event=>{event.stopPropagation();toggleLanguageMenu()});
$("insightsButton").addEventListener("click",()=>{renderInsights();showScreen("insights")});
$("insightsDoneButton").addEventListener("click",()=>showScreen("home"));
document.querySelectorAll(".language-option").forEach(option=>option.addEventListener("click",async()=>{await loadLanguage(option.dataset.language);toggleLanguageMenu(false)}));
document.addEventListener("click",event=>{if(!event.target.closest(".language-wrapper"))toggleLanguageMenu(false)});
$("startButton").addEventListener("click",()=>{resetSession();inspectCurrentProtection();showScreen("behavior")});
document.querySelectorAll("#behaviorOptions .choice-button").forEach(button=>button.addEventListener("click",()=>selectBehavior(button)));
$("otherBehaviorInput").addEventListener("input",validateOtherBehavior);
$("behaviorContinueButton").addEventListener("click",()=>{if(session.behaviorLabel)showScreen("intensity")});
$("intensitySlider").addEventListener("input",()=>updateSliderValue($("intensitySlider"),$("intensityValue")));
$("intensityContinueButton").addEventListener("click",()=>{session.intensityBefore=Number($("intensitySlider").value);session.attemptIntensityBefore=session.intensityBefore;showScreen("expectation")});
document.querySelectorAll("#expectationOptions .choice-button").forEach(button=>button.addEventListener("click",()=>selectExpectation(button)));
$("otherExpectationInput").addEventListener("input",validateOtherExpectation);
$("expectationContinueButton").addEventListener("click",()=>{if(session.expectationLabel)startIntervention()});
$("reassessSlider").addEventListener("input",()=>updateSliderValue($("reassessSlider"),$("reassessValue")));
$("reassessContinueButton").addEventListener("click",reassess);
document.querySelectorAll(".outcome-button").forEach(button=>button.addEventListener("click",()=>selectOutcome(button)));
$("finishButton").addEventListener("click",finishAndReset);
$("anotherInterventionButton").addEventListener("click",tryAnotherIntervention);
document.querySelectorAll(".back-button").forEach(button=>button.addEventListener("click",()=>goBack(button.dataset.back)));
}

function exposeDebug(){
window.INTERRUPT_DEBUG={
getSession:()=>session,
getSessions:getSavedSessions,
getHistory:getEngineHistory,
getStats:calculateInterventionStats,
getAdaptiveStats,
getRecommendation,
getPreviousSuccessRecommendation,
getInsights:()=>{renderInsights();return{sessions:getCompletedSessions(),history:getEngineHistory(),stats:INTERRUPT_ADAPTIVE.buildStats(getEngineHistory()),protection:getProtectionStats()}},
band:value=>INTERRUPT_ADAPTIVE.getIntensityBand(value),
resetData:()=>{if(typeof INTERRUPT_STORAGE!=="undefined"&&typeof INTERRUPT_STORAGE.clearSessions==="function")INTERRUPT_STORAGE.clearSessions();else localStorage.removeItem(STORAGE.sessions);protectionCall("clearEvents");console.log("INTERRUPT session and protection data cleared.")},
language:()=>currentLanguage,
translation:(key,fallback)=>t(key,fallback),
entitlements:{
getPlan:()=>getEntitlements()?.getPlan(),
getPlanInfo:()=>getEntitlements()?.getPlanInfo(),
isPro,
hasFeature,
setPro:()=>{const result=getEntitlements()?.debug?.setPro();updateProEntryPoints();return result},
setFree:()=>{const result=getEntitlements()?.debug?.setFree();updateProEntryPoints();return result},
trial:()=>{const result=getEntitlements()?.debug?.trial();updateProEntryPoints();return result},
reset:()=>{const result=getEntitlements()?.debug?.reset();updateProEntryPoints();return result}
},
protection:{
getSettings:getProtectionSettings,
setEnabled:setProtectionEnabled,
setMode:setProtectionMode,
setCategoryEnabled:setProtectionCategory,
addDomain:addProtectionDomain,
removeDomain:removeProtectionDomain,
getDomains:getProtectionDomains,
getEvents:getProtectionEvents,
getStats:getProtectionStats,
inspect:inspectProtectionUrl,
inspectCurrent:inspectCurrentProtection,
recordEvent:recordProtectionEvent
}
};
}

function registerServiceWorker(){
if("serviceWorker" in navigator){
window.addEventListener("load",()=>{
navigator.serviceWorker.register("./service-worker.js").catch(error=>console.warn("Service worker registration failed:",error));
});
}
}

async function initialize(){
registerServiceWorker();
initializeEvents();
exposeDebug();
const savedLanguage=localStorage.getItem(STORAGE.language)||"en";
resetSession();
await loadLanguage(savedLanguage);
initProtection();
updateProEntryPoints();
}

document.addEventListener("DOMContentLoaded",initialize);
