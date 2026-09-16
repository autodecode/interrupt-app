(() => {
let lastUrl=location.href;

function checkUrl(){
const url=location.href;

if(url===lastUrl)return;
lastUrl=url;
chrome.runtime.sendMessage({
  type:"checkUrl",
  url
}).then(result=>{
  if(!result)return;
  const target=chrome.runtime.getURL(
    `blocked.html?category=${encodeURIComponent(result.category)}&host=${encodeURIComponent(result.host)}&url=${encodeURIComponent(result.url)}&mode=${encodeURIComponent(result.mode)}`
  );
  if(location.href!==target){
    location.replace(target);
  }
}).catch(()=>{});

}

const originalPushState=history.pushState;
const originalReplaceState=history.replaceState;

history.pushState=function(…args){
const result=originalPushState.apply(this,args);
checkUrl();
return result;
};

history.replaceState=function(…args){
const result=originalReplaceState.apply(this,args);
checkUrl();
return result;
};

window.addEventListener(“popstate”,checkUrl);
window.addEventListener(“hashchange”,checkUrl);

setInterval(checkUrl,1000);
})();
