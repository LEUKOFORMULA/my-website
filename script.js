// Можно добавить взаимодействие — при клике ускорить клетку
const cell = document.getElementById('cell');

cell.addEventListener('click', () => {
  cell.style.animationDuration = '1s';
  setTimeout(() => {
    cell.style.animationDuration = '5s';
  }, 2000);
});
