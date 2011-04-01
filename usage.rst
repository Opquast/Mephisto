==============
Mephisto Usage
==============

Being an HTTP server, you ask content to Mephisto with HTTP. Here are the
implemented resources:

Retrieve DOM content
====================

.. function:: /
  
  :param url: Document URL
  :param modifier: JavaScript modifier path (see :ref:`modifiers`)

This endpoint returns a text/plain response containing the HTML representation
of the main document object of the page. This is not the same thing as the raw
HTML source but I think you get the point.

Example::

  curl http://localhost:9000/?url=http://google.com/

Full report
===========

.. function:: /dump

  :param url: Document URL
  :param modifier: JavaScript modifier path (see :ref:`modifiers`)

This endpoint returns a JSON response containing an object with the following
elements:

- **dom**: DOM dump string
- **resources**: List of all resources loaded with the page.

Example::

  curl http://localhost:9000/dump?url=http://google.com/

Screenshot
==========

.. function:: /screenshot

  :param url: Document URL
  :param w: Screenshot width (default 1024)
  :param h: Screenshot height (default 700)
  :param modifier: JavaScript modifier path (see :ref:`modifiers`)

This endpoint returns a screenshot as a image/png response.

.. warning:: This feature is not fully stable at the moment. Actually it could
             block your client which is, indeed, a bad behavior.

Monitoring
==========

.. function:: /monitor

This endpoint returns some useful information to monitor your server. It sends
a text/plain response or a JSON one if you add an ``Accept: application/json``
header to your request.


.. _modifiers:

Modifiers
=========

All page loading endpoints accept one or many parameter named ``modifier``. A
modifier could be:

- A URL to any JavaScript file
- A single file name that references a script located in the :file:`data`
  folder of the extension.

The script is executed just before we close the tab as if it was its own
script. Then it can modify the page or return a result.

Within the ``dump`` view, modifiers can return objects that will be merged
with response.

A return result should be wrapped in a function to return a result. The
following example add an element named ``test`` to result object in ``dump``
view:

.. code-block:: javascript

  (function() {
      return {
          'test': 'test'
      };
  })();

You can add many ``modifier`` arguments to your query string. Example::

  curl http://localhost:9000/dump?url=http://google.com/\
  &modifier=jquery-1.5-min.js&modifier=extractor.js

This query load the built-in modifiers ``jquery-1.5-min.js`` and
``extractor.js`` which will add many more information to response.
