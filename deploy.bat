@echo off
cd /d "%~dp0"
echo ==================================================
echo   Animal Farm card site - one-click deploy
echo   (content only: cards / rules / faq / site.txt)
echo ==================================================
echo.
echo [1/3] build (config -> js)...
python build.py || py build.py || python3 build.py
echo.
echo [2/3] commit...
git add -A
git commit -m "update site content"
echo.
echo [3/3] push to GitHub...
git push
echo.
echo Done. Site updates in ~1 min. If push failed with an SSL/schannel
echo error, just run this again (GitHub network hiccup).
pause
