const INTERRUPT_PROTECTION=(()=>{

const DEFAULT_SETTINGS={
enabled:true,
categories:{
gambling:true,
pornography:true,
socialMedia:true,
custom:true
},
mode:“medium”,
customDomains:[]
};

const MODES={
light:{
seconds:15,
allowContinue:true
},
medium:{
seconds:60,
allowContinue:true
},
strong:{
seconds:300,
allowContinue:false
}
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
  "pornhub.com",
  "xvideos.com",
  "xnxx.com",
  "xhamster.com",
  "redtube.com",
  "youporn.com",
  "spankbang.com",
  "onlyfans.com"
],
socialMedia:[
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

function normalizeDomain(domain){
return String(domain||””)
.toLowerCase()
.replace(/^https?:///,””)
.replace(/^www./,””)
.split(”/”)[0]
.split(”?”)[0]
.split(”#”)[0]
.replace(/.$/,””)
.trim();
}

function normalizeSettings(settings){
const source=settings||{};

return{
  ...DEFAULT_SETTINGS,
  ...source,
  categories:{
    ...DEFAULT_SETTINGS.categories,
    ...(source.categories||{})
  },
  customDomains:Array.isArray(source.customDomains)
    ?source.customDomains
      .map(normalizeDomain)
      .filter(Boolean)
    :[],
  mode:MODES[source.mode]
    ?source.mode
    :"medium"
};

}

function domainMatches(host,domain){
host=normalizeDomain(host);
domain=normalizeDomain(domain);

if(!host||!domain)return false;
return host===domain||host.endsWith(`.${domain}`);

}

function getCategory(host,settings){
const normalized=normalizeSettings(settings);

for(const category of Object.keys(DOMAINS)){
  if(!normalized.categories[category])continue;
  if(
    DOMAINS[category].some(
      domain=>domainMatches(host,domain)
    )
  ){
    return category;
  }
}
if(
  normalized.categories.custom&&
  normalized.customDomains.some(
    domain=>domainMatches(host,domain)
  )
){
  return "custom";
}
return null;

}

function inspectUrl(url,settings){
if(!url)return null;

let parsed;
try{
  parsed=new URL(url);
}catch{
  return null;
}
if(
  parsed.protocol!=="http:"&&
  parsed.protocol!=="https:"
){
  return null;
}
const normalizedSettings=normalizeSettings(settings);
if(!normalizedSettings.enabled)return null;
const host=normalizeDomain(parsed.hostname);
const category=getCategory(host,normalizedSettings);
if(!category)return null;
return{
  blocked:true,
  category,
  host,
  url:parsed.href,
  mode:normalizedSettings.mode,
  seconds:MODES[normalizedSettings.mode].seconds,
  allowContinue:MODES[normalizedSettings.mode].allowContinue
};

}

function createEvent(data={}){
const now=new Date().toISOString();

return{
  id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
  type:data.type||"protection",
  category:data.category||null,
  host:data.host||null,
  url:data.url||null,
  mode:data.mode||"medium",
  action:data.action||null,
  intensityBefore:
    typeof data.intensityBefore==="number"
      ?data.intensityBefore
      :null,
  intensityAfter:
    typeof data.intensityAfter==="number"
      ?data.intensityAfter
      :null,
  startedAt:data.startedAt||now,
  completedAt:data.completedAt||now,
  timestamp:now
};

}

function calculateReduction(intensityBefore,intensityAfter){
if(
typeof intensityBefore!==“number”||
typeof intensityAfter!==“number”
){
return null;
}

return intensityBefore-intensityAfter;

}

function isSuccessful(intensityBefore,intensityAfter){
const reduction=calculateReduction(
intensityBefore,
intensityAfter
);

return reduction!==null&&reduction>0;

}

function getMode(mode){
return MODES[mode]||MODES.medium;
}

function getDomains(category){
return Array.isArray(DOMAINS[category])
?[…DOMAINS[category]]
:[];
}

function addDomain(category,domain){
const normalized=normalizeDomain(domain);

if(!normalized)return false;
if(!DOMAINS[category]){
  DOMAINS[category]=[];
}
if(!DOMAINS[category].includes(normalized)){
  DOMAINS[category].push(normalized);
}
return true;

}

function removeDomain(category,domain){
if(!DOMAINS[category])return false;

const normalized=normalizeDomain(domain);
const index=DOMAINS[category].indexOf(normalized);
if(index===-1)return false;
DOMAINS[category].splice(index,1);
return true;

}

return{
DEFAULT_SETTINGS,
MODES,
DOMAINS,
normalizeDomain,
normalizeSettings,
domainMatches,
getCategory,
inspectUrl,
createEvent,
calculateReduction,
isSuccessful,
getMode,
getDomains,
addDomain,
removeDomain
};

})();
