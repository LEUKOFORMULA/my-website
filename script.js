/*********************************************************************
 *  Простая «симуляция» крови:
 *  – эритроциты просто плавают хаотично
 *  – лейкоциты ищут ближайшую бактерию и «съедают» её
 *  – когда бактерия съедена, создаётся новая
 *********************************************************************/

const scene = document.getElementById('scene');
const W = scene.clientWidth;
const H = scene.clientHeight;

const NUM_ERYTHRO = 10;
const NUM_LEUKO   = 4;
const NUM_BACT    = 8;

const entities = [];

/* ──────────────────────── вспомогательные функции ─────────────────────── */

// создаём DOM-элемент и объект-привязку
function createEntity(type) {
  const div = document.createElement('div');
  div.className = `entity ${type}`;
  scene.appendChild(div);
  const size = type === 'erythrocyte' ? 60 : (type === 'leukocyte' ? 70 : 40);
  // случайные координаты
  const x = Math.random() * (W - size) + size / 2;
  const y = Math.random() * (H - size) + size / 2;
  // случайная скорость
  const speed = (type === 'leukocyte') ? 1.2 : 0.8;
  const angle = Math.random() * Math.PI * 2;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;

  return { el: div, type, x, y, vx, vy, size };
}

// расстояние между центрами
const dist2 = (a, b) => (a.x - b.x)**2 + (a.y - b.y)**2;

/* ──────────────────────── инициализация ─────────────────────── */

function spawnInitial() {
  for (let i = 0; i < NUM_ERYTHRO; i++) entities.push(createEntity('erythrocyte'));
  for (let i = 0; i < NUM_LEUKO;   i++) entities.push(createEntity('leukocyte'));
  for (let i = 0; i < NUM_BACT;    i++) entities.push(createEntity('bacteria'));
}
spawnInitial();

/* ──────────────────────── основной цикл ─────────────────────── */

function animate() {
  requestAnimationFrame(animate);

  for (const e of entities) {
    // Лейкоцит ищет ближнюю бактерию
    if (e.type === 'leukocyte') {
      let nearest = null, dMin = Infinity;
      for (const b of entities)
        if (b.type === 'bacteria') {
          const d = dist2(e, b);
          if (d < dMin) { dMin = d; nearest = b; }
        }
      if (nearest) {
        const dx = nearest.x - e.x, dy = nearest.y - e.y;
        const len = Math.hypot(dx, dy) || 1;
        // Подгоняем скорость к бактерии
        e.vx += (dx / len) * 0.05;
        e.vy += (dy / len) * 0.05;
        // Ограничиваем максимальную скорость
        const maxSpeed = 1.8;
        const speed = Math.hypot(e.vx, e.vy);
        if (speed > maxSpeed) {
          e.vx = (e.vx / speed) * maxSpeed;
          e.vy = (e.vy / speed) * maxSpeed;
        }
        // Проверка «поедания»
        if (Math.sqrt(dMin) < (e.size + nearest.size) / 2) {
          // удаляем бактерию из DOM и массива
          nearest.el.remove();
          entities.splice(entities.indexOf(nearest), 1);
          // спавним новую бактерию
          entities.push(createEntity('bacteria'));
        }
      }
    }

    // Обновляем координаты
    e.x += e.vx;
    e.y += e.vy;

    // Столкновение со стенками
    if (e.x < e.size / 2 || e.x > W - e.size / 2) e.vx *= -1;
    if (e.y < e.size / 2 || e.y > H - e.size / 2) e.vy *= -1;

    // Применяем к DOM-элементу
    e.el.style.left = `${e.x}px`;
    e.el.style.top  = `${e.y}px`;

    // Дополнительное вращение эритроцитов
    if (e.type === 'erythrocyte') {
      const rot = (parseFloat(e.el.dataset.rot || 0) + 1) % 360;
      e.el.dataset.rot = rot;
      e.el.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
    }
  }
}

// запустить после того, как элемент #scene получит итоговые размеры
window.addEventListener('load', () => {
  animate();
});
