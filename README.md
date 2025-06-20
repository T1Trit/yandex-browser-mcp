# Yandex Browser Tabs MCP Server v2.0

MCP (Model Context Protocol) сервер для управления вкладками Яндекс Браузера с расширенной функциональностью.

## 🚀 Новые возможности в версии 2.0

### 📊 Прямой доступ к консоли браузера
- Перехват всех логов консоли (log, warn, error, info)
- Сохранение истории консоли
- Фильтрация логов по типу

### 🎯 Быстрый скроллинг
- Скролл к элементу с плавной анимацией
- Скролл в любом направлении на заданное расстояние
- Поддержка smooth и instant режимов

### 📄 Получение информации без скриншотов
- Извлечение текста со страницы или элемента
- Получение HTML контента (inner/outer)
- Чтение атрибутов элементов
- Получение метаинформации страницы

### 🎮 Расширенное взаимодействие
- Hover эффекты
- Нажатие клавиш и комбинаций
- Заполнение форм
- Ожидание появления элементов

## 📋 Установка

```bash
# Клонируйте репозиторий
git clone <repository-url>
cd yandex-browser-mcp

# Установите зависимости
npm install

# Соберите проект
npm run build
```
## 🔧 Использование

### 1. Запустите Яндекс Браузер в режиме отладки

Используйте один из предоставленных батников:
```bash
start-yandex-debug.bat
```

Или вручную:
```bash
"C:\Users\%USERNAME%\AppData\Local\Yandex\YandexBrowser\Application\browser.exe" --remote-debugging-port=9222
```

### 2. Подключите MCP сервер к Claude Desktop

Добавьте в конфигурацию Claude Desktop:
```json
{
  "mcpServers": {
    "yandex-browser": {
      "command": "node",
      "args": ["C:\\Users\\Professional\\Desktop\\yandex-browser-mcp\\build\\index.js"]
    }
  }
}
```

## 📚 Полный список функций

### Базовые функции

#### connect_to_browser
Подключиться к уже открытому Яндекс Браузеру
```typescript
connect_to_browser({ port?: number })
```

#### list_tabs
Получить список всех открытых вкладок
```typescript
list_tabs({})
```

#### navigate
Перейти по URL в указанной вкладке
```typescript
navigate({ 
  url: string, 
  tabIndex?: number, 
  waitForSelector?: string 
})
```
### Взаимодействие с элементами

#### click
Кликнуть по элементу
```typescript
click({ selector: string, tabIndex?: number })
```

#### type
Ввести текст в поле
```typescript
type({ 
  selector: string, 
  text: string, 
  tabIndex?: number, 
  delay?: number 
})
```

#### hover
Навести курсор на элемент
```typescript
hover({ selector: string, tabIndex?: number })
```

#### key_press
Нажать клавишу или комбинацию
```typescript
key_press({ 
  key: string, 
  modifiers?: ['Control' | 'Shift' | 'Alt' | 'Meta'][], 
  tabIndex?: number 
})
```

### Скроллинг

#### scroll
Прокрутить страницу или к элементу
```typescript
scroll({ 
  tabIndex?: number,
  direction?: 'up' | 'down' | 'left' | 'right',
  distance?: number,
  selector?: string,
  smooth?: boolean
})
```
### Получение информации

#### get_text
Получить текстовое содержимое
```typescript
get_text({ selector?: string, tabIndex?: number })
```

#### get_html
Получить HTML содержимое
```typescript
get_html({ 
  selector?: string, 
  outerHTML?: boolean, 
  tabIndex?: number 
})
```

#### get_attributes
Получить атрибуты элемента
```typescript
get_attributes({ 
  selector: string, 
  attributes?: string[], 
  tabIndex?: number 
})
```

#### get_page_info
Получить информацию о странице
```typescript
get_page_info({ tabIndex?: number })
// Возвращает: URL, title, description, viewport, metaTags
```

#### get_console_logs
Получить логи консоли браузера
```typescript
get_console_logs({ 
  tabIndex?: number,
  type?: 'all' | 'log' | 'warn' | 'error' | 'info',
  limit?: number
})
```
### Работа с формами

#### fill_form
Заполнить форму данными
```typescript
fill_form({ 
  formSelector?: string,
  fields: { [selector: string]: any },
  tabIndex?: number
})
```

### Утилиты

#### wait_for_element
Ждать появления элемента
```typescript
wait_for_element({ 
  selector: string,
  tabIndex?: number,
  timeout?: number,
  visible?: boolean
})
```

#### screenshot
Сделать скриншот
```typescript
screenshot({ 
  name: string,
  tabIndex?: number,
  fullPage?: boolean,
  selector?: string
})
```

#### evaluate
Выполнить JavaScript код
```typescript
evaluate({ script: string, tabIndex?: number })
```

#### execute_test
Выполнить тест (выбрать ответы и отправить)
```typescript
execute_test({ 
  tabIndex: number,
  testSelectors: string[],
  submitButtonSelector: string
})
```
## 💡 Примеры использования

### Пример 1: Мониторинг консоли и извлечение данных
```javascript
// Подключаемся к браузеру
connect_to_browser({})

// Переходим на страницу
navigate({ url: "https://example.com" })

// Получаем логи консоли
get_console_logs({ type: 'error' })

// Извлекаем текст
get_text({ selector: '.main-content' })
```

### Пример 2: Заполнение и отправка формы
```javascript
// Заполняем форму
fill_form({
  fields: {
    '#name': 'Иван Иванов',
    '#email': 'ivan@example.com',
    '#country': 'ru',
    '#subscribe': true
  }
})

// Нажимаем Enter для отправки
key_press({ key: 'Enter' })
```

### Пример 3: Скроллинг и скриншоты
```javascript
// Скроллим к элементу
scroll({ selector: '#important-section', smooth: true })

// Делаем скриншот элемента
screenshot({ 
  name: 'important-section.png',
  selector: '#important-section'
})
```

## 🧪 Тестирование

Откройте `test-page-v2.html` в браузере для тестирования всех функций:
```bash
navigate({ url: "file:///C:/Users/Professional/Desktop/yandex-browser-mcp/test-page-v2.html" })
```

## 📝 Лицензия

MIT

## 👨‍💻 Автор

MIT Professor

---

**v2.0** - Расширенная версия с прямым доступом к данным браузера