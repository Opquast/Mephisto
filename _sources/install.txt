=====================
Mephisto Installation
=====================

Get an XPI package
==================

If you don't want to build your own XPI package, download the most recent
package from GitHub on:

https://github.com/Temesis/Mephisto/archives/master

Make your own package
=====================

If you prefer or need to build your own XPI package, you first need to install
the `Firefox Add-On SDK <https://jetpack.mozillalabs.com/>`_ and clone the
Mephisto repository in a folder inside your SDK installation.

Mephisto repository can be found on:
``git://github.com/Temesis/Mephisto.git``

You can then call ``cfx run`` or ``cfx test`` in a terminal to check that the
add-on works fine.

Run ``cfx xpi`` to create an XPI file.

Install package
===============

On Desktop
----------

To install Mephisto on a desktop browser (you have full access to UI), simply
drag the XPI file on your browser window.

On Server
---------

Installing Mephisto without access to Firefox UI is a bit more complicated.

- Create a folder name :file:`mephisto@temesis.com` in the
  :file:`extensions` folder of your Firefox profile,
- Unzip the XPI file directly in the created folder,
- Start Firefox.

On a server, you'll need to start Firefox in a X server. It works fine with
Xvfb.

Configuration
=============

Mephisto provides the following settings:

- **extensions.mephisto.serverHost**: HTTP server hostname (default localhost)
- **extensions.mephisto.serverPort**: HTTP server port (default 8000)

You can set these settings in the ``user.js`` file in your profile. For
example:

.. code-block:: javascript

  user_pref("extensions.mephisto.serverHost", "myhostname.com");
  user_pref("extensions.mephisto.serverPort", 8000);

.. warning:: You must set a true hostname or IP, not 0.0.0.0, it won't work.
             This issue might be fixed in a future release.

