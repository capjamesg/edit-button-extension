if [ -f "build.zip" ]; then
    rm build.zip
fi
zip -r build.zip . -x ".*" -x "__MACOSX/*" -x "build.zip" -x "build.sh" -x ".git/*" -x ".gitignore"