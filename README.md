# Mephisto

## Develop with Mephisto

### Installation (for developers)

You need node.js, npm, grunt and Mozilla Addon-SDK to work on Mephisto scripts.

Prepare your environment:

```sh
# Once you activated your SDK virtual-env

# Update submodules
git submodule update --init --recursive

# Install npm deps
npm install
```

### Start Mephisto with grunt

It's easier to launch Mephisto with dedicated "mephisto" grunt task.

To launch server:

```sh
grunt mephisto:scripts/server.js

# or shortcut:
grunt runserver
```

To launch a test script:

```sh
grunt mephisto:scripts/launch-tests.js:"http\:google.com/"
```
