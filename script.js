/*********************************************************************
 *  «Кровь v4» — клики-очаги, Space-антибиотик, Иммунодефицит,
 *  победа/поражение по площади бактерий, сохранение в localStorage
 *********************************************************************/

const scene    = document.getElementById('scene');
const overlay  = document.getElementById('overlay');
const saveBtn  = document.getElementById('saveBtn');
const loadBtn  = document.getElementById('loadBtn');
const immunoBtn= document.getElementById('immunoBtn');
const SAVE_KEY = 'bloodSimSave';

let W, H;                 // размеры сцены
const updSize =()=>{ W=scene.clientWidth; H=scene.clientHeight; };
updSize(); window.addEventListener('resize',updSize);

/* ---------- параметры ---------- */
const NUM_ERY=10, NUM_LEU=4, NUM_BAC=8;
const ANTIBIOTIC_MS = 5000;
const OUTBREAK_CNT  = 10;          // сколько бактерий при клике
const WIN_COLOR  = '#00e676';
const LOSS_COLOR = '#ff3232';

const entities=[];         // все объекты
let antibioticActive=false, antibioticEnds=0, antibioticTimer=null;
let immunodefActive=false, spawnTimer=null, killTimer=null;
let animId=null, gameEnded=false;

/* ---------- генерация ---------- */
const bactGrads=[
  'radial-gradient(circle at 30% 30%,#1fa700,#0b6400 70%)',
  'radial-gradient(circle at 30% 30%,#a56d00,#5a3700 70%)',
  'radial-gradient(circle at 30% 30%,#b60c6f,#73034d 70%)',
  'radial-gradient(circle at 30% 30%,#006aa5,#003c63 70%)'
];
const rand=(a,b)=>Math.random()*(b-a)+a;
const dist2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;

function makeEntity(type,x=null,y=null){
  const e=document.createElement('div');
  e.className=`entity ${type}`; scene.appendChild(e);

  let size,base;
  if(type==='erythrocyte'){ size=60; base=0.8; }
  else if(type==='leukocyte'){ size=70; base=1.2; }
  else{ size=rand(30,45); base=rand(0.5,1);
        e.style.background=bactGrads[Math.floor(Math.random()*bactGrads.length)];
        e.style.boxShadow='0 0 8px rgba(0,0,0,.35)'; }

  e.style.width=`${size}px`; e.style.height=`${size}px`;
  x??=rand(size/2,W-size/2); y??=rand(size/2,H-size/2);
  const ang=Math.random()*Math.PI*2;
  const vx=Math.cos(ang)*base, vy=Math.sin(ang)*base;
  return {el:e,type,x,y,vx,vy,size,base};
}

/* ---------- начальная сцена ---------- */
(()=>{ for(let i=0;i<NUM_ERY;i++)entities.push(makeEntity('erythrocyte'));
       for(let i=0;i<NUM_LEU;i++)entities.push(makeEntity('leukocyte'));
       for(let i=0;i<NUM_BAC;i++)entities.push(makeEntity('bacteria')); })();

/* =====================  И Н Т Е Р А К Т И В  ===================== */

/* Клик → очаг из 10 бактерий */
scene.addEventListener('click',evt=>{
  if(gameEnded) return;
  const r=scene.getBoundingClientRect(), cx=evt.clientX-r.left, cy=evt.clientY-r.top;
  for(let i=0;i<OUTBREAK_CNT;i++){
    const ang=Math.random()*Math.PI*2, dist=rand(0,40);
    const x=cx+Math.cos(ang)*dist, y=cy+Math.sin(ang)*dist;
    entities.push(makeEntity('bacteria',x,y));
  }
});

/* Space → антибиотик */
document.addEventListener('keydown',e=>{
  if(e.code!=='Space'||antibioticActive||immunodefActive||gameEnded) return;
  startAntibiotic(ANTIBIOTIC_MS);
});

/* Иммунодефицит */
immunoBtn.onclick=()=>{ if(!immunodefActive&&!gameEnded) startImmunodef(); };

/* Сохранение / загрузка */
saveBtn.onclick=saveGame;
loadBtn.onclick=()=>{ loadGame()||alert('Нет сохранённой игры'); };

/* ---------- антибиотик ---------- */
function startAntibiotic(ms){
  antibioticActive=true; antibioticEnds=Date.now()+ms;
  entities.filter(o=>o.type==='bacteria').forEach(b=>b.el.classList.add('slow'));
  clearTimeout(antibioticTimer);
  antibioticTimer=setTimeout(stopAntibiotic,ms);
}
function stopAntibiotic(){
  antibioticActive=false; antibioticEnds=0;
  entities.filter(o=>o.type==='bacteria').forEach(b=>b.el.classList.remove('slow'));
}

/* ---------- иммунодефицит ---------- */
function startImmunodef(restore=false){
  immunodefActive=true; immunoBtn.disabled=true;
  if(restore) return;                  // при загрузке не перезапускаем таймеры

  killTimer=setInterval(()=>{
    const l=entities.find(o=>o.type==='leukocyte');
    if(l){ l.el.remove(); entities.splice(entities.indexOf(l),1); }
  },700);

  spawnTimer=setInterval(()=>{
    entities.push(makeEntity('bacteria'));
  },300);
}

/* ---------- overlay ---------- */
function showOverlay(text,color){
  overlay.textContent=text;
  overlay.style.color=color;
  overlay.classList.add('show');
  gameEnded=true;
  cancelAnimationFrame(animId);
  clearInterval(killTimer); clearInterval(spawnTimer);
  clearTimeout(antibioticTimer);
}

/* ---------- сохранение ---------- */
function saveGame(){
  if(gameEnded) return;
  const data={
    entities:entities.map(o=>({type:o.type,x:o.x,y:o.y,vx:o.vx,vy:o.vy,size:o.size,base:o.base})),
    antibioticActive, antibioticEnds,
    immunodefActive, gameEnded
  };
  localStorage.setItem(SAVE_KEY,JSON.stringify(data));
  console.log('💾 Сохранено');
}

/* ---------- загрузка ---------- */
function loadGame(){
  const raw=localStorage.getItem(SAVE_KEY); if(!raw) return false;

  // очистить
  entities.forEach(o=>o.el.remove()); entities.length=0;
  overlay.classList.remove('show'); gameEnded=false;

  const d=JSON.parse(raw);
  d.entities.forEach(o=>{
    const e=makeEntity(o.type,o.x,o.y); Object.assign(e,o);
    e.el.style.left=`${e.x}px`; e.el.style.top=`${e.y}px`;
    entities.push(e);
  });

  if(d.antibioticActive) startAntibiotic(d.antibioticEnds-Date.now());
  if(d.immunodefActive)  startImmunodef(true);
  console.log('⟳ Загружено');
  return true;
}

/* =====================  О С Н О В Н О Й   Ц И К Л  ===================== */
function animate(){
  animId=requestAnimationFrame(animate);

  let bacArea=0;

  for(const e of entities){
    /* скорость для каждого кадра */
    const speedFactor = (e.type==='leukocyte')
      ? (antibioticActive?2:1)
      : (e.type==='bacteria' && antibioticActive?0.3:1);

    const speed = e.base*speedFactor;

    /* логика лейкоцита */
    if(e.type==='leukocyte'){
      const target=entities.find(b=>b.type==='bacteria');
      if(target){
        const dx=target.x-e.x, dy=target.y-e.y, len=Math.hypot(dx,dy)||1;
        e.vx=(dx/len)*speed; e.vy=(dy/len)*speed;
      }else{ e.vx=e.vy=0; }          // нечего атаковать
    }

    /* бактерии считают площадь */
    if(e.type==='bacteria') bacArea+=Math.PI*(e.size/2)**2;

    /* движение + отражение */
    e.x+=e.vx; e.y+=e.vy;
    if(e.x<e.size/2||e.x>W-e.size/2) e.vx*=-1;
    if(e.y<e.size/2||e.y>H-e.size/2) e.vy*=-1;

    e.el.style.left=`${e.x}px`; e.el.style.top=`${e.y}px`;

    /* вращение эритроцитов */
    if(e.type==='erythrocyte'){
      const r=(+e.el.dataset.r||0)+1; e.el.dataset.r=r;
      e.el.style.transform=`translate(-50%,-50%) rotate(${r}deg)`;
    }

    /* столкновение лейкоцит↔бактерия */
    if(e.type==='leukocyte'){
      for(const b of entities) if(b.type==='bacteria'){
        if(Math.sqrt(dist2(e,b))<(e.size+b.size)/2){
          b.el.remove(); entities.splice(entities.indexOf(b),1);
          break;
        }
      }
    }
  }

  /* ----- проверка победы / поражения ----- */
  const sceneArea=W*H;
  if(!gameEnded){
    if(bacArea/sceneArea>0.9){
      showOverlay('Смерть от сепсиса',LOSS_COLOR);
      localStorage.removeItem(SAVE_KEY);
    }
    else if(!entities.some(o=>o.type==='bacteria')){
      showOverlay('Выздоровление! Спасибо доктор!',WIN_COLOR);
      localStorage.removeItem(SAVE_KEY);
    }
  }
}

/* ---------- старт ---------- */
window.addEventListener('load',()=>{
  if(!loadGame()) animate();
});
