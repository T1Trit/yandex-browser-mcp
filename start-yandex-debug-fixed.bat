@echo off
chcp 65001 >nul
echo ========================================
echo Запуск Яндекс Браузера в режиме отладки
echo ========================================
echo.

:: Проверяем, не запущен ли уже процесс с отладкой
netstat -an | findstr :9222 >nul
if %errorlevel% equ 0 (
    echo ВНИМАНИЕ: Порт 9222 уже используется!
    echo Возможно, браузер уже запущен в режиме отладки.
    echo.
    echo Попробуйте:
    echo 1. Закрыть все окна Яндекс Браузера
    echo 2. Проверить диспетчер задач на наличие процессов browser.exe
    echo.
    pause
    exit /b 1
)

:: Закрываем все процессы Яндекс Браузера
echo Закрываем существующие процессы браузера...
taskkill /F /IM browser.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Проверяем несколько возможных путей
set "BROWSER_PATH1=C:\Users\%USERNAME%\AppData\Local\Yandex\YandexBrowser\Application\browser.exe"
set "BROWSER_PATH2=C:\Program Files\Yandex\YandexBrowser\Application\browser.exe"
set "BROWSER_PATH3=C:\Program Files (x86)\Yandex\YandexBrowser\Application\browser.exe"

set BROWSER_PATH=

:: Проверяем каждый путь
if exist "%BROWSER_PATH1%" (
    set "BROWSER_PATH=%BROWSER_PATH1%"
    echo Найден браузер: %BROWSER_PATH1%
) else if exist "%BROWSER_PATH2%" (
    set "BROWSER_PATH=%BROWSER_PATH2%"
    echo Найден браузер: %BROWSER_PATH2%
) else if exist "%BROWSER_PATH3%" (
    set "BROWSER_PATH=%BROWSER_PATH3%"
    echo Найден браузер: %BROWSER_PATH3%
)

if "%BROWSER_PATH%"=="" (
    echo ОШИБКА: Яндекс Браузер не найден!
    echo.
    echo Проверенные пути:
    echo - %BROWSER_PATH1%
    echo - %BROWSER_PATH2%
    echo - %BROWSER_PATH3%
    echo.
    echo Пожалуйста, укажите правильный путь к browser.exe
    pause
    exit /b 1
)

:: Запускаем браузер с параметрами отладки
echo.
echo Запускаем браузер с параметрами отладки...
echo Путь: %BROWSER_PATH%
echo.

start "" "%BROWSER_PATH%" --remote-debugging-port=9222 --enable-automation --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding

:: Ждем запуска
timeout /t 3 /nobreak >nul

:: Проверяем, запустился ли браузер
netstat -an | findstr :9222 >nul
if %errorlevel% equ 0 (
    echo ✓ Браузер успешно запущен в режиме отладки!
    echo.
    echo Порт отладки: 9222
    echo.
    echo Теперь вы можете использовать команды в Claude:
    echo - "Подключись к браузеру"
    echo - "Покажи все вкладки"
    echo - "Перейди на сайт во вкладке X"
    echo - "Сделай скриншот"
    echo.
) else (
    echo × ОШИБКА: Не удалось запустить браузер в режиме отладки!
    echo.
    echo Возможные причины:
    echo 1. Антивирус блокирует режим отладки
    echo 2. Недостаточно прав доступа
    echo 3. Браузер требует обновления
    echo.
)

pause