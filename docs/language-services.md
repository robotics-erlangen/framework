# Tests and linting
Both Lua and Typescript strategy scripts are linted and tested to perform some
basic validity and style checks. For Lua, linting is done by *luacheck*, for
Typescript by *tslint*. *python2* is required for some additional checks.

To run the unit tests and linter, execute the following in your build folder
```
make check
```

## tslint
*tslint* should be installed with *npm*. To use *npm* you first need to install
[NodeJS](https://nodejs.org). On most modern Linux Systems it should be
possible to install it with your distributions respective package manager. If
you choose to install manually, it is necessary to add *Node*'s binary folder
to your PATH.

You can now install tslint.
```
npm -g install typescript tslint
```

Depending on where you installed *Node*, you may need administrative/root rights.

### Editor integration
Typescript provides language services through *tsserver*. Linting is performed
by a tsserver plugin called *tslint-language-service*. Since we extended the
language and the compiler, it is not possible to use your global Typescript
installation for this purpose.

#### General setup
The general setup (independent of your editor) is to install Typescript and its
plugins to a seperate `node_modules` folder and point your editors Typescript
plugin to this folder.
1. Install NodeJS and npm and make them available in your PATH
2. Clone our [modified Typescript Compiler](https://project.robotics-erlangen.de/robocup/typescript-compiler) and follow the build instructions provided in the repository.
3. In a seperate folder `/path/to/langservices` run `npm install typescript tslint tslint-language-service`
4. Overwrite `/path/to/langservices/node_modules/typescript/lib` with our compiled compiler.

#### Visual Studio Code
Visual Studio Code has a Typescript plugin installed by default. You'll need to
point it to the folder you setup before.
1. Open `File > Preferences > Settings`. If you opened the `strategy/typescript` folder, select `Workspace Settings`, otherwise `User Settings` are find.
2. Search for `typescript.tsdk` and click on `Edit in settings.json`.
3. Add a new JSON Key `typescript.tsdk` with `/path/to/langservices/node_modules/typescript/lib` as its value.
4. Save and restart.
5. After opening a Typescript file, click on the Typescript version number on the bottom right and select `Use workspace version`.

## Luacheck
Install according to the following platform dependent instructions.
Alternatively, the source files are available at
https://github.com/mpeterv/luacheck .

#### Linux
Install luarocks and use it to install luacheck
```
sudo apt-get install luarocks
sudo luarocks install luacheck
```

On Ubuntu 14.04 it may be necessary to use
```
luacheck -q **/*.lua
```

#### macOS
Install luarocks and use it to install luacheck
```
brew install lua
luarocks install luacheck
```

#### Windows
- Download the prebuilt luacheck package from
https://www.robotics-erlangen.de/downloads/libraries/luacheck-0.18.7z .
- Extract the contained luacheck folder and move it to `%APPDATA%` (enter path in Explorer). The luacheck.bat in the _bin_ folder should now be located at
`<USER>\AppData\Roaming\luacheck\bin\luacheck.bat`.
- Open the _Control Panel_ (Systemsteuerung), open _User Account_ (Benutzerkonten), then _Change own Environment Variables_.
Add to *User* variables:
`PATH` = `%APPDATA%\luacheck\bin`

(Fertiges Ra für Windows unter: https://project.robotics-erlangen.de/robocup/software/wikis/ra-builds )

### Editor integration

#### Atom
Install the *linter-luacheck* package.

#### Sublime Text 3
Install _[Package Control](https://packagecontrol.io/installation)_. Then use it to install
- *SublimeLinter*
- *SublimeLinter-luacheck*
- *SublimeLinter-tslint*
