window.addEventListener('DOMContentLoaded', () => {
  const scene  = document.getElementById('scene');
  const banner = document.getElementById('banner');
  const resultText = document.getElementById('resultText');
  const restartBtn = document.getElementById('restartBtn');
  const btnAb = document.getElementById('antibiotic');
  const btnG  = document.getElementById('gcsf');
  const btnIm = document.getElementById('immunodef');

  let W = scene.clientWidth, H = scene.clientHeight;
  window.addEventListener('resize', () => {
    W = scene.clientWidth;
    H = scene.clientHeight;
  });

  const START = { ery:10, leu:6, bac:30 };
  const ANTIB_MS = 5000, REPL_MS = 4000, OUTBREAK = 10, MAX_ENT = 500;
  const SPEED = { ery:.8, leu:1.6 };
  const WIN = '#00e676', LOSS = '#ff3232';

  let ents = [], antibiotic = false, immunodef = false, ended = false;
  let timers = [], rafId;

  const grads=[
    'radial-gradient(circle at 30% 30%,#1fa700,#0b6400 70%)',
    'radial-gradient(circle at 30% 30%,#a56d00,#5a3700 70%)',
    'radial-gradient(circle at 30% 30%,#b60c6f,#73034d 70%)',
    'radial-gradient(circle at 30% 30%,#006aa5,#003c63 70%)'
  ];
  const rnd = (a,b)=>Math.random()*(b-a)+a;
  const dist2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;

  function spawn(type, x = null, y = null){
    if(ents.length >= MAX_ENT) return;
    const el=document.createElement('div');
    el.className=`entity ${type}`; scene.appendChild(el);
    let size, base;
    if(type==='ery'){ size=60; base=SPEED.ery; }
    else if(type==='leu'){ size=70; base=SPEED.leu; }
    else { size=rnd(30,45); base=rnd(.5,1);
      el.style.background=grads[Math.floor(Math.random()*grads.length)];
      el.style.boxShadow='0 0 8px rgba(0,0,0,.35)'; }
    el.style.width=el.style.height=`${size}px`;
    x ??= rnd(size/2, W-size/2);
    y ??= rnd(size/2, H-size/2);
    const ang=Math.random()*Math.PI*2;
    const vx=Math.cos(ang)*base, vy=Math.sin(ang)*base;
    ents.push({el,type,x,y,vx,vy,size,base});
  }

  function start(){
    ents = [];
    timers = [];
    ended = false;
    antibiotic = false;
    immunodef = false;
    scene.innerHTML = '';
    banner.classList.remove('show');
    btnIm.disabled = false;

    Array.from({length:START.ery}).forEach(()=>spawn('ery'));
    Array.from({length:START.leu}).forEach(()=>spawn('leu'));
    Array.from({length:START.bac}).forEach(()=>spawn('bac'));

    timers.push(setInterval(()=>{
      if(ended) return;
      ents.filter(e=>e.type==='bac').forEach(b=>{
        const ang=Math.random()*Math.PI*2,d=rnd(10,25);
        spawn('bac', b.x+Math.cos(ang)*d, b.y+Math.sin(ang)*d);
      });
    },REPL_MS));

    loop();
  }

  function startAntibiotic(){
    if(antibiotic||immunodef||ended) return;
    antibiotic=true;
    ents.filter(e=>e.type==='bac').forEach(b=>b.el.classList.add('slow'));
    timers.push(setTimeout(()=>{
      antibiotic=false;
      ents.filter(e=>e.type==='bac').forEach(b=>b.el.classList.remove('slow'));
    },ANTIB_MS));
  }
  btnAb.onclick=startAntibiotic;
  btnG.onclick=()=>{ if(!ended) Array.from({length:5}).forEach(()=>spawn('leu')); };
  btnIm.onclick=()=>{
    if(immunodef||ended) return;
    immunodef=true; btnIm.disabled=true;
    timers.push(setInterval(()=>{
      const l=ents.find(e=>e.type==='leu');
      if(l){ l.el.remove(); ents.splice(ents.indexOf(l),1); }
    },700));
    timers.push(setInterval(()=>spawn('bac'),300));
  };

  scene.addEventListener('click',e=>{
    if(ended) return;
    const r=scene.getBoundingClientRect();
    const cx=e.clientX-r.left, cy=e.clientY-r.top;
    Array.from({length:OUTBREAK}).forEach(()=>{
      const ang=Math.random()*Math.PI*2,d=rnd(0,40);
      spawn('bac',cx+Math.cos(ang)*d,cy+Math.sin(ang)*d);
    });
  });

  function finish(text,color,win){
    resultText.textContent = text;
    banner.classList.toggle('win',win);
    banner.classList.add('show');
    resultText.style.color = color;
    ended=true;
    cancelAnimationFrame(rafId);
    timers.forEach(id=>clearInterval(id));
  }

  function loop(){
    rafId=requestAnimationFrame(loop);
    let bacArea=0;
    for(const e of ents){
      const factor=(e.type==='leu') ? (antibiotic?2:1)
                  :(e.type==='bac'&&antibiotic?0.3:1);
      const speed=e.base*factor;
      if(e.type==='leu'){
        let tgt=null,min=Infinity;
        ents.forEach(b=>{
          if(b.type!=='bac') return;
          const d=dist2(e,b); if(d<min){min=d; tgt=b;}
        });
        if(tgt){
          const dx=tgt.x-e.x, dy=tgt.y-e.y, len=Math.hypot(dx,dy)||1;
          e.vx=(dx/len)*speed; e.vy=(dy/len)*speed;
        } else { e.vx=e.vy=0; }
      }
      if(e.type==='bac') bacArea+=Math.PI*(e.size/2)**2;
      e.x+=e.vx; e.y+=e.vy;
      if(e.x<e.size/2||e.x>W-e.size/2) e.vx*=-1;
      if(e.y<e.size/2||e.y>H-e.size/2) e.vy*=-1;
      e.el.style.left=`${e.x}px`; e.el.style.top=`${e.y}px`;
      if(e.type==='ery'){
        const r=(+e.el.dataset.r||0)+1; e.el.dataset.r=r;
        e.el.style.transform=`translate(-50%,-50%) rotate(${r}deg)`;
      }
      if(e.type==='leu'){
        for(const b of ents) if(b.type==='bac'){
          if(Math.hypot(b.x-e.x,b.y-e.y) < (e.size+b.size)/2){
            b.el.remove(); ents.splice(ents.indexOf(b),1); break;
          }
        }
      }
    }
    if(!ended){
      const ratio=bacArea/(W*H);
      if(ratio>0.9) finish('Смерть от сепсиса',LOSS,false);
      else if(!ents.some(e=>e.type==='bac'))
                    finish('Выздоровление! Спасибо, доктор!',WIN,true);
    }
  }

  restartBtn.onclick = () => {
    start();
  };

  start();
});
