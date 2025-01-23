@echo off
echo 开始部署到 GitHub Pages...

:: 创建或清空 docs 目录
if exist docs (
    rd /s /q docs
)
mkdir docs

:: 复制必要文件到 docs 目录
xcopy /s /y public\* docs\
copy lottery-data.json docs\

:: Git 命令
git add .
git commit -m "Update GitHub Pages"
git push

echo 部署完成！