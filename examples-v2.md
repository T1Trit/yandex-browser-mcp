# Примеры использования Yandex Browser MCP v2.0

## 🚀 Быстрый старт

### 1. Подключение и базовая навигация
```
connect_to_browser({})
list_tabs()
navigate({ url: "https://ya.ru" })
```

### 2. Получение информации со страницы БЕЗ скриншотов

#### Получить весь текст страницы:
```
get_text({})
```

#### Получить текст конкретного элемента:
```
get_text({ selector: "h1" })
```

#### Получить HTML элемента:
```
get_html({ selector: ".content", outerHTML: true })
```

#### Получить атрибуты элемента:
```
get_attributes({ selector: "img", attributes: ["src", "alt"] })
```

#### Получить метаинформацию страницы:
```
get_page_info({})
```

### 3. Мониторинг консоли браузера

#### Получить все логи:
```
get_console_logs({})
```

#### Получить только ошибки:
```
get_console_logs({ type: "error", limit: 50 })
```
### 4. Быстрый скроллинг

#### Скролл к элементу:
```
scroll({ selector: "#footer", smooth: true })
```

#### Скролл вниз на 500px:
```
scroll({ direction: "down", distance: 500 })
```

#### Мгновенный скролл вверх:
```
scroll({ direction: "up", distance: 1000, smooth: false })
```

### 5. Прямое взаимодействие

#### Hover эффект:
```
hover({ selector: ".menu-item" })
```

#### Нажатие клавиш:
```
key_press({ key: "Enter" })
key_press({ key: "a", modifiers: ["Control"] })  // Ctrl+A
key_press({ key: "Tab" })
```

#### Заполнение формы:
```
fill_form({
  fields: {
    "#username": "test_user",
    "#password": "secure_pass",
    "#remember": true,
    "#country": "ru"
  }
})
```

### 6. Полезные комбинации

#### Мониторинг AJAX запросов:
```
// Сначала открываем консоль
evaluate({ script: "console.log('Monitoring started...')" })

// Переходим на страницу
navigate({ url: "https://example.com" })

// Ждем загрузки
wait_for_element({ selector: ".loaded", timeout: 10000 })

// Получаем логи
get_console_logs({ type: "all" })
```
#### Извлечение структурированных данных:
```
// Получаем все ссылки на странице
evaluate({ 
  script: `
    Array.from(document.querySelectorAll('a'))
      .map(a => ({ text: a.textContent, href: a.href }))
  `
})

// Получаем данные из таблицы
get_html({ selector: "table" })

// Получаем все изображения
evaluate({
  script: `
    Array.from(document.querySelectorAll('img'))
      .map(img => ({ src: img.src, alt: img.alt }))
  `
})
```

#### Автоматизация тестирования:
```
// Открываем тестовую страницу
navigate({ url: "file:///path/to/test-page-v2.html" })

// Тестируем консоль
click({ selector: "button[onclick='testConsole()']" })
get_console_logs({ limit: 10 })

// Тестируем hover
hover({ selector: "#hover-target" })

// Заполняем и отправляем форму
fill_form({
  fields: {
    "#name": "Тест",
    "#email": "test@example.com",
    "#message": "Тестовое сообщение"
  }
})
click({ selector: "button[type='submit']" })
```

### 7. Отладка и диагностика

#### Проверка загрузки страницы:
```
navigate({ url: "https://slow-site.com" })
wait_for_element({ selector: "body", visible: true })
get_page_info()
get_console_logs({ type: "error" })
```

#### Мониторинг JavaScript ошибок:
```
// Подписываемся на ошибки
evaluate({ 
  script: `
    window.addEventListener('error', (e) => {
      console.error('JS Error:', e.message, 'at', e.filename, e.lineno)
    })
  `
})

// Работаем со страницей...
// Затем получаем все ошибки
get_console_logs({ type: "error" })
```

## 💡 Советы

1. **Всегда проверяйте подключение** перед работой: `connect_to_browser({})`
2. **Используйте wait_for_element** для динамических страниц
3. **Комбинируйте get_text и get_attributes** для полного извлечения данных
4. **Мониторьте консоль** при отладке: `get_console_logs({ type: "error" })`
5. **Используйте smooth: false** для быстрого скроллинга при автоматизации