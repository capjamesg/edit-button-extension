if [ ! -d "builds" ]; then
    mkdir builds
fi

if [ -f "builds/build.zip" ]; then
    rm builds/build.zip
fi
if [ -f "builds/edge_build.zip" ]; then
    rm builds/edge_build.zip
fi

echo "Creating build ZIP files..."

zip -r builds/build.zip . -x ".*" -x "__MACOSX/*" -x "build.zip" -x "build.sh" -x ".git/*" -x ".gitignore" -x "*DS_Store*" -x "web/*" -x "screenshot.png" -x "builds/*" -x "Edit*" -x "docs/*"

# create an edge_build.zip file too
# rename edge_manfiest.json to manifest.json in the zip file
mv manifest.json manifest_all.json
mv edge_manifest.json manifest.json

# create the edge_build.zip file
zip -r builds/edge_build.zip . -x ".*" -x "__MACOSX/*" -x "build.zip" -x "build.sh" -x ".git/*" -x ".gitignore" -x "*DS_Store*" -x "web/*" -x "screenshot.png" -x "builds/*" -x "Edit*" -x "docs/*"
mv manifest.json edge_manifest.json
mv manifest_all.json manifest.json

echo ""
echo "Builds created successfully in the builds directory:"
echo "  - builds/build.zip: For Chrome and Firefox."
echo "  - builds/edge_build.zip: For Microsoft Edge."
echo ""
echo "To build for Safari, please use Xcode."