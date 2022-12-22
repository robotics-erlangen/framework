# Tests and linting
Both Lua and Typescript strategy scripts are linted and tested to perform some
basic validity and style checks. For Lua, linting is done by *luacheck*, for
Typescript by *eslint*. *python2* is required for some additional checks.

To run the unit tests and linter, execute the following in your build folder
```
make check
```

## Typescript
Typescript linting is done with a project local installation of *eslint*. IntelliSense is provided by *tsserver*.

To make use of those, you first need to install *npm* which is usually distributed
alongside [NodeJS](https://nodejs.org). On most modern Linux Systems, it should
be possible to insall it with your distributions respective package manager. If
you choose to install it manually, it is necessary to add *Node*'s binary
folder to your `PATH`.

- Linux & MacOS: Run the `setup.sh` script located at `strategy/typescript`

Windows:
1. Open a Command Line and change directory to `strategy/typescript`
2. Run `npm install`
3. Copy the contents of `libs/tsc/built/local` to `strategy/typescript/node_modules/typescript/lib` and overwrite the existing files

### Editor integration

#### Visual Studio Code
Visual Studio Code has a Typescript plugin installed by default.
If you make sure to open the `strategy/typescript` folder (not the base
`software` folder) in VS Code, it should automatically use the project-local
`node_modules` folder. You can verify this, check [the Microsoft docs](https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-the-workspace-version-of-typescript)
If not you can change the TypeScript version by clicking on the curly braces
next to the "TypeScript" Button on the bottom left. Click on it then click
select version and select the workspace version.

#### Vim8/Neovim
There are multiple plugins providing language server integration for Vim but I use and recommend [`coc.nvim`](https://github.com/neoclide/coc.nvim). For the setup:
1. Install [`coc.nvim`](https://github.com/neoclide/coc.nvim)
2. Run `:CocInstall coc-tsserver coc-json`
3. (optional) If coc-tsserver detects a global installation of TypeScript it will use that first, but that can be avoided by setting "tsserver.useLocalTsdk": true in the coc settings
(which can be easily accessed with the :CocConfig command)

#### Helix
1. Install the typescript-language-server in a way that it's in your PATH.
  Recommended:
    npm install -g typescript typescript-language-server
    The global TypeScript installation is required here, but it's automatically in the PATH.
  Alternatively install the language server locally:
    npm install typescript-language-server
    and add the local strategy/typescript/node_modules/.bin/ to your PATH.
2. Add a config file under strategy/typescript/.helix/languages.toml with the following contents:
    [[language]]
    name = "typescript"
    config = { tsserver = { "path" = "node_modules/.bin/tsserver" } }
  but use the absolute path of the node_modules, e.g.
  "/home/user/robotics/software/strategy/typescript/node_modules/.bin/tsserver"

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