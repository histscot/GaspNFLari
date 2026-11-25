'use strict';
/* ============================== SHARED VIEW PIECES ============================== */
const tlink=(t,inner)=>'<button class="link" data-act="team" data-id="'+t.id+'">'+inner+'</button>';
const seg=(act,cur,opts)=>'<div class="seg">'+opts.map(([v,l])=>'<button data-act="'+act+'" data-v="'+v+'" aria-pressed="'+(String(cur)===String(v))+'">'+esc(l)+'</button>').join('')+'</div>';
function seedTile(v,t,n,sub,cls){return '<button class="seedt '+(cls||'')+'" data-act="team" data-id="'+t.id+'" style="--tc:'+safeColor(t.color)+'"><span class="n">'+(n||'')+'</span>'+logo(t,cls==='p1'?132:76)+'<b>'+esc(t.abbr)+'</b><span>'+esc(sub)+'</span></button>';}

/* ============================== STANDINGS ============================== */
function standTable(v,rows,o){
  /* the two-up division cards drop PF, PA, Home and Away so nothing is cut off */
  const full=!o.compact,head=['W','L','T','PCT'].concat(full?['PF','PA']:[],['Diff'],full?['Home','Away']:[],['Div','Conf','Strk']);
  let h='<div class="tw"><table'+(full?'':' class="compact"')+'><thead><tr><th></th><th class="l">Team</th>'+head.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>';
  rows.forEach((r,i)=>{const t=vTeam(v,r.id),res=r.res;let s='–';if(res.length){const c=res[res.length-1];let n=0;for(let k=res.length-1;k>=0&&res[k]===c;k--)n++;s=c+n;}
    const sd=o.seed&&o.seed[r.id],df=r.pf-r.pa;
    const cells=[r.o.w,r.o.l,r.o.t,'<b>'+fmtPct(r.o)+'</b>'].concat(full?[r.pf,r.pa]:[],[(df>0?'+':'')+df],full?[recStr(r.home),recStr(r.away)]:[],[recStr(r.div),recStr(r.conf),s]);
    h+='<tr class="'+(sd?'in':'')+(o.cut===i+1?' cut':'')+'"><td class="rk">'+(sd||i+1)+'</td><td class="tm" style="--tc:'+safeColor(t.color)+'">'+tlink(t,'<span class="tmn">'+logo(t,o.sz||40)+'<span>'+esc(t.name)+'</span></span>')+'</td>'+cells.map(c=>'<td>'+c+'</td>').join('')+'</tr>';});
  return h+'</tbody></table></div>';
}
function seedsFor(v,tab){const m={};v.confs.forEach(c=>{if(!v.teams.some(t=>confOfTeam(v,t)===c.id))return;
  if(v.po&&v.po.confs[c.id]){const s=v.po.confs[c.id].seed;m[c.id]={seeds:Object.keys(s).sort((a,b)=>s[a]-s[b])};m[c.id].order=confSeeding(v.teams,v.divs,tab,c.id,1).order;}
  else m[c.id]=confSeeding(v.teams,v.divs,tab,c.id,v.live?v.setup.rules.playoffTeams:v.setup.playoffTeams);});return m;}
const confHead=c=>'<div class="confh">'+img(cSrc(c),56)+'<h2>'+esc(c.name)+'</h2></div>';
function playoffPicture(v,tab,seeds,c){
  const s=seeds[c.id];if(!s)return '';const rest=s.order.filter(id=>!s.seeds.includes(id));
  return '<div class="strip">'+s.seeds.map((id,i)=>seedTile(v,vTeam(v,id),i+1,recStr(tab[id].o))).join('')+'</div>'+
    (rest.length?'<div class="sub" style="padding:0 14px">'+(v.phase==='regular'||v.phase==='preseason'?'In the hunt':'Missed the playoffs')+'</div><div class="strip">'+rest.slice(0,v.phase==='regular'?rest.length:32).map(id=>seedTile(v,vTeam(v,id),'',recStr(tab[id].o),'out')).join('')+'</div>':'');
}
function standingsView(v,mode){
  const tab=tableOf(v),seeds=seedsFor(v,tab),seedMap={};if(v.po||v.games.some(g=>g.type==='reg'&&g.played))Object.values(seeds).forEach(s=>s.seeds.forEach((id,i)=>seedMap[id]=i+1));
  const rank=ts=>ts.map(t=>tab[t.id]).sort(cmpRows);
  let h='';
  if(mode==='div'){
    h+='<div class="cols2">'+v.confs.map(c=>'<div>'+confHead(c)+v.divs.filter(d=>d.confId===c.id).map(d=>{const rows=rank(v.teams.filter(t=>t.divId===d.id));if(!rows.length)return '';const L=vTeam(v,rows[0].id),started=rows.some(r=>r.o.gp);
      return '<section class="panel divcard"><div class="divhero" style="--tc:'+safeColor(L.color)+'">'+img(tSrc(L),200,'wm')+(started?logo(L,92):img(cSrc(c),72))+'<div><h3>'+esc(c.name+' '+d.name)+'</h3><div class="sub">'+(started?'Leader: '+esc(L.name)+' · '+recStr(rows[0].o):'Season not started')+'</div></div></div>'+standTable(v,rows,{seed:seedMap,sz:44,compact:true})+'</section>';}).join('')+'</div>').join('')+'</div>';
  }else if(mode==='conf'){
    h+=v.confs.map(c=>{const s=seeds[c.id];if(!s)return '';const order=s.seeds.concat(s.order.filter(id=>!s.seeds.includes(id)));
      return confHead(c)+'<section class="panel">'+playoffPicture(v,tab,seeds,c)+standTable(v,order.map(id=>tab[id]),{seed:seedMap,cut:s.seeds.length,sz:40})+'</section>';}).join('');
  }else{
    const rows=rank(v.teams);
    h+='<section class="panel"><div class="podium">'+[1,0,2].filter(i=>rows[i]).map(i=>seedTile(v,vTeam(v,rows[i].id),i+1,recStr(rows[i].o),i===0?'p1':'')).join('')+'</div>'+standTable(v,rows,{sz:40})+'</section>';
  }
  return h+'<div class="legend"><span>Green rank = playoff seed. Order: win %, games played, head-to-head, division %, conference %, name. Division winners are seeded ahead of wild cards.</span></div>';
}

/* ============================== BRACKET + CHAMPION ============================== */
function serCard(v,g,seed,live){
  if(!g)return '<div class="ser">'+[0,1].map(()=>'<div class="srow"><span class="seed"></span><span class="ph"></span><span class="ab muted">TBD</span></div>').join('')+'</div>';
  const row=(id,score,other)=>{const t=vTeam(v,id),st=!g.played?'':score>other?'won':'lost';
    return '<div class="srow '+st+'" style="--tc:'+safeColor(t.color)+'">'+(st==='won'?img(tSrc(t),104,'wm'):'')+'<span class="seed">'+(seed[id]||'')+'</span>'+tlink(t,logo(t,54))+'<span class="ab">'+esc(t.abbr)+'</span><span class="sc">'+(g.played?score:'')+'</span></div>';};
  let h='<div class="ser'+(!g.played&&live?' live':'')+'">'+row(g.h,g.hs,g.as)+row(g.a,g.as,g.hs);
  if(live&&!g.played)h+='<div class="sf"><button class="btn sm pri" data-act="proll" data-id="'+g.id+'">Roll</button><button class="btn sm" data-act="penter" data-id="'+g.id+'">Enter score</button></div>';
  else if(g.played)h+='<div class="sf"><button class="btn sm ghost" data-act="plog" data-id="'+g.id+'">'+(g.ot?'Final / OT · ':'')+'Dice log</button></div>';
  return h+'</div>';
}
function roundNames(v,cid,total){const cb=v.po.confs[cid];return Array.from({length:total},(_,r)=>roundLabel(v,{confId:cid,round:r}));}
function bracketView(v){
  const po=v.po,live=v.live&&v.phase==='playoffs',ids=Object.keys(po.confs);
  const block=(cid,right)=>{const cb=po.confs[cid],c=v.confs.find(x=>x.id===cid),total=Math.ceil(Math.log2(cb.size)),names=roundNames(v,cid,total);
    let cols='';for(let r=0;r<total;r++){const rd=cb.rounds[r];let cards='';
      if(rd){if(r===0)cards+=rd.byes.map(id=>{const t=vTeam(v,id);return '<div class="byet" style="border-color:'+safeColor(t.color)+'">'+logo(t,54)+'<div><b class="disp">'+cb.seed[id]+' · '+esc(t.abbr)+'</b><div class="small muted">First-round bye</div></div></div>';}).join('');
        cards+=rd.games.map(id=>serCard(v,gameById(v,id),cb.seed,live)).join('');}
      else cards=Array.from({length:Math.max(1,Math.pow(2,total-r-1))},()=>serCard(v,null,cb.seed)).join('');
      cols+='<div class="rw"><div class="rh">'+esc(names[r])+'</div><div class="rc">'+cards+'</div></div>';}
    return '<div class="cf'+(right?' right':'')+'"><div class="cn">'+img(cSrc(c),40)+esc(c.name)+'</div><div class="cfr">'+cols+'</div></div>';};
  let mid='';
  if(ids.length>1){
    const tt=po.title;mid='<div class="fin"><div class="trophy">'+img(asset(v.setup.trophyLogo)||lSrc(v.setup),150)+'<h3 style="font-size:28px">'+esc(titleLabel(v))+'</h3></div>';
    if(tt)mid+=tt.rounds.map((rd,i)=>rd.byes.map(id=>'<div class="byet">'+logo(vTeam(v,id),54)+'<span>Bye</span></div>').join('')+rd.games.map(id=>serCard(v,gameById(v,id),{},live)).join('')).join('');
    else mid+=serCard(v,null,{});
    if(po.champ){const ch=vTeam(v,po.champ);mid+='<div class="trophy"><div class="sub" style="color:var(--accent)">Champions</div>'+logo(ch,170)+'<h3 style="font-size:26px">'+esc(ch.name)+'</h3></div>';}
    mid+='</div>';
  }
  const half=Math.ceil(ids.length/2);
  return '<div class="bscroll"><div class="bracket">'+ids.slice(0,half).map(i=>block(i,false)).join('')+mid+ids.slice(half).map(i=>block(i,true)).join('')+'</div></div>';
}
function championHero(v){
  const po=v.po;if(!po||!po.champ)return '';
  const ch=vTeam(v,po.champ),ru=po.runner?vTeam(v,po.runner):null,tab=tableOf(v);
  const path=v.games.filter(g=>g.type==='po'&&g.played&&(g.h===ch.id||g.a===ch.id)).sort((a,b)=>(a.confId?0:1)-(b.confId?0:1)||a.round-b.round);
  let h='<div class="champ" style="--tc:'+safeColor(ch.color)+'">'+img(tSrc(ch),520,'wm')+img(tSrc(ch),520,'wm r')+
    '<div class="eb">'+esc(v.year+' · '+titleLabel(v))+' Champions</div>'+img(tSrc(ch),300,'big')+'<h2>'+esc(ch.name)+'</h2><div class="sub">'+recStr(tab[ch.id].o)+' regular season</div>';
  const fg=path[path.length-1];
  if(ru&&fg){const m=fg.h===ch.id;h+='<div class="final-line">'+logo(ch,80)+'<span>'+(m?fg.hs:fg.as)+' – '+(m?fg.as:fg.hs)+(fg.ot?' OT':'')+'</span>'+logo(ru,80)+'</div><div class="muted">over the '+esc(ru.name)+'</div>';}
  h+='<div class="pathrow">'+path.map(g=>{const m=g.h===ch.id,o=vTeam(v,m?g.a:g.h);return '<div class="pchip">'+esc(roundLabel(v,g))+logo(o,54)+'<b>'+(m?g.hs+'-'+g.as:g.as+'-'+g.hs)+' vs '+esc(o.abbr)+'</b></div>';}).join('')+'</div>';
  return h+'</div>';
}

/* ============================== SCHEDULE ============================== */
function gameCard(v,g,tab){
  const H=vTeam(v,g.h),A=vTeam(v,g.a),ed=APP.editGame===g.id,open=APP.openGame===g.id;
  const side=(t,s,o,r,home)=>'<div class="gt'+(g.played&&s>o?' win':'')+(g.played&&s<o?' lose':'')+'" style="--tc:'+safeColor(t.color)+'">'+tlink(t,logo(t,52))+'<span class="gn"><b>'+esc(t.name)+'</b><small>'+(home?'Home':'Away')+' · '+recStr(tab[t.id].o)+'</small></span>'+(g.played&&g.det&&!ed?'<span class="rl" title="d100 roll">'+r+'</span>':'')+(ed?'<input type="number" min="0" class="in gsi" data-side="'+(home?'h':'a')+'" value="'+(g.played?s:'')+'" aria-label="'+esc(t.abbr)+' score">':'<span class="gs">'+(g.played?s:'')+'</span>')+'</div>';
  let h='<div class="gm">'+side(A,g.as,g.hs,g.det&&g.det.ar,false)+side(H,g.hs,g.as,g.det&&g.det.hr,true)+'<div class="gf"><span>'+(g.played?(g.hs===g.as?'Tie':'Final')+(g.ot?' / OT':'')+(g.manual?' · entered':''):'Scheduled')+(g.riv?' · Rivalry':'')+'</span><span class="sp"></span>';
  if(v.live&&v.phase!=='playoffs'&&v.phase!=='complete'){
    if(ed)h+='<label class="chk"><input type="checkbox" class="got"'+(g.ot?' checked':'')+'>OT</label><button class="btn sm pri" data-act="gsave" data-id="'+g.id+'">Save</button><button class="btn sm" data-act="gcancel">Cancel</button>';
    else h+=(g.played?'<button class="btn sm ghost" data-act="gclear" data-id="'+g.id+'">Clear</button>':'<button class="btn sm pri" data-act="groll" data-id="'+g.id+'">Roll</button>')+'<button class="btn sm" data-act="gedit" data-id="'+g.id+'">Enter</button>';
  }
  if(g.played)h+='<button class="btn sm ghost" data-act="glog" data-id="'+g.id+'">'+(open?'Hide':'Dice log')+'</button>';
  h+='</div>'+(open&&g.played?'<div class="log">'+rollLog(v,g).map(l=>'<div>'+esc(l)+'</div>').join('')+'</div>':'')+'</div>';
  return h;
}
function weekView(v){
  const games=regGames(v),weeks=Math.max(v.live?APP.U.season.weeks:0,...games.map(g=>g.wk));
  if(APP.week==null||APP.week<1||APP.week>weeks)APP.week=currentWeek(v);
  const w=APP.week,list=games.filter(g=>g.wk===w),tab=tableOf(v),playing=new Set(list.flatMap(g=>[g.h,g.a])),byes=v.teams.filter(t=>!playing.has(t.id)),left=list.filter(g=>!g.played).length;
  let h='<div class="tb"><button class="btn" data-act="wk" data-v="-1"'+(w<=1?' disabled':'')+'>← Prev</button><select class="in" data-ch="week" aria-label="Week">'+Array.from({length:weeks},(_,i)=>'<option value="'+(i+1)+'"'+(i+1===w?' selected':'')+'>Week '+(i+1)+'</option>').join('')+'</select><button class="btn" data-act="wk" data-v="1"'+(w>=weeks?' disabled':'')+'>Next →</button><span class="sp"></span>';
  if(v.live&&v.phase==='regular')h+='<button class="btn pri" data-act="rollnext"'+(nextUnplayed(v)?'':' disabled')+'>Roll next game</button><button class="btn" data-act="rollweek"'+(left?'':' disabled')+'>Roll week '+w+'</button><button class="btn" data-act="simseason"'+(nextUnplayed(v)?'':' disabled')+'>Roll rest of season</button>';
  h+='</div><div class="confh">'+img(lSrc(v.setup),48)+'<h2>'+v.year+' · Week '+w+'</h2><span class="muted">'+(list.length-left)+' of '+list.length+' played</span></div><div class="sched">'+list.map(g=>gameCard(v,g,tab)).join('')+'</div>';
  if(byes.length)h+='<div class="byes"><span class="sub">On bye</span>'+byes.map(t=>'<span class="pill">'+logo(t,28)+esc(t.abbr)+'</span>').join('')+'</div>';
  return h;
}
function preseasonSchedule(){
  const U=APP.U,s=U.setup,ts=activeTeams(s),nfl=s.rules.format==='nfl'&&isNflShape(s.confs,s.divs,ts,s.rules.games),has=U.season.games.length>0;
  let h='<section class="panel pad"><h3>'+U.season.year+' schedule</h3><p class="muted">'+(nfl?'Generates the current NFL 17-game formula: six division games, two rotating four-team division blocks, same-place matchups and the 17th game. Byes fall in weeks 5–14.':'Generates '+s.rules.games+' games per team: division games first, then conference games, rivals, then cross-conference fill. '+(s.rules.format==='nfl'?'(The NFL formula needs 2 conferences of 4 four-team divisions and 17 games, so this league uses the flexible builder.)':''))+'</p><div class="tb"><button class="btn pri" data-act="gensched">'+(has?'Regenerate':'Generate')+' schedule</button><button class="btn" data-act="upsched">Upload schedule (.xlsx or .csv)</button><button class="btn ghost" data-act="pastesched">Paste schedule</button><button class="btn ghost" data-act="schedtemplate">Download '+(has?'this schedule':'template')+'</button></div><p class="small muted">Upload either a list with <b>Week, Away, Home</b> columns, or a grid with one row per team, week numbers across the top and cells like <b>@KC</b>, <b>DEN</b> or <b>BYE</b>. Team names, nicknames and abbreviations all match.</p></section>';
  if(has)h+=(U.season.notes.length?'<div class="note">'+U.season.notes.map(esc).join('<br>')+'</div>':'')+'<div class="tb"><button class="btn pri" data-act="kickoff">Kick off the '+U.season.year+' season</button><span class="muted">'+U.season.games.length+' games over '+U.season.weeks+' weeks · '+esc(U.season.schedSource||'')+'</span></div>'+weekView(liveView());
  return h;
}

/* ============================== HOME ============================== */
function homeView(){
  const U=APP.U,s=U.setup,v=liveView(),ts=v.teams,n=ts.filter(t=>asset(t.logo)).length,H=leagueHistory(),prev=H.seasons[H.seasons.length-1];
  let h='';
  if(v.phase==='complete')h+=championHero(v)+'<div class="tb"><button class="btn pri" data-act="offseason">Advance to the '+(v.year+1)+' offseason</button><button class="btn" data-act="tab" data-v="playoffs">Final bracket</button></div>';
  if(v.phase==='preseason'){
    h+='<section class="panel"><div class="divhero" style="--tc:#013369">'+img(lSrc(s),110)+'<div><h3>'+v.year+' preseason</h3><div class="sub">'+ts.length+' teams · '+s.rules.games+' games · '+s.rules.playoffTeams+' playoff teams per conference</div></div></div><div class="pad"><div class="tb" style="margin:0"><button class="btn pri" data-act="tab" data-v="schedule">'+(U.season.games.length?'Review schedule and kick off':'Set the schedule')+'</button><button class="btn" data-act="tab" data-v="office">League office: ratings, rules, expansion</button><button class="btn" data-act="bulk">Upload logos ('+n+' of '+ts.length+')</button></div></div></section>';
  }else if(v.phase!=='complete'){
    const reg=regGames(v),p=reg.filter(g=>g.played).length;
    h+='<div class="tb"><div class="progress"><b style="width:'+Math.round(100*p/Math.max(1,reg.length))+'%"></b></div><span class="muted">'+p+' of '+reg.length+' regular season games</span><span class="sp"></span><button class="btn pri" data-act="tab" data-v="'+(v.phase==='playoffs'?'playoffs':'schedule')+'">'+(v.phase==='playoffs'?'Play the postseason':p===reg.length?'Season done — seed the playoffs':'Play week '+currentWeek(v))+'</button></div>';
    const tab=tableOf(v),seeds=seedsFor(v,tab);
    h+='<div class="cols2">'+v.confs.map(c=>'<div>'+confHead(c)+'<section class="panel"><div class="strip">'+(seeds[c.id]?seeds[c.id].seeds.map((id,i)=>seedTile(v,vTeam(v,id),i+1,recStr(tab[id].o))).join(''):'')+'</div></section></div>').join('')+'</div>';
  }
  if(prev&&v.phase!=='complete'&&prev.champ)h+='<div class="note" style="display:flex;gap:14px;align-items:center">'+logo(prev.champ,72)+'<div><div class="sub">Defending champions</div><h3>'+esc(prev.champ.name)+'</h3></div></div>';
  h+='<section class="panel"><div class="pad" style="padding-bottom:0"><h3>The league</h3></div>'+v.confs.map(c=>'<div class="wall">'+v.divs.filter(d=>d.confId===c.id).flatMap(d=>ts.filter(t=>t.divId===d.id)).map(t=>'<button class="tile" data-act="team" data-id="'+t.id+'" data-drop="logo:team:'+t.id+'">'+logo(t,80)+'<span class="a">'+esc(t.abbr)+'</span></button>').join('')+'</div>').join('')+'</section>';
  return h;
}

/* ============================== HISTORY ============================== */
function historyView(){
  const H=leagueHistory(),s=APP.U.setup;
  if(APP.histYear!=null){
    const sum=H.seasons.find(x=>x.year===APP.histYear);
    if(sum){const v=sum.v;if(APP.histTab==='schedule'){}
      let h='<div class="tb"><button class="btn" data-act="histback">← League history</button>'+seg('histtab',APP.histTab,[['champion','Champion'],['standings','Standings'],['bracket','Bracket'],['schedule','Results']])+(APP.histTab==='standings'?seg('sv',APP.sv,[['div','Division'],['conf','Conference'],['league','League']]):'')+'<span class="sp"></span><button class="btn ghost" data-act="shot">Screenshot view</button></div>';
      return h+(APP.histTab==='champion'?championHero(v):APP.histTab==='standings'?standingsView(v,APP.sv):APP.histTab==='bracket'?bracketView(v):weekView(v));}
    APP.histYear=null;
  }
  if(!H.seasons.length)return '<div class="panel empty">'+img(lSrc(s),90)+'<p style="margin:auto">No champions yet. Finish a season and it is recorded here with its standings, bracket and every score.</p></div>';
  let h='<div class="tb">'+seg('histview',APP.histView,[['seasons','Champions'],['alltime','All-time standings'],['records','Records']])+'</div>';
  if(APP.histView==='seasons'){
    const titles=Object.values(H.fr).filter(f=>f.titles.length).sort((a,b)=>b.titles.length-a.titles.length||b.titles[b.titles.length-1]-a.titles[a.titles.length-1]);
    h+='<h3 class="pt">Trophy case</h3><div class="cards" style="margin-top:8px">'+titles.map(f=>{const t=T(f.id)||f.seasons[f.seasons.length-1].t;return '<button class="card" data-act="team" data-id="'+f.id+'" style="--tc:'+safeColor(t.color)+'">'+logo(t,110)+'<span class="nm">'+esc(t.name)+'</span><span class="yr" style="color:var(--accent)">'+f.titles.length+'×</span><span class="small muted">'+f.titles.join(', ')+'</span></button>';}).join('')+'</div><h3 class="pt">Champions by season</h3><div class="cards" style="margin-top:8px">'+
      H.seasons.slice().reverse().map(x=>x.champ?'<button class="card" data-act="histyear" data-v="'+x.year+'" style="--tc:'+safeColor(x.champ.color)+'"><span class="yr">'+x.year+'</span><span class="sub">'+esc(titleLabel(x.v))+'</span>'+logo(x.champ,150)+'<span class="nm">'+esc(x.champ.name)+'</span>'+(x.runner&&x.final?'<span class="mini" style="align-items:center">'+Math.max(x.final.hs,x.final.as)+'-'+Math.min(x.final.hs,x.final.as)+' over '+logo(x.runner,34)+esc(x.runner.abbr)+'</span>':'')+(x.best?'<span class="small muted">Best record: '+esc(x.best.name)+' '+recStr(x.best.o)+'</span>':'')+'</button>':'').join('')+'</div>';
  }else if(APP.histView==='alltime'){
    const rows=Object.values(H.fr).sort((a,b)=>b.titles.length-a.titles.length||pct({w:b.w,t:b.t,gp:b.w+b.l+b.t})-pct({w:a.w,t:a.t,gp:a.w+a.l+a.t}));
    h+='<section class="panel tw"><table><thead><tr><th>#</th><th class="l">Franchise</th><th>Seasons</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>Playoffs</th><th>PO W-L</th><th>Div titles</th><th>Conf titles</th><th>Championships</th></tr></thead><tbody>'+rows.map((f,i)=>{const t=T(f.id)||f.seasons[f.seasons.length-1].t,r={w:f.w,l:f.l,t:f.t,gp:f.w+f.l+f.t};return '<tr><td>'+(i+1)+'</td><td class="tm" style="--tc:'+safeColor(t.color)+'">'+tlink(t,'<span class="tmn">'+logo(t,40)+esc(t.name)+(t.active===false?' <span class="muted small">(retired)</span>':'')+'</span>')+'</td><td>'+f.seasons.length+'</td><td>'+f.w+'</td><td>'+f.l+'</td><td>'+f.t+'</td><td>'+fmtPct(r)+'</td><td>'+f.apps+'</td><td>'+f.pw+'-'+f.pl+'</td><td>'+f.divT.length+'</td><td>'+f.confT.length+'</td><td><b>'+f.titles.length+'</b></td></tr>';}).join('')+'</tbody></table></section>';
  }else{
    h+='<div class="cards">'+Object.entries(H.records).map(([k,r])=>'<div class="card" style="--tc:'+safeColor(r.team.color)+'"><span class="sub">'+esc(k)+'</span>'+logo(r.team,90)+'<span class="nm">'+esc(r.team.name)+'</span><span class="yr">'+esc(r.text)+'</span><span class="small muted">'+r.year+'</span></div>').join('')+'</div>';
  }
  if(APP.U.moves.length)h+='<details class="panel"><summary>League transactions ('+APP.U.moves.length+')</summary><div>'+APP.U.moves.slice().reverse().map(m=>'<div><b>'+m.year+'</b> — '+esc(m.text)+'</div>').join('')+'</div></details>';
  return h;
}

/* ============================== TEAM PAGES ============================== */
function teamsView(){
  const U=APP.U,s=U.setup,H=leagueHistory(),t=APP.teamId&&T(APP.teamId);
  if(!t){const retired=s.teams.filter(x=>!x.active);
    const wall=list=>'<div class="wall">'+list.map(x=>'<button class="tile" data-act="team" data-id="'+x.id+'" data-drop="logo:team:'+x.id+'">'+logo(x,96)+'<span class="a">'+esc(x.abbr)+'</span><span class="small muted">'+esc(x.name)+'</span></button>').join('')+'</div>';
    return '<p class="muted">Pick a team for its history.</p>'+s.confs.map(c=>confHead(c)+'<section class="panel">'+wall(s.divs.filter(d=>d.confId===c.id).flatMap(d=>activeTeams(s).filter(x=>x.divId===d.id)))+'</section>').join('')+(retired.length?'<h3 class="pt">Retired franchises</h3><section class="panel">'+wall(retired)+'</section>':'');}
  const f=H.fr[t.id],v=liveView(),d=s.divs.find(x=>x.id===t.divId),c=d&&s.confs.find(x=>x.id===d.confId);
  const cur=t.active&&v.games.length?tableOf(v)[t.id]:null;
  const rec=f?{w:f.w,l:f.l,t:f.t,gp:f.w+f.l+f.t}:blank();
  let h='<div class="tb"><button class="btn" data-act="team" data-id="">← All teams</button><select class="in" data-ch="teampick" aria-label="Team">'+s.teams.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(x=>'<option value="'+x.id+'"'+(x.id===t.id?' selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select><span class="sp"></span><button class="btn" data-act="uplogo" data-key="team:'+t.id+'">'+(asset(t.logo)?'Replace':'Upload')+' logo</button><button class="btn ghost" data-act="shot">Screenshot view</button></div>';
  h+='<div class="champ" style="--tc:'+safeColor(t.color)+'" data-drop="logo:team:'+t.id+'">'+img(tSrc(t),520,'wm r')+img(tSrc(t),300,'big')+'<h2>'+esc(t.name)+'</h2><div class="sub">'+esc((c?c.name:'')+' '+(d?d.name:''))+' · since '+t.joined+(t.active?'':' · retired')+'</div>'+(f&&f.titles.length?'<div class="pathrow">'+f.titles.map(y=>'<div class="pchip">'+img(asset(s.trophyLogo)||lSrc(s),44)+'<b>'+y+'</b>Champions</div>').join('')+'</div>':'')+'</div>';
  const stat=(a,b)=>'<div class="stat"><b>'+a+'</b><span>'+b+'</span></div>';
  h+='<div class="stats">'+stat(f?f.titles.length:0,'Championships')+stat(f?f.confT.length:0,'Conference titles')+stat(f?f.divT.length:0,'Division titles')+stat(f?f.apps:0,'Playoff trips')+stat(recStr(rec),'All-time record')+stat(fmtPct(rec),'Win pct')+stat(f?f.pw+'-'+f.pl:'0-0','Playoff record')+(cur&&U.season.phase!=='complete'?stat(recStr(cur.o),U.season.year+' so far'):'')+'</div>';
  if(f){h+='<section class="panel"><div class="pad" style="padding-bottom:4px"><h3>Season by season</h3></div><div class="tw"><table><thead><tr><th class="l">Year</th><th class="l">Team</th><th class="l">Division</th><th>W-L-T</th><th>PCT</th><th>PF</th><th>PA</th><th>Div</th><th>Seed</th><th class="l">Finish</th></tr></thead><tbody>'+f.seasons.slice().reverse().map(x=>'<tr><td class="l"><button class="link" data-act="histyear" data-v="'+x.year+'"><b>'+x.year+'</b></button></td><td class="l"><span class="tmn">'+logo(x.t,30)+esc(x.t.name)+'</span></td><td class="l">'+esc(x.conf.name+' '+x.div.name)+'</td><td>'+recStr(x.r.o)+'</td><td>'+fmtPct(x.r.o)+'</td><td>'+x.r.pf+'</td><td>'+x.r.pa+'</td><td>'+x.divRank+'</td><td>'+(x.seed||'–')+'</td><td class="l">'+(x.champ?'<b style="color:var(--accent)">'+esc(x.result)+'</b>':esc(x.result))+'</td></tr>').join('')+'</tbody></table></div></section>';
    const hh=Object.entries(f.h2h).map(([id,r])=>({t:T(id),r})).filter(x=>x.t).sort((a,b)=>b.r.gp-a.r.gp||pct(b.r)-pct(a.r));
    h+='<details class="panel"><summary>Head-to-head, completed seasons</summary><div class="tw"><table><thead><tr><th class="l">Opponent</th><th>W</th><th>L</th><th>T</th><th>PCT</th></tr></thead><tbody>'+hh.map(x=>'<tr><td class="l"><span class="tmn">'+logo(x.t,28)+esc(x.t.name)+'</span></td><td>'+x.r.w+'</td><td>'+x.r.l+'</td><td>'+x.r.t+'</td><td>'+fmtPct(x.r)+'</td></tr>').join('')+'</tbody></table></div></details>';
    if(f.names.length>1)h+='<section class="panel pad"><h3>Identity history</h3><div class="mini" style="justify-content:flex-start">'+f.names.map(n=>'<span class="pill">'+logo(n.t,30)+n.year+' · '+esc(n.name)+'</span>').join('')+'</div></section>';
  }
  if(cur){const gs=v.games.filter(g=>g.h===t.id||g.a===t.id).sort((a,b)=>(a.type==='po')-(b.type==='po')||(a.wk||a.round)-(b.wk||b.round));
    h+='<section class="panel"><div class="pad" style="padding-bottom:4px"><h3>'+U.season.year+' schedule</h3></div><div class="tw"><table><thead><tr><th class="l">Week</th><th class="l">Opponent</th><th>Result</th></tr></thead><tbody>'+gs.map(g=>{const home=g.h===t.id,o=T(home?g.a:g.h),m=home?g.hs:g.as,p=home?g.as:g.hs;return '<tr><td class="l">'+(g.type==='po'?esc(roundLabel(v,g)):g.wk)+'</td><td class="l"><span class="tmn">'+logo(o,30)+(home?'vs ':'at ')+esc(o.name)+'</span></td><td>'+(g.played?'<b>'+(m>p?'W':m<p?'L':'T')+'</b> '+m+'-'+p+(g.ot?' OT':''):'–')+'</td></tr>';}).join('')+'</tbody></table></div></section>';}
  return h;
}

/* ============================== LEAGUE OFFICE ============================== */
const structureOpen=()=>APP.U.season.phase==='preseason';
function logoTile(key,src,label,has){return '<div class="tile" data-drop="logo:'+key+'">'+img(src,86)+'<span class="a">'+esc(label)+'</span><span class="mini"><button class="btn sm" data-act="uplogo" data-key="'+key+'">'+(has?'Replace':'Upload')+'</button>'+(has?'<button class="btn sm ghost" data-act="rmlogo" data-key="'+key+'" aria-label="Remove '+esc(label)+' logo">×</button>':'')+'</span></div>';}
function officeView(){
  const U=APP.U,s=U.setup,r=s.rules,open=structureOpen(),dis=open?'':' disabled';
  const chk=(k,l)=>'<label class="chk"><input type="checkbox" data-ch="rule" data-k="'+k+'"'+(r[k]?' checked':'')+'>'+l+'</label>';
  const num=(k,l,min,max)=>'<label class="f">'+l+'<input class="in" type="number" min="'+min+'" max="'+max+'" data-ch="rule" data-k="'+k+'" value="'+r[k]+'"></label>';
  const txt=(k,l,val)=>'<label class="f">'+l+'<input class="in" data-ch="league" data-k="'+k+'" value="'+esc(val)+'"></label>';
  let h='<div class="note">'+(open?'It is the preseason: you can add expansion teams, move teams between divisions, or retire a franchise. If you change the lineup, the schedule is cleared so you can rebuild it.':'Names, colors, logos and ratings can change any time. Expansion and realignment open in the next preseason.')+'</div>';
  h+='<section class="panel pad"><h3>Logos</h3><p class="muted small">At least 240×240. Drop a whole folder of files here and they match by file name (KC.png, chiefs.png, Kansas City Chiefs.png). Name others NFL.png or league.png, AFC.png, NFC.png and trophy.png.</p><div class="drop" data-drop="bulk"><button class="btn pri" data-act="bulk">Choose logo files</button><div class="small">'+activeTeams(s).filter(t=>asset(t.logo)).length+' of '+activeTeams(s).length+' team logos loaded</div></div><div class="wall" style="padding:0">'+logoTile('league',lSrc(s),s.leagueName,!!asset(s.leagueLogo))+logoTile('trophy',asset(s.trophyLogo)||badge('CUP','#b8860b','circle'),'Trophy',!!asset(s.trophyLogo))+s.confs.map(c=>logoTile('conf:'+c.id,cSrc(c),c.name,!!asset(c.logo))).join('')+'</div></section>';
  h+='<section class="panel pad"><h3>Teams and ratings</h3><p class="muted small">Base score = (own OFF − opponent DEF), plus HFA for the home team, minus the visitor’s own HFA for the visitor. Under that formula a <b>higher DEF is a stingier defense</b>. Each team then adds a d100 Main Chart result.</p><div class="tb"><button class="btn pri" data-act="addteam"'+dis+'>+ Add expansion team</button><button class="btn" data-act="upteams"'+dis+'>Import teams (.xlsx)</button><button class="btn" data-act="upratings">Upload ratings (.xlsx / .csv)</button><button class="btn ghost" data-act="teamtemplate">Download teams and ratings</button><button class="btn ghost" data-act="randratings">Randomize ratings</button></div>';
  s.confs.forEach(c=>{s.divs.filter(d=>d.confId===c.id).forEach(d=>{
    h+='<div class="confh" style="margin-top:10px">'+img(cSrc(c),32)+'<b class="disp" style="font-size:20px">'+esc(c.name)+'</b><input class="in" data-ch="divname" data-id="'+d.id+'" value="'+esc(d.name)+'" aria-label="Division name" style="width:150px">'+(open&&!s.teams.some(t=>t.active&&t.divId===d.id)?'<button class="btn sm danger" data-act="deldiv" data-id="'+d.id+'">Delete empty division</button>':'')+'</div><div class="tw"><table class="team-ed"><thead><tr><th class="l">Logo</th><th class="l">Name</th><th>Abbr</th><th>Color</th><th>OFF</th><th>DEF</th><th>HFA</th><th class="l">Rival</th><th class="l">Division</th><th></th></tr></thead><tbody>';
    activeTeams(s).filter(t=>t.divId===d.id).forEach(t=>{const f=(k,type,cls,x)=>'<input class="in '+cls+'" type="'+type+'" data-ch="tf" data-id="'+t.id+'" data-k="'+k+'" value="'+esc(t[k])+'" aria-label="'+esc(t.abbr+' '+k)+'" '+(x||'')+'>';
      h+='<tr data-drop="logo:team:'+t.id+'"><td class="l"><button class="link" data-act="uplogo" data-key="team:'+t.id+'" title="Upload logo">'+logo(t,48)+'</button></td><td class="l">'+f('name','text','','style="width:210px"')+'</td><td>'+f('abbr','text','num','maxlength="4"')+'</td><td><input type="color" data-ch="tf" data-id="'+t.id+'" data-k="color" value="'+safeColor(t.color)+'" aria-label="'+esc(t.abbr)+' color"></td><td>'+f('off','number','num')+'</td><td>'+f('def','number','num')+'</td><td>'+f('hfa','number','num')+'</td><td class="l"><select class="in" data-ch="tf" data-id="'+t.id+'" data-k="rivalId" aria-label="Rival"><option value="">None</option>'+activeTeams(s).filter(o=>o.id!==t.id).map(o=>'<option value="'+o.id+'"'+(t.rivalId===o.id?' selected':'')+'>'+esc(o.abbr)+'</option>').join('')+'</select></td><td class="l"><select class="in" data-ch="tf" data-id="'+t.id+'" data-k="divId" aria-label="Division"'+dis+'>'+s.divs.map(x=>'<option value="'+x.id+'"'+(t.divId===x.id?' selected':'')+'>'+esc(s.confs.find(c=>c.id===x.confId).name+' '+x.name)+'</option>').join('')+'</select></td><td><button class="btn sm ghost danger" data-act="retire" data-id="'+t.id+'"'+dis+'>Retire</button></td></tr>';});
    h+='</tbody></table></div>';});
    h+='<button class="btn sm" data-act="adddiv" data-id="'+c.id+'"'+dis+' style="margin-top:8px">+ Division in '+esc(c.name)+'</button>';});
  const gone=s.teams.filter(t=>!t.active);
  if(gone.length)h+='<div style="margin-top:14px"><span class="sub">Retired</span> '+gone.map(t=>'<span class="pill">'+logo(t,24)+esc(t.name)+' <button class="btn sm ghost" data-act="revive" data-id="'+t.id+'"'+dis+'>Bring back</button></span>').join(' ')+'</div>';
  h+='</section><section class="panel pad"><h3>League and game rules</h3><div class="form" style="margin:12px 0">'+txt('uname','Universe name',U.name)+txt('leagueName','League name',s.leagueName)+txt('titleName','Title game name',s.titleName)+s.confs.map(c=>'<label class="f">Conference name<input class="in" data-ch="confname" data-id="'+c.id+'" value="'+esc(c.name)+'"></label>').join('')+num('games','Games per team',1,40)+num('playoffTeams','Playoff teams per conference',1,32)+'<label class="f">Schedule builder<select class="in" data-ch="rule" data-k="format"><option value="nfl"'+(r.format==='nfl'?' selected':'')+'>NFL formula (when league shape fits)</option><option value="flex"'+(r.format==='flex'?' selected':'')+'>Flexible</option></select></label>'+num('divEach','Flexible: games vs each division foe',0,4)+num('confEach','Flexible: games vs each conference foe',0,4)+'</div><div class="tb" style="margin:0">'+chk('ties','Ties possible in the regular season')+chk('useOT','Play one OT round when tied')+chk('neutralTitle','Neutral-site title game (no HFA)')+'</div><p class="small muted">Playoff games never tie: sudden-death OT rounds repeat until someone leads.</p></section>';
  return h;
}

/* ============================== SAVES ============================== */
function savesView(){
  const U=APP.U,I=APP.index,when=t=>new Date(t).toLocaleString([], {dateStyle:'medium',timeStyle:'short'});
  let h='<div class="note">Everything autosaves on this device only. <b>Export a universe file</b> now and then as your real backup, and to move to another device.</div>';
  h+='<section class="panel pad"><h3>Universes</h3><p class="muted small">Each one has its own teams, season and history.</p><div class="tb"><button class="btn pri" data-act="newuni">+ New universe</button><button class="btn" data-act="export" data-v="universe">Export this universe</button><button class="btn" data-act="import">Import a save file</button></div><div class="cards">'+I.universes.slice().sort((a,b)=>b.updated-a.updated).map(m=>'<div class="card"'+(m.id===U.id?' style="--tc:var(--accent)"':'')+'>'+img(asset(m.logo)||badge(String(m.league).slice(0,4).toUpperCase(),'#013369'),64)+'<span class="nm">'+esc(m.name)+'</span><span class="small muted">'+esc(m.league)+' · '+m.year+' · '+m.seasons+' past season'+(m.seasons===1?'':'s')+'<br>'+when(m.updated)+'</span><span class="mini">'+(m.id===U.id?'<span class="pill">Open</span><button class="btn sm" data-act="dupuni">Duplicate</button>':'<button class="btn sm pri" data-act="loaduni" data-id="'+m.id+'">Open</button><button class="btn sm ghost danger" data-act="deluni" data-id="'+m.id+'">Delete</button>')+'</span></div>').join('')+'</div></section>';
  h+='<section class="panel pad"><h3>League setups (start a new universe with your logos)</h3><p class="muted small">A setup keeps teams, divisions, ratings, rules and every logo, with no schedule, results or history.</p><div class="tb"><button class="btn pri" data-act="savesetup">Save current setup</button><button class="btn" data-act="export" data-v="setup">Export setup file</button></div>'+(I.setups.length?'<div class="cards">'+I.setups.map(m=>'<div class="card">'+img(asset(m.logo)||badge(String(m.league).slice(0,4).toUpperCase(),'#013369'),64)+'<span class="nm">'+esc(m.name)+'</span><span class="small muted">'+m.teams+' teams · '+m.logos+' team logos<br>'+when(m.saved)+'</span><span class="mini"><button class="btn sm pri" data-act="usesetup" data-id="'+m.id+'">New universe</button><button class="btn sm ghost danger" data-act="delsetup" data-id="'+m.id+'">Delete</button></span></div>').join('')+'</div>':'<p class="muted">No saved setups yet.</p>')+'</section>';
  h+='<section class="panel pad"><h3>Season checkpoints</h3><p class="muted small">Snapshot the current season (schedule, results, bracket, rosters and ratings) and return to it later. History from earlier years is untouched.</p><div class="tb"><button class="btn pri" data-act="checkpoint">Save checkpoint</button><button class="btn" data-act="export" data-v="season">Export season file</button></div>'+(U.checkpoints.length?'<div class="tw"><table><tbody>'+U.checkpoints.map((c,i)=>'<tr><td class="l"><b>'+esc(c.name)+'</b></td><td class="l muted">'+when(c.ts)+'</td><td><button class="btn sm" data-act="restore" data-v="'+i+'">Restore</button> <button class="btn sm ghost danger" data-act="delcp" data-v="'+i+'">Delete</button></td></tr>').join('')+'</tbody></table></div>':'')+'</section>';
  return h;
}

/* ============================== SHELL ============================== */
function render(){
  document.body.classList.toggle('shot',APP.shot);
  const U=APP.U;if(!U)return;const s=U.setup,v=liveView();
  const phase={preseason:'Preseason',regular:'Regular season',playoffs:'Playoffs',complete:'Season complete'}[v.phase];
  const light=document.documentElement.dataset.theme==='light';
  const tabs=[['home','Home'],['schedule','Schedule'],['standings','Standings'],['playoffs','Playoffs'],['history','League history'],['teams','Teams'],['office','League office'],['saves','Saves']];
  let h='<header class="hdr">'+img(lSrc(s),58)+'<div><h1>Gaspari Gridiron</h1><div class="sub">'+esc(U.name)+' · '+v.year+' '+esc(s.leagueName)+'</div></div><span class="sp"></span><span class="pill">'+phase+'</span><button class="btn sm noshot" data-act="theme">'+(light?'Dark mode':'Light mode')+'</button><button class="btn sm noshot" data-act="anim" aria-pressed="'+APP.anim+'">Dice animation: '+(APP.anim?'on':'off')+'</button></header>';
  h+='<nav class="nav">'+tabs.map(([k,l])=>'<button data-act="tab" data-v="'+k+'" aria-current="'+(APP.view===k)+'">'+l+'</button>').join('')+'</nav><main>';
  if(APP.saveError)h+='<div class="note" style="border-color:var(--bad)">Autosave failed on this device. Export your universe from the Saves tab so you don’t lose it.</div>';
  const shotBtn='<button class="btn ghost" data-act="shot">Screenshot view</button>';
  if(APP.view==='home')h+=homeView();
  else if(APP.view==='schedule'){
    if(v.phase==='preseason')h+=preseasonSchedule();
    else{h+=weekView(v);if(v.phase==='regular')h+='<div class="tb" style="margin-top:16px"><button class="btn'+(nextUnplayed(v)?'':' pri')+'" data-act="seedpo">Lock standings and seed the playoffs</button></div>';}
  }else if(APP.view==='standings')h+='<div class="tb">'+seg('sv',APP.sv,[['div','Division'],['conf','Playoff picture'],['league','League']])+'<span class="sp"></span>'+shotBtn+'</div>'+standingsView(v,APP.sv);
  else if(APP.view==='playoffs'){
    if(v.po){const live=v.phase==='playoffs',nx=live&&nextPoGame();
      h+='<div class="tb">'+(live?'<button class="btn pri" data-act="pnext">Roll next game</button><button class="btn" data-act="psimround">Sim round</button><button class="btn" data-act="psimall">Sim to champion</button>':'<button class="btn pri" data-act="offseason">Advance to the offseason</button>')+'<button class="btn" data-act="pundo"'+((v.po.order||[]).length?'':' disabled')+'>Undo last game</button><button class="btn ghost" data-act="preset">Reset playoffs</button><button class="btn ghost" data-act="reopen">Reopen regular season</button><span class="sp"></span>'+shotBtn+'</div>'+championHero(v)+bracketView(v);}
    else{const tab=tableOf(v),seeds=seedsFor(v,tab);
      h+='<div class="tb">'+(v.phase==='regular'?'<button class="btn pri" data-act="seedpo">Lock standings and seed the playoffs</button>':'<span class="muted">The bracket is seeded after the regular season.</span>')+'<span class="sp"></span>'+shotBtn+'</div>'+(regGames(v).some(g=>g.played)?'<h3 class="pt">If the season ended today</h3><div class="cols2" style="margin-top:10px">'+v.confs.map(c=>'<div>'+confHead(c)+'<section class="panel">'+playoffPicture(v,tab,seeds,c)+'</section></div>').join('')+'</div>':'<div class="panel empty">'+img(asset(s.trophyLogo)||lSrc(s),120)+'<p style="margin:10px auto">The playoff picture appears once games are played.</p></div>');}
  }else if(APP.view==='history')h+=historyView();
  else if(APP.view==='teams')h+=teamsView();
  else if(APP.view==='office')h+=officeView();
  else h+=savesView();
  document.getElementById('app').innerHTML=h+'</main>';
}
