@echo off
echo Запуск Яндекс Браузера с поддержкой отладки...
echo.
echo После запуска браузера вы сможете управлять открытыми вкладками через Claude!
echo.
echo Порт отладки: 9222
echo.

set BROWSER_PATH=C:\Users\%USERNAME%\AppData\Local\Yandex\YandexBrowser\Application\browser.exe

if exist "%BROWSER_PATH%" (
    start "" "%BROWSER_PATH%" --remote-debugging-port=9222 --enable-automation
    echo Браузер запущен!
    echo.
    echo Теперь вы можете использовать команды в Claude:
    echo - "Подключись к браузеру"
    echo - "Покажи все вкладки"
    echo - "Во вкладке 2 перейди на сайт"
    echo - "Выполни тест во вкладке 3"
) else (
    echo ОШИБКА: Яндекс Браузер не найден по пути:
    echo %BROWSER_PATH%
    echo.
    echo Пожалуйста, проверьте путь установки.
)

pause