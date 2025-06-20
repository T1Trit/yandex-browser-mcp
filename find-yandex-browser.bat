@echo off
chcp 65001 >nul
echo ==========================================
echo Поиск установленного Яндекс Браузера
echo ==========================================
echo.

echo Поиск в реестре...
echo.

:: Поиск в реестре для текущего пользователя
for /f "tokens=2*" %%a in ('reg query "HKEY_CURRENT_USER\Software\Yandex\YandexBrowser\BLBeacon" /v "path" 2^>nul') do (
    echo Найден путь в реестре (пользователь): %%b
    if exist "%%b" (
        echo ✓ Файл существует
    ) else (
        echo × Файл не найден
    )
    echo.
)

:: Поиск в реестре для всех пользователей
for /f "tokens=2*" %%a in ('reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Yandex\YandexBrowser" /v "InstalledPath" 2^>nul') do (
    echo Найден путь в реестре (система): %%b
    if exist "%%b\browser.exe" (
        echo ✓ Файл существует: %%b\browser.exe
    ) else (
        echo × Файл не найден
    )
    echo.
)

echo Поиск в стандартных директориях...
echo.

:: Список возможных путей
set "paths[0]=C:\Users\%USERNAME%\AppData\Local\Yandex\YandexBrowser\Application"
set "paths[1]=C:\Program Files\Yandex\YandexBrowser\Application"
set "paths[2]=C:\Program Files (x86)\Yandex\YandexBrowser\Application"
set "paths[3]=C:\Users\%USERNAME%\AppData\Local\Programs\Yandex\YandexBrowser\Application"

:: Проверяем каждый путь
for /L %%i in (0,1,3) do (
    call set "current_path=%%paths[%%i]%%"
    call echo Проверка: %%current_path%%
    if exist "%%current_path%%\browser.exe" (
        call echo ✓ НАЙДЕН: %%current_path%%\browser.exe
        call dir "%%current_path%%\browser.exe" /b
        echo.
    ) else (
        echo × Не найден
        echo.
    )
)

echo Поиск через where...
where browser.exe 2>nul
if %errorlevel% equ 0 (
    echo ✓ Найден через PATH
) else (
    echo × Не найден в PATH
)

echo.
echo ==========================================
echo Поиск процессов Яндекс Браузера...
echo ==========================================
echo.

tasklist /FI "IMAGENAME eq browser.exe" 2>nul | findstr /i browser.exe
if %errorlevel% equ 0 (
    echo.
    echo ВНИМАНИЕ: Браузер сейчас запущен!
    echo Закройте все окна браузера перед запуском в режиме отладки.
)

echo.
pause