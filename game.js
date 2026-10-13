'use strict';
const $=id=>document.getElementById(id);
const heldReadouts=new Map();
let fieldHeadline='',fieldDetail='';
const cells=[];for(let i=0;i<27;i++){const c=document.createElement('div');c.className='cell';c.innerHTML='<span class="led"></span>';$('grid').appendChild(c);cells.push(c);}
let state='idle',difficulty=1,sound=false,audio=null,timer=null,clockTimer=null,transition=null,display='field',nextQuarter=false,team='home';
let openingRunTap=null;
let home=0,away=0,quarter=1,seconds=900,ball=20,down=1,target=30,x=0,y=1,defenders=[],playStart=20,moves=0,flash=false;
function beep(freq=440,duration=.08){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='square';o.frequency.value=freq;g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
function message(t){$('message').textContent=t;}
function render(){cells.forEach((c,i)=>{const cy=Math.floor(i/9),cx=i%9;c.className='cell'+(defenders.some(d=>d.x===cx&&d.y===cy)?' defender':'')+(x===cx&&y===cy?' runner':'');});const numeric=display==='score'||display==='status';const announced=display==='announcement';$('field').classList.toggle('announcement',announced);$('fieldAnnouncement').hidden=!announced;$('fieldHeadline').textContent=fieldHeadline;$('fieldDetail').textContent=fieldDetail;$('field').classList.toggle('numeric',numeric);$('ledReadout').hidden=!numeric;if(numeric){const labels=display==='score'?['HOME','TIME','VISITOR']:['DOWN','FIELD','TO GO'];const absoluteBall=team==='home'?ball:100-ball;const side=absoluteBall<50?'H':absoluteBall>50?'V':'';const values=display==='score'?[String(home).padStart(2,'0'),(Math.ceil(seconds/6)/10).toFixed(1),String(away).padStart(2,'0')]:[down,side+(absoluteBall>50?100-absoluteBall:absoluteBall),ball>90?'':Math.max(0,target-ball)];$('readoutLabels').innerHTML=labels.map(v=>'<span>'+v+'</span>').join('');$('readoutNumbers').innerHTML=values.map(v=>'<span>'+v+'</span>').join('');}$('readoutQuarter').hidden=display!=='score';$('readoutQuarter').textContent='QTR '+quarter;$('field').classList.toggle('blink',flash);$('possessionLabel').textContent=team==='home'?'HOME BALL':'VISITOR BALL';$('directionLabel').textContent=team==='home'?'RUN →':'← RUN';$('runArrow').textContent=team==='home'?'→':'←';$('forward').setAttribute('aria-label',team==='home'?'Run right':'Run left');}
function stop(){clearInterval(timer);clearInterval(clockTimer);timer=clockTimer=null;}
function formation(){openingRunTap=null;x=team==='home'?0:8;y=1;defenders=[{x:3,y:0},{x:3,y:1},{x:3,y:2},{x:5,y:1},{x:8,y:1}].map(d=>({...d,x:team==='home'?d.x:8-d.x}));moves=0;flash=false;}
function ready(text){stop();state='ready';formation();display='field';message(text||'PRESS AN ARROW TO PLAY');render();}
function newGame(){cancelVisitor();visitorDrive=null;$('driveResult').close?.();$('finalResult').close?.();finalRecorded=false;fieldHeadline=fieldDetail='';heldReadouts.clear();stop();clearTimeout(transition);home=away=0;team='home';nextQuarter=false;quarter=1;seconds=900;ball=20;down=1;target=30;ready('HOME · 1ST & 10 · PRESS AN ARROW');}
function start(){if(heldReadouts.size)return;beep(660);if(state==='idle'){newGame();}if(state!=='ready'&&state!=='paused')return;if(nextQuarter){quarter++;seconds=900;nextQuarter=false;}if(state==='ready')playStart=ball;display='field';state='live';message(seconds===0?team.toUpperCase()+' · CLOCK 0 · FINISH THE PLAY':team==='home'?'HOME · FIND THE GAP →':'VISITOR · ← FIND THE GAP');timer=setInterval(defenseTick,(difficulty===1?600:400)/playSpeed());clockTimer=seconds>0?setInterval(()=>{if(state!=='live')return;seconds=Math.max(0,seconds-12);if(seconds===0){clearInterval(clockTimer);clockTimer=null;message(team.toUpperCase()+' · CLOCK 0 · FINISH THE PLAY');}render();},1100/playSpeed()):null;render();}
function collision(){return defenders.some(d=>d.x===x&&d.y===y);}
function move(dx,dy,automatic=false){if(simulateVisitor&&team==='visitor'&&!automatic)return;if(state==='idle'||state==='ready'||state==='paused')start();if(state!=='live')return;const ny=y+dy;if(ny<0||ny>2)return;const nx=dx?(x+(team==='home'?1:-1)+9)%9:x;const tapTime=Date.now();if(dx&&y===1&&ball===playStart+1&&openingRunTap!==null&&(tapTime-openingRunTap)*playSpeed()<=180){const guard=defenders.find(d=>d.y===1&&d.x===(team==='home'?3:5));if(guard){guard.x=nx;}}if(dx&&y===1&&ball===playStart&&x===(team==='home'?0:8))openingRunTap=tapTime;else openingRunTap=null;if(defenders.some(d=>d.x===nx&&d.y===ny)){x=nx;y=ny;tackle();return;}x=nx;y=ny;if(dx){ball++;if(ball>=100){if(team==='home')home+=7;else away+=7;endPlay(team.toUpperCase()+' TOUCHDOWN! +7',true);return;}}beep(dx?520:390,.035);render();}
function defenseTick(){if(state!=='live')return;moves++;const index=Math.floor(Math.random()*defenders.length);const d=defenders[index];if(!d)return;const options=[];if(d.x!==x)options.push({x:d.x+Math.sign(x-d.x),y:d.y});if(d.y!==y)options.push({x:d.x,y:d.y+Math.sign(y-d.y)});if(options.length){const p=options[Math.floor(Math.random()*options.length)];if(!defenders.some((other,i)=>i!==index&&other.x===p.x&&other.y===p.y)){d.x=p.x;d.y=p.y;}}if(collision())tackle();else render();}
function settleDown(allowTurnover=true){if(ball>=target){down=1;target=Math.min(100,ball+10);return 'FIRST DOWN';}down++;if(down>4){down=1;if(allowTurnover)return 'TURNOVER';down=4;}return 'DOWN';}
function changePossession(receivingBall){team=team==='home'?'visitor':'home';ball=Math.max(1,Math.min(99,receivingBall));down=1;target=Math.min(100,ball+10);}
function endPlay(text,score=false){stop();state='dead';display='field';flash=true;let extra='';if(score){display='announcement';flash=false;fieldHeadline='TOUCHDOWN';fieldDetail=team.toUpperCase()+' +7';changePossession(20);extra=team.toUpperCase()+' BALL';}else{const result=settleDown();if(result==='TURNOVER'){changePossession(100-ball);extra='TURNOVER · '+team.toUpperCase()+' BALL';}else if(result==='FIRST DOWN')extra='FIRST DOWN';}message(text+(extra?' · '+extra:'')+' · ST / SC');beep(score?880:160,score?.3:.16);if(seconds===0)finishQuarter(score);render();afterVisitorPlay(score?'touchdown':extra.includes('TURNOVER')?'downs':null);}
function finishQuarter(scored=false){if(quarter===4){state='over';display='announcement';flash=false;fieldHeadline=home>away?'HOME WINS':home<away?'VISITOR WINS':'TIE GAME';fieldDetail='HOME '+home+' · VISITOR '+away;message(home>away?'FINAL · HOME WINS!':home===away?'FINAL · TIE GAME':'FINAL · VISITOR WINS!');beep(180,.4);showFinalResult();}else{nextQuarter=true;if(!scored){display='score';flash=false;}message($('message').textContent.replace(' · ST / SC','')+' · END Q'+quarter+' · ST / SC');}}
function readout(which){if(simulateVisitor&&team==='visitor')return;prepareReadout(which);}
function prepareReadout(which){if(state==='live'||state==='paused'||state==='kicking')return;if(state==='idle')newGame();if(state==='dead'){if(nextQuarter&&quarter===2){team='visitor';ball=20;down=1;target=30;visitorDrive=null;}formation();state='ready';}display=which;message(state==='over'?'FINAL SCORE · RESET TO PLAY':'PRESS AN ARROW TO PLAY');render();scheduleVisitor();}
function holdReadout(token,which){if(simulateVisitor&&team==='visitor')return;if(state==='live'||state==='paused'||state==='kicking')return;readout(which);heldReadouts.delete(token);heldReadouts.set(token,which);}
function releaseReadout(token){if(!heldReadouts.delete(token))return;const remaining=[...heldReadouts.values()];display=remaining.length?remaining[remaining.length-1]:state==='over'?'announcement':'field';render();if(!heldReadouts.size)scheduleVisitor();}
function releaseAllReadouts(){for(const token of [...heldReadouts.keys()])releaseReadout(token);}
function bindReadout(id,which){const button=$(id),pointerToken='pointer:'+id,keyToken='button:'+id;const clear=()=>{button.classList.remove('pressed');releaseReadout(pointerToken);};button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);button.classList.add('pressed');holdReadout(pointerToken,which);});for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,clear);button.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat){button.classList.add('pressed');holdReadout(keyToken,which);}}});button.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();button.classList.remove('pressed');releaseReadout(keyToken);}});button.addEventListener('blur',()=>{clear();releaseReadout(keyToken);});}
function tackle(){const gain=ball-playStart;endPlay('TACKLED · '+gain+' YARD'+(gain===1?'':'S'));}
function kick(automatic=false){if(simulateVisitor&&team==='visitor'&&!automatic)return;if(state!=='ready'||heldReadouts.size)return;if(down!==4){message('KICK ONLY ON 4TH DOWN');beep(140,.1);return;}if(nextQuarter){quarter++;seconds=900;nextQuarter=false;}stop();beep(300,.15);state='kicking';display='field';flash=false;defenders=[];x=team==='home'?0:8;y=1;let steps=0;message(team.toUpperCase()+' · KICK '+(team==='home'?'→':'←'));render();timer=setInterval(()=>{if(state!=='kicking')return;if(steps<8){steps++;x+=team==='home'?1:-1;beep(420+steps*35,.025);render();}else{stop();finishKick();}},110/playSpeed());}
function normalCdf(z){const t=1/(1+.2316419*Math.abs(z));const density=Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);const tail=density*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));return z>=0?1-tail:tail;}
function puntYards(){const lower=normalCdf(-2),p=lower+Math.random()*(1-2*lower);let low=-2,high=2;for(let i=0;i<24;i++){const mid=(low+high)/2;if(normalCdf(mid)<p)low=mid;else high=mid;}return Math.max(20,Math.min(60,Math.round(40+10*(low+high)/2)));}
function finishKick(){let driveOutcome='punt';const kickingTeam=team.toUpperCase();let result,scored=false;if(ball>=65){const distance=100-ball+17,good=Math.random()<(distance<=40?.9:distance<=50?.72:.5);if(good){driveOutcome='field goal';scored=true;if(team==='home')home+=3;else away+=3;changePossession(20);result=kickingTeam+' FIELD GOAL! +3';}else{driveOutcome='missed field goal';changePossession(100-ball);result='FIELD GOAL MISSED';}}else{const yards=puntYards(),landing=ball+yards;changePossession(landing>=100?20:100-landing);result='PUNT '+yards+' YDS'+(landing>=100?' · TOUCHBACK':'');}state='dead';display='field';flash=true;if(scored){display='announcement';flash=false;fieldHeadline='FIELD GOAL';fieldDetail=kickingTeam+' +3';}message(result+' · '+team.toUpperCase()+' BALL · ST / SC');render();afterVisitorPlay(driveOutcome,result);}

let simulateVisitor=false,visitorTimer=null,visitorDrive=null,visitorSkill=.8,visitorWaits=0;
const tallyStorageKey='fc-lighthouse-football-wins-v1';
let finalRecorded=false,winTally=loadWinTally();
function loadWinTally(){try{const value=JSON.parse(localStorage.getItem(tallyStorageKey));return{home:Number.isSafeInteger(value?.home)&&value.home>=0?value.home:0,visitor:Number.isSafeInteger(value?.visitor)&&value.visitor>=0?value.visitor:0};}catch{return{home:0,visitor:0};}}
function renderWinTally(){ $('homeWins').textContent=winTally.home;$('visitorWins').textContent=winTally.visitor;}
function saveWinTally(){try{localStorage.setItem(tallyStorageKey,JSON.stringify(winTally));$('tallyNote').textContent='WINS ON THIS BROWSER · TIES DON’T COUNT';}catch{$('tallyNote').textContent='WINS THIS SESSION · STORAGE UNAVAILABLE';}renderWinTally();}
function showFinalResult(){if(!finalRecorded){finalRecorded=true;if(home>away)winTally.home++;else if(away>home)winTally.visitor++;saveWinTally();}$('finalWinner').textContent=fieldHeadline;$('finalScore').textContent='HOME '+home+' · VISITOR '+away;renderWinTally();if(!$('finalResult').open)$('finalResult').showModal();}
$('resetTally').onclick=()=>{winTally={home:0,visitor:0};saveWinTally();};
$('closeFinal').onclick=()=>$('finalResult').close();
$('playAgain').onclick=newGame;
function playSpeed(){return simulateVisitor&&team==='visitor'?4:1;}
function cancelVisitor(){clearTimeout(visitorTimer);visitorTimer=null;}
function scheduleVisitor(delay=220){
 cancelVisitor();
 if(!simulateVisitor||team!=='visitor'||state==='over'||state==='idle'||document.hidden||$('instructions').open||$('driveResult').open||heldReadouts.size)return;
 visitorTimer=setTimeout(visitorStep,delay);
}
function visitorStep(){
 visitorTimer=null;
 if(!simulateVisitor||team!=='visitor'||state==='over'||document.hidden||$('instructions').open)return;
 if(state==='kicking')return;
 if(state==='dead')prepareReadout('field');
 if(team!=='visitor'||state==='over')return;
 if(!visitorDrive)visitorDrive={start:ball,plays:0,lastBall:ball};
 if(state==='ready'){
  visitorSkill=.68+Math.random()*.27;visitorWaits=0;
  if(down===4&&(ball>=65||target-ball>2||ball<50)){kick(true);return;}
  start();
 }
 if(state==='paused')start();
 if(state!=='live')return;
 const nx=(x+8)%9,occupied=(cx,cy)=>defenders.some(d=>d.x===cx&&d.y===cy);
 const lanes=[y-1,y+1].filter(l=>l>=0&&l<=2&&!occupied(x,l));
 // Look several columns ahead so the runner baits the wall from a safe distance.
 const queue=[{cx:x,cy:y,depth:0,first:null}],seen=new Set([x+','+y]);let best=queue[0];
 while(queue.length){
  const node=queue.shift();if(node.depth>best.depth)best=node;
  if(node.depth>=3)continue;
  for(const [dx,dy] of [[1,0],[0,-1],[0,1]]){
   const cx=dx?(node.cx+8)%9:node.cx,cy=node.cy+dy,key=cx+','+cy;
   if(cy<0||cy>2||occupied(cx,cy)||seen.has(key))continue;
   seen.add(key);queue.push({cx,cy,depth:node.depth+dx,first:node.first||[dx,dy]});
  }
 }
 if(Math.random()<(1-visitorSkill)*.08){
  if(Math.random()<.4)move(1,0,true);
  else if(lanes.length)move(0,lanes[Math.floor(Math.random()*lanes.length)]-y,true);
 }else if(best.first&&best.depth>=2){move(...best.first,true);visitorWaits=0;}
 else{
  visitorWaits++;
  const threat=defenders.some(d=>Math.abs(d.x-x)+Math.abs(d.y-y)===1);
  if(lanes.length&&(threat||visitorWaits%5===0)){
   const safe=lanes.sort((a,b)=>defenders.filter(d=>Math.abs(d.x-x)+Math.abs(d.y-a)<=1).length-defenders.filter(d=>Math.abs(d.x-x)+Math.abs(d.y-b)<=1).length);
   move(0,safe[0]-y,true);
  }
 }
 if(state==='live')scheduleVisitor((170+Math.random()*140)/4);
}
function homeSituation(){const yard=ball<=50?'HOME '+ball:'VISITOR '+(100-ball);return 'HOME BALL · '+(down===1?'1ST':down===2?'2ND':down===3?'3RD':'4TH')+' & '+(target===100?'GOAL':target-ball)+' ON '+yard;}
function afterVisitorPlay(outcome,kickResult){
 if(!simulateVisitor)return;
 if(visitorDrive){
  visitorDrive.plays++;visitorDrive.lastBall=outcome==='touchdown'?100:team==='visitor'?ball:visitorDrive.lastBall;
  // On a turnover the ball has already been mirrored into Home coordinates.
  if(outcome==='downs'||outcome==='missed field goal')visitorDrive.lastBall=100-ball;
  if(team==='home'){
   cancelVisitor();const yards=Math.max(0,visitorDrive.lastBall-visitorDrive.start);
   const label=outcome==='touchdown'?'TOUCHDOWN +7':outcome==='field goal'?'FIELD GOAL +3':outcome==='missed field goal'?'FIELD GOAL MISSED':outcome==='downs'?'TURNOVER ON DOWNS':kickResult||'PUNT';
   const summary='VISITOR · '+label+' · '+yards+'-YARD DRIVE · '+visitorDrive.plays+' PLAY'+(visitorDrive.plays===1?'':'S');
   $('driveSummary').textContent=summary;
   if(state==='over'){$('homeSituation').textContent='FINAL · HOME '+home+' · VISITOR '+away;message(summary+' · FINAL');}
   else{prepareReadout('field');$('homeSituation').textContent=team==='home'?homeSituation():'HALFTIME · VISITOR STARTS THE SECOND HALF';}
   visitorDrive=null;
   if(state!=='over')$('driveResult').showModal();
   return;
  }
 }
 scheduleVisitor(team==='visitor'?180:500);
}
$('simulateVisitor').onclick=()=>{
 simulateVisitor=!simulateVisitor;
 $('simulateVisitor').setAttribute('aria-pressed',simulateVisitor);
 $('simulateVisitor').classList.toggle('active',simulateVisitor);
 $('simulationState').textContent=simulateVisitor?'ON · VISITOR 4×':'OFF';
 cancelVisitor();visitorDrive=null;
 if(state==='live'||state==='paused'){const wasPaused=state==='paused';stop();state='paused';if(!wasPaused)start();}
 if(simulateVisitor&&team==='visitor')scheduleVisitor();
};
$('continueHome').onclick=()=>$('driveResult').close();
$('driveResult').addEventListener('close',()=>scheduleVisitor());
function bind(id,fn,repeat=false){let timeout,interval;const clear=()=>{clearTimeout(timeout);clearInterval(interval);$(id).classList.remove('pressed');};$(id).addEventListener('pointerdown',e=>{e.preventDefault();$(id).setPointerCapture?.(e.pointerId);$(id).classList.add('pressed');fn();if(repeat)timeout=setTimeout(()=>{interval=setInterval(fn,140);},300);});['pointerup','pointercancel','lostpointercapture'].forEach(name=>$(id).addEventListener(name,clear));}
bind('up',()=>move(0,-1));bind('moveDown',()=>move(0,1));bind('forward',()=>move(1,0));bindReadout('score','score');bindReadout('status','status');bind('kick',kick);
document.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('selectstart',e=>e.preventDefault());
$('reset').onclick=()=>{if(state==='idle'||state==='over'||window.confirm('Start a new game?'))newGame();};
$('rookie').onclick=()=>level(1);$('pro').onclick=()=>level(2);function level(n){if(difficulty===n)return;difficulty=n;for(const [id,l]of [['rookie',1],['pro',2]]){$(id).classList.toggle('active',n===l);$(id).setAttribute('aria-pressed',n===l);}if(state==='live'){clearInterval(timer);timer=setInterval(defenseTick,(difficulty===1?600:400)/playSpeed());}}
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-pressed',sound);beep(660);};
function pause(){cancelVisitor();if(state==='live'){stop();state='paused';message('PAUSED · PRESS AN ARROW');render();}}function resume(){if(state==='paused')start();scheduleVisitor();}
$('help').onclick=()=>{pause();$('instructions').showModal();};$('closeHelp').onclick=()=>$('instructions').close();$('instructions').addEventListener('close',resume);document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAllReadouts();pause();}});document.addEventListener('keydown',e=>{if($('instructions').open||$('driveResult').open||$('finalResult').open)return;const actions={ArrowUp:()=>move(0,-1),ArrowDown:()=>move(0,1),ArrowRight:()=>move(1,0),ArrowLeft:()=>move(1,0),Shift:()=>holdReadout('key:'+(e.code||'Shift'),'score'),Control:()=>holdReadout('key:'+(e.code||'Control'),'status'),s:()=>holdReadout('key:s','status'),S:()=>holdReadout('key:s','status'),c:()=>holdReadout('key:c','score'),C:()=>holdReadout('key:c','score'),k:kick,K:kick};if(actions[e.key]){e.preventDefault();if(!e.repeat)actions[e.key]();}});document.addEventListener('keyup',e=>{if(e.key==='Shift'||e.key==='Control'){e.preventDefault();releaseReadout('key:'+(e.code||e.key));}if(['s','c'].includes(e.key.toLowerCase())){e.preventDefault();releaseReadout('key:'+e.key.toLowerCase());}});window.addEventListener('blur',()=>{releaseAllReadouts();pause();});render();
