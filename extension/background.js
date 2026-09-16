const DEFAULT_SETTINGS={
enabled:true,
categories:{
gambling:true,
pornography:true,
socialMedia:true
},
mode:“medium”,
customDomains:[]
};

const DOMAINS={
gambling:[
“bet365.com”,
“betfair.com”,
“pokerstars.com”,
“williamhill.com”,
“888.com”,
“betway.com”,
“bwin.com”,
“unibet.com”,
“draftkings.com”,
“fanduel.com”
],
pornography:[
“pornhub.com”,
“xvideos.com”,
“xnxx.com”,
“xhamster.com”,
“redtube.com”,
“youporn.com”,
“spankbang.com”,
“onlyfans.com”
],
socialMedia:[
“facebook.com”,
“instagram.com”,
“tiktok.com”,
“x.com”,
“twitter.com”,
“reddit.com”,
“snapchat.com”,
“pinterest.com”,
“threads.net”
]
};

const BLOCK_PAGE=chrome.runtime.getURL(“blocked.html”);

async function getSettings(){
const saved=await chrome.storage.local.get(“settings”);
return {
…DEFAULT_SETTINGS,
…saved.settings,
categories:{
…DEFAULT_SETTINGS.categories,
…(saved.settings?.categories||{})
},
customDomains:Array.isArray(saved.settings?.customDomains)?saved.settings.customDomains:[]
};
}

function normalizeDomain(domain){
return String(domain||””)
.toLowerCase()
.replace(/^www./,””)
.trim();
}

function domainMatches(host,domain){
host=normalizeDomain(host);
domain=normalizeDomain(domain);
return host===domain||host.endsWith(.${domain});
}

function getCategory(host,settings){
for(const category of Object.keys(DOMAINS)){
if(!settings.categories[category])continue;
if(DOMAINS[category].some(domain=>domainMatches(host,domain)))return category;
}

if(settings.customDomains.some(domain=>domainMatches(host,domain)))return “custom”;

return null;
}

function isProtectionPage(url){
return String(url||””).startsWith(BLOCK_PAGE);
}

async function shouldBlock(url){
const settings=await getSettings();

if(!settings.enabled)return null;
if(!url||isProtectionPage(url))return null;

let parsed;
try{
parsed=new URL(url);
}catch{
return null;
}

if(![“http:”,“https:”].includes(parsed.protocol))return null;

const category=getCategory(parsed.hostname,settings);
if(!category)return null;

return {
category,
host:normalizeDomain(parsed.hostname),
url,
mode:settings.mode
};
}

async function blockTab(tabId,url){
const result=await shouldBlock(url);
if(!result)return;

const target=${BLOCK_PAGE}?category=${encodeURIComponent(result.category)}&host=${encodeURIComponent(result.host)}&url=${encodeURIComponent(result.url)}&mode=${encodeURIComponent(result.mode)};

try{
await chrome.tabs.update(tabId,{url:target});
}catch{}
}

chrome.webNavigation.onBeforeNavigate.addListener(
details=>{
if(details.frameId!==0)return;
blockTab(details.tabId,details.url);
},
{url:[{schemes:[“http”,“https”]}]}
);

chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
if(message?.type===“getSettings”){
getSettings().then(sendResponse);
return true;
}

if(message?.type===“setSettings”){
chrome.storage.local.set({
settings:{
…DEFAULT_SETTINGS,
…(message.settings||{}),
categories:{
…DEFAULT_SETTINGS.categories,
…(message.settings?.categories||{})
}
}
}).then(()=>sendResponse({ok:true}));
return true;
}

if(message?.type===“checkUrl”){
shouldBlock(message.url).then(result=>sendResponse(result));
return true;
}
});

chrome.runtime.onInstalled.addListener(async()=>{
const existing=await chrome.storage.local.get(“settings”);

if(!existing.settings){
await chrome.storage.local.set({
settings:DEFAULT_SETTINGS
});
}
});
