const INTERRUPT_ADAPTIVE=(()=>{
  function getIntensityBand(value){
    const intensity=Number(value);
    if(intensity<=3)return"low";
    if(intensity<=6)return"moderate";
    if(intensity<=8)return"high";
    return"extreme";
  }
  function buildStats(history){
    const stats={};
    if(!Array.isArray(history))return stats;
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
          bestImpact:-Infinity,
          worstImpact:Infinity,
          last:null,
          successful:[]
        };
      }
      const stat=stats[item.intervention];
      const impact=
        item.intensityBefore-
        item.intensityAfter;
      stat.uses++;
      stat.totalImpact+=impact;
      if(impact>0){
        stat.positive++;
      }
      stat.bestImpact=Math.max(
        stat.bestImpact,
        impact
      );
      stat.worstImpact=Math.min(
        stat.worstImpact,
        impact
      );
      if(
        !stat.last||
        new Date(
          item.completedAt||item.startedAt
        )>
        new Date(
          stat.last.completedAt||
          stat.last.startedAt
        )
      ){
        stat.last=item;
      }
      if(impact>0){
        stat.successful.push(item);
      }
    });
    Object.values(stats).forEach(stat=>{
      stat.averageImpact=
        stat.totalImpact/stat.uses;
      stat.successRate=
        stat.positive/stat.uses;
      stat.confidence=
        stat.uses>=5
          ?"high"
          :stat.uses>=3
            ?"moderate"
            :"emerging";
    });
    return stats;
  }
  function matchesContext(item,context={},level){
    const behavior=context.behavior;
    const expectation=context.expectation;
    const band=
      getIntensityBand(
        context.intensityBefore
      );
    if(
      level>=1&&
      behavior&&
      behavior!=="other"&&
      item.behavior!==behavior
    ){
      return false;
    }
    if(
      level>=2&&
      expectation&&
      expectation!=="unknown"&&
      item.expectation&&
      item.expectation!==expectation
    ){
      return false;
    }
    if(
      level>=3&&
      getIntensityBand(
        item.intensityBefore
      )!==band
    ){
      return false;
    }
    return true;
  }
  function getAdaptiveHistory(
    history,
    context={},
    level=3
  ){
    if(!Array.isArray(history))return[];
    return history.filter(
      item=>matchesContext(
        item,
        context,
        level
      )
    );
  }
  function getAdaptiveStats(
    history,
    context={}
  ){
    const levels=[3,2,1,0];
    for(const level of levels){
      const adaptiveHistory=
        getAdaptiveHistory(
          history,
          context,
          level
        );
      if(adaptiveHistory.length){
        return{
          level,
          history:adaptiveHistory,
          stats:buildStats(adaptiveHistory)
        };
      }
    }
    return{
      level:0,
      history:[],
      stats:{}
    };
  }
  function getLastSuccessful(
    history,
    context,
    intervention
  ){
    const adaptive=
      getAdaptiveStats(
        history,
        context
      );
    const successful=
      adaptive.history
        .filter(item=>
          item.intervention===intervention&&
          item.intensityAfter<
          item.intensityBefore
        )
        .sort(
          (a,b)=>
            new Date(
              b.completedAt||
              b.startedAt
            )-
            new Date(
              a.completedAt||
              a.startedAt
            )
        );
    return successful[0]||null;
  }
  function getRecommendation(
    history,
    context,
    intervention
  ){
    const adaptive=
      getAdaptiveStats(
        history,
        context
      );
    const stat=
      adaptive.stats[intervention];
    if(!stat)return null;
    const successful=
      adaptive.history
        .filter(item=>
          item.intervention===intervention&&
          item.intensityAfter<
          item.intensityBefore
        )
        .sort(
          (a,b)=>
            new Date(
              b.completedAt||
              b.startedAt
            )-
            new Date(
              a.completedAt||
              a.startedAt
            )
        );
    const last=
      successful[0]||
      stat.last;
    if(!last)return null;
    const reduction=
      last.intensityBefore-
      last.intensityAfter;
    return{
      intervention,
      last,
      reduction,
      uses:stat.uses,
      averageImpact:stat.averageImpact,
      successRate:stat.successRate,
      confidence:stat.confidence,
      level:adaptive.level
    };
  }
  function scoreIntervention(
    intervention,
    stats={},
    preferredOrder=[],
    intensity=5
  ){
    let score=0;
    const preferredIndex=
      preferredOrder.indexOf(
        intervention
      );
    if(preferredIndex!==-1){
      score+=(
        preferredOrder.length-
        preferredIndex
      )*3;
    }
    if(stats[intervention]){
      const stat=
        stats[intervention];
      score+=
        stat.averageImpact*5;
      score+=
        stat.successRate*4;
      score+=
        Math.min(
          stat.uses,
          5
        );
      if(stat.averageImpact<=0){
        score-=3;
      }
      if(stat.successRate>=.75){
        score+=3;
      }
      if(
        stat.successRate>=.5&&
        stat.uses>=3
      ){
        score+=2;
      }
    }
    if(
      intensity>=8&&
      [
        "delay",
        "fastForward",
        "realityCheck",
        "changeScene"
      ].includes(intervention)
    ){
      score+=2;
    }
    if(
      intensity<=3&&
      [
        "nameIt",
        "wave",
        "actualNeed"
      ].includes(intervention)
    ){
      score+=1;
    }
    return score;
  }
  return{
    getIntensityBand,
    buildStats,
    matchesContext,
    getAdaptiveHistory,
    getAdaptiveStats,
    getLastSuccessful,
    getRecommendation,
    scoreIntervention
  };
})();
