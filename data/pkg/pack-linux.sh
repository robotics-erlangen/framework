#!/bin/bash
# make sure the current working directory is the location of the script
# `bash foobar.sh` seems to have foobar.sh in $0
cd "$(dirname "$0")"
cd ../..

mkdir -p ../software-cpy/build/bin
mkdir -p ../software-cpy/libs/v8/v8
cp -r strategy ../software-cpy
cp build/bin/ra ../software-cpy/build/bin
cp build/bin/icudtl.dat ../software-cpy/build/bin
cp build/bin/natives_blob.bin ../software-cpy/build/bin
cp build/bin/snapshot_blob.bin ../software-cpy/build/bin
cp -r libs/v8/v8 ../software-cpy/libs/v8
cp -r libs/tsc ../software-cpy/
cp -r config ../software-cpy
cp -r data ../software-cpy

cd ../software-cpy
echo "#!/bin/bash" > start.sh
echo "LD_LIBRARY_PATH=libs/v8/v8/out/x64.release build/bin/ra" >> start.sh
chmod +x start.sh

tar cfz software-linux.tar.gz *
mv software-linux.tar.gz ..
cd ..
rm -rf software-cpy
