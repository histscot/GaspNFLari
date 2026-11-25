'use strict';
/* ============================== DEFAULT NFL ============================== */
const NFL=[
['AFC','East','Buffalo Bills|BUF|#00338d;Miami Dolphins|MIA|#008e97;New England Patriots|NE|#0c2d5e;New York Jets|NYJ|#125740'],
['AFC','North','Baltimore Ravens|BAL|#4b2a91;Cincinnati Bengals|CIN|#fb4f14;Cleveland Browns|CLE|#a5491a;Pittsburgh Steelers|PIT|#e3a410'],
['AFC','South','Houston Texans|HOU|#a71930;Indianapolis Colts|IND|#00417e;Jacksonville Jaguars|JAX|#00778b;Tennessee Titans|TEN|#4b92db'],
['AFC','West','Denver Broncos|DEN|#fb4f14;Kansas City Chiefs|KC|#e31837;Las Vegas Raiders|LV|#6b7075;Los Angeles Chargers|LAC|#0080c6'],
['NFC','East','Dallas Cowboys|DAL|#1d4f91;New York Giants|NYG|#0b2f7a;Philadelphia Eagles|PHI|#00605a;Washington Commanders|WAS|#7a1f2f'],
['NFC','North','Chicago Bears|CHI|#c85a17;Detroit Lions|DET|#0076b6;Green Bay Packers|GB|#24553a;Minnesota Vikings|MIN|#5b2d8c'],
['NFC','South','Atlanta Falcons|ATL|#a71930;Carolina Panthers|CAR|#0085ca;New Orleans Saints|NO|#9f8958;Tampa Bay Buccaneers|TB|#d50a0a'],
['NFC','West','Arizona Cardinals|ARI|#97233f;Los Angeles Rams|LAR|#1f4fb0;San Francisco 49ers|SF|#aa0000;Seattle Seahawks|SEA|#3f7d20']];
const defaultRules=()=>({ties:true,useOT:true,format:'nfl',games:17,divEach:2,confEach:1,playoffTeams:7,neutralTitle:false});
function nflSetup(){
  const confs=[{id:'conf_afc',name:'AFC',logo:null},{id:'conf_nfc',name:'NFC',logo:null}],divs=[],teams=[];
  NFL.forEach(([c,d,list],i)=>{const cid=c==='AFC'?'conf_afc':'conf_nfc',did='div_'+i;divs.push({id:did,confId:cid,name:d});
    list.split(';').forEach(s=>{const [name,abbr,color]=s.split('|');teams.push({id:'tm_'+abbr.toLowerCase(),name,abbr,color,logo:null,divId:did,off:20,def:0,hfa:3,rivalId:null,active:true,joined:null});});});
  return {leagueName:'NFL',startYear:2026,titleName:'Super Bowl',titleNumber:61,leagueLogo:null,trophyLogo:null,rules:defaultRules(),confs,divs,teams};
}
function customSetup(o){
  const confs=[],divs=[],teams=[],palette=['#1d4f91','#a71930','#24553a','#c85a17','#4b2a91','#00778b','#e3a410','#6b7075','#7a1f2f','#0085ca'];
  const dn=['East','North','South','West','Central','Coastal','Mountain','Pacific'];let n=0;
  o.confNames.forEach((cn,ci)=>{const c={id:uid('conf'),name:cn,logo:null};confs.push(c);
    for(let d=0;d<o.divsPer;d++){const v={id:uid('div'),confId:c.id,name:dn[d%dn.length]};divs.push(v);
      for(let k=0;k<o.teamsPer;k++){n++;teams.push({id:uid('tm'),name:'Team '+n,abbr:'T'+n,color:palette[n%palette.length],logo:null,divId:v.id,off:20,def:0,hfa:3,rivalId:null,active:true,joined:null});}}});
  const nflish=confs.length===2&&o.divsPer===4&&o.teamsPer===4;
  const per=o.divsPer*o.teamsPer;
  return {leagueName:o.name,startYear:o.year,titleName:o.title||'League Championship',titleNumber:1,leagueLogo:null,trophyLogo:null,
    rules:Object.assign(defaultRules(),{format:nflish&&o.games===17?'nfl':'flex',games:o.games,playoffTeams:Math.max(o.divsPer,Math.min(per,o.playoffTeams))}),confs,divs,teams};
}

/* ============================== STORAGE ============================== */
let _db=null,memOnly=false;const MEM=new Map();
function db(){return _db||(_db=new Promise((res,rej)=>{try{const r=indexedDB.open('gaspari-gridiron-nfl',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}}));}
async function idb(mode,fn){const d=await db();return new Promise((res,rej)=>{const tx=d.transaction('kv',mode),q=fn(tx.objectStore('kv'));tx.oncomplete=()=>res(q&&q.result);tx.onerror=tx.onabort=()=>rej(tx.error);});}
async function kvGet(k){if(memOnly)return MEM.get(k);try{return await idb('readonly',s=>s.get(k));}catch(e){memOnly=true;return MEM.get(k);}}
async function kvSet(k,v){MEM.set(k,v);if(memOnly)return;await idb('readwrite',s=>s.put(v,k));}
async function kvDel(k){MEM.delete(k);if(!memOnly)await idb('readwrite',s=>s.delete(k));}

const APP={U:null,index:{current:null,universes:[],setups:[]},assets:{},view:'home',sv:'div',week:null,teamId:null,histYear:null,histTab:'champion',histView:'seasons',openGame:null,editGame:null,shot:false,busy:false,anim:true,saveError:false,uploadKey:null,statsCache:null,pendingSched:null};
let saveTimer=null;
function save(){APP.statsCache=null;clearTimeout(saveTimer);saveTimer=setTimeout(flush,300);}
async function flush(){clearTimeout(saveTimer);const U=APP.U;if(!U)return;
  try{U.updated=Date.now();await kvSet('u:'+U.id,U);
    const meta={id:U.id,name:U.name,league:U.setup.leagueName,year:U.season.year,seasons:U.history.length,updated:U.updated,logo:U.setup.leagueLogo};
    const i=APP.index.universes.findIndex(x=>x.id===U.id);if(i<0)APP.index.universes.push(meta);else APP.index.universes[i]=meta;
    APP.index.current=U.id;await kvSet('index',APP.index);if(APP.saveError){APP.saveError=false;render();}}
  catch(e){if(!APP.saveError){APP.saveError=true;render();}}}

/* ============================== ASSETS (logos shared by every universe and save) ============================== */
function hash(s){let a=2166136261,b=5381;for(let i=0;i<s.length;i+=1){const c=s.charCodeAt(i);a=Math.imul(a^c,16777619);b=(Math.imul(b,33)+c)|0;}return 'img_'+(a>>>0).toString(36)+(b>>>0).toString(36)+s.length.toString(36);}
async function addAsset(dataUrl){const id=hash(dataUrl);APP.assets[id]=dataUrl;await kvSet(id,dataUrl);return id;}
function assetIdsIn(obj){const out=new Set();JSON.stringify(obj,(k,v)=>{if(typeof v==='string'&&/^img_[a-z0-9]+$/.test(v))out.add(v);return v;});return [...out];}
async function loadAssets(obj){for(const id of assetIdsIn(obj))if(!APP.assets[id]){const v=await kvGet(id);if(v)APP.assets[id]=v;}}

/* ============================== LOGOS ============================== */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeColor=c=>/^#[0-9a-f]{6}$/i.test(c)?c:'#556070';
function lum(h){h=safeColor(h).slice(1);return (.299*parseInt(h.slice(0,2),16)+.587*parseInt(h.slice(2,4),16)+.114*parseInt(h.slice(4),16))/255;}
function badge(text,color,shape){const a=String(text||'?').slice(0,4),fs=a.length>3?27:a.length>2?32:40,tc=lum(color)>.62?'#101418':'#fff';
  const d=shape==='circle'?'<circle cx="50" cy="50" r="47"/>':'<path d="M50 3 L93 13 V52 C93 76 73 92 50 98 C27 92 7 76 7 52 V13 Z"/>';
  return 'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="'+safeColor(color)+'">'+d+'</g><text x="50" y="'+(50+fs*.36)+'" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="'+fs+'" fill="'+tc+'">'+esc(a)+'</text></svg>');}
const asset=id=>id&&APP.assets[id]&&/^data:image\//.test(APP.assets[id])?APP.assets[id]:null;
const tSrc=t=>asset(t.logo)||badge(t.abbr,t.color);
const cSrc=c=>asset(c.logo)||badge(c.name.slice(0,4).toUpperCase(),c.name==='AFC'?'#c8102e':c.name==='NFC'?'#013369':'#4a5770','circle');
const lSrc=setup=>asset(setup.leagueLogo)||badge(setup.leagueName.slice(0,4).toUpperCase(),'#013369');
const img=(src,sz,cls)=>'<img class="lg'+(cls?' '+cls:'')+'" width="'+sz+'" height="'+sz+'" src="'+esc(src)+'" alt="">';
const logo=(t,sz,cls)=>img(tSrc(t),sz,cls);
async function processLogo(file){
  if(!/^image\//.test(file.type)&&!/\.(png|jpe?g|webp|svg|gif)$/i.test(file.name))throw new Error(file.name+' is not an image.');
  const url=URL.createObjectURL(file);
  try{const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error(file.name+' could not be read as an image.'));i.src=url;});
    const svg=/svg/i.test(file.type+file.name),w=im.naturalWidth||0,h=im.naturalHeight||0;
    if(!svg&&(w<240||h<240))throw new Error(file.name+' is '+w+'×'+h+'. Logos need to be at least 240×240.');
    const side=svg?440:Math.max(240,Math.min(440,Math.max(w,h))),iw=w||side,ih=h||side,k=Math.min(side/iw,side/ih);
    const c=document.createElement('canvas');c.width=c.height=side;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(im,(side-iw*k)/2,(side-ih*k)/2,iw*k,ih*k);
    return c.toDataURL('image/png');
  }finally{URL.revokeObjectURL(url);}
}
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const ALIAS={wsh:'was',jac:'jax',la:'lar',arz:'ari',blt:'bal',clv:'cle',hst:'hou',gnb:'gb',kan:'kc',nwe:'ne',nor:'no',sfo:'sf',tam:'tb',lvr:'lv',oak:'lv',sd:'lac',stl:'lar'};
/* strict match used for schedules; loose=true also matches file names */
function matchTeam(teams,text,loose){
  const n=norm(text);if(!n)return null;const nick=t=>norm(t.name.split(' ').pop()),city=t=>norm(t.name.split(' ').slice(0,-1).join(' '));
  const one=f=>{const m=teams.filter(f);return m.length===1?m[0]:null;};
  let t=one(t=>norm(t.abbr)===n)||one(t=>norm(t.name)===n)||(ALIAS[n]&&one(t=>norm(t.abbr)===ALIAS[n]))||one(t=>nick(t)===n)||one(t=>city(t)===n);
  if(t||!loose)return t||null;
  const tok=String(text).toLowerCase().split(/[^a-z0-9]+/);
  return one(t=>n.includes(norm(t.name)))||one(t=>nick(t).length>=4&&n.includes(nick(t)))||one(t=>tok.includes(norm(t.abbr)))||null;
}

/* ============================== UNIVERSE + SEASON ============================== */
const newSeason=year=>({year,phase:'preseason',games:[],weeks:0,po:null,schedSource:null,notes:[]});
function newUniverse(name,setup){setup=JSON.parse(JSON.stringify(setup));setup.teams.forEach(t=>{t.joined=t.joined||setup.startYear;});
  return {id:uid('uni'),name,created:Date.now(),updated:Date.now(),setup,season:newSeason(setup.startYear),history:[],checkpoints:[],moves:[]};}
const activeTeams=setup=>setup.teams.filter(t=>t.active);
const teamIn=(setup,id)=>setup.teams.find(t=>t.id===id);
const T=id=>teamIn(APP.U.setup,id);
/* a "view" is what any season screen draws from: the live season or an archived one */
function liveView(){const U=APP.U,s=U.setup;return {live:true,year:U.season.year,setup:s,teams:activeTeams(s),confs:s.confs,divs:s.divs,games:U.season.games,po:U.season.po,phase:U.season.phase,titleName:s.titleName,titleNumber:s.titleNumber};}
function snapshotSeason(){const U=APP.U,s=U.setup,v=liveView();const copy=o=>JSON.parse(JSON.stringify(o));
  return {year:v.year,leagueName:s.leagueName,leagueLogo:s.leagueLogo,trophyLogo:s.trophyLogo,titleName:s.titleName,titleNumber:s.titleNumber,playoffTeams:s.rules.playoffTeams,
    teams:copy(v.teams),confs:copy(v.confs),divs:copy(v.divs),games:copy(U.season.games),po:copy(U.season.po)};}
function archView(a){return {live:false,year:a.year,setup:a,teams:a.teams,confs:a.confs,divs:a.divs,games:a.games,po:a.po,phase:'complete',titleName:a.titleName,titleNumber:a.titleNumber};}
function allArchives(){const U=APP.U,a=U.history.slice();if(U.season.phase==='complete')a.push(snapshotSeason());return a;}
const vTeam=(v,id)=>v.teams.find(t=>t.id===id);
const tableOf=v=>buildTable(v.teams,v.divs,v.games);
const confOfTeam=(v,t)=>v.divs.find(d=>d.id===t.divId).confId;
const regGames=v=>v.games.filter(g=>g.type==='reg');
const gameById=(v,id)=>v.games.find(g=>g.id===id);
function roman(n){const m=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let r='';for(const [k,s] of m)while(n>=k){r+=s;n-=k;}return r;}
const titleLabel=v=>v.titleName+(v.titleName==='Super Bowl'&&v.titleNumber?' '+roman(v.titleNumber):'');
const recStr=r=>r.w+'-'+r.l+(r.t?'-'+r.t:'');
const fmtPct=r=>{const p=pct(r);return p>=1?'1.000':p.toFixed(3).slice(1);};

/* playing games */
function playGameObj(g,playoff){const U=APP.U,H=T(g.h),A=T(g.a),r=rollScores(H,A,U.setup.rules,playoff,g.neutral);Object.assign(g,{played:true,manual:false,hs:r.hs,as:r.as,ot:r.ot,det:r.det});return g;}
function rollLog(v,g){
  const H=vTeam(v,g.h),A=vTeam(v,g.a),d=g.det,sg=n=>(n>=0?'+':'')+n,L=[];
  if(!d)return ['Score entered by hand.'];
  L.push('Base — '+H.name+' (home): '+d.hb+(d.neutral?' (neutral site, no HFA)':'')+'. '+A.name+': '+d.ab+'.');
  [[H,d.hb,d.hr],[A,d.ab,d.ar]].forEach(([t,b,r])=>L.push(t.name+' rolls '+r+' → '+sg(MAIN_CHART[r])+' → '+clampScore(b+MAIN_CHART[r])));
  d.otr.forEach(([x,y],i)=>L.push('OT '+(i+1)+': '+H.abbr+' rolls '+x+' → '+OT_CHART[x]+' pts, '+A.abbr+' rolls '+y+' → '+OT_CHART[y]+' pts'));
  if(d.pre[0]!==g.hs||d.pre[1]!==g.as)L.push('4 and 5 are not valid finals: '+d.pre[0]+'-'+d.pre[1]+' adjusted to '+g.hs+'-'+g.as+'.');
  return L;
}
function nextUnplayed(v){return regGames(v).filter(g=>!g.played).sort((a,b)=>a.wk-b.wk)[0]||null;}
function currentWeek(v){const n=nextUnplayed(v);return n?n.wk:(v.games.length?Math.max(...regGames(v).map(g=>g.wk)):1);}
function divisionPlaces(){const U=APP.U,last=U.history[U.history.length-1],place={};if(!last)return place;
  const v=archView(last),tab=tableOf(v);v.divs.forEach(d=>v.teams.filter(t=>t.divId===d.id).map(t=>tab[t.id]).sort(cmpRows).forEach((r,i)=>place[r.id]=i));return place;}

/* playoffs */
function startPlayoffs(){
  const U=APP.U,v=liveView(),tab=tableOf(v),po={confs:{},title:null,champ:null,runner:null};
  U.season.games=U.season.games.filter(g=>g.type==='reg');
  v.confs.forEach(c=>{if(!v.teams.some(t=>confOfTeam(v,t)===c.id))return;
    const sd=confSeeding(v.teams,v.divs,tab,c.id,U.setup.rules.playoffTeams),seed={};sd.seeds.forEach((id,i)=>seed[id]=i+1);
    const {byes,playing}=computeByes(sd.seeds),cb={seed,winners:sd.winners,rounds:[],champ:null,size:sd.seeds.length};po.confs[c.id]=cb;
    if(sd.seeds.length===1)cb.champ=sd.seeds[0];else cb.rounds.push({byes,games:pairTeams(playing,seed,new Set(sd.winners)).map(([h,a])=>poGame(c.id,0,h,a))});
  });
  U.season.po=po;U.season.phase='playoffs';advance();
}
function poGame(confId,round,h,a,neutral){const g={id:uid('p'),type:'po',confId,round,h,a,neutral:!!neutral,played:false};APP.U.season.games.push(g);return g.id;}
const winnerOf=g=>g.hs>g.as?g.h:g.a, loserOf=g=>g.hs>g.as?g.a:g.h;
function advance(){
  const U=APP.U,po=U.season.po;if(!po||po.champ)return;
  for(const [cid,cb] of Object.entries(po.confs)){
    if(cb.champ)continue;const last=cb.rounds[cb.rounds.length-1],gs=last.games.map(id=>gameById(liveView(),id));
    if(!gs.every(g=>g.played))continue;
    const surv=last.byes.concat(gs.map(winnerOf));
    if(surv.length===1)cb.champ=surv[0];else cb.rounds.push({byes:[],games:pairTeams(surv,cb.seed,new Set(cb.winners)).map(([h,a])=>poGame(cid,cb.rounds.length,h,a))});
  }
  if(!Object.values(po.confs).every(c=>c.champ))return;
  const champs=Object.values(po.confs).map(c=>c.champ);
  if(champs.length===1){po.champ=champs[0];po.runner=null;U.season.phase='complete';return;}
  if(!po.title){const tab=tableOf(liveView()),order=champs.map(id=>tab[id]).sort(cmpRows).map(r=>r.id),seed={};order.forEach((id,i)=>seed[id]=i+1);
    const {byes,playing}=computeByes(order);po.title={seed,rounds:[]};
    po.title.rounds.push({byes,games:pairTeams(playing,seed,new Set()).map(([h,a])=>poGame(null,0,h,a,U.setup.rules.neutralTitle&&order.length===2))});}
  else{const tt=po.title,last=tt.rounds[tt.rounds.length-1],gs=last.games.map(id=>gameById(liveView(),id));if(!gs.every(g=>g.played))return;
    const surv=last.byes.concat(gs.map(winnerOf)).sort((a,b)=>tt.seed[a]-tt.seed[b]);
    if(surv.length===1){po.champ=surv[0];po.runner=loserOf(gs[gs.length-1]);U.season.phase='complete';}
    else tt.rounds.push({byes:[],games:pairTeams(surv,tt.seed,new Set()).map(([h,a])=>poGame(null,tt.rounds.length,h,a,U.setup.rules.neutralTitle&&surv.length===2))});}
}
/* undo removes the most recent playoff result and everything it created */
function undoPlayoff(){
  const U=APP.U,po=U.season.po,order=po.order||[];const id=order.pop();if(!id)return;
  const keep=new Set(order);
  const g=gameById(liveView(),id);
  po.champ=null;po.runner=null;U.season.phase='playoffs';
  const drop=new Set();
  const trim=(box)=>{const ri=box.rounds.findIndex(r=>r.games.includes(id));if(ri<0)return false;box.rounds.splice(ri+1).forEach(r=>r.games.forEach(x=>drop.add(x)));return true;};
  let inConf=false;for(const cb of Object.values(po.confs))if(trim(cb)){cb.champ=null;inConf=true;}
  if(inConf&&po.title){po.title.rounds.forEach(r=>r.games.forEach(x=>drop.add(x)));po.title=null;}else if(po.title)trim(po.title);
  U.season.games=U.season.games.filter(x=>!drop.has(x.id));
  po.order=order.filter(x=>!drop.has(x));
  Object.assign(g,{played:false,hs:null,as:null,ot:false,det:null,manual:false});
}
function finishPo(g){const po=APP.U.season.po;(po.order||(po.order=[])).push(g.id);advance();}
function openPoGames(){return APP.U.season.games.filter(g=>g.type==='po'&&!g.played);}
function nextPoGame(){return openPoGames().sort((a,b)=>(a.confId?0:1)-(b.confId?0:1)||a.round-b.round)[0]||null;}
function roundLabel(v,g){
  if(!g.confId){const tt=v.po.title,n=tt.rounds.length,size=Object.keys(tt.seed).length,total=Math.ceil(Math.log2(size));const left=total-g.round;return left<=1?titleLabel(v):'League Semifinal';}
  const cb=v.po.confs[g.confId],total=Math.ceil(Math.log2(cb.size)),left=total-g.round;
  return left===1?'Conference Championship':left===2?'Divisional':left===3&&total===3?'Wild Card':'Round '+(g.round+1);
}

/* ============================== OFFSEASON ============================== */
function advanceSeason(drift){
  const U=APP.U;if(U.season.phase!=='complete')return;
  U.history.push(snapshotSeason());
  if(U.setup.titleNumber)U.setup.titleNumber++;
  if(drift>0)driftRatings(drift);
  U.season=newSeason(U.season.year+1);APP.week=null;
}
function driftRatings(n){const j=()=>Math.round((rand()+rand()-1)*n);activeTeams(APP.U.setup).forEach(t=>{
  /* pull gently toward league middle so ratings do not run away over many seasons */
  t.off=Math.round(Math.max(8,Math.min(32,t.off+j()+(t.off>24?-1:t.off<16?1:0))));t.def=Math.round(Math.max(-8,Math.min(8,t.def+j()+(t.def>4?-1:t.def<-4?1:0))));});}

/* ============================== LEAGUE HISTORY ============================== */
function seasonSummary(a){
  const v=archView(a),tab=tableOf(v),po=a.po,teams={};
  v.teams.forEach(t=>{const r=tab[t.id],conf=confOfTeam(v,t),cb=po.confs[conf];
    const dr=v.teams.filter(x=>x.divId===t.divId).map(x=>tab[x.id]).sort(cmpRows).findIndex(x=>x.id===t.id)+1;
    const seed=cb&&cb.seed[t.id]||null,pg=v.games.filter(g=>g.type==='po'&&g.played&&(g.h===t.id||g.a===t.id));
    let result='Missed playoffs';
    if(po.champ===t.id)result='Won '+titleLabel(v);else if(po.runner===t.id)result='Lost '+titleLabel(v);
    else if(seed){const lost=pg.find(g=>loserOf(g)===t.id);result=lost?'Lost '+roundLabel(v,lost):'Playoffs';}
    teams[t.id]={t,r,seed,divRank:dr,divTitle:dr===1,confTitle:cb&&cb.champ===t.id,champ:po.champ===t.id,result,pw:pg.filter(g=>winnerOf(g)===t.id).length,pl:pg.filter(g=>loserOf(g)===t.id).length,
      div:v.divs.find(d=>d.id===t.divId),conf:v.confs.find(c=>c.id===conf)};});
  const rows=Object.values(tab).filter(r=>r.o.gp);
  const top=f=>rows.slice().sort(f)[0];
  const fg=po.title?gameById(v,po.title.rounds[po.title.rounds.length-1].games.slice(-1)[0]):null;
  return {v,year:a.year,teams,champ:po.champ?vTeam(v,po.champ):null,runner:po.runner?vTeam(v,po.runner):null,final:fg,
    best:top(cmpRows),offense:top((x,y)=>y.pf-x.pf),defense:top((x,y)=>x.pa-y.pa),worst:rows.slice().sort(cmpRows).slice(-1)[0]};
}
function leagueHistory(){
  if(APP.statsCache)return APP.statsCache;
  const seasons=allArchives().map(seasonSummary),fr={},records={};
  const get=id=>fr[id]||(fr[id]={id,seasons:[],w:0,l:0,t:0,pf:0,pa:0,pw:0,pl:0,titles:[],confT:[],divT:[],apps:0,h2h:{},names:[]});
  const best=(k,val,rec,low)=>{if(!records[k]||(low?val<records[k].val:val>records[k].val))records[k]=Object.assign({val},rec);};
  seasons.forEach(s=>{
    Object.values(s.teams).forEach(x=>{const f=get(x.t.id);f.seasons.push(Object.assign({year:s.year},x));f.w+=x.r.o.w;f.l+=x.r.o.l;f.t+=x.r.o.t;f.pf+=x.r.pf;f.pa+=x.r.pa;f.pw+=x.pw;f.pl+=x.pl;
      if(x.champ)f.titles.push(s.year);if(x.confTitle)f.confT.push(s.year);if(x.divTitle)f.divT.push(s.year);if(x.seed)f.apps++;
      if(!f.names.length||f.names[f.names.length-1].name!==x.t.name)f.names.push({year:s.year,name:x.t.name,logo:x.t.logo,t:x.t});
      if(x.r.o.gp){best('Best record',pct(x.r.o),{team:x.t,year:s.year,text:recStr(x.r.o)});best('Worst record',pct(x.r.o),{team:x.t,year:s.year,text:recStr(x.r.o)},true);
        best('Most points, season',x.r.pf,{team:x.t,year:s.year,text:x.r.pf+' pts'});best('Fewest allowed, season',x.r.pa,{team:x.t,year:s.year,text:x.r.pa+' pts'},true);}});
    s.v.games.filter(g=>g.played).forEach(g=>{
      for(const [me,op,a,b] of [[g.h,g.a,g.hs,g.as],[g.a,g.h,g.as,g.hs]]){const f=get(me),h=f.h2h[op]||(f.h2h[op]=blank());add(h,a,b);}
      const w=vTeam(s.v,winnerOf(g)),l=vTeam(s.v,loserOf(g)),sc=Math.max(g.hs,g.as)+'-'+Math.min(g.hs,g.as);
      if(g.hs!==g.as)best('Biggest blowout',Math.abs(g.hs-g.as),{team:w,year:s.year,text:sc+' over '+l.abbr});
      best('Most points, one team',Math.max(g.hs,g.as),{team:g.hs>=g.as?vTeam(s.v,g.h):vTeam(s.v,g.a),year:s.year,text:sc});});
    /* longest winning streaks are tracked per season */
    Object.values(s.teams).forEach(x=>{let run=0,mx=0;x.r.res.forEach(c=>{run=c==='W'?run+1:0;mx=Math.max(mx,run);});if(mx)best('Longest win streak',mx,{team:x.t,year:s.year,text:mx+' straight'});});
  });
  return APP.statsCache={seasons,fr,records};
}
