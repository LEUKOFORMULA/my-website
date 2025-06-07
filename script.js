const cell = document.getElementById('cell');

document.addEventListener('mousemove', (event) => {
  const x = event.clientX - 50; // центрируем по клетке (ширина/2)
  const y = event.clientY - 50;
  cell.style.left = `${x}px`;
  cell.style.top = `${y}px`;
});
