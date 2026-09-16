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

const MODES={
light:{seconds:15,allowContinue:true},
medium:{seconds:60,allowContinue:true},
strong:{seconds:300,allowContinue:false}
};

const protection=MODES[mode]||MODES.medium;

let seconds=protection.seconds;
let initialUrge=5;
let timerStartedAt=new Date().toISOString();
let reassessing=false;
let timer=null;

$(“categoryLabel”).textContent=
CATEGORY_LABELS[category]||CATEGORY_LABELS.custom;

$(“message”).textContent=
CATEGORY_TEXT[category]||CATEGORY_TEXT.custom;

$(“domainLabel”).textContent=host;

function setPrompt(text){
$(“prompt”).textContent=text;
}

function updateTimer(){
$(“timer”).textContent=seconds;

if(seconds<=0){
$(“timer”).textContent=“✓”;
setPrompt(“The pause is over. Check the urge again before deciding.”);
$(“interruptButton”).textContent=“REASSESS”;
$(“interruptButton”).disabled=false;
}
}

function saveEvent(data){
chrome.storage.local.get(“protectionEvents”).then(result=>{
const events=Array.isArray(result.protectionEvents)
?result.protectionEvents
:[];

events.push({
  id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
  type:"interruption",
  category,
  host,
  originalUrl,
  mode,
  ...data,
  timestamp:new Date().toISOString()
});
return chrome.storage.local.set({
  protectionEvents:events.slice(-500)
});

});
}

function finishAndGoBack(after=null){
saveEvent({
action:“back”,
intensityBefore:initialUrge,
intensityAfter:after,
startedAt:timerStartedAt,
completedAt:new Date().toISOString()
});

history.back();
}

async function finishAndContinue(after=null){
saveEvent({
action:“continue”,
intensityBefore:initialUrge,
intensityAfter:after,
startedAt:timerStartedAt,
completedAt:new Date().toISOString()
});

try{
await chrome.runtime.sendMessage({
type:“allowOnce”,
host
});
}catch{}

if(originalUrl){
location.href=originalUrl;
return;
}

history.back();
}

function startTimer(){
updateTimer();

timer=setInterval(()=>{
if(seconds<=0){
clearInterval(timer);
return;
}

seconds--;
updateTimer();

},1000);
}

function showReassessment(){
if(reassessing)return;

reassessing=true;

$(“title”).textContent=“Check again.”;
$(“message”).textContent=
“Has the urge changed after the pause?”;

setPrompt(
“Rate the urge now. The decision is still yours.”
);

$(“interruptButton”).style.display=“none”;

$(“backButton”).textContent=“GO BACK”;
$(“continueButton”).textContent=“CONTINUE ANYWAY”;

const slider=$(“urgeSlider”);
const value=$(“urgeValue”);

slider.value=initialUrge;
value.textContent=initialUrge;

slider.addEventListener(“input”,()=>{
value.textContent=slider.value;
});

$(“backButton”).onclick=()=>{
finishAndGoBack(Number(slider.value));
};

$(“continueButton”).onclick=()=>{
finishAndContinue(Number(slider.value));
};
}

function interrupt(){
if(seconds>0){
setPrompt(
Take ${seconds} more second${seconds===1?"":"s"}. You don't have to act on the urge yet.
);
return;
}

showReassessment();
}

$(“urgeSlider”).addEventListener(“input”,()=>{
initialUrge=Number($(“urgeSlider”).value);
$(“urgeValue”).textContent=initialUrge;
});

$(“interruptButton”).addEventListener(
“click”,
interrupt
);

$(“backButton”).addEventListener(
“click”,
()=>{
if(reassessing){
finishAndGoBack(
Number($(“urgeSlider”).value)
);
return;
}

finishAndGoBack(null);

}
);

$(“continueButton”).addEventListener(
“click”,
()=>{
if(reassessing){
finishAndContinue(
Number($(“urgeSlider”).value)
);
return;
}

if(protection.allowContinue){
  finishAndContinue(null);
}

}
);

if(!protection.allowContinue){
$(“continueButton”).style.display=“none”;
}

startTimer();
