'use strict';
/* ===== Gaspari Gridiron engine: charts and rules ported from histscot/gaspari-gridiron ===== */
const MAIN_CHART={1:-21,2:-17,3:-17,4:-14,5:-14,6:-10,7:-10,8:-8,9:-8,10:-8,11:-7,12:-7,13:-7,14:-7,15:-7,16:-6,17:-6,18:-6,19:-6,20:-6,21:-3,22:-3,23:-3,24:-3,25:-3,26:-3,27:-2,28:-2,29:-2,30:-2,31:-2,32:-2,33:-2,34:0,35:0,36:0,37:0,38:0,39:0,40:0,41:0,42:0,43:0,44:0,45:0,46:0,47:0,48:0,49:0,50:0,51:3,52:3,53:3,54:3,55:3,56:3,57:3,58:3,59:5,60:5,61:5,62:5,63:5,64:5,65:5,66:5,67:6,68:6,69:6,70:6,71:6,72:6,73:7,74:7,75:7,76:7,77:7,78:7,79:7,80:7,81:7,82:7,83:7,84:7,85:7,86:8,87:8,88:8,89:10,90:10,91:14,92:14,93:14,94:14,95:14,96:17,97:17,98:17,99:17,100:21};
const OT_CHART={1:0,2:6,3:6,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0,13:0,14:0,15:0,16:0,17:0,18:0,19:0,20:0,21:0,22:0,23:0,24:0,25:0,26:0,27:0,28:0,29:0,30:0,31:0,32:0,33:0,34:0,35:0,36:0,37:0,38:0,39:0,40:0,41:0,42:0,43:0,44:0,45:0,46:0,47:0,48:0,49:0,50:0,51:3,52:3,53:3,54:3,55:3,56:3,57:3,58:3,59:3,60:3,61:3,62:3,63:3,64:3,65:3,66:3,67:3,68:3,69:3,70:3,71:3,72:3,73:7,74:7,75:7,76:7,77:7,78:7,79:7,80:7,81:7,82:7,83:7,84:7,85:7,86:7,87:7,88:7,89:7,90:7,91:7,92:7,93:7,94:7,95:7,96:7,97:7,98:7,99:7,100:8};
const rand=()=>Math.random();
const d100=()=>Math.floor(rand()*100)+1;
const uid=p=>p+'_'+rand().toString(36).slice(2,9);
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const clampScore=s=>s<0?0:s===1?3:s;
function choose4(my,other){let o=my>other?[3,6].filter(v=>v>other):[3,6].filter(v=>v<other);if(!o.length)o=other<4?[6]:[3];return o[Math.floor(rand()*o.length)];}
/* 4 and 5 are not valid finals. 5 becomes 6 (3 when the other side already has 6, so a loss can't turn into a tie). 4 becomes 3 or 6 without flipping the result. */
function fixFinals(h,a){
  if(h===5&&a===5){h=6;a=6;} else if(h===5){h=a===6?3:6;} else if(a===5){a=h===6?3:6;}
  if(h===4&&a===4){h=a=rand()<.5?3:6;} else if(h===4){h=choose4(h,a);} else if(a===4){a=choose4(a,h);}
  return [h,a];
}
function baseScores(H,A,neutral){const hh=neutral?0:H.hfa,ah=neutral?0:A.hfa;return [(H.off-A.def)+hh,(A.off-H.def)-ah];}
/* rules:{ties,useOT}  playoff:boolean */
function rollScores(H,A,rules,playoff,neutral){
  const [hb,ab]=baseScores(H,A,neutral),hr=d100(),ar=d100();
  let hs=clampScore(hb+MAIN_CHART[hr]),as=clampScore(ab+MAIN_CHART[ar]);
  const otr=[];let ot=false;const must=playoff||!rules.ties;
  if(hs===as&&!(!playoff&&rules.ties&&!rules.useOT)){
    ot=true;let n=0;
    while(true){n++;const x=d100(),y=d100(),hp=clampScore(OT_CHART[x]),ap=clampScore(OT_CHART[y]);otr.push([x,y]);
      if(hp!==ap){hs=clampScore(hs+hp);as=clampScore(as+ap);break;}
      if(!must)break; if(n>500){hs+=3;break;}}
  }
  const pre=[hs,as];[hs,as]=fixFinals(hs,as);
  return {hs,as,ot,det:{hb,ab,hr,ar,otr,pre,neutral:!!neutral}};
}

/* ===== records, tiebreakers ===== */
const pct=r=>r.gp?(r.w+.5*r.t)/r.gp:0;
const blank=()=>({w:0,l:0,t:0,gp:0});
function add(r,o,p){r.gp++;if(o>p)r.w++;else if(o<p)r.l++;else r.t++;}
function buildTable(teams,divs,games){
  const confOf={};divs.forEach(d=>confOf[d.id]=d.confId);
  const T={};teams.forEach(t=>T[t.id]={id:t.id,name:t.name,divId:t.divId,confId:confOf[t.divId],o:blank(),home:blank(),away:blank(),div:blank(),conf:blank(),pf:0,pa:0,res:[],h2h:{}});
  games.filter(g=>g.type==='reg'&&g.played).sort((a,b)=>a.wk-b.wk).forEach(g=>{
    [[g.h,g.a,g.hs,g.as,true],[g.a,g.h,g.as,g.hs,false]].forEach(([me,op,s,p,home])=>{
      const r=T[me],q=T[op];if(!r||!q)return;add(r.o,s,p);add(home?r.home:r.away,s,p);
      if(r.divId===q.divId)add(r.div,s,p);if(r.confId===q.confId)add(r.conf,s,p);
      r.pf+=s;r.pa+=p;r.res.push(s>p?'W':s<p?'L':'T');
      const h=r.h2h[op]||(r.h2h[op]=blank());add(h,s,p);});
  });
  return T;
}
/* Rules of Play order: win pct, games played, head-to-head, division pct, conference pct, name */
function cmpRows(a,b){
  const pa=pct(a.o),pb=pct(b.o);if(pa!==pb)return pb-pa;
  if(a.o.gp!==b.o.gp)return b.o.gp-a.o.gp;
  const h=a.h2h[b.id];if(h&&h.w!==h.l)return h.l-h.w;
  const da=pct(a.div),db=pct(b.div);if(da!==db)return db-da;
  const ca=pct(a.conf),cb=pct(b.conf);if(ca!==cb)return cb-ca;
  return a.name.localeCompare(b.name);
}

/* ===== playoffs ===== */
function isSafeSize(n,D){let s=1;while(s<n)s*=2;const byes=s-n,nbw=Math.max(0,D-byes),playing=n-byes;if(playing-nbw<nbw)return false;return Math.min(byes,D)<=playing/2;}
function confSeeding(teams,divs,table,confId,configured){
  const cd=divs.filter(d=>d.confId===confId);
  const ranked=teams.filter(t=>cd.some(d=>d.id===t.divId)).map(t=>table[t.id]).sort(cmpRows);
  const win=new Set(cd.map(d=>{const l=ranked.filter(r=>r.divId===d.id);return l.length?l[0].id:null;}).filter(Boolean));
  const W=ranked.filter(r=>win.has(r.id)).map(r=>r.id),C=ranked.filter(r=>!win.has(r.id)).map(r=>r.id);
  let n=Math.min(Math.max(configured,W.length,1),ranked.length);
  while(n<ranked.length&&!isSafeSize(n,W.length))n++;
  return {seeds:W.concat(C.slice(0,Math.max(0,n-W.length))),winners:W,order:ranked.map(r=>r.id)};
}
function computeByes(ids){let s=1;while(s<ids.length)s*=2;const b=s-ids.length;return {byes:ids.slice(0,b),playing:ids.slice(b)};}
function pairTeams(ids,seed,winners){
  const by=(a,b)=>seed[a]-seed[b],W=ids.filter(i=>winners.has(i)).sort(by),U=ids.filter(i=>!winners.has(i)).sort(by),P=[];
  while(W.length&&U.length)P.push([W.shift(),U.pop()]);
  while(W.length>=2)P.push([W.shift(),W.pop()]);
  while(U.length>=2)P.push([U.shift(),U.pop()]);
  return P.map(([a,b])=>seed[a]<seed[b]?[a,b]:[b,a]).sort((x,y)=>seed[x[0]]-seed[y[0]]);
}

/* ===== scheduling ===== */
/* Euler-circuit orientation: every team's home and away counts end within 1 */
function orient(pairs){
  const adj={},edges=pairs.map(p=>({a:p.a,b:p.b,riv:p.riv,used:false,home:null}));
  const link=(u,e)=>(adj[u]||(adj[u]=[])).push(e);
  edges.forEach(e=>{link(e.a,e);link(e.b,e);});
  const odd=Object.keys(adj).filter(k=>adj[k].length%2);
  odd.forEach(k=>{const e={a:k,b:'#',used:false,dummy:true};link(k,e);link('#',e);});
  Object.values(adj).forEach(shuffle);
  shuffle(Object.keys(adj)).forEach(start=>{
    const st=[start];
    while(st.length){const u=st[st.length-1];let e;while(adj[u].length&&(e=adj[u][adj[u].length-1]).used)adj[u].pop();
      if(!adj[u].length){st.pop();continue;}e=adj[u].pop();e.used=true;const v=e.a===u?e.b:e.a;e.home=u;st.push(v);}
  });
  return edges.filter(e=>!e.dummy).map(e=>({h:e.home,a:e.home===e.a?e.b:e.a,riv:e.riv}));
}
/* Put games into weeks (no team twice in a week). Min-conflict tabu search; byes held inside byeWin when there is exactly one spare week. */
function placeWeeks(games,ids,weeks,byeWin){
  const per={};ids.forEach(i=>per[i]=0);games.forEach(g=>{per[g.h]++;per[g.a]++;});
  const bye={};
  if(byeWin){const wk=[];for(let w=byeWin[0];w<=byeWin[1];w++)wk.push(w);
    const need=shuffle(ids.filter(i=>per[i]===weeks-1));
    if(need.length%2===0){let k=0;for(let i=0;i<need.length;i+=2){const w=wk[k++%wk.length];bye[need[i]]=w;bye[need[i+1]]=w;}}}
  const occ={};ids.forEach(i=>{occ[i]=[];for(let w=0;w<=weeks;w++)occ[i][w]=[];});
  const put=(g,w)=>{g.wk=w;occ[g.h][w].push(g);occ[g.a][w].push(g);};
  const take=g=>{for(const t of [g.h,g.a]){const L=occ[t][g.wk];L.splice(L.indexOf(g),1);}};
  const cost=(g,w)=>occ[g.h][w].filter(x=>x!==g).length+occ[g.a][w].filter(x=>x!==g).length+(bye[g.h]===w?1:0)+(bye[g.a]===w?1:0);
  shuffle(games.slice()).forEach(g=>{let best=[],bc=1e9;for(let w=1;w<=weeks;w++){const c=cost(g,w);if(c<bc){bc=c;best=[w];}else if(c===bc)best.push(w);}put(g,best[Math.floor(rand()*best.length)]);});
  const tabu=new Map();
  for(let it=0;it<150000;it++){
    const bad=games.filter(g=>cost(g,g.wk)>0);
    if(!bad.length)return true;
    const g=bad[Math.floor(rand()*bad.length)];
    let best=[],bc=1e9;
    for(let w=1;w<=weeks;w++){if(w===g.wk)continue;const k=games.indexOf(g)+':'+w;let c=cost(g,w);if((tabu.get(k)||0)>it&&c>0)continue;if(c<bc){bc=c;best=[w];}else if(c===bc)best.push(w);}
    if(!best.length)continue;
    const w=rand()<.02?1+Math.floor(rand()*weeks):best[Math.floor(rand()*best.length)];
    tabu.set(games.indexOf(g)+':'+g.wk,it+8+Math.floor(rand()*10));
    const clash=[...new Set(occ[g.h][w].concat(occ[g.a][w]))].filter(x=>x!==g),old=g.wk;
    take(g);put(g,w);
    if(clash.length===1&&rand()<.75){const c=clash[0];take(c);tabu.set(games.indexOf(c)+':'+w,it+8);put(c,old);}
  }
  return false;
}
/* Swap whole weeks and move rivalry-heavy weeks late; break immediate rematches */
function polishWeeks(games,weeks,byeWin){
  const rematches=map=>{const s={};let n=0;games.forEach(g=>{const k=[g.h,g.a].sort().join('|');(s[k]||(s[k]=[])).push(map[g.wk]);});
    Object.values(s).forEach(a=>{a.sort((x,y)=>x-y);for(let i=1;i<a.length;i++)if(a[i]===a[i-1]+1)n++;});return n;};
  let map=Array.from({length:weeks+1},(_,i)=>i),best=rematches(map);
  const inWin=w=>byeWin&&w>=byeWin[0]&&w<=byeWin[1];
  for(let it=0;it<1500&&best>0;it++){const x=1+Math.floor(rand()*weeks),y=1+Math.floor(rand()*weeks);if(x===y)continue;
    const m=map.slice(),i=m.indexOf(x),j=m.indexOf(y);if(byeWin&&inWin(x)!==inWin(y))continue;[m[i],m[j]]=[m[j],m[i]];const c=rematches(m);if(c<=best){map=m;best=c;}}
  games.forEach(g=>g.wk=map[g.wk]);
  /* finish on the rivalry / division week */
  const score=w=>games.filter(g=>g.wk===w&&g.riv).length*3+games.filter(g=>g.wk===w&&g.dv).length;
  let top=weeks;for(let w=1;w<=weeks;w++)if(!(byeWin&&inWin(w))&&score(w)>score(top))top=w;
  if(top!==weeks&&!(byeWin&&inWin(weeks)))games.forEach(g=>{if(g.wk===top)g.wk=weeks;else if(g.wk===weeks)g.wk=top;});
  return games;
}
function isNflShape(confs,divs,teams,games){return confs.length===2&&games===17&&confs.every(c=>{const d=divs.filter(x=>x.confId===c.id);return d.length===4&&d.every(v=>teams.filter(t=>t.divId===v.id).length===4);})&&teams.length===32;}
/* The current NFL 17-game formula. place: teamId -> 0..3 finish in last season's division */
function nflPairs(confs,divs,teams,year,place){
  const D=confs.map(c=>divs.filter(d=>d.confId===c.id));
  const M=D.map(cd=>cd.map(d=>teams.filter(t=>t.divId===d.id).sort((a,b)=>(place[a.id]??9)-(place[b.id]??9))));
  const P=[],push=(a,b,x)=>P.push(Object.assign({a:a.id,b:b.id},x));
  const rot=[[[0,1],[2,3]],[[0,2],[1,3]],[[0,3],[1,2]]][((year%3)+3)%3];
  const fixed=[];
  M.forEach(cm=>{
    cm.forEach(dv=>{for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){fixed.push({h:dv[i].id,a:dv[j].id,dv:true});fixed.push({h:dv[j].id,a:dv[i].id,dv:true});}});
    rot.forEach(([x,y])=>cm[x].forEach(a=>cm[y].forEach(b=>push(a,b))));
    const mate={};rot.forEach(([x,y])=>{mate[x]=y;mate[y]=x;});
    for(let x=0;x<4;x++)for(let y=x+1;y<4;y++)if(mate[x]!==y)for(let k=0;k<4;k++)push(cm[x][k],cm[y][k]);
  });
  for(let i=0;i<4;i++){
    const j=(i+year)%4;M[0][i].forEach(a=>M[1][j].forEach(b=>push(a,b)));
    const j2=(i+year+2)%4;for(let k=0;k<4;k++)push(M[0][i][k],M[1][j2][k]);
  }
  return {P,fixed};
}
/* Rules of Play order for custom / expanded leagues: division, conference, rivalry, then fill (cross-conference first) */
function flexPairs(confs,divs,teams,G,divEach,confEach){
  const tot={},vs={},P=[],notes=[];teams.forEach(t=>{tot[t.id]=0;vs[t.id]={};});
  const confOf=t=>divs.find(d=>d.id===t.divId).confId;
  const rec=(a,b,riv)=>{P.push({a:a.id,b:b.id,riv:!!riv,dv:a.divId===b.divId});tot[a.id]++;tot[b.id]++;vs[a.id][b.id]=(vs[a.id][b.id]||0)+1;vs[b.id][a.id]=(vs[b.id][a.id]||0)+1;};
  const phase=(times,ok,label)=>{for(let k=0;k<times;k++){const cand=[];for(let i=0;i<teams.length;i++)for(let j=i+1;j<teams.length;j++)if(ok(teams[i],teams[j]))cand.push([teams[i],teams[j]]);
    let cut=0;shuffle(cand).forEach(([a,b])=>{if(tot[a.id]<G&&tot[b.id]<G)rec(a,b);else cut++;});if(cut)notes.push('Season too short for every '+label+' game; '+cut+' left off.');}};
  phase(divEach,(a,b)=>a.divId===b.divId,'division');
  /* With two or more conferences, leave room for inter-conference games (about the NFL's mix) */
  const room={},nd={};teams.forEach(t=>{room[t.id]=confs.length>1?Math.max(0,Math.round((G-tot[t.id])*.55)):G;nd[t.id]=0;});
  for(let k=0;k<confEach;k++){const cand=[];for(let i=0;i<teams.length;i++)for(let j=i+1;j<teams.length;j++){const a=teams[i],b=teams[j];if(a.divId!==b.divId&&confOf(a)===confOf(b))cand.push([a,b]);}
    shuffle(cand).forEach(([a,b])=>{if(tot[a.id]<G&&tot[b.id]<G&&nd[a.id]<room[a.id]&&nd[b.id]<room[b.id]){rec(a,b);nd[a.id]++;nd[b.id]++;}});}
  teams.forEach(t=>{const r=teams.find(x=>x.id===t.rivalId);if(!r)return;if(vs[t.id][r.id]){const g=P.find(p=>(p.a===t.id&&p.b===r.id)||(p.a===r.id&&p.b===t.id));g.riv=true;}else if(tot[t.id]<G&&tot[r.id]<G)rec(t,r,true);});
  for(let guard=0;guard<20000;guard++){
    const need=shuffle(teams.filter(t=>tot[t.id]<G)).sort((a,b)=>(G-tot[b.id])-(G-tot[a.id]));
    if(need.length<2)break;const A=need[0],pool=need.slice(1);
    const key=x=>(vs[A.id][x.id]||0)*100+(confOf(x)!==confOf(A)?0:10)-(G-tot[x.id])*.5;
    pool.sort((x,y)=>key(x)-key(y));rec(A,pool[0]);
  }
  teams.forEach(t=>{if(tot[t.id]!==G)notes.push(t.name+' has '+tot[t.id]+' games instead of '+G+(teams.length*G%2?' (an odd number of teams with an odd number of games always leaves one team short).':'.'));});
  return {P,notes:[...new Set(notes)]};
}
function makeSchedule(setup,teams,year,place){
  const {confs,divs,rules}=setup,ids=teams.map(t=>t.id);
  const nfl=rules.format==='nfl'&&isNflShape(confs,divs,teams,rules.games);
  let games,notes=[],riv={};
  teams.forEach(t=>{if(t.rivalId)riv[[t.id,t.rivalId].sort().join('|')]=true;});
  if(nfl){const r=nflPairs(confs,divs,teams,year,place||{});games=r.fixed.concat(orient(r.P));}
  else{const r=flexPairs(confs,divs,teams,rules.games,rules.divEach,rules.confEach);notes=r.notes;
    const o=orient(r.P);const dv={};teams.forEach(t=>dv[t.id]=t.divId);o.forEach(g=>g.dv=dv[g.h]===dv[g.a]);games=o;}
  games.forEach(g=>g.riv=!!riv[[g.h,g.a].sort().join('|')]);
  const per={};ids.forEach(i=>per[i]=0);games.forEach(g=>{per[g.h]++;per[g.a]++;});
  const most=Math.max(0,...Object.values(per));
  let weeks=Math.max(most+1,Math.ceil(games.length/Math.max(1,Math.floor(ids.length/2)))),win=null,ok=false;
  for(let extra=0;extra<6&&!ok;extra++){
    const W=weeks+extra;
    win=(W===most+1&&W>=14)?[5,W-4]:null;
    ok=placeWeeks(games,ids,W,win);
    if(!ok&&win){win=null;ok=placeWeeks(games,ids,W,null);}
    if(ok)weeks=W;
  }
  if(!ok)return {error:'Could not fit this schedule into weeks. Lower the division or conference game counts and try again.'};
  polishWeeks(games,weeks,win);
  return {nfl,weeks,notes,games:games.sort((a,b)=>a.wk-b.wk).map(g=>({id:uid('g'),type:'reg',wk:g.wk,h:g.h,a:g.a,riv:!!g.riv,played:false}))};
}
