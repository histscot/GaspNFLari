'use strict';
/* ============================== UI HELPERS ============================== */
const $=(s,r=document)=>r.querySelector(s);
let toastT;function toast(m,err){const t=$('#toast');t.textContent=m;t.className='on'+(err?' err':'');clearTimeout(toastT);toastT=setTimeout(()=>t.className='',err?8000:3000);}
function dialog(html,buttons){return new Promise(res=>{const m=$('#modal');m.innerHTML='<div class="mbox">'+html+'<div class="r">'+buttons.map(([v,l,c])=>'<button class="btn '+(c||'')+'" data-m="'+v+'">'+esc(l)+'</button>').join('')+'</div></div>';m.classList.add('on');
  m.onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;const form={};m.querySelectorAll('[name]').forEach(i=>form[i.name]=i.type==='checkbox'?i.checked:i.type==='file'?i.files[0]||null:i.value);m.classList.remove('on');m.innerHTML='';m.onclick=null;res({v:b.dataset.m,form});};
  const f=m.querySelector('input,textarea,select')||m.querySelector('.pri,.btn');if(f)f.focus();});}
async function ask(msg,ok){return (await dialog('<p>'+msg+'</p>',[['no','Cancel'],['ok',ok||'Continue','pri']])).v==='ok';}
const field=(label,name,val,type,extra)=>'<label class="f">'+label+'<input class="in" name="'+name+'" type="'+(type||'text')+'" value="'+esc(val==null?'':val)+'" '+(extra||'')+'></label>';

/* files out: Android share sheet, iPhone share sheet ("Save to Files"), or a normal download */
async function saveFile(filename,data){
  const blob=data instanceof Blob?data:new Blob([data]);
  try{
    if(IS_NATIVE){await nativeSave(filename,blob);return;}
    if(IS_IOS&&navigator.canShare){
      const file=new File([blob],filename,{type:blob.type||'application/octet-stream'});
      if(navigator.canShare({files:[file]})){
        /* a fresh tap is required before iOS will open the share sheet */
        if(!await ask('<b>'+esc(filename)+'</b> is ready. In the next screen choose “Save to Files” to keep it.','Save file'))return;
        await navigator.share({files:[file]});return;
      }
    }
    linkDownload(filename,blob);toast('Saved '+filename);
  }catch(e){if(!cancelled(e))toast('Could not save the file'+(e&&e.message?': '+e.message:'.'),true);}
}
/* phones often grey out .json and .csv files when a type filter is set, so only filter images there */
function pickFile(accept,multiple){return new Promise(res=>{const i=$('#filein');i.value='';i.accept=(IS_NATIVE||IS_IOS)&&!accept.startsWith('image')?'':accept;i.multiple=!!multiple;i.onchange=()=>res([...i.files]);i.click();});}
function csvRows(text){const rows=[];let row=[],cur='',q=false;const delim=text.split('\n')[0].includes('\t')?'\t':',';
  for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=c;}else if(c==='"')q=true;else if(c===delim){row.push(cur);cur='';}else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur='';}else if(c!=='\r')cur+=c;}
  row.push(cur);rows.push(row);return rows.filter(r=>r.some(x=>String(x).trim()!==''));}
async function fileRows(file,sheetPref){
  if(/\.(csv|tsv|txt)$/i.test(file.name))return csvRows((await file.text()).replace(/^﻿/,''));
  if(!window.XLSX)throw new Error('The Excel reader did not load. Save the sheet as CSV and upload that.');
  const wb=XLSX.read(new Uint8Array(await file.arrayBuffer()),{type:'array'}),n=wb.SheetNames.find(x=>x.trim().toLowerCase()===sheetPref)||wb.SheetNames[0];
  return XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,defval:'',raw:false,blankrows:false});
}
async function saveSheet(base,rows,sheet){
  if(window.XLSX){const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=rows[0].map((_,i)=>({wch:i===0?26:14}));XLSX.utils.book_append_sheet(wb,ws,sheet);
    await saveFile(base+'.xlsx',new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})]));}
  else await saveFile(base+'.csv',rows.map(r=>r.map(c=>/[",\n]/.test(c)?'"'+String(c).replace(/"/g,'""')+'"':c).join(',')).join('\n'));
}
const fileSafe=s=>String(s).replace(/[^\w-]+/g,'-').replace(/^-|-$/g,'')||'league';

/* ============================== SCHEDULE UPLOAD ============================== */
function parseSchedule(rows,teams){
  const errors=[],warnings=[],games=[],seen=new Set(),unknown=new Set();
  const cell=x=>String(x==null?'':x).trim();
  const weekNum=s=>{const m=cell(s).match(/^(?:week|wk|w)?\s*\.?\s*(\d{1,2})$/i);return m?+m[1]:null;};
  const find=s=>{const t=matchTeam(teams,s);if(!t)unknown.add(cell(s));return t;};
  const addG=(wk,a,h)=>{if(!a||!h)return;if(a.id===h.id){errors.push('Week '+wk+': '+h.name+' is listed against itself.');return;}const k=wk+'|'+h.id+'|'+a.id;if(seen.has(k))return;seen.add(k);games.push({id:uid('g'),type:'reg',wk,h:h.id,a:a.id,riv:h.rivalId===a.id||a.rivalId===h.id,played:false});};
  let hi=-1,cw,ca,ch;
  for(let i=0;i<Math.min(rows.length,10);i++){const r=rows[i].map(x=>norm(x));const w=r.findIndex(x=>x==='week'||x==='wk'),a=r.findIndex(x=>/^(away|visitor|visitingteam|awayteam|road)/.test(x)),h=r.findIndex(x=>/^(home|hometeam)$/.test(x));if(w>=0&&a>=0&&h>=0){hi=i;cw=w;ca=a;ch=h;break;}}
  if(hi>=0){
    let skipped=0;rows.slice(hi+1).forEach(r=>{if(!cell(r[ca])&&!cell(r[ch]))return;const wk=weekNum(r[cw]);if(!wk){skipped++;return;}addG(wk,find(r[ca]),find(r[ch]));});
    if(skipped)warnings.push(skipped+' row(s) without a regular season week number were skipped.');
  }else{
    const gi=rows.findIndex(r=>r.slice(1).filter(x=>weekNum(x)).length>=3);
    if(gi<0)return {errors:['Could not find the columns. Use headers Week, Away, Home, or a grid with week numbers across the top and teams down the side.'],warnings,games};
    const cols=rows[gi].map((x,i)=>i?weekNum(x):null);
    rows.slice(gi+1).forEach(r=>{if(!cell(r[0]))return;const me=find(r[0]);if(!me)return;cols.forEach((wk,i)=>{if(!wk)return;let c=cell(r[i]);if(!c||/^(bye|-|–|—)$/i.test(c))return;const away=/^(@|at\s+)/i.test(c);c=c.replace(/^(@|at\s+|vs\.?\s+)/i,'').replace(/\*+$/,'');const o=find(c);if(o)addG(wk,away?me:o,away?o:me);});});
  }
  if(unknown.size)errors.push('These names don’t match a team: '+[...unknown].slice(0,10).join(', ')+(unknown.size>10?' and '+(unknown.size-10)+' more':'')+'.');
  const slot={};games.forEach(g=>[g.h,g.a].forEach(id=>{const k=g.wk+'|'+id;if(slot[k])errors.push('Week '+g.wk+': '+teams.find(t=>t.id===id).name+' is scheduled twice.');slot[k]=1;}));
  if(!games.length&&!errors.length)errors.push('No games found.');
  const per={};teams.forEach(t=>per[t.id]=0);games.forEach(g=>{per[g.h]++;per[g.a]++;});
  const none=teams.filter(t=>!per[t.id]);if(games.length&&none.length)warnings.push('No games for: '+none.map(t=>t.abbr).join(', ')+'.');
  const counts=[...new Set(Object.values(per).filter(Boolean))];
  if(counts.length>1){const mode=counts.sort((a,b)=>Object.values(per).filter(x=>x===b).length-Object.values(per).filter(x=>x===a).length)[0];warnings.push('Uneven game counts. Most teams have '+mode+'; different: '+teams.filter(t=>per[t.id]&&per[t.id]!==mode).map(t=>t.abbr+' ('+per[t.id]+')').slice(0,12).join(', ')+'.');}
  return {errors:[...new Set(errors)].slice(0,8),warnings,games:games.sort((a,b)=>a.wk-b.wk),weeks:Math.max(0,...games.map(g=>g.wk))};
}
async function applySchedule(rows,source){
  const U=APP.U,r=parseSchedule(rows,activeTeams(U.setup));
  if(r.errors.length){await dialog('<h3>Schedule not loaded</h3><ul>'+r.errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul>',[['ok','OK','pri']]);return;}
  if(r.warnings.length&&!await ask('<b>'+r.games.length+' games over '+r.weeks+' weeks.</b><br><br>'+r.warnings.map(esc).join('<br>'),'Use this schedule'))return;
  U.season.games=r.games;U.season.weeks=r.weeks;U.season.schedSource=source;U.season.notes=r.warnings;APP.week=1;save();render();toast(r.games.length+' games loaded.');
}
function generate(){
  const U=APP.U;toast('Building the schedule…');
  setTimeout(()=>{const r=makeSchedule(U.setup,activeTeams(U.setup),U.season.year,divisionPlaces());
    if(r.error){toast(r.error,true);return;}
    U.season.games=r.games;U.season.weeks=r.weeks;U.season.schedSource=r.nfl?'NFL formula':'Flexible builder';U.season.notes=r.notes;APP.week=1;save();render();toast('Schedule ready: '+r.games.length+' games over '+r.weeks+' weeks.');},40);
}
function scheduleRows(){const U=APP.U,ts=activeTeams(U.setup),g=U.season.games.filter(x=>x.type==='reg').sort((a,b)=>a.wk-b.wk);
  return [['Week','Away','Home']].concat(g.length?g.map(x=>[x.wk,T(x.a).name,T(x.h).name]):[[1,ts[1].name,ts[0].name],[1,ts[3]?ts[3].abbr:'',ts[2]?ts[2].abbr:'']]);}

/* ============================== TEAM FILES ============================== */
function teamRows(setup){return [['Team Name','OFF','DEF','HFA','Division','Conference','Abbr','Color']].concat(activeTeams(setup).map(t=>{const d=setup.divs.find(d=>d.id===t.divId);return [t.name,t.off,t.def,t.hfa,d.name,setup.confs.find(c=>c.id===d.confId).name,t.abbr,t.color];}));}
function readTable(rows){const hi=rows.findIndex(r=>r.some(x=>/^(team|teamname|abbr)$/.test(norm(x))));if(hi<0)throw new Error('No “Team Name” column found.');
  const head=rows[hi].map(norm);const col=(...n)=>head.findIndex(x=>n.includes(x));
  const c={name:col('teamname','team'),off:col('off','offense','offensiverating'),def:col('def','defense','defensiverating'),hfa:col('hfa','homefieldadvantage'),div:col('division','div'),conf:col('conference','conf'),abbr:col('abbr','abbreviation'),color:col('color','colour')};
  return rows.slice(hi+1).map(r=>{const o={};for(const k in c)o[k]=c[k]>=0?String(r[c[k]]==null?'':r[c[k]]).trim():'';return o;}).filter(o=>o.name||o.abbr);}
const num=(s,d)=>{const n=parseFloat(s);return isNaN(n)?d:n;};
function applyRatings(setup,list){let ok=0;const miss=[];list.forEach(o=>{const t=matchTeam(activeTeams(setup),o.name)||matchTeam(activeTeams(setup),o.abbr);if(!t){miss.push(o.name||o.abbr);return;}t.off=num(o.off,t.off);t.def=num(o.def,t.def);t.hfa=num(o.hfa,t.hfa);ok++;});return {ok,miss};}
/* the Gaspari Gridiron template: replaces the lineup; teams that match by name keep their id, logo and history */
function importLineup(setup,list,year){
  const bad=list.filter(o=>!o.name||!o.conf);if(bad.length||!list.length)throw new Error('Every row needs a team name and a conference.');
  const old=setup.teams.slice(),oc=setup.confs.slice(),od=setup.divs.slice(),confs=[],divs=[],teams=[];
  list.forEach(o=>{let c=confs.find(c=>norm(c.name)===norm(o.conf));if(!c){const p=oc.find(c=>norm(c.name)===norm(o.conf));c=p?Object.assign({},p):{id:uid('conf'),name:o.conf,logo:null};confs.push(c);}
    const dn=o.div||'All Teams';let d=divs.find(d=>d.confId===c.id&&norm(d.name)===norm(dn));if(!d){const p=od.find(d=>d.confId===c.id&&norm(d.name)===norm(dn));d={id:p?p.id:uid('div'),confId:c.id,name:dn};divs.push(d);}
    const prev=old.find(t=>norm(t.name)===norm(o.name)&&!teams.some(x=>x.id===t.id));
    const t=prev?Object.assign({},prev):{id:uid('tm'),logo:null,rivalId:null,joined:year,color:'#44546a',abbr:o.name.replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase()||'TBD',off:20,def:0,hfa:3};
    Object.assign(t,{name:o.name,divId:d.id,active:true,off:num(o.off,t.off),def:num(o.def,t.def),hfa:num(o.hfa,t.hfa)});if(o.abbr)t.abbr=o.abbr.toUpperCase().slice(0,4);if(/^#[0-9a-f]{6}$/i.test(o.color))t.color=o.color;teams.push(t);});
  const gone=old.filter(t=>!teams.some(x=>x.id===t.id)).map(t=>Object.assign(t,{active:false,rivalId:null}));
  /* retired franchises stay on file under their old division */
  gone.forEach(t=>{if(!divs.some(d=>d.id===t.divId))t.divId=divs[0].id;});
  setup.confs=confs;setup.divs=divs;setup.teams=teams.concat(gone);
}
function structureChanged(){const s=APP.U.season;if(s.games.length){s.games=[];s.weeks=0;s.schedSource=null;s.notes=[];toast('League lineup changed. Build or upload the schedule again.');}APP.week=null;}
const logMove=text=>APP.U.moves.push({year:APP.U.season.year,text});

/* ============================== LOGOS ============================== */
function logoTarget(key){const s=APP.U.setup;if(key==='league')return [s,'leagueLogo'];if(key==='trophy')return [s,'trophyLogo'];const [k,id]=key.split(':');const o=k==='conf'?s.confs.find(c=>c.id===id):s.teams.find(t=>t.id===id);return o?[o,'logo']:null;}
async function setLogo(key,assetId){
  const t=logoTarget(key);if(!t)return;t[0][t[1]]=assetId;
  if(assetId)APP.U.history.forEach(a=>{const [k,id]=key.split(':');
    if(k==='league'&&!a.leagueLogo)a.leagueLogo=assetId;else if(k==='trophy'&&!a.trophyLogo)a.trophyLogo=assetId;
    else{const o=k==='conf'?a.confs.find(c=>c.id===id):k==='team'?a.teams.find(x=>x.id===id):null;if(o&&!o.logo)o.logo=assetId;}});
}
async function uploadLogo(key,file){try{await setLogo(key,await addAsset(await processLogo(file)));save();render();toast('Logo added.');}catch(e){toast(e.message,true);}}
function logoKeyFor(fname){const s=APP.U.setup,base=fname.replace(/\.[^.]+$/,''),n=norm(base).replace(/logo$|^logo/g,'');
  if(['league',norm(s.leagueName),'leaguelogo'].includes(n))return 'league';if(['trophy','superbowl','lombardi','championship','cup'].includes(n))return 'trophy';
  const c=s.confs.find(c=>norm(c.name)===n);if(c)return 'conf:'+c.id;const t=matchTeam(activeTeams(s),base.replace(/[_-]+/g,' ').replace(/\blogo\b/i,'').trim(),true);return t?'team:'+t.id:null;}
async function bulkLogos(files){let ok=0;const bad=[];toast('Loading '+files.length+' file(s)…');
  for(const f of files){try{const k=logoKeyFor(f.name);if(!k){bad.push(f.name+' (no match)');continue;}await setLogo(k,await addAsset(await processLogo(f)));ok++;}catch(e){bad.push(e.message);}}
  save();render();
  if(bad.length)await dialog('<h3>'+ok+' logo'+(ok===1?'':'s')+' added, '+bad.length+' skipped</h3><ul>'+bad.slice(0,20).map(b=>'<li>'+esc(b)+'</li>').join('')+'</ul><p class="muted small">Click a team’s logo in League office to upload a skipped file directly.</p>',[['ok','OK','pri']]);else toast(ok+' logo'+(ok===1?'':'s')+' added.');}

/* ============================== SAVE FILES + UNIVERSES ============================== */
const clone=o=>JSON.parse(JSON.stringify(o));
async function openUniverse(U){await loadAssets(U);APP.U=U;APP.view='home';APP.week=null;APP.teamId=null;APP.histYear=null;APP.openGame=APP.editGame=null;APP.statsCache=null;await flush();render();window.scrollTo(0,0);}
async function exportFile(kind){
  const U=APP.U;let body;
  if(kind==='universe')body={universe:U};else if(kind==='setup')body={name:U.name,setup:U.setup};else body={universeId:U.id,name:U.name,season:U.season,setup:U.setup};
  await loadAssets(body);const assets={};assetIdsIn(body).forEach(id=>{if(APP.assets[id])assets[id]=APP.assets[id];});
  const tag=kind==='season'?'season-'+U.season.year:kind;
  await saveFile('gridiron-'+fileSafe(U.name)+'-'+tag+'-'+new Date().toISOString().slice(0,10)+'.json',new Blob([JSON.stringify(Object.assign({app:'gaspari-gridiron-nfl',kind,v:1,assets},body))],{type:'application/json'}));
}
const NUMKEYS=new Set(['off','def','hfa','joined','year','startYear','titleNumber','games_per','wk','hs','as','round','weeks','playoffTeams','divEach','confEach','hb','ab','hr','ar','size','ts','created','updated']);
const IDKEYS=new Set(['id','divId','confId','rivalId','h','a','champ','runner','universeId']);
function clean(v,k){
  if(Array.isArray(v))return v.map(x=>clean(x,k));
  if(v&&typeof v==='object'){const o={};for(const key in v){if(key==='__proto__'||!/^[\w .:-]*$/.test(key))throw new Error('bad key');o[key]=clean(v[key],key);}return o;}
  if(typeof v==='string'){if(IDKEYS.has(k)&&k!=='h'&&k!=='a'&&!/^[\w.-]*$/.test(v))throw new Error('bad id');if((k==='h'||k==='a')&&!/^[\w.-]*$/.test(v))throw new Error('bad id');if(NUMKEYS.has(k))return Number(v)||0;if((k==='logo'||k==='leagueLogo'||k==='trophyLogo')&&!/^img_[a-z0-9]+$/.test(v))return null;}
  return v;}
async function importFile(file){
  try{
    const raw=JSON.parse(await file.text());
    /* league files saved by the original Gaspari Gridiron app */
    if(raw.exportedFrom==='Gaspari Gridiron'&&raw.state){const st=raw.state;const setup=nflSetup();setup.leagueName='League';setup.titleName='League Championship';setup.titleNumber=1;
      setup.confs=st.conferences.map(c=>({id:c.id,name:c.name,logo:null}));setup.divs=st.divisions.map(d=>({id:d.id,confId:d.conferenceId,name:d.name}));
      setup.teams=st.teams.map(t=>({id:t.id,name:t.name,abbr:t.abbr||'TBD',color:'#2c5f8a',logo:null,divId:t.divisionId,off:+t.off||0,def:+t.def||0,hfa:+t.hfa||0,rivalId:t.rivalId||null,active:true,joined:setup.startYear}));
      Object.assign(setup.rules,{ties:!!st.settings.tiesAllowed,useOT:!!st.settings.useOT,games:+st.settings.gamesPerSeason||12,playoffTeams:+(st.playoffFormat||{}).teamsPerConf||4,format:'flex'});
      await openUniverse(newUniverse('Imported league',clean(setup)));toast('Teams, ratings and rules imported. Results from the old file are not carried over.');return;}
    if(raw.app!=='gaspari-gridiron-nfl')throw new Error('This is not a Gaspari Gridiron save file.');
    for(const [id,d] of Object.entries(raw.assets||{}))if(/^img_[a-z0-9]+$/.test(id)&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(d)){APP.assets[id]=d;await kvSet(id,d);}
    delete raw.assets;const f=clean(raw);
    if(f.kind==='universe'){const U=f.universe;if(!U||!U.setup||!U.season||!Array.isArray(U.setup.teams))throw new Error('The universe file is incomplete.');
      if(APP.index.universes.some(x=>x.id===U.id)){const r=await dialog('<p>“'+esc(U.name)+'” is already on this computer.</p>',[['no','Cancel'],['copy','Keep both'],['over','Replace it','pri']]);if(r.v==='no')return;if(r.v==='copy'){U.id=uid('uni');U.name+=' (imported)';}}
      U.history=U.history||[];U.checkpoints=U.checkpoints||[];U.moves=U.moves||[];await openUniverse(U);toast('Universe loaded.');}
    else if(f.kind==='setup'){await addSetup(f.name||f.setup.leagueName,f.setup);APP.view='saves';render();toast('Setup added. Use “New universe” on it.');}
    else if(f.kind==='season'){const U=APP.U;
      if(f.universeId===U.id){U.checkpoints.unshift({name:'Imported '+f.season.year+' season file',ts:Date.now(),season:f.season,setup:f.setup});save();APP.view='saves';render();toast('Added to checkpoints. Restore it when ready.');}
      else if(await ask('This season belongs to a different universe. Open it as a new universe (without earlier history)?','Open')){const n=newUniverse(f.name+' ('+f.season.year+')',f.setup);n.season=f.season;await openUniverse(n);}}
    else throw new Error('Unknown save file type.');
  }catch(e){toast('Could not load that file. '+(e.message||''),true);}
}
async function addSetup(name,setup){const id=uid('set');setup=clone(setup);setup.teams=setup.teams.filter(t=>t.active);setup.teams.forEach(t=>t.joined=null);
  await kvSet('s:'+id,setup);APP.index.setups.unshift({id,name,league:setup.leagueName,teams:setup.teams.length,logos:setup.teams.filter(t=>t.logo).length,logo:setup.leagueLogo,saved:Date.now()});await loadAssets(setup);await kvSet('index',APP.index);}
function carryLogos(to,from){if(!to.leagueLogo)to.leagueLogo=from.leagueLogo;if(!to.trophyLogo)to.trophyLogo=from.trophyLogo;
  to.confs.forEach(c=>{const o=from.confs.find(x=>norm(x.name)===norm(c.name));if(o&&!c.logo)c.logo=o.logo;});
  let n=0;to.teams.forEach(t=>{const o=from.teams.find(x=>x.logo&&(norm(x.name)===norm(t.name)||x.id===t.id&&norm(x.abbr)===norm(t.abbr)));if(o&&!t.logo){t.logo=o.logo;n++;}});return n;}
async function newUniverseDialog(setupId){
  const I=APP.index;
  const r=await dialog('<h3>New universe</h3><div class="form" style="grid-template-columns:1fr;margin-top:10px">'+field('Universe name','name','Universe '+(I.universes.length+1))+
    '<label class="f">League<select class="in" name="src"><option value="nfl">Current NFL — 32 teams, 2026</option><option value="custom">Create my own NFL-style league</option>'+I.setups.map(s=>'<option value="'+s.id+'"'+(s.id===setupId?' selected':'')+'>Saved setup: '+esc(s.name)+'</option>').join('')+'</select></label>'+
    '<label class="chk"><input type="checkbox" name="carry" checked>Bring over logos from the open universe where team names match</label></div>',[['no','Cancel'],['ok','Next','pri']]);
  if(r.v!=='ok')return;const {src,carry}=r.form,name=r.form.name.trim()||'Universe';let setup;
  if(src==='nfl')setup=nflSetup();
  else if(src==='custom'){
    const c=await dialog('<h3>Create an NFL league</h3><div class="form" style="margin-top:10px">'+field('League name','name','NFL')+field('First season','year',2026,'number')+field('Title game name','title','Super Bowl')+field('Conferences (comma separated)','confs','AFC, NFC')+field('Divisions per conference','divs',4,'number','min="1" max="8"')+field('Teams per division','tpd',4,'number','min="2" max="8"')+field('Games per team','games',17,'number','min="1" max="40"')+field('Playoff teams per conference','po',7,'number','min="1" max="32"')+'</div><p class="small muted">Placeholder teams are created. Rename them in League office, or use Import teams to load your own list.</p>',[['no','Cancel'],['ok','Create league','pri']]);
    if(c.v!=='ok')return;const f=c.form,names=f.confs.split(',').map(x=>x.trim()).filter(Boolean).slice(0,4);if(!names.length){toast('Enter at least one conference.',true);return;}
    const int=(v,d,a,b)=>Math.max(a,Math.min(b,parseInt(v,10)||d));
    const o={name:f.name.trim()||'NFL',year:int(f.year,2026,1900,3000),title:f.title.trim(),confNames:names,divsPer:int(f.divs,4,1,8),teamsPer:int(f.tpd,4,2,8),games:int(f.games,17,1,40),playoffTeams:int(f.po,7,1,32)};
    if(names.length*o.divsPer*o.teamsPer>64){toast('Keep the league to 64 teams or fewer.',true);return;}
    setup=customSetup(o);
  }else{setup=await kvGet('s:'+src);if(!setup){toast('That setup could not be read.',true);return;}setup=clone(setup);}
  if(carry&&APP.U)carryLogos(setup,APP.U.setup);
  await flush();await openUniverse(newUniverse(name,setup));toast('New universe created.');
}

/* ============================== DICE ============================== */
function diceShow(g,caption){
  if(!APP.anim)return Promise.resolve();
  return new Promise(res=>{const H=T(g.h),A=T(g.a),el=$('#dice'),d=g.det,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,sg=n=>(n>=0?'+':'')+n;
    const side=(t,k)=>'<div class="dside" id="ds-'+k+'">'+img(tSrc(t),150)+'<h2>'+esc(t.name)+'</h2><div class="die'+(reduce?'':' roll')+'" id="die-'+k+'" style="--tc:'+safeColor(t.color)+'">00</div><div class="small" id="br-'+k+'">&nbsp;</div><div class="dscore" id="sc-'+k+'"></div></div>';
    el.innerHTML='<div><div class="disp" style="font-size:22px;margin-bottom:12px;color:#c9d2e2">'+esc(caption)+'</div><div class="dsides">'+side(A,'a')+side(H,'h')+'</div><div id="dnote" style="margin-top:8px;min-height:22px"></div><div class="small" style="opacity:.6">Click to skip</div></div>';el.classList.add('on');
    let shown=false,done=false,t1,t2;const iv=reduce?0:setInterval(()=>['a','h'].forEach(k=>$('#die-'+k).textContent=d100()),70);
    const reveal=()=>{if(shown)return;shown=true;clearInterval(iv);[['a',d.ar,d.ab,g.as,g.hs],['h',d.hr,d.hb,g.hs,g.as]].forEach(([k,r,b,s,o])=>{const die=$('#die-'+k);die.textContent=r;die.classList.remove('roll');$('#br-'+k).textContent='Base '+b+'  ·  chart '+sg(MAIN_CHART[r]);$('#sc-'+k).textContent=s;if(s<o)$('#ds-'+k).classList.add('lose');});
      $('#dnote').textContent=g.ot?'Overtime: '+d.otr.length+' round'+(d.otr.length>1?'s':'')+(g.hs===g.as?' — ends in a tie':''):(g.hs===g.as?'Tie game':'');};
    const end=()=>{if(done)return;done=true;clearInterval(iv);clearTimeout(t1);clearTimeout(t2);el.classList.remove('on');el.innerHTML='';el.onclick=null;res();};
    t1=setTimeout(reveal,reduce?0:900);t2=setTimeout(end,3800);el.onclick=()=>{if(shown)end();else reveal();};});
}
async function rollReg(g){APP.busy=true;APP.week=g.wk;playGameObj(g,false);save();await diceShow(g,'Week '+g.wk);APP.busy=false;render();}
async function rollPo(g){APP.busy=true;const label=roundLabel(liveView(),g);playGameObj(g,true);await diceShow(g,label);APP.busy=false;finishPo(g);save();render();if(APP.U.season.phase==='complete'){window.scrollTo(0,0);toast(T(APP.U.season.po.champ).name+' are champions!');}}
function enteredScores(a,b){const x=Number(a),y=Number(b);return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&String(a).trim()!==''&&String(b).trim()!==''?[x,y]:null;}

/* ============================== EVENTS ============================== */
async function onClick(e){
  const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,v=el.dataset.v,id=el.dataset.id,U=APP.U,s=U.setup,S=U.season;
  if(APP.busy)return;
  const redraw=()=>{save();render();};
  switch(a){
    case 'tab':APP.view=v;APP.histYear=null;APP.teamId=null;APP.openGame=APP.editGame=null;render();window.scrollTo(0,0);break;
    case 'sv':APP.sv=v;render();break;
    case 'shot':APP.shot=!APP.shot;render();break;
    case 'theme':{const t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;try{localStorage.setItem('gg-theme',t);}catch(_){}render();break;}
    case 'anim':APP.anim=!APP.anim;try{localStorage.setItem('gg-anim',APP.anim?'1':'0');}catch(_){}render();break;
    case 'team':APP.view='teams';APP.teamId=id||null;APP.histYear=null;APP.shot=APP.shot&&!!id;render();window.scrollTo(0,0);break;
    case 'histyear':APP.view='history';APP.histYear=+v;APP.histTab='champion';APP.week=null;render();window.scrollTo(0,0);break;
    case 'histback':APP.histYear=null;APP.week=null;render();break;
    case 'histtab':APP.histTab=v;APP.week=1;render();break;
    case 'histview':APP.histView=v;render();break;
    /* schedule */
    case 'gensched':if(!S.games.length||await ask('Replace the current schedule with a new one?','Regenerate'))generate();break;
    case 'upsched':{const [f]=await pickFile('.xlsx,.xls,.csv,.tsv,.txt');if(f)try{await applySchedule(await fileRows(f,'schedule'),'Uploaded: '+f.name);}catch(err){toast(err.message,true);}break;}
    case 'pastesched':{const r=await dialog('<h3>Paste a schedule</h3><p class="small muted">Copy cells from a spreadsheet, including the header row (Week, Away, Home, or the weekly grid).</p><textarea class="in" name="txt" style="width:100%;min-height:220px;font-family:monospace"></textarea>',[['no','Cancel'],['ok','Load','pri']]);if(r.v==='ok'&&r.form.txt.trim())await applySchedule(csvRows(r.form.txt),'Pasted');break;}
    case 'schedtemplate':await saveSheet('gridiron-'+S.year+'-schedule',scheduleRows(),'Schedule');break;
    case 'kickoff':if(!S.games.length)break;S.phase='regular';APP.week=1;redraw();window.scrollTo(0,0);break;
    case 'wk':APP.week+=+v;APP.openGame=APP.editGame=null;render();break;
    case 'groll':await rollReg(gameById(liveView(),id));break;
    case 'rollnext':{const g=regGames(liveView()).find(g=>g.wk===APP.week&&!g.played)||nextUnplayed(liveView());if(g)await rollReg(g);break;}
    case 'rollweek':regGames(liveView()).filter(g=>g.wk===APP.week&&!g.played).forEach(g=>playGameObj(g,false));redraw();break;
    case 'simseason':if(await ask('Roll every remaining regular season game?','Roll them all')){regGames(liveView()).filter(g=>!g.played).forEach(g=>playGameObj(g,false));redraw();toast('Regular season complete.');}break;
    case 'gedit':APP.editGame=id;render();break;
    case 'gcancel':APP.editGame=null;render();break;
    case 'gclear':Object.assign(gameById(liveView(),id),{played:false,hs:null,as:null,ot:false,det:null,manual:false});redraw();break;
    case 'gsave':{const card=el.closest('.gm'),sc=enteredScores(card.querySelector('[data-side="h"]').value,card.querySelector('[data-side="a"]').value);
      if(!sc){toast('Enter both scores as whole numbers.',true);break;}if(sc[0]===sc[1]&&!s.rules.ties){toast('Ties are switched off in this league.',true);break;}
      Object.assign(gameById(liveView(),id),{played:true,manual:true,det:null,hs:sc[0],as:sc[1],ot:card.querySelector('.got').checked});APP.editGame=null;redraw();break;}
    case 'glog':APP.openGame=APP.openGame===id?null:id;render();break;
    /* playoffs */
    case 'seedpo':{const left=regGames(liveView()).filter(g=>!g.played).length;if(!regGames(liveView()).some(g=>g.played)){toast('Play some games first.',true);break;}
      if(left&&!await ask(left+' regular season games are still unplayed. Seed the playoffs from the current standings anyway?','Seed playoffs'))break;startPlayoffs();APP.view='playoffs';redraw();window.scrollTo(0,0);break;}
    case 'proll':await rollPo(gameById(liveView(),id));break;
    case 'pnext':{const g=nextPoGame();if(g)await rollPo(g);break;}
    case 'psimround':{const open=openPoGames();open.forEach(g=>{playGameObj(g,true);finishPo(g);});redraw();break;}
    case 'psimall':{let g,n=0;while((g=nextPoGame())&&n++<500){playGameObj(g,true);finishPo(g);}redraw();window.scrollTo(0,0);break;}
    case 'penter':{const g=gameById(liveView(),id),H=T(g.h),A=T(g.a),r=await dialog('<h3>Enter final score</h3><div class="form" style="margin-top:10px">'+field(esc(A.name),'a','','number','min="0"')+field(esc(H.name),'h','','number','min="0"')+'<label class="chk"><input type="checkbox" name="ot">Overtime</label></div>',[['no','Cancel'],['ok','Save','pri']]);
      if(r.v!=='ok')break;const sc=enteredScores(r.form.h,r.form.a);if(!sc||sc[0]===sc[1]){toast('Enter two different whole-number scores. Playoff games cannot tie.',true);break;}Object.assign(g,{played:true,manual:true,det:null,hs:sc[0],as:sc[1],ot:r.form.ot});finishPo(g);redraw();break;}
    case 'plog':{const lv=APP.view==='history'?archView(allArchives().find(x=>x.year===APP.histYear)):liveView(),g=gameById(lv,id);await dialog('<h3>'+esc(roundLabel(lv,g))+'</h3><div class="log">'+rollLog(lv,g).map(l=>'<div>'+esc(l)+'</div>').join('')+'</div>',[['ok','Close','pri']]);break;}
    case 'pundo':undoPlayoff();redraw();break;
    case 'preset':if(await ask('Clear every playoff result and re-seed the bracket?','Reset playoffs')){startPlayoffs();redraw();}break;
    case 'reopen':if(await ask('Discard the playoff bracket and return to the regular season?','Reopen')){S.games=S.games.filter(g=>g.type==='reg');S.po=null;S.phase='regular';APP.view='schedule';redraw();}break;
    case 'offseason':{const r=await dialog('<h3>Close the '+S.year+' season</h3><p>The champion, standings, bracket and every score go into league history. You then land in the '+(S.year+1)+' preseason, where you can add expansion teams, realign and set the schedule.</p><label class="f">Offseason rating changes<select class="in" name="drift"><option value="0">None — I’ll set ratings myself</option><option value="2">Modest (a couple of points)</option><option value="4">Big swings</option></select></label>',[['no','Cancel'],['ok','Go to offseason','pri']]);
      if(r.v!=='ok'||S.phase!=='complete')break;advanceSeason(+r.form.drift);APP.view='home';redraw();window.scrollTo(0,0);break;}
    /* logos */
    case 'uplogo':{const [f]=await pickFile('image/*');if(f)await uploadLogo(el.dataset.key,f);break;}
    case 'rmlogo':await setLogo(el.dataset.key,null);redraw();break;
    case 'bulk':{const fs=await pickFile('image/*',true);if(fs.length)await bulkLogos(fs);break;}
    /* league office */
    case 'addteam':{if(!structureOpen())break;
      const r=await dialog('<h3>Add an expansion team</h3><div class="form" style="margin-top:10px">'+field('Team name (city and nickname)','name','')+field('Abbreviation','abbr','','text','maxlength="4"')+field('Primary color','color','#2a6f97','color')+field('OFF','off',18,'number')+field('DEF','def',-1,'number')+field('HFA','hfa',3,'number')+
        '<label class="f">Division<select class="in" name="div">'+s.divs.map(d=>'<option value="'+d.id+'">'+esc(s.confs.find(c=>c.id===d.confId).name+' '+d.name)+'</option>').join('')+'</select></label><label class="f">Rival<select class="in" name="rival"><option value="">None</option>'+activeTeams(s).map(t=>'<option value="'+t.id+'">'+esc(t.name)+'</option>').join('')+'</select></label><label class="f">Logo (240×240 or larger)<input class="in" type="file" name="logo" accept="image/*"></label></div>',[['no','Cancel'],['ok','Add team','pri']]);
      if(r.v!=='ok')break;const f=r.form,name=f.name.trim();if(!name){toast('The team needs a name.',true);break;}
      if(activeTeams(s).some(t=>norm(t.name)===norm(name))){toast('A team with that name already exists.',true);break;}
      const t={id:uid('tm'),name,abbr:(f.abbr.trim()||name.split(' ').pop().slice(0,3)).toUpperCase().slice(0,4),color:safeColor(f.color),logo:null,divId:f.div,off:num(f.off,18),def:num(f.def,-1),hfa:num(f.hfa,3),rivalId:f.rival||null,active:true,joined:S.year};
      if(f.logo)try{t.logo=await addAsset(await processLogo(f.logo));}catch(err){toast(err.message,true);}
      s.teams.push(t);const d=s.divs.find(d=>d.id===t.divId);logMove(name+' join the '+s.confs.find(c=>c.id===d.confId).name+' '+d.name+' as an expansion team.');structureChanged();redraw();break;}
    case 'retire':{if(!structureOpen())break;const t=T(id);if(activeTeams(s).length<=2){toast('A league needs at least two teams.',true);break;}if(!await ask('Retire the '+esc(t.name)+'? Their history is kept and you can bring them back.','Retire'))break;
      activeTeams(s).forEach(x=>{if(x.rivalId===id)x.rivalId=null;});if(U.history.some(h=>h.teams.some(x=>x.id===id))){t.active=false;t.rivalId=null;logMove(t.name+' leave the league.');}else s.teams=s.teams.filter(x=>x.id!==id);structureChanged();redraw();break;}
    case 'revive':if(structureOpen()){const t=T(id);t.active=true;logMove(t.name+' return to the league.');structureChanged();redraw();}break;
    case 'adddiv':{if(!structureOpen())break;const r=await dialog('<h3>New division</h3>'+field('Division name','name',''),[['no','Cancel'],['ok','Add','pri']]);if(r.v==='ok'&&r.form.name.trim()){s.divs.push({id:uid('div'),confId:id,name:r.form.name.trim()});redraw();}break;}
    case 'deldiv':if(structureOpen()&&!s.teams.some(t=>t.active&&t.divId===id)){const rest=s.divs.filter(d=>d.id!==id);if(!rest.length)break;s.teams.forEach(t=>{if(t.divId===id)t.divId=rest[0].id;});s.divs=rest;redraw();}break;
    case 'teamtemplate':await saveSheet('gridiron-'+fileSafe(s.leagueName)+'-teams',teamRows(s),'Teams');break;
    case 'upratings':{const [f]=await pickFile('.xlsx,.xls,.csv');if(!f)break;try{const r=applyRatings(s,readTable(await fileRows(f,'teams')));redraw();toast(r.ok+' teams updated.'+(r.miss.length?' Not matched: '+r.miss.slice(0,5).join(', '):''),!r.ok);}catch(err){toast(err.message,true);}break;}
    case 'upteams':{if(!structureOpen())break;const [f]=await pickFile('.xlsx,.xls,.csv');if(!f)break;try{const list=readTable(await fileRows(f,'teams'));if(!await ask('This replaces the lineup with the '+list.length+' teams in the file. Teams whose names match keep their logo and history.','Import'))break;const c=clone(s);importLineup(c,list,S.year);U.setup=c;logMove('League lineup imported from '+f.name+'.');structureChanged();redraw();}catch(err){toast(err.message,true);}break;}
    case 'randratings':if(await ask('Give every team new random ratings (OFF 15–26, DEF −5 to 5, HFA 1–4)?','Randomize')){const ri=(a,b)=>a+Math.floor(rand()*(b-a+1));activeTeams(s).forEach(t=>Object.assign(t,{off:ri(15,26),def:ri(-5,5),hfa:ri(1,4)}));redraw();}break;
    /* saves */
    case 'newuni':await newUniverseDialog();break;
    case 'usesetup':await newUniverseDialog(id);break;
    case 'loaduni':{await flush();const n=await kvGet('u:'+id);if(n)await openUniverse(n);else toast('That universe could not be read.',true);break;}
    case 'dupuni':{await flush();const n=clone(U);n.id=uid('uni');n.name+=' (copy)';await openUniverse(n);toast('You are now in the copy.');break;}
    case 'deluni':if(await ask('Permanently delete this universe and its history? This cannot be undone.','Delete')){await kvDel('u:'+id);APP.index.universes=APP.index.universes.filter(x=>x.id!==id);await kvSet('index',APP.index);render();}break;
    case 'savesetup':{const r=await dialog('<h3>Save league setup</h3>'+field('Setup name','name',U.name+' setup'),[['no','Cancel'],['ok','Save','pri']]);if(r.v==='ok'){await addSetup(r.form.name.trim()||'Setup',s);render();toast('Setup saved with its logos.');}break;}
    case 'delsetup':if(await ask('Delete this saved setup? This cannot be undone.','Delete')){await kvDel('s:'+id);APP.index.setups=APP.index.setups.filter(x=>x.id!==id);await kvSet('index',APP.index);render();}break;
    case 'export':await exportFile(v);break;
    case 'import':{const [f]=await pickFile('.json,application/json');if(f)await importFile(f);break;}
    case 'checkpoint':{const r=await dialog('<h3>Save checkpoint</h3>'+field('Name','name',S.year+' · '+(S.phase==='regular'?'before week '+currentWeek(liveView()):S.phase)),[['no','Cancel'],['ok','Save','pri']]);if(r.v==='ok'){U.checkpoints.unshift({name:r.form.name.trim()||'Checkpoint',ts:Date.now(),season:clone(S),setup:clone(s)});U.checkpoints.length=Math.min(U.checkpoints.length,20);redraw();toast('Checkpoint saved.');}break;}
    case 'restore':{const c=U.checkpoints[+v],later=U.history.filter(h=>h.year>=c.season.year).length;if(!await ask('Restore “'+esc(c.name)+'”? The current season is replaced.'+(later?' <b>'+later+' completed season(s) from '+c.season.year+' onward will be removed from history.</b>':''),'Restore'))break;
      const n=clone(c.setup);carryLogos(n,s);U.setup=n;U.season=clone(c.season);U.history=U.history.filter(h=>h.year<c.season.year);U.moves=U.moves.filter(m=>m.year<=c.season.year);await loadAssets(U);APP.week=null;APP.view='home';redraw();toast('Checkpoint restored.');break;}
    case 'delcp':if(await ask('Delete this checkpoint?','Delete')){U.checkpoints.splice(+v,1);redraw();}break;
  }
}
function onChange(e){
  const el=e.target.closest('[data-ch]');if(!el||!APP.U)return;const k=el.dataset.ch,U=APP.U,s=U.setup,val=el.type==='checkbox'?el.checked:el.value;
  if(k==='week'){APP.week=+val;render();return;}
  if(k==='teampick'){APP.teamId=val;render();return;}
  if(k==='tf'){const t=T(el.dataset.id),f=el.dataset.k;
    if(f==='off'||f==='def'||f==='hfa')t[f]=Math.max(-60,Math.min(60,num(val,t[f])));
    else if(f==='divId'){if(!structureOpen())return;t.divId=val;const d=s.divs.find(d=>d.id===val);logMove(t.name+' move to the '+s.confs.find(c=>c.id===d.confId).name+' '+d.name+'.');structureChanged();}
    else if(f==='rivalId')t.rivalId=val||null;
    else if(String(val).trim()){const nv=f==='abbr'?val.trim().toUpperCase().slice(0,4):val.trim();if(f==='name'&&nv!==t.name&&U.history.length)logMove(t.name+' become the '+nv+'.');t[f]=nv;}}
  else if(k==='divname'){if(val.trim())s.divs.find(d=>d.id===el.dataset.id).name=val.trim();}
  else if(k==='confname'){if(val.trim())s.confs.find(c=>c.id===el.dataset.id).name=val.trim();}
  else if(k==='league'){const f=el.dataset.k;if(!val.trim()){render();return;}if(f==='uname')U.name=val.trim();else s[f]=val.trim();}
  else if(k==='rule'){const f=el.dataset.k;if(el.type==='checkbox'){s.rules[f]=val;if(f==='ties'&&!val)s.rules.useOT=true;}else if(f==='format')s.rules.format=val;else s.rules[f]=Math.max(+el.min,Math.min(+el.max,Math.round(num(val,s.rules[f]))));
    if(['games','format','divEach','confEach'].includes(f)&&structureOpen())structureChanged();}
  save();render();
}
document.addEventListener('click',onClick);
document.addEventListener('change',onChange);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&APP.shot){APP.shot=false;render();}});
document.addEventListener('dragover',e=>{if(![...e.dataTransfer.types].includes('Files'))return;e.preventDefault();const d=e.target.closest('[data-drop]');if(d)d.classList.add('over');});
document.addEventListener('dragleave',e=>{const d=e.target.closest&&e.target.closest('[data-drop]');if(d)d.classList.remove('over');});
document.addEventListener('drop',async e=>{if(!e.dataTransfer.files.length)return;e.preventDefault();const fs=[...e.dataTransfer.files],d=e.target.closest('[data-drop]');
  if(fs.length===1&&d&&d.dataset.drop.startsWith('logo:'))await uploadLogo(d.dataset.drop.slice(5),fs[0]);
  else if(fs.every(f=>/\.json$/i.test(f.name)))await importFile(fs[0]);else await bulkLogos(fs);});
window.addEventListener('pagehide',()=>{if(APP.U)flush();});

async function init(){
  try{const t=localStorage.getItem('gg-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;APP.anim=localStorage.getItem('gg-anim')!=='0';}catch(_){}
  let U=null;
  try{const i=await kvGet('index');if(i)APP.index=i;if(APP.index.current)U=await kvGet('u:'+APP.index.current);}catch(_){}
  if(!U&&APP.index.universes.length)try{U=await kvGet('u:'+APP.index.universes[0].id);}catch(_){}
  if(!U)U=newUniverse('NFL Universe',nflSetup());
  try{await loadAssets(U);for(const m of APP.index.universes.concat(APP.index.setups))if(m.logo)await loadAssets([m.logo]);}catch(_){}
  APP.U=U;render();save();
}
window.__GG={APP,init,render,liveView,leagueHistory,parseSchedule,csvRows,importFile,exportFile,logoKeyFor,bulkLogos};
init();
