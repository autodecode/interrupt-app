(function(){

  const STORAGE_KEY = "interrupt_entitlement";

  const PLANS = { FREE:"free", PRO:"pro" };

  // Free = interrupt. Pro = understand what works for you.
  const FEATURES = {
    coreInterruption:       ["free","pro"],
    basicHistory:           ["free","pro"],
    basicInsights:          ["free","pro"],
    adaptiveInterventions: ["free","pro"],
    deepPatterns:           ["pro"],
    longTermInsights:       ["pro"],
    interventionProfiles:   ["pro"],
    advancedContext:        ["pro"],
    personalRecommendations:["pro"],
    customInterventions:    ["pro"]
  };

  const PLAN_INFO = {
    free: {
      name:"Free",
      price:null,
      interval:null,
      description:"Core interruption and basic personal insights."
    },
    pro: {
      name:"Pro",
      price:null,
      interval:null,
      description:"Deeper patterns, personalization and advanced insights."
    }
  };

  function read(){
    try{
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        plan: data.plan === PLANS.PRO ? PLANS.PRO : PLANS.FREE,
        source: data.source || "default",
        expiresAt: data.expiresAt || null,
        trial: data.trial === true,
        updatedAt: data.updatedAt || null
      };
    }catch(e){
      return {plan:PLANS.FREE,source:"default",expiresAt:null,trial:false,updatedAt:null};
    }
  }

  function save(data){
    try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); }catch(e){}
    return read();
  }

  function getPlan(){
    const data = read();
    if(data.expiresAt && Date.now() >= new Date(data.expiresAt).getTime()) return PLANS.FREE;
    return data.plan;
  }

  function isPro(){ return getPlan() === PLANS.PRO; }
  function isFree(){ return !isPro(); }

  function hasFeature(feature){
    return !!FEATURES[feature] && FEATURES[feature].includes(getPlan());
  }

  function getFeature(feature){
    if(!FEATURES[feature]) return null;
    return {
      key:feature,
      free:FEATURES[feature].includes(PLANS.FREE),
      pro:FEATURES[feature].includes(PLANS.PRO),
      available:hasFeature(feature)
    };
  }

  function getPlanInfo(){
    const data = read(), plan = getPlan();
    return {
      plan,
      ...PLAN_INFO[plan],
      source:data.source,
      trial:data.trial && plan === PLANS.PRO,
      expiresAt:data.expiresAt
    };
  }

  // Used later by the payment/backend layer.
  function activatePro(source="purchase",expiresAt=null,trial=false){
    return save({
      plan:PLANS.PRO,
      source,
      expiresAt,
      trial,
      updatedAt:new Date().toISOString()
    });
  }

  function activateFree(source="default"){
    return save({
      plan:PLANS.FREE,
      source,
      expiresAt:null,
      trial:false,
      updatedAt:new Date().toISOString()
    });
  }

  function startTrial(days=7){
    const expiresAt = new Date(Date.now()+days*86400000).toISOString();
    return activatePro("trial",expiresAt,true);
  }

  function clear(){
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
    return getPlanInfo();
  }

  // Development helpers. Replace with real entitlement validation later.
  window.INTERRUPT_ENTITLEMENTS = {
    PLANS,
    FEATURES,
    PLAN_INFO,
    getPlan,
    getPlanInfo,
    isPro,
    isFree,
    hasFeature,
    getFeature,
    activatePro,
    activateFree,
    startTrial,
    clear,
    debug:{
      setPro:()=>activatePro("debug"),
      setFree:()=>activateFree("debug"),
      trial:()=>startTrial(),
      reset:()=>clear()
    }
  };

})();
