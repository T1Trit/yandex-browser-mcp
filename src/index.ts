#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import puppeteer from "puppeteer-core";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode
} from "@modelcontextprotocol/sdk/types.js";

// Глобальные переменные для управления браузером
let browser: any = null;
let debuggingPort = 9222;
let consoleMessages: Array<{timestamp: Date, type: string, text: string, location?: string}> = [];
const MAX_CONSOLE_MESSAGES = 1000;

// Конфигурация Яндекс Браузера
const YANDEX_BROWSER_PATH = process.env.YANDEX_BROWSER_PATH || 
  "C:\\Users\\%USERNAME%\\AppData\\Local\\Yandex\\YandexBrowser\\Application\\browser.exe";

// Схемы для валидации параметров инструментов
const NavigateSchema = z.object({
  url: z.string().url(),
  tabIndex: z.number().optional(),
  waitForSelector: z.string().optional()
});

const ClickSchema = z.object({
  selector: z.string(),
  tabIndex: z.number().optional()
});
const TypeSchema = z.object({
  selector: z.string(), 
  text: z.string(),
  tabIndex: z.number().optional(),
  delay: z.number().optional()
});

const ScreenshotSchema = z.object({
  name: z.string(),
  tabIndex: z.number().optional(),
  fullPage: z.boolean().optional(),
  selector: z.string().optional()
});

const EvaluateSchema = z.object({
  script: z.string(),
  tabIndex: z.number().optional()
});

const ListTabsSchema = z.object({});

const ConnectToExistingSchema = z.object({
  port: z.number().optional()
});

const ExecuteTestSchema = z.object({
  tabIndex: z.number(),
  testSelectors: z.array(z.string()),
  submitButtonSelector: z.string()
});

// Новые схемы для дополнительных функций
const ScrollSchema = z.object({
  tabIndex: z.number().optional(),
  direction: z.enum(['up', 'down', 'left', 'right']).optional(),
  distance: z.number().optional(),
  selector: z.string().optional(),
  smooth: z.boolean().optional()
});
const GetTextSchema = z.object({
  selector: z.string().optional(),
  tabIndex: z.number().optional()
});

const GetHtmlSchema = z.object({
  selector: z.string().optional(),
  outerHTML: z.boolean().optional(),
  tabIndex: z.number().optional()
});

const GetAttributesSchema = z.object({
  selector: z.string(),
  attributes: z.array(z.string()).optional(),
  tabIndex: z.number().optional()
});

const HoverSchema = z.object({
  selector: z.string(),
  tabIndex: z.number().optional()
});

const KeyPressSchema = z.object({
  key: z.string(),
  modifiers: z.array(z.enum(['Control', 'Shift', 'Alt', 'Meta'])).optional(),
  tabIndex: z.number().optional()
});

const GetConsoleLogsSchema = z.object({
  tabIndex: z.number().optional(),
  type: z.enum(['all', 'log', 'warn', 'error', 'info']).optional(),
  limit: z.number().optional()
});

const FillFormSchema = z.object({
  formSelector: z.string().optional(),
  fields: z.record(z.string(), z.any()),
  tabIndex: z.number().optional()
});
const WaitForElementSchema = z.object({
  selector: z.string(),
  tabIndex: z.number().optional(),
  timeout: z.number().optional(),
  visible: z.boolean().optional()
});

const GetPageInfoSchema = z.object({
  tabIndex: z.number().optional()
});

// Функция для получения пути Яндекс Браузера с заменой переменных окружения
function getYandexBrowserPath(): string {
  return YANDEX_BROWSER_PATH.replace('%USERNAME%', process.env.USERNAME || 'Professional');
}

// Функция для подключения к существующему браузеру
async function connectToExistingBrowser(port: number = 9222) {
  try {
    browser = await puppeteer.connect({
      browserURL: `http://localhost:${port}`,
      defaultViewport: null
    });
    debuggingPort = port;
    
    // Подключаем слушатели консоли для всех страниц
    const pages = await browser.pages();
    for (const page of pages) {
      attachConsoleListener(page);
    }
    
    return true;
  } catch (error) {
    console.error("Не удалось подключиться к браузеру:", error);
    return false;
  }
}
// Функция для подключения слушателя консоли к странице
function attachConsoleListener(page: any) {
  page.on('console', (msg: any) => {
    const logEntry = {
      timestamp: new Date(),
      type: msg.type(),
      text: msg.text(),
      location: msg.location() ? `${msg.location().url}:${msg.location().lineNumber}` : undefined
    };
    
    consoleMessages.push(logEntry);
    
    // Ограничиваем размер буфера
    if (consoleMessages.length > MAX_CONSOLE_MESSAGES) {
      consoleMessages.shift();
    }
  });
  
  // Также перехватываем ошибки страницы
  page.on('pageerror', (error: Error) => {
    consoleMessages.push({
      timestamp: new Date(),
      type: 'error',
      text: error.message
    });
  });
}

// Функция для запуска нового браузера
async function launchNewBrowser() {
  if (browser) {
    await browser.close();
  }
  
  browser = await puppeteer.launch({
    executablePath: getYandexBrowserPath(),
    headless: false,
    args: [
      `--remote-debugging-port=${debuggingPort}`,
      '--disable-blink-features=AutomationControlled',
      '--exclude-switches=enable-automation',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--disable-default-apps',
      '--user-data-dir=C:\\tmp\\yandex-automation-profile'
    ],
    defaultViewport: null
  });
  
  // Подключаем слушатели консоли к новым страницам
  browser.on('targetcreated', async (target: any) => {
    if (target.type() === 'page') {
      const page = await target.page();
      if (page) attachConsoleListener(page);
    }
  });
  
  return browser;
}
// Функция для получения страницы по индексу вкладки
async function getPageByIndex(tabIndex?: number) {
  if (!browser) {
    // Попробуем подключиться к существующему браузеру
    const connected = await connectToExistingBrowser(debuggingPort);
    if (!connected) {
      await launchNewBrowser();
    }
  }
  
  const pages = await browser.pages();
  
  if (tabIndex !== undefined) {
    if (tabIndex < 0 || tabIndex >= pages.length) {
      throw new Error(`Вкладка с индексом ${tabIndex} не найдена. Доступно вкладок: ${pages.length}`);
    }
    return pages[tabIndex];
  }
  
  // Если индекс не указан, возвращаем активную вкладку или создаем новую
  const page = pages[pages.length - 1] || await browser.newPage();
  
  // Убеждаемся, что слушатель консоли подключен
  if (!page.listenerCount('console')) {
    attachConsoleListener(page);
  }
  
  return page;
}
// Создание MCP сервера
const server = new Server(
  {
    name: "yandex-browser-tabs-mcp",
    version: "2.0.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    }
  }
);

// Обработчик списка инструментов
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "connect_to_browser",
        description: "Подключиться к уже открытому Яндекс Браузеру",
        inputSchema: {
          type: "object",
          properties: {
            port: {
              type: "number",
              description: "Порт для отладки (по умолчанию 9222)"
            }
          }
        }
      },
      {
        name: "list_tabs",
        description: "Получить список всех открытых вкладок с их индексами и заголовками",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },      {
        name: "navigate",
        description: "Перейти по URL в указанной вкладке",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL для перехода"
            },
            tabIndex: {
              type: "number",
              description: "Индекс вкладки (необязательно)"
            },
            waitForSelector: {
              type: "string",
              description: "CSS селектор для ожидания загрузки"
            }
          },
          required: ["url"]
        }
      },
      {
        name: "click",
        description: "Кликнуть по элементу в указанной вкладке",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS селектор элемента"
            },
            tabIndex: {
              type: "number",
              description: "Индекс вкладки (необязательно)"
            }
          },
          required: ["selector"]
        }
      },      {
        name: "type",
        description: "Ввести текст в поле в указанной вкладке",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS селектор поля ввода"
            },
            text: {
              type: "string",
              description: "Текст для ввода"
            },
            tabIndex: {
              type: "number",
              description: "Индекс вкладки (необязательно)"
            },
            delay: {
              type: "number",
              description: "Задержка между символами в мс"
            }
          },
          required: ["selector", "text"]
        }
      },
      {
        name: "scroll",
        description: "Прокрутить страницу или к элементу",
        inputSchema: {
          type: "object",
          properties: {
            tabIndex: {
              type: "number",
              description: "Индекс вкладки"
            },
            direction: {
              type: "string",
              enum: ["up", "down", "left", "right"],
              description: "Направление прокрутки"
            },
            distance: {
              type: "number",
              description: "Расстояние в пикселях"
            },
            selector: {
              type: "string",
              description: "CSS селектор элемента для прокрутки к нему"
            },
            smooth: {
              type: "boolean",
              description: "Плавная прокрутка (по умолчанию true)"
            }
          }
        }
      },      {
        name: "get_text",
        description: "Получить текстовое содержимое страницы или элемента",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS селектор элемента (если не указан - вся страница)"
            },
            tabIndex: {
              type: "number",
              description: "Индекс вкладки"
            }
          }
        }
      },
      {
        name: "get_html",
        description: "Получить HTML содержимое страницы или элемента",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS селектор элемента"
            },
            outerHTML: {
              type: "boolean",
              description: "Включить внешний HTML (по умолчанию false)"
            },
            tabIndex: {
              type: "number",
              description: "Индекс вкладки"
            }
          }
        }
      },      {
        name: "get_attributes",
        description: "Получить атрибуты элемента",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS селектор элемента"
            },
            attributes: {
              type: "array",
              items: { type: "string" },
              description: "Список атрибутов (если не указан - все)"
            },
            tabIndex: {
              type: "number",
              description: "Индекс вкладки"
            }
          },
          required: ["selector"]
        }
      },
      {
        name: "get_console_logs",
        description: "Получить логи консоли браузера",
        inputSchema: {
          type: "object",
          properties: {
            tabIndex: {
              type: "number",
              description: "Индекс вкладки"
            },
            type: {
              type: "string",
              enum: ["all", "log", "warn", "error", "info"],
              description: "Тип логов (по умолчанию all)"
            },
            limit: {
              type: "number",
              description: "Максимальное количество записей"
            }
          }
        }
      },      {
        name: "hover",
        description: "Навести курсор на элемент",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS селектор элемента"
            },
            tabIndex: {
              type: "number",
              description: "Индекс вкладки"
            }
          },
          required: ["selector"]
        }
      },
      {
        name: "key_press",
        description: "Нажать клавишу или комбинацию клавиш",
        inputSchema: {
          type: "object",
          properties: {
            key: {
              type: "string",
              description: "Клавиша (например: Enter, Escape, ArrowDown, a, 1)"
            },
            modifiers: {
              type: "array",
              items: {
                type: "string",
                enum: ["Control", "Shift", "Alt", "Meta"]
              },
              description: "Модификаторы клавиш"
            },
            tabIndex: {
              type: "number",
              description: "Индекс вкладки"
            }
          },
          required: ["key"]
        }
      },      {
        name: "fill_form",
        description: "Заполнить форму данными",
        inputSchema: {
          type: "object",
          properties: {
            formSelector: {
              type: "string",
              description: "CSS селектор формы"
            },
            fields: {
              type: "object",
              description: "Объект с данными {селектор: значение}"
            },
            tabIndex: {
              type: "number",
              description: "Индекс вкладки"
            }
          },
          required: ["fields"]
        }
      },
      {
        name: "wait_for_element",
        description: "Ждать появления элемента",
        inputSchema: {
          type: "object",
          properties: {
            selector: {
              type: "string",
              description: "CSS селектор элемента"
            },
            tabIndex: {
              type: "number",
              description: "Индекс вкладки"
            },
            timeout: {
              type: "number",
              description: "Таймаут в миллисекундах (по умолчанию 30000)"
            },
            visible: {
              type: "boolean",
              description: "Ждать видимости элемента"
            }
          },
          required: ["selector"]
        }
      },      {
        name: "get_page_info",
        description: "Получить информацию о странице (URL, заголовок, мета-теги)",
        inputSchema: {
          type: "object",
          properties: {
            tabIndex: {
              type: "number",
              description: "Индекс вкладки"
            }
          }
        }
      },
      {
        name: "screenshot",
        description: "Сделать скриншот указанной вкладки",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Имя скриншота"
            },
            tabIndex: {
              type: "number",
              description: "Индекс вкладки (необязательно)"
            },
            fullPage: {
              type: "boolean",
              description: "Скриншот всей страницы"
            },
            selector: {
              type: "string",
              description: "CSS селектор элемента для скриншота"
            }
          },
          required: ["name"]
        }
      },      {
        name: "evaluate",
        description: "Выполнить JavaScript код в указанной вкладке",
        inputSchema: {
          type: "object",
          properties: {
            script: {
              type: "string",
              description: "JavaScript код для выполнения"
            },
            tabIndex: {
              type: "number",
              description: "Индекс вкладки (необязательно)"
            }
          },
          required: ["script"]
        }
      },
      {
        name: "execute_test",
        description: "Выполнить тест в указанной вкладке: выбрать ответы и отправить",
        inputSchema: {
          type: "object",
          properties: {
            tabIndex: {
              type: "number",
              description: "Индекс вкладки с тестом"
            },
            testSelectors: {
              type: "array",
              items: {
                type: "string"
              },
              description: "CSS селекторы правильных ответов"
            },
            submitButtonSelector: {
              type: "string",
              description: "CSS селектор кнопки отправки"
            }
          },
          required: ["tabIndex", "testSelectors", "submitButtonSelector"]
        }
      }
    ]
  };
});
// Обработчик вызова инструментов
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case "connect_to_browser": {
        const { port } = ConnectToExistingSchema.parse(args);
        const connected = await connectToExistingBrowser(port);
        
        if (connected) {
          const pages = await browser.pages();
          return {
            content: [{
              type: "text",
              text: `Успешно подключен к браузеру на порту ${debuggingPort}. Найдено вкладок: ${pages.length}`
            }]
          };
        } else {
          return {
            content: [{
              type: "text",
              text: "Не удалось подключиться к браузеру. Запустите Яндекс Браузер с флагом --remote-debugging-port=9222"
            }]
          };
        }
      }      
      case "list_tabs": {
        const page = await getPageByIndex();
        const pages = await browser.pages();
        
        const tabsList = await Promise.all(
          pages.map(async (p: any, index: number) => {
            const title = await p.title();
            const url = p.url();
            return `Вкладка ${index}: "${title}" - ${url}`;
          })
        );
        
        return {
          content: [{
            type: "text",
            text: `Открытые вкладки:\n${tabsList.join('\n')}`
          }]
        };
      }
      
      case "navigate": {
        const { url, tabIndex, waitForSelector } = NavigateSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        if (waitForSelector) {
          await page.waitForSelector(waitForSelector, { timeout: 30000 });
        }
        
        const title = await page.title();
        return {
          content: [{
            type: "text",
            text: `Перешел на ${url} (вкладка ${tabIndex ?? 'активная'}). Заголовок: ${title}`
          }]
        };
      }      
      case "click": {
        const { selector, tabIndex } = ClickSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        await page.waitForSelector(selector, { visible: true });
        await page.click(selector);
        
        return {
          content: [{
            type: "text",
            text: `Кликнул по элементу ${selector} (вкладка ${tabIndex ?? 'активная'})`
          }]
        };
      }
      
      case "type": {
        const { selector, text, tabIndex, delay } = TypeSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        await page.waitForSelector(selector, { visible: true });
        await page.click(selector); // Фокус на поле
        await page.type(selector, text, { delay: delay || 50 });
        
        return {
          content: [{
            type: "text",
            text: `Ввел текст в ${selector} (вкладка ${tabIndex ?? 'активная'})`
          }]
        };
      }      
      case "scroll": {
        const { tabIndex, direction, distance, selector, smooth = true } = ScrollSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        if (selector) {
          // Скролл к элементу
          await page.evaluate((sel: string, isSmooth: boolean) => {
            const element = document.querySelector(sel);
            if (element) {
              element.scrollIntoView({ 
                behavior: isSmooth ? 'smooth' : 'auto',
                block: 'center'
              });
            }
          }, selector, smooth);
          
          return {
            content: [{
              type: "text",
              text: `Прокрутил к элементу ${selector} (вкладка ${tabIndex ?? 'активная'})`
            }]
          };
        } else if (direction && distance) {
          // Скролл в направлении
          const scrollMap = {
            down: `window.scrollBy(0, ${distance})`,
            up: `window.scrollBy(0, -${distance})`,
            right: `window.scrollBy(${distance}, 0)`,
            left: `window.scrollBy(-${distance}, 0)`
          };
          
          await page.evaluate((scrollCode: string, isSmooth: boolean) => {
            if (isSmooth) {
              const [x, y] = scrollCode.match(/-?\d+/g)!.map(Number);
              window.scrollBy({ left: x || 0, top: y || 0, behavior: 'smooth' });
            } else {
              eval(scrollCode);
            }
          }, scrollMap[direction], smooth);
          
          return {
            content: [{
              type: "text",
              text: `Прокрутил ${direction} на ${distance}px (вкладка ${tabIndex ?? 'активная'})`
            }]
          };
        }
        
        throw new Error("Необходимо указать либо selector, либо direction и distance");
      }      
      case "get_text": {
        const { selector, tabIndex } = GetTextSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        let text;
        if (selector) {
          await page.waitForSelector(selector);
          text = await page.$eval(selector, (el: HTMLElement) => el.innerText || el.textContent);
        } else {
          text = await page.evaluate(() => document.body.innerText);
        }
        
        return {
          content: [{
            type: "text",
            text: text || "Текст не найден"
          }]
        };
      }
      
      case "get_html": {
        const { selector, outerHTML = false, tabIndex } = GetHtmlSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        let html;
        if (selector) {
          await page.waitForSelector(selector);
          html = await page.$eval(selector, (el: Element, outer: boolean) => 
            outer ? el.outerHTML : el.innerHTML, outerHTML);
        } else {
          html = await page.content();
        }
        
        return {
          content: [{
            type: "text",
            text: html || "HTML не найден"
          }]
        };
      }      
      case "get_attributes": {
        const { selector, attributes, tabIndex } = GetAttributesSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        await page.waitForSelector(selector);
        const attrs = await page.$eval(selector, (el: Element, attrList?: string[]) => {
          const result: Record<string, string | null> = {};
          
          if (attrList && attrList.length > 0) {
            attrList.forEach(attr => {
              result[attr] = el.getAttribute(attr);
            });
          } else {
            // Получаем все атрибуты
            Array.from(el.attributes).forEach((attr: Attr) => {
              result[attr.name] = attr.value;
            });
          }
          
          return result;
        }, attributes);
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(attrs, null, 2)
          }]
        };
      }
      
      case "get_console_logs": {
        const { tabIndex, type = 'all', limit = 100 } = GetConsoleLogsSchema.parse(args);
        
        let logs = consoleMessages;
        
        // Фильтруем по типу
        if (type !== 'all') {
          logs = logs.filter(log => log.type === type);
        }
        
        // Ограничиваем количество
        logs = logs.slice(-limit);
        
        const formattedLogs = logs.map(log => 
          `[${log.timestamp.toISOString()}] [${log.type.toUpperCase()}] ${log.text}${log.location ? ` (${log.location})` : ''}`
        ).join('\n');
        
        return {
          content: [{
            type: "text",
            text: formattedLogs || "Нет логов консоли"
          }]
        };
      }      
      case "hover": {
        const { selector, tabIndex } = HoverSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        await page.waitForSelector(selector, { visible: true });
        await page.hover(selector);
        
        return {
          content: [{
            type: "text",
            text: `Навел курсор на элемент ${selector} (вкладка ${tabIndex ?? 'активная'})`
          }]
        };
      }
      
      case "key_press": {
        const { key, modifiers = [], tabIndex } = KeyPressSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        // Нажимаем модификаторы
        for (const modifier of modifiers) {
          await page.keyboard.down(modifier);
        }
        
        // Нажимаем основную клавишу
        await page.keyboard.press(key);
        
        // Отпускаем модификаторы
        for (const modifier of modifiers.reverse()) {
          await page.keyboard.up(modifier);
        }
        
        return {
          content: [{
            type: "text",
            text: `Нажал клавишу ${modifiers.length ? modifiers.join('+') + '+' : ''}${key} (вкладка ${tabIndex ?? 'активная'})`
          }]
        };
      }      
      case "fill_form": {
        const { formSelector, fields, tabIndex } = FillFormSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        // Если указан селектор формы, проверяем её наличие
        if (formSelector) {
          await page.waitForSelector(formSelector);
        }
        
        // Заполняем поля
        for (const [selector, value] of Object.entries(fields)) {
          await page.waitForSelector(selector, { visible: true });
          
          // Определяем тип элемента
          const tagName = await page.$eval(selector, (el: Element) => el.tagName.toLowerCase());
          const type = await page.$eval(selector, (el: Element) => (el as HTMLInputElement).type);
          
          if (tagName === 'select') {
            await page.select(selector, value as string);
          } else if (type === 'checkbox' || type === 'radio') {
            const isChecked = await page.$eval(selector, (el: Element) => (el as HTMLInputElement).checked);
            if ((value === true && !isChecked) || (value === false && isChecked)) {
              await page.click(selector);
            }
          } else {
            await page.click(selector);
            await page.keyboard.down('Control');
            await page.keyboard.press('a');
            await page.keyboard.up('Control');
            await page.type(selector, String(value));
          }
        }
        
        return {
          content: [{
            type: "text",
            text: `Заполнена форма с ${Object.keys(fields).length} полями (вкладка ${tabIndex ?? 'активная'})`
          }]
        };
      }      
      case "wait_for_element": {
        const { selector, tabIndex, timeout = 30000, visible = true } = WaitForElementSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        try {
          await page.waitForSelector(selector, { 
            timeout, 
            visible 
          });
          
          return {
            content: [{
              type: "text",
              text: `Элемент ${selector} найден (вкладка ${tabIndex ?? 'активная'})`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Элемент ${selector} не найден в течение ${timeout}мс (вкладка ${tabIndex ?? 'активная'})`
            }]
          };
        }
      }
      
      case "get_page_info": {
        const { tabIndex } = GetPageInfoSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        const info = await page.evaluate(() => {
          const metaTags: Record<string, string> = {};
          document.querySelectorAll('meta').forEach((meta: HTMLMetaElement) => {
            const name = meta.getAttribute('name') || meta.getAttribute('property');
            const content = meta.getAttribute('content');
            if (name && content) {
              metaTags[name] = content;
            }
          });
          
          return {
            url: window.location.href,
            title: document.title,
            description: (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || '',
            viewport: (document.querySelector('meta[name="viewport"]') as HTMLMetaElement)?.content || '',
            charset: document.characterSet,
            metaTags
          };
        });
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(info, null, 2)
          }]
        };
      }      
      case "screenshot": {
        const { name, tabIndex, fullPage, selector } = ScreenshotSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        let screenshotBuffer;
        if (selector) {
          await page.waitForSelector(selector);
          const element = await page.$(selector);
          screenshotBuffer = await element?.screenshot();
        } else {
          screenshotBuffer = await page.screenshot({ 
            fullPage: fullPage || false,
            type: 'png'
          });
        }
        
        // Сохраняем скриншот как ресурс
        const screenshotData = screenshotBuffer?.toString('base64');
        
        return {
          content: [{
            type: "text",
            text: `Скриншот сохранен: ${name} (вкладка ${tabIndex ?? 'активная'})`
          }, {
            type: "image",
            data: screenshotData,
            mimeType: "image/png"
          }]
        };
      }      
      case "evaluate": {
        const { script, tabIndex } = EvaluateSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        const result = await page.evaluate(script);
        
        return {
          content: [{
            type: "text",
            text: `Результат выполнения (вкладка ${tabIndex ?? 'активная'}):\n${JSON.stringify(result, null, 2)}`
          }]
        };
      }
      
      case "execute_test": {
        const { tabIndex, testSelectors, submitButtonSelector } = ExecuteTestSchema.parse(args);
        const page = await getPageByIndex(tabIndex);
        
        // Кликаем по всем селекторам ответов
        for (const selector of testSelectors) {
          try {
            await page.waitForSelector(selector, { visible: true, timeout: 5000 });
            await page.click(selector);
            await page.waitForTimeout(500); // Небольшая задержка между кликами
          } catch (e) {
            console.error(`Не удалось кликнуть по ${selector}:`, e);
          }
        }
        
        // Отправляем тест
        await page.waitForSelector(submitButtonSelector, { visible: true });
        await page.click(submitButtonSelector);
        
        return {
          content: [{
            type: "text",
            text: `Тест выполнен и отправлен (вкладка ${tabIndex}). Выбрано ответов: ${testSelectors.length}`
          }]
        };
      }
      
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Неизвестный инструмент: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Ошибка валидации: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    throw error;
  }
});
// Обработчик списка ресурсов (для скриншотов)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: []
  };
});

// Запуск сервера
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Yandex Browser Tabs MCP сервер v2.0 запущен");
  console.error("Новые функции:");
  console.error("- Прямой доступ к консоли браузера");
  console.error("- Быстрый скроллинг");
  console.error("- Получение текста и HTML без скриншотов");
  console.error("- Расширенное взаимодействие с элементами");
  
  // Обработка завершения
  process.on('SIGINT', async () => {
    if (browser) {
      await browser.disconnect();
    }
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Ошибка запуска сервера:", error);
  process.exit(1);
});