/*********************************************************************
 *  «Кровь» v3 — клики-бактерии, Space-антибиотик, Иммунодефицит,
 *  сохранение/загрузка через localStorage
 *********************************************************************/

const scene        = document.getElementById('scene');
const gameOverScr  = document.getElementById('gameOver');
const saveBtn      = document.getElementById('saveBtn');
const loadBtn      = document.getElementById('loadBtn');
const immunoBtn    = document.getElementById('immunoBtn');

const SAVE_KEY     = 'bloodSimSave';

let W, H;
function updSize(){ W = scene.clientWidth; H = scene.clientHeight; }
updSize(); window.addEventListener('resize', updSize);

const NUM_ERYTHRO = 10, NUM_LEUKO = 4, NUM_BACT = 8;
const entities = [];

let antibioticActive = false, antibioticEndsAt = 0, antibioticTimer = null;
let immunodefActive  = false, spawnBactTimer = null, killLeukoTimer = null;
let animId = null;

/* ---------- генерация сущностей ---------- */

const bactColors = [
  'radial-gradient(circle at 30% 30%,#1fa700,#0b6400 70%)',
  'radial-gradient(circle at 30% 30%,#a56d00,#5a3700 70%)',
  'radial-gradient(circle at 30% 30%,#b60c6f,#73034d 70%)',
  'radial-gradient(circle at 30% 30%,#006aa5,#003c63 70%)'
];

const rand = (a,b)=>Math.random()*(b-a)+a;
const dist2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;

function makeEntity(type,x=null,y=null){
  const d=document.createElement('div');
  d.className=`entity ${type}`; scene.appendChild(d);

  let size,speed;
  if(type==='erythrocyte'){size=60;speed=0.8;}
  else if(type==='leukocyte'){size=70;speed=1.2;}
  else{ size=rand(30,45); speed=rand(0.5,1);
        d.style.background=bactColors[Math.floor(Math.random()*bactColors.length)];
        d.style.boxShadow='0 0 8px rgba(0,0,0,.35)'; }

  x??=rand(size/2,W-size/2); y??=rand(size/2,H-size/2);
  const ang=Math.random()*Math.PI*2, vx=Math.cos(ang)*speed, vy=Math.sin(ang)*speed;
  return {el:d,type,x,y,vx,vy,size,baseSpeed:speed};
}

/* ---------- начальная генерация ---------- */
(()=>{ for(let i=0;i<NUM_ERYTHRO;i++)entities.push(makeEntity('erythrocyte'));
       for(let i=0;i<NUM_LEUKO;  i++)entities.push(makeEntity('leukocyte'));
       for(let i=0;i<NUM_BACT;   i++)entities.push(makeEntity('bacteria')); })();

/* ---------- интерактив ---------- */

// клик → новая бактерия
scene.addEventListener('click',e=>{
  const r=scene.getBoundingClientRect();
  entities.push(makeEntity('bacteria',e.clientX-r.left,e.clientY-r.top));
});

// Space → антибиотик
document.addEventListener('keydown',e=>{
  if(e.code!=='Space'||antibioticActive||immunodefActive) return;
  startAntibiotic(5000);
});

// кнопка Иммунодефицит
immunoBtn.onclick=()=>{ if(!immunodefActive) activateImmunodef(); };

// кнопки сохранения/загрузки
saveBtn.onclick=saveGame;
loadBtn.onclick=()=>{ loadGame()||alert('Нет сохранённой игры'); };

/* ---------- антибиотик ---------- */
function startAntibiotic(ms){
  antibioticActive=true; antibioticEndsAt=Date.now()+ms;
  entities.filter(o=>o.type==='bacteria').forEach(b=>b.el.classList.add('slow'));
  clearTimeout(antibioticTimer);
  antibioticTimer=setTimeout(stopAntibiotic,ms);
}
function stopAntibiotic(){
  antibioticActive=false; antibioticEndsAt=0;
  entities.filter(o=>o.type==='bacteria').forEach(b=>b.el.classList.remove('slow'));
}

/* ---------- иммунодефицит ---------- */
function activateImmunodef(restoreOnly=false){
  immunodefActive=true; immunoBtn.disabled=true;

  if(!restoreOnly){
    killLeukoTimer=setInterval(()=>{
      const l=entities.find(o=>o.type==='leukocyte');
      if(l){ l.el.remove(); entities.splice(entities.indexOf(l),1); }
      if(!entities.some(o=>o.type==='leukocyte')) gameOver();
    },700);

    spawnBactTimer=setInterval(()=>{
      entities.push(makeEntity('bacteria'));
    },300);
  }
}
/* ---------- Game Over ---------- */
function gameOver(){
  clearInterval(killLeukoTimer); clearInterval(spawnBactTimer);
  clearTimeout(antibioticTimer); cancelAnimationFrame(animId);
  gameOverScr.classList.add('show');
}

/* ---------- сохранение / загрузка ---------- */
function saveGame(){
  const data={
    entities:entities.map(o=>({type:o.type,x:o.x,y:o.y,vx:o.vx,vy:o.vy,size:o.size,baseSpeed:o.baseSpeed})),
    antibioticActive, antibioticEndsAt,
    immunodefActive
  };
  localStorage.setItem(SAVE_KEY,JSON.stringify(data));
  console.log('💾 Сохранено');
}
function loadGame(){
  const raw=localStorage.getItem(SAVE_KEY); if(!raw) return false;
  // очистить сцену
  entities.forEach(o=>o.el.remove()); entities.length=0;

  const d=JSON.parse(raw);
  d.entities.forEach(e=>{
    const obj=makeEntity(e.type,e.x,e.y); Object.assign(obj,e);
    obj.el.style.left=`${obj.x}px`; obj.el.style.top=`${obj.y}px`;
    entities.push(obj);
  });

  if(d.antibioticActive) startAntibiotic(d.antibioticEndsAt-Date.now());
  if(d.immunodefActive)  activateImmunodef(true);
  console.log('⟳ Загружено');
  return true;
}

/* ---------- основной цикл ---------- */
function animate(){
  animId=requestAnimationFrame(animate);

  for(const e of entities){
    /* лейкоцит ищет ближайшую бактерию */
    if(e.type==='leukocyte'){
      let tgt=null,dMin=Infinity;
      for(const b of entities) if(b.type==='bacteria'){
        const d=dist2(e,b); if(d<dMin){dMin=d; tgt=b;}
      }
      if(tgt){
        const dx=tgt.x-e.x, dy=tgt.y-e.y, len=Math.hypot(dx,dy)||1;
        const accel=(antibioticActive?0.1:0.05)*1.5;
        e.vx+=(dx/len)*accel; e.vy+=(dy/len)*accel;
      }
    }
    /* бактерии замедляются при антибиотике */
    if(e.type==='bacteria'){
      const slow=antibioticActive?0.3:1, sp=e.baseSpeed*slow;
      const norm=Math.hypot(e.vx,e.vy)||1;
      e.vx=(e.vx/norm)*sp; e.vy=(e.vy/norm)*sp;
    }
    /* движение + отражение от стенок */
    e.x+=e.vx; e.y+=e.vy;
    if(e.x<e.size/2||e.x>W-e.size/2) e.vx*=-1;
    if(e.y<e.size/2||e.y>H-e.size/2) e.vy*=-1;

    e.el.style.left=`${e.x}px`; e.el.style.top=`${e.y}px`;

    /* вращаем эритроциты */
    if(e.type==='erythrocyte'){
      const r=(+e.el.dataset.r||0)+1; e.el.dataset.r=r;
      e.el.style.transform=`translate(-50%,-50%) rotate(${r}deg)`;
    }
    /* столкновение лейкоцит-бактерия */
    if(e.type==='leukocyte'){
      for(const b of entities) if(b.type==='bacteria'){
        if(Math.sqrt(dist2(e,b))<(e.size+b.size)/2){
          b.el.remove(); entities.splice(entities.indexOf(b),1);
          entities.push(makeEntity('bacteria'));
          break;
        }
      }
    }
  }
}

/* ---------- запуск ---------- */
window.addEventListener('load',()=>{
  if(!loadGame()) animate();   // если сохранения нет – новая игра
});
