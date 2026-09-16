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
const pendingBlocks=new Map();
const allowedOnce=new Map();

function normalizeDomain(domain){
return String(domain||””)
.toLowerCase()
.replace(/^www./,””)
.trim()
.replace(/.$/,””);
}

function domainMatches(host,domain){
host=normalizeDomain(host);
domain=normalizeDomain(domain);

if(!host||!domain)return false;

return host===domain||host.endsWith(.${domain});
}

function normalizeSettings(settings){
return{
…DEFAULT_SETTINGS,
…(settings||{}),
categories:{
…DEFAULT_SETTINGS.categories,
…(settings?.categories||{})
},
customDomains:Array.isArray(settings?.customDomains)
?settings.customDomains
.map(normalizeDomain)
.filter(Boolean)
:[],
mode:[“light”,“medium”,“strong”].includes(settings?.mode)
?settings.mode
:“medium”
};
}

async function getSettings(){
const result=await chrome.storage.local.get(“settings”);
const settings=normalizeSettings(result.settings);

if(!result.settings){
await chrome.storage.local.set({settings});
}

return settings;
}

function parseUrl(url){
try{
const parsed=new URL(url);

if(!["http:","https:"].includes(parsed.protocol))return null;
return parsed;

}catch{
return null;
}
}

function isBlockPage(url){
return String(url||””).startsWith(BLOCK_PAGE);
}

function getCategory(host,settings){
for(const category of Object.keys(DOMAINS)){
if(!settings.categories[category])continue;

if(DOMAINS[category].some(domain=>domainMatches(host,domain))){
  return category;
}

}

if(
settings.customDomains.some(domain=>domainMatches(host,domain))
){
return “custom”;
}

return null;
}

function getAllowKey(tabId,host){
return ${tabId}:${normalizeDomain(host)};
}

function hasAllowedOnce(tabId,host){
const key=getAllowKey(tabId,host);
const expires=allowedOnce.get(key);

if(!expires)return false;

if(Date.now()>expires){
allowedOnce.delete(key);
return false;
}

return true;
}

function allowOnce(tabId,host){
allowedOnce.set(
getAllowKey(tabId,host),
Date.now()+5601000
);
}

function clearTabState(tabId){
pendingBlocks.delete(tabId);

for(const key of allowedOnce.keys()){
if(key.startsWith(${tabId}:)){
allowedOnce.delete(key);
}
}
}

async function checkUrl(url,tabId=null){
const settings=await getSettings();

if(!settings.enabled)return null;

if(!url||isBlockPage(url))return null;

const parsed=parseUrl(url);

if(!parsed)return null;

const host=normalizeDomain(parsed.hostname);
const category=getCategory(host,settings);

if(!category)return null;

if(tabId!==null&&hasAllowedOnce(tabId,host)){
return null;
}

return{
category,
host,
url:parsed.href,
mode:settings.mode
};
}

async function recordBlock(data){
const result=await chrome.storage.local.get(“protectionEvents”);
const events=Array.isArray(result.protectionEvents)
?result.protectionEvents
:[];

events.push({
id:${Date.now()}-${Math.random().toString(36).slice(2,8)},
type:“blocked”,
…data,
timestamp:new Date().toISOString()
});

await chrome.storage.local.set({
protectionEvents:events.slice(-500)
});
}

async function redirectToBlockPage(tabId,result){
const existing=pendingBlocks.get(tabId);

if(
existing&&
existing.url===result.url
){
return;
}

pendingBlocks.set(tabId,{
url:result.url,
host:result.host,
category:result.category,
timestamp:Date.now()
});

const target=
${BLOCK_PAGE}?category=${encodeURIComponent(result.category)}+
&host=${encodeURIComponent(result.host)}+
&url=${encodeURIComponent(result.url)}+
&mode=${encodeURIComponent(result.mode)};

await recordBlock({
category:result.category,
host:result.host,
originalUrl:result.url,
mode:result.mode,
tabId
});

try{
await chrome.tabs.update(tabId,{url:target});
}catch{
pendingBlocks.delete(tabId);
}
}

async function handleNavigation(details){
if(details.frameId!==0)return;

const tabId=details.tabId;

if(tabId<0)return;

if(isBlockPage(details.url)){
pendingBlocks.delete(tabId);
return;
}

const result=await checkUrl(details.url,tabId);

if(!result)return;

await redirectToBlockPage(tabId,result);
}

chrome.webNavigation.onBeforeNavigate.addListener(
handleNavigation,
{
url:[
{schemes:[“http”,“https”]}
]
}
);

chrome.tabs.onRemoved.addListener(tabId=>{
clearTabState(tabId);
});

chrome.tabs.onUpdated.addListener((tabId,changeInfo)=>{
if(changeInfo.status===“loading”&&changeInfo.url){
const pending=pendingBlocks.get(tabId);

if(
  pending&&
  changeInfo.url!==pending.url&&
  !isBlockPage(changeInfo.url)
){
  pendingBlocks.delete(tabId);
}

}
});

chrome.runtime.onMessage.addListener(
(message,sender,sendResponse)=>{
if(message?.type===“getSettings”){
getSettings().then(sendResponse);
return true;
}

if(message?.type==="setSettings"){
  getSettings().then(async current=>{
    const settings=normalizeSettings({
      ...current,
      ...(message.settings||{}),
      categories:{
        ...current.categories,
        ...(message.settings?.categories||{})
      }
    });
    await chrome.storage.local.set({settings});
    sendResponse({
      ok:true,
      settings
    });
  });
  return true;
}
if(message?.type==="checkUrl"){
  const tabId=sender.tab?.id??null;
  checkUrl(message.url,tabId).then(sendResponse);
  return true;
}
if(message?.type==="allowOnce"){
  const tabId=sender.tab?.id;
  if(typeof tabId==="number"&&message.host){
    allowOnce(tabId,message.host);
  }
  sendResponse({ok:true});
  return false;
}
if(message?.type==="getProtectionEvents"){
  chrome.storage.local
    .get("protectionEvents")
    .then(result=>{
      sendResponse({
        events:Array.isArray(result.protectionEvents)
          ?result.protectionEvents
          :[]
      });
    });
  return true;
}
if(message?.type==="clearProtectionEvents"){
  chrome.storage.local
    .set({protectionEvents:[]})
    .then(()=>sendResponse({ok:true}));
  return true;
}

}
);

chrome.runtime.onInstalled.addListener(async()=>{
const result=await chrome.storage.local.get([
“settings”,
“protectionEvents”
]);

if(!result.settings){
await chrome.storage.local.set({
settings:DEFAULT_SETTINGS
});
}

if(!Array.isArray(result.protectionEvents)){
await chrome.storage.local.set({
protectionEvents:[]
});
}
});
