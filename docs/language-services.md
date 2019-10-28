# Linting
Both Lua and Typescript strategy scripts are linted to perform some basic validity and style checks.
For Lua, this is done by _luacheck_, for Typescript by _tslint_.
Both are best run by using the _check_ target. Inside your build folder execute `make check`

## tslint installation

_tslint_ should be installed with _npm_. To use _npm_ you first need
to install (NodeJS)[https://nodejs.org]. (On most modern Linux Systems
it should also be possible to install it with your distributions respective
package manager).
If you choose to install manually, it is necessary to add _Node_'s binary folder to your PATH

Now you can install tslint
```
npm -g install typescript tslint
```
Depending on where you installed _Node_, you may need administrative/root rights.

## Luacheck installation

Install according to the following platform dependent instructions.
Alternatively, the source files are available at
https://github.com/mpeterv/luacheck .

### Linux
Install luarocks and use it to install luacheck
```
sudo apt-get install luarocks
sudo luarocks install luacheck
```

On Ubuntu 14.04 it may be necessary to use
```
luacheck -q **/*.lua
```

### macOS
Install luarocks and use it to install luacheck
```
brew install lua
luarocks install luacheck
```

### Windows
- Download the prebuilt luacheck package from
https://www.robotics-erlangen.de/downloads/libraries/luacheck-0.18.7z .
- Extract the contained luacheck folder and move it to `%APPDATA%` (enter path in Explorer). The luacheck.bat in the _bin_ folder should now be located at
`<USER>\AppData\Roaming\luacheck\bin\luacheck.bat`.
- Open the _Control Panel_ (Systemsteuerung), open _User Account_ (Benutzerkonten), then _Change own Environment Variables_.
Add to *User* variables:
`PATH` = `%APPDATA%\luacheck\bin`

(Fertiges Ra für Windows unter: https://project.robotics-erlangen.de/robocup/software/wikis/ra-builds )


## Editor integration

### Atom
Install the _linter-luacheck_ package.

### Sublime Text 3
Install _(Package Control)[https://packagecontrol.io/installation]_. Then use it to install
- _SublimeLinter_
- _SublimeLinter-luacheck_
- _SublimeLinter-tslint_

### Visual Studio Code
1. Install NodeJS and npm and make them available in your PATH.
2. Clone the [Typescript-/Andiscript-/Butterflyscript-/Name Following Compiler](https://project.robotics-erlangen.de/robocup/typescript-compiler) and follow the build instructions provided in the repository.
3. In a seperate folder, run `npm install typescript tslint tslint-language-service`
4. In this folder, overwrite `node_modules/typescript/lib` with our compiled compiler.
5. In Visual Studio Code, open `File > Preferences > Settings`. If you opened the `strategy/typescript` folder, select `Workspace Settings`, otherwise `User Settings` are fine.
6. Search for `typescript.tsdk` and click on `Edit in settings.json`.
7. Add a new JSON Key `typescript.tsdk` with `npm_install_folder/node_modules/typescript/lib` as its value.
8. Save and restart.
9. After opening a Typescript file, click on the version number on the bottom right and select `Use workspace version`.


# Tests
To run the unit tests and linter, execute the following in your build folder
```
make check
```
