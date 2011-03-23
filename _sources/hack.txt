================
Mephisto Hacking
================

Create your own views
=====================

Adding your views is not difficult. First you have to install the `Mozilla Add-on SDK <https://jetpack.mozillalabs.com/>`_.

Then clone the Mephisto repository locally.

To create a new view, open the file :file:`lib/views.js` and add a property to
the object named ``exports.loaders``. Your property name is the path of your
new view and its content is an object containing the following optional
callbacks:

.. js:function:: onInit()
  
  If you need to add some properties to your object before
  everything starts.

.. js:function:: onReady(evt)

  Called when loaded document is ready.

.. js:function:: onLoad(evt)

  Called when document is loaded.

.. js:function:: onLoadWait()

  Called one second after onLoad event.

.. js:function:: onTimeout()

  Called after a delay if page could not be loaded.

.. js:function:: onClose(evt)

  Called when tab is closed. Tab is closed after LoadWait event.

.. js:function:: onRequestLogStart(request, listener)

  Called on every request start.

.. js:function:: onRequestLogStop(request, listener)

  Called on every request stop.


In all callbacks, ``this`` represents the ``RequestProcessor`` instance (you
may find it in :file:`lib/httpd-handler.js`).

You can look at the existing views source code to learn how to make your own.