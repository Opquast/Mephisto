# Mephisto

Mephisto is a Mozilla Firefox add-on that adds an HTTP server inside your
browser. This server is able to open webpages and returns content information
or screenshots.

Common tools like curl or urllib2 will only give you the main HTML code of a
webpage. On many websites, this source code is not the final document given to
the user as some script may have modified it. Sometime you want to check your
document's validity upon some criteria. Your source could be OK and your DOM
a terrible mess.

## Main features

- Send DOM content after page load;
- Take screenshot;
- Send page and resources report.

## Views

### /?url=[url]

The main server view returns the DOM with a text/plain Content-Type.

### /dump?url=[url]

This view returns a JSON result, which contains the following elements:

- **dom**: The webpage DOM
- **resources**: A list of all resources loaded
  with the page (Think Firebug network monitor)

### /screenshot?url=[url]

**EXPERIMENTAL** This view returns a screenshot of the webpage as a PNG
response. This is not stable enough yet.

## Modifiers

The **/dump** view can accept a aditionnal parameter named **modifier**. This
parameter will look for a javascript file located in data folder.

For example, Mephisto comes with an information extractor that returns links,
images, and other metrics. You can load it by adding **modifier** arguments
to url. For example:

`/dump?url=http://google.com/&modifier=jquery-1.5.min.js&modifier=extractor.js`

This action will load jQuery and the extractor script after page load. Results
comming from modifiers are merged with dump results. Here are elements added
by **extractor.js**:

- **title**: Page title;
- **links**: List of all links in page;
- **images**: List of all images in page;
- **stats**: Element counter

### You own modifiers

If you want to create a modifier called, say, **test.js**, just add your file
in **data/modifiers** folder of the extension.

If your modifier should return results, you need to wrap it in a function. For
example:

    (function() {
        return {
            test: true;
        }
    })();

### Create your own views

Adding your views is not difficult. First you'll have to install the [Mozilla
Add-on SDK](https://jetpack.mozillalabs.com/) and clone this repository
somewhere you can use it.

To create a new view, open the file **lib/views.js** and add a property to the
object named **exports.views**. You property name is the path of your new
view and its content is an object containing the following optional callbacks:

- **onInit()**: If you need to add some property to your object before
  everything starts.
- **onReady(evt)**: Called when loaded document is ready.
- **onLoad(evt)**: Called when loaded document is loaded
- **onLoadWait()**: Called one second after onLoad event.
- **onTimeout()**: Called after a delay if page could not load.
- **onClose(evt)**: Called when tab is closed. Tab is closed after LoadWait
  event
- **onRequestLogStart(request, listener)**: Called on every request start
- **onRequestLogStop(request, listener)**: Called on every request stop

In all this callbacks, **this** represents the **RequestProcessor** instance
(you may find it in **lib/httpd-handler.js**).

You can look at existing views code to learn how to make your own.

