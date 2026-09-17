const INTERRUPT_ADAPTIVE=(()=>{

function getIntensityBand(value){
const intensity=Number(value);
if(intensity<=3)return"low";
if(intensity<=6)return"moderate";
if(intensity<=8)return"high";
return"extreme";
}

function getRecencyWeight(item,now=Date.now()){
const timestamp=new Date(item?.completedAt||item?.startedAt||0).getTime();
if(!timestamp||Number.isNaN(timestamp))return 0.5;
const ageDays=Math.max(0,(now-timestamp)/86400000);
return Math.pow(0.5,ageDays/30);
}

function getContextWeight(item,context={}){
let weight=1;
let matches=0;

if(
context.behavior&&
context.behavior!=="other"&&
item.behavior===context.behavior
){
weight*=2;
matches++;
}

if(
context.expectation&&
context.expectation!=="unknown"&&
item.expectation===context.expectation
){
weight*=1.5;
matches++;
}

if(
context.intensityBefore!=null&&
getIntensityBand(item.intensityBefore)===
getIntensityBand(context.intensityBefore)
){
weight*=1.35;
matches++;
}

if(!matches)weight*=0.65;

return weight;
}

function buildStats(history,context={}){
const stats={};
if(!Array.isArray(history))return stats;

const now=Date.now();

history.forEach(item=>{
if(
!item||
!item.intervention||
typeof item.intensityBefore!=="number"||
typeof item.intensityAfter!=="number"
)return;

if(!stats[item.intervention]){
stats[item.intervention]={
uses:0,
totalImpact:0,
positive:0,
negative:0,
zero:0,
totalNegativeImpact:0,
weightedImpact:0,
weightedSuccess:0,
weightedUses:0,
contextWeight:0,
bestImpact:-Infinity,
worstImpact:Infinity,
last:null,
successful:[]
};
}

const stat=stats[item.intervention];
const impact=item.intensityBefore-item.intensityAfter;
const recency=getRecencyWeight(item,now);
const contextWeight=getContextWeight(item,context);
const weight=recency*contextWeight;

stat.uses++;
stat.totalImpact+=impact;
stat.weightedImpact+=impact*weight;
stat.weightedUses+=weight;
stat.contextWeight+=contextWeight;

if(impact>0){
stat.positive++;
stat.weightedSuccess+=weight;
stat.successful.push(item);
}

if(impact<0){
stat.negative++;
stat.totalNegativeImpact+=Math.abs(impact);
}

if(impact===0)stat.zero++;

stat.bestImpact=Math.max(stat.bestImpact,impact);
stat.worstImpact=Math.min(stat.worstImpact,impact);

if(
!stat.last||
new Date(item.completedAt||item.startedAt)>
new Date(stat.last.completedAt||stat.last.startedAt)
){
stat.last=item;
}
});

Object.values(stats).forEach(stat=>{
stat.averageImpact=stat.totalImpact/stat.uses;
stat.successRate=stat.positive/stat.uses;
stat.negativeRate=stat.negative/stat.uses;
stat.zeroRate=stat.zero/stat.uses;

stat.averageNegativeImpact=
stat.negative?
stat.totalNegativeImpact/stat.negative:0;

stat.recencyWeightedImpact=
stat.weightedUses?
stat.weightedImpact/stat.weightedUses:0;

stat.recencyWeightedSuccessRate=
stat.weightedUses?
stat.weightedSuccess/stat.weightedUses:0;

stat.recencyWeight=stat.weightedUses;

stat.confidence=
stat.uses>=5?"high":
stat.uses>=3?"moderate":
"emerging";

stat.reliability=
Math.min(1,stat.uses/5);

stat.contextRelevance=
stat.uses?
Math.min(1,stat.contextWeight/(stat.uses*2)):0;
});

return stats;
}

function matchesContext(item,context={},level){
const behavior=context.behavior;
const expectation=context.expectation;
const band=getIntensityBand(context.intensityBefore);

if(
level>=1&&
behavior&&
behavior!=="other"&&
item.behavior!==behavior
)return false;

if(
level>=2&&
expectation&&
expectation!=="unknown"&&
item.expectation&&
item.expectation!==expectation
)return false;

if(
level>=3&&
getIntensityBand(item.intensityBefore)!==band
)return false;

return true;
}

function getAdaptiveHistory(history,context={},level=3){
if(!Array.isArray(history))return[];
return history.filter(item=>matchesContext(item,context,level));
}

function getAdaptiveStats(history,context={}){
if(!Array.isArray(history))return{level:0,history:[],stats:{}};

const levels=[3,2,1,0];

for(const level of levels){
const adaptiveHistory=getAdaptiveHistory(history,context,level);

if(adaptiveHistory.length){
return{
level,
history:adaptiveHistory,
stats:buildStats(adaptiveHistory,context)
};
}
}

return{
level:0,
history:[],
stats:{}
};
}

function getLastSuccessful(history,context,intervention){
const adaptive=getAdaptiveStats(history,context);

const successful=adaptive.history
.filter(
item=>
item.intervention===intervention&&
item.intensityAfter<item.intensityBefore
)
.sort(
(a,b)=>
new Date(b.completedAt||b.startedAt)-
new Date(a.completedAt||a.startedAt)
);

return successful[0]||null;
}

function getRecommendation(history,context,intervention){
const adaptive=getAdaptiveStats(history,context);
const stat=adaptive.stats[intervention];

if(!stat)return null;

const successful=adaptive.history
.filter(
item=>
item.intervention===intervention&&
item.intensityAfter<item.intensityBefore
)
.sort(
(a,b)=>
new Date(b.completedAt||b.startedAt)-
new Date(a.completedAt||a.startedAt)
);

const last=successful[0]||stat.last;

if(!last)return null;

const reduction=last.intensityBefore-last.intensityAfter;

return{
intervention,
last,
reduction,
uses:stat.uses,
averageImpact:stat.averageImpact,
successRate:stat.successRate,
negativeRate:stat.negativeRate,
averageNegativeImpact:stat.averageNegativeImpact,
recencyWeightedImpact:stat.recencyWeightedImpact,
recencyWeightedSuccessRate:stat.recencyWeightedSuccessRate,
contextRelevance:stat.contextRelevance,
reliability:stat.reliability,
confidence:stat.confidence,
level:adaptive.level
};
}

function scoreIntervention(intervention,stats={},preferredOrder=[],intensity=5){
let score=0;

const preferredIndex=preferredOrder.indexOf(intervention);

if(preferredIndex!==-1){
score+=(preferredOrder.length-preferredIndex)*3;
}

const stat=stats[intervention];

if(stat){

score+=stat.averageImpact*2;
score+=stat.recencyWeightedImpact*7;

score+=stat.successRate*2;
score+=stat.recencyWeightedSuccessRate*5;

score+=Math.min(stat.uses,5);

score*=0.65+(stat.reliability*0.35);

if(stat.contextRelevance>=0.75)score+=2;
else if(stat.contextRelevance>=0.5)score+=1;

if(stat.averageImpact>0)score+=stat.averageImpact;

if(stat.successRate>=.75)score+=3;

if(stat.successRate>=.5&&stat.uses>=3)score+=2;

if(stat.uses>=3){

score-=stat.negativeRate*5;

if(stat.negativeRate>=.5)score-=4;

if(stat.averageImpact<0){
score+=stat.averageImpact*2;
}

if(stat.recencyWeightedImpact<0){
score+=stat.recencyWeightedImpact*3;
}
}

if(
stat.uses>=5&&
stat.successRate>=.7
){
score+=2;
}

if(
stat.uses>=5&&
stat.recencyWeightedSuccessRate>=.7
){
score+=3;
}

if(stat.uses===0)score+=2.5;
else if(stat.uses===1)score+=1.5;
else if(stat.uses===2)score+=0.75;

}else{
score+=2.5;
}

if(
intensity>=8&&
["delay","fastForward","realityCheck","changeScene"].includes(intervention)
){
score+=2;
}

if(
intensity<=3&&
["nameIt","wave","actualNeed"].includes(intervention)
){
score+=1;
}

return score;
}


/* -------------------------------------------------
   INTERVENTION PROFILES
------------------------------------------------- */

function getInterventionProfiles(
history,
context={},
interventions=[]
){
const adaptive=getAdaptiveStats(history,context);
const stats=adaptive.stats;
const names=interventions.length
?interventions
:Object.keys(stats);

return names.map(intervention=>{
const stat=stats[intervention];

if(!stat){
return{
intervention,
uses:0,
averageImpact:0,
successRate:0,
negativeRate:0,
zeroRate:0,
recencyWeightedImpact:0,
recencyWeightedSuccessRate:0,
contextRelevance:0,
reliability:0,
confidence:"emerging",
bestImpact:null,
worstImpact:null,
last:null,
lastSuccessful:null,
score:scoreIntervention(
intervention,
stats,
[],
context.intensityBefore??5
)
};
}

const successful=adaptive.history
.filter(
item=>
item.intervention===intervention&&
item.intensityAfter<item.intensityBefore
)
.sort(
(a,b)=>
new Date(b.completedAt||b.startedAt)-
new Date(a.completedAt||a.startedAt)
);

return{
intervention,
uses:stat.uses,
averageImpact:stat.averageImpact,
successRate:stat.successRate,
negativeRate:stat.negativeRate,
zeroRate:stat.zeroRate,
averageNegativeImpact:stat.averageNegativeImpact,
recencyWeightedImpact:stat.recencyWeightedImpact,
recencyWeightedSuccessRate:stat.recencyWeightedSuccessRate,
contextRelevance:stat.contextRelevance,
reliability:stat.reliability,
confidence:stat.confidence,
bestImpact:stat.bestImpact,
worstImpact:stat.worstImpact,
last:stat.last,
lastSuccessful:successful[0]||null,
score:scoreIntervention(
intervention,
stats,
[],
context.intensityBefore??5
)
};
});
}


/* -------------------------------------------------
   CONTEXT PATTERNS
------------------------------------------------- */

function getContextPatterns(history,minUses=2){
if(!Array.isArray(history))return[];

const groups={};

history.forEach(item=>{
if(
!item||
!item.intervention||
typeof item.intensityBefore!=="number"||
typeof item.intensityAfter!=="number"
)return;

const behavior=item.behavior||"other";
const expectation=item.expectation||"unknown";
const intensityBand=getIntensityBand(item.intensityBefore);

const key=[
behavior,
expectation,
intensityBand
].join("|");

if(!groups[key]){
groups[key]={
behavior,
expectation,
intensityBand,
uses:0,
totalImpact:0,
positive:0,
negative:0,
interventions:{},
last:null
};
}

const group=groups[key];
const impact=item.intensityBefore-item.intensityAfter;

group.uses++;
group.totalImpact+=impact;

if(impact>0)group.positive++;
if(impact<0)group.negative++;

if(!group.interventions[item.intervention]){
group.interventions[item.intervention]={
uses:0,
totalImpact:0,
positive:0
};
}

const intervention=group.interventions[item.intervention];

intervention.uses++;
intervention.totalImpact+=impact;

if(impact>0)intervention.positive++;

if(
!group.last||
new Date(item.completedAt||item.startedAt)>
new Date(group.last.completedAt||group.last.startedAt)
){
group.last=item;
}
});

return Object.values(groups)
.filter(group=>group.uses>=minUses)
.map(group=>{
const interventions=Object.entries(group.interventions)
.map(([intervention,data])=>({
intervention,
uses:data.uses,
averageImpact:data.totalImpact/data.uses,
successRate:data.positive/data.uses
}))
.sort((a,b)=>{
if(b.averageImpact!==a.averageImpact){
return b.averageImpact-a.averageImpact;
}
return b.uses-a.uses;
});

const best=interventions[0]||null;

return{
behavior:group.behavior,
expectation:group.expectation,
intensityBand:group.intensityBand,
uses:group.uses,
averageImpact:group.totalImpact/group.uses,
successRate:group.positive/group.uses,
negativeRate:group.negative/group.uses,
bestIntervention:best,
interventions,
last:group.last
};
})
.sort((a,b)=>{
if(b.averageImpact!==a.averageImpact){
return b.averageImpact-a.averageImpact;
}
return b.uses-a.uses;
});
}


/* -------------------------------------------------
   BEST INTERVENTION
------------------------------------------------- */

function getBestIntervention(
history,
context={},
preferredOrder=[],
interventions=[]
){
const adaptive=getAdaptiveStats(history,context);

if(!adaptive.history.length){
return null;
}

const names=interventions.length
?interventions
:Object.keys(adaptive.stats);

const scored=names.map(intervention=>({
intervention,
score:scoreIntervention(
intervention,
adaptive.stats,
preferredOrder,
context.intensityBefore??5
),
stats:adaptive.stats[intervention]||null
}))
.sort((a,b)=>b.score-a.score);

if(!scored.length)return null;

const best=scored[0];
const stat=best.stats;

return{
intervention:best.intervention,
score:best.score,
uses:stat?.uses||0,
averageImpact:stat?.averageImpact||0,
successRate:stat?.successRate||0,
recencyWeightedImpact:stat?.recencyWeightedImpact||0,
recencyWeightedSuccessRate:stat?.recencyWeightedSuccessRate||0,
contextRelevance:stat?.contextRelevance||0,
reliability:stat?.reliability||0,
confidence:stat?.confidence||"emerging",
level:adaptive.level,
last:stat?.last||null,
lastSuccessful:stat?.successful?.length
?stat.successful
.sort(
(a,b)=>
new Date(b.completedAt||b.startedAt)-
new Date(a.completedAt||a.startedAt)
)[0]
:null
};
}


/* -------------------------------------------------
   EXPLAINABLE SUMMARY
------------------------------------------------- */

function getLearningSummary(history,context={},interventions=[]){
const adaptive=getAdaptiveStats(history,context);

const profiles=getInterventionProfiles(
history,
context,
interventions
);

const tested=profiles.filter(item=>item.uses>0);
const successful=tested
.filter(item=>item.successRate>0)
.sort((a,b)=>{
if(b.score!==a.score)return b.score-a.score;
return b.averageImpact-a.averageImpact;
});

const patterns=getContextPatterns(
adaptive.history,
2
);

return{
level:adaptive.level,
sampleSize:adaptive.history.length,
profiles,
patterns,
testedCount:tested.length,
successfulCount:successful.length,
best:successful[0]||null
};
}


return{
getIntensityBand,
getRecencyWeight,
getContextWeight,
buildStats,
matchesContext,
getAdaptiveHistory,
getAdaptiveStats,
getLastSuccessful,
getRecommendation,
scoreIntervention,
getInterventionProfiles,
getContextPatterns,
getBestIntervention,
getLearningSummary
};

})();
