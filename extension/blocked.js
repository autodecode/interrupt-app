const params=new URLSearchParams(location.search);

const category=params.get(“category”)||“custom”;
const host=params.get(“host”)||””;
const originalUrl=params.get(“url”)||””;
const mode=params.get(“mode”)||“medium”;

const $=id=>document.getElementById(id);

const CATEGORY_LABELS={
gambling:“GAMBLING”,
pornography:“PORNOGRAPHY”,
socialMedia:“SOCIAL MEDIA”,
custom:“PROTECTED ACTIVITY”
};

const CATEGORY_TEXT={
gambling:“You were about to enter a gambling-related activity.”,
pornography:“You were about to enter a protected activity.”,
socialMedia:“You were about to open a social media activity.”,
custom:“You were about to open a protected activity.”
};

const settings={
light:{seconds:15,allowContinue:true},
medium:{seconds:60,allowContinue:true},
strong:{seconds:300,allowContinue:false}
};

const protection=settings[mode]||settings.medium;

let seconds=protection.seconds;
let timerStartedAt=new Date().toISOString();
let timerFinishedAt=null;
let initialUrge=5;

$(“categoryLabel”).textContent=CATEGORY_LABELS[category]||CATEGORY_LABELS.custom;
$(“message”).textContent=CATEGORY_TEXT[category]||CATEGORY_TEXT.custom;
$(“domainLabel”).textContent=host;

$(“urgeSlider”).addEventListener(“input”,()=>{
initialUrge=Number($(“urgeSlider”).value);
$(“urgeValue”).textContent=initialUrge;
});

function updateTimer(){
$(“timer”).textContent=seconds;

if(seconds<=0){
timerFinishedAt=new Date().toISOString();
$(“timer”).textContent=“✓”;
$(“prompt”).textContent=“The pause is over. What do you want to do?”;
$(“interruptButton”).textContent=“REASSESS”;
$(“interruptButton”).disabled=false;
}
}

const timer=setInterval(()=>{
if(seconds>0){
seconds–;
updateTimer();
}else{
clearInterval(timer);
}
},1000);

function saveEvent(data){
chrome.storage.local.get(“protectionEvents”,result=>{
const events=Array.isArray(result.protectionEvents)
?result.protectionEvents
:[];

events.push({
  id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
  category,
  host,
  originalUrl,
  mode,
  ...data
});
chrome.storage.local.set({
  protectionEvents:events.slice(-500)
});

});
}

function goBack(){
saveEvent({
action:“back”,
intensityBefore:initialUrge,
intensityAfter:null,
startedAt:timerStartedAt,
completedAt:new Date().toISOString()
});

history.back();
}

function continueAnyway(){
saveEvent({
action:“continue”,
intensityBefore:initialUrge,
intensityAfter:null,
startedAt:timerStartedAt,
completedAt:new Date().toISOString()
});

if(originalUrl){
location.href=originalUrl;
return;
}

history.back();
}

function interrupt(){
if(seconds>0){
$(“prompt”).textContent=Take ${seconds} more seconds. You don't have to act on the urge yet.;
return;
}

$(“title”).textContent=“Now check again.”;
$(“message”).textContent=“Has the urge changed after the pause?”;
$(“urge”).style.display=“block”;
$(“prompt”).textContent=“Rate it again before deciding.”;

$(“interruptButton”).style.display=“none”;
$(“backButton”).textContent=“GO BACK”;
$(“continueButton”).textContent=“CONTINUE ANYWAY”;

$(“urgeSlider”).focus();

const oldSlider=$(“urgeSlider”);
const newSlider=oldSlider.cloneNode(true);
oldSlider.replaceWith(newSlider);

const oldValue=$(“urgeValue”);
const newValue=oldValue;

newSlider.addEventListener(“input”,()=>{
newValue.textContent=newSlider.value;
});

$(“backButton”).onclick=()=>{
const after=Number(newSlider.value);

saveEvent({
  action:"back",
  intensityBefore:initialUrge,
  intensityAfter:after,
  startedAt:timerStartedAt,
  completedAt:new Date().toISOString()
});
history.back();

};

$(“continueButton”).onclick=()=>{
const after=Number(newSlider.value);

saveEvent({
  action:"continue",
  intensityBefore:initialUrge,
  intensityAfter:after,
  startedAt:timerStartedAt,
  completedAt:new Date().toISOString()
});
if(originalUrl){
  location.href=originalUrl;
  return;
}
history.back();

};
}

$(“interruptButton”).addEventListener(“click”,interrupt);
$(“backButton”).addEventListener(“click”,goBack);
$(“continueButton”).addEventListener(“click”,continueAnyway);

if(!protection.allowContinue){
$(“continueButton”).style.display=“none”;
}

updateTimer();
