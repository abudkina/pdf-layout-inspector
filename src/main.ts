import { Приложение } from './app/App';
import { логгер } from './utils/logger';
import './styles/main.css';

function запуск(): void {
  const контейнер = document.getElementById('приложение');
  if (!контейнер) {
    логгер.ошибка('Контейнер #приложение не найден в DOM');
    return;
  }

  try {
    new Приложение(контейнер);
    логгер.инфо('Приложение запущено');
  } catch (ошибка) {
    логгер.ошибка('Критическая ошибка запуска', ошибка);
    контейнер.innerHTML = `
      <div class="критическая-ошибка" role="alert">
        <h1>Не удалось запустить приложение</h1>
        <p>Обновите страницу или попробуйте другой браузер.</p>
      </div>
    `;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', запуск);
} else {
  запуск();
}
