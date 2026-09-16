const INTERRUPT_STORAGE=(()=>{

const KEYS={
sessions:“interrupt_sessions”,
events:“interrupt_events”
};

const MAX_SESSIONS=500;
const MAX_EVENTS=500;

function read(key,fallback=[]){
try{
const raw=
localStorage.getItem(key);

  if(!raw)return fallback;
  const value=
    JSON.parse(raw);
  return value;
}catch(error){
  console.warn(
    "INTERRUPT storage read failed:",
    key,
    error
  );
  return fallback;
}

}

function write(key,value){
try{
localStorage.setItem(
key,
JSON.stringify(value)
);

  return true;
}catch(error){
  console.warn(
    "INTERRUPT storage write failed:",
    key,
    error
  );
  return false;
}

}

function remove(key){
try{
localStorage.removeItem(key);
return true;
}catch(error){
console.warn(
“INTERRUPT storage remove failed:”,
key,
error
);

  return false;
}

}

function getSessions(){
const sessions=
read(KEYS.sessions,[]);

return Array.isArray(sessions)
  ?sessions.slice(-MAX_SESSIONS)
  :[];

}

function saveSessions(sessions){
if(!Array.isArray(sessions)){
return false;
}

return write(
  KEYS.sessions,
  sessions.slice(-MAX_SESSIONS)
);

}

function appendSession(session){
const sessions=
getSessions();

sessions.push(session);
return saveSessions(sessions);

}

function getEvents(){
const events=
read(KEYS.events,[]);

return Array.isArray(events)
  ?events.slice(-MAX_EVENTS)
  :[];

}

function saveEvents(events){
if(!Array.isArray(events)){
return false;
}

return write(
  KEYS.events,
  events.slice(-MAX_EVENTS)
);

}

function appendEvent(event){
const events=
getEvents();

events.push(event);
return saveEvents(events);

}

function clearSessions(){
return remove(KEYS.sessions);
}

function clearEvents(){
return remove(KEYS.events);
}

function clearAll(){
const sessions=
clearSessions();

const events=
  clearEvents();
return sessions&&events;

}

return{
KEYS,
MAX_SESSIONS,
MAX_EVENTS,

read,
write,
remove,
getSessions,
saveSessions,
appendSession,
clearSessions,
getEvents,
saveEvents,
appendEvent,
clearEvents,
clearAll

};

})();
