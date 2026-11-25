'use strict';
/* Everything that differs between the Android app, the iPhone home screen app and a desktop browser. */
const IS_NATIVE=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
const IS_IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const nativePlugin=(()=>{const cache={};return n=>cache[n]||(cache[n]=window.Capacitor.registerPlugin(n));})();

const blobBase64=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onloadend=()=>res(String(r.result).split(',')[1]||'');r.onerror=()=>rej(r.error);r.readAsDataURL(blob);});
function linkDownload(filename,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}

/* Android: write to the app cache, then open the share sheet (Drive, Files, email...) */
async function nativeSave(filename,blob){
  const out=await nativePlugin('Filesystem').writeFile({path:filename,data:await blobBase64(blob),directory:'CACHE'});
  await nativePlugin('Share').share({title:filename,url:out.uri,dialogTitle:'Save or share '+filename});
}
const cancelled=e=>!!e&&(e.name==='AbortError'||/cancel/i.test(String(e.message||e)));

/* Android hardware back: close what is on top, then go Home, then leave the app */
if(IS_NATIVE){
  nativePlugin('App').addListener('backButton',async()=>{
    const modal=document.getElementById('modal'),dice=document.getElementById('dice');
    if(dice.classList.contains('on')){dice.click();return;}
    if(modal.classList.contains('on')){const b=modal.querySelector('[data-m="no"]')||modal.querySelector('[data-m]');if(b)b.click();return;}
    if(APP.shot){APP.shot=false;render();return;}
    if(APP.view!=='home'){APP.view='home';APP.teamId=null;APP.histYear=null;render();window.scrollTo(0,0);return;}
    try{await flush();}finally{nativePlugin('App').exitApp();}
  });
}

/* offline support for the web versions (the Android app already ships its files) */
if(!IS_NATIVE&&'serviceWorker' in navigator&&window.isSecureContext)
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
/* ask the browser not to clear saved universes when storage runs low */
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&typeof APP!=='undefined'&&APP.U)flush();});
