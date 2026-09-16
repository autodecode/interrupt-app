const INTERRUPT_EVENTS=(()=>{

const MAX_EVENTS=500;

function create(data={}){
const now=new Date().toISOString();
return{
id:data.id||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
type:data.type||"protection",
source:data.source||"protection",
category:data.category||null,
host:data.host||null,
url:data.url||null,
mode:data.mode||null,
action:data.action||null,
intervention:data.intervention||null,
intensityBefore:typeof data.intensityBefore==="number"?data.intensityBefore:null,
intensityAfter:typeof data.intensityAfter==="number"?data.intensityAfter:null,
startedAt:data.startedAt||now,
completedAt:data.completedAt||now,
timestamp:data.timestamp||now
};
}

function reduction(event){
if(typeof event?.intensityBefore!=="number"||typeof event?.intensityAfter!=="number")return null;
return event.intensityBefore-event.intensityAfter;
}

function isSuccessful(event){
const value=reduction(event);
return value!==null&&value>0;
}

function normalize(events){
if(!Array.isArray(events))return[];
return events.filter(Boolean).map(create).slice(-MAX_EVENTS);
}

function append(events,event){
return[...normalize(events),create(event)].slice(-MAX_EVENTS);
}

function filter(events,criteria={}){
return normalize(events).filter(event=>{
if(criteria.type&&event.type!==criteria.type)return false;
if(criteria.source&&event.source!==criteria.source)return false;
if(criteria.category&&event.category!==criteria.category)return false;
if(criteria.host&&event.host!==criteria.host)return false;
if(criteria.intervention&&event.intervention!==criteria.intervention)return false;
return true;
});
}

function latest(events,criteria={}){
const list=filter(events,criteria);
return list.length?list[list.length-1]:null;
}

function successful(events,criteria={}){
return filter(events,criteria).filter(isSuccessful);
}

function failed(events,criteria={}){
return filter(events,criteria).filter(event=>{
const value=reduction(event);
return value!==null&&value<=0;
});
}

return{
MAX_EVENTS,
create,
reduction,
isSuccessful,
normalize,
append,
filter,
latest,
successful,
failed
};

})();
