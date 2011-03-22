# Mephisto

Mephisto is a Mozilla Firefox 4 Add-On that adds an HTTP server inside your
browser. This server is able to open webpages and returns content information
or screenshots.

Common tools like curl or urllib2 will only give you the main HTML code of a
webpage. On many websites, this source code is not the final document given to
the user as some script may have modified it. Sometimes you want to check the 
validity of your document based on some criteria. Your source could be OK but 
your DOM a terrible mess.

## Main features

- Send DOM content after page load;
- Take screenshot;
- Send page and resources report.

## Install Mephisto

### XPI Release

You can download an XPI package on the [project download
page](https://github.com/Temesis/Mephisto/archives/master).

To install it manually, create a folder called **mephisto@temesis.com** in
your Firefox profile and unzip the content of the XPI into this folder.

### Git branch with Mozilla Add-On SDK

First you have to install the [Mozilla
Add-on SDK](https://jetpack.mozillalabs.com/).

Then clone the Mephisto repository somewhere in your SDK environnement.

Then, perform `cfx xpi` to create an XPI package.

### Configuration

In your **user.js** file, you can add the following settings:

- **extensions.mephisto.serverHost**: HTTP server hostname (default localhost);
- **extensions.mephisto.serverPort**: HTTP server port (default 8000);

**Warning**: You can't set "0.0.0.0" as a hostname. You must set the real
hostname the server will listen on.

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
response. This is not fully stable at the moment.

## Modifiers

The **/dump** view can accept an additional parameter named **modifier**. This
parameter looks for a javascript file located in the data folder.

For instance, Mephisto comes with an information extractor that returns links,
images and other metrics. You can load it by adding several **modifier** arguments
to the url. For example:

`/dump?url=http://google.com/&modifier=jquery-1.5.min.js&modifier=extractor.js`

This action will load jQuery and the extractor script once the page is loaded. Results
coming from modifiers are merged with dump results. Here are the elements added
by **extractor.js**:

- **title**: Page title;
- **links**: List of all the links in page;
- **images**: List of all the images in page;
- **stats**: Element counter

### You own modifiers

If you want to create a modifier called, say, **test.js**, just add your file
in **data/modifiers** folder of the extension.

If your modifier must return results, you need to wrap it in a function. For
example:

    (function() {
        return {
            test: true;
        }
    })();

### Create your own views

Adding your views is not difficult. First you have to install the [Mozilla
Add-on SDK](https://jetpack.mozillalabs.com/).

Then clone the Mephisto repository locally.

To create a new view, open the file **lib/views.js** and add a property to the
object named **exports.loaders**. Your property name is the path of your new
view and its content is an object containing the following optional callbacks:

- **onInit()**: If you need to add some properties to your object before
  everything starts.
- **onReady(evt)**: Called when loaded document is ready.
- **onLoad(evt)**: Called when document is loaded
- **onLoadWait()**: Called one second after onLoad event.
- **onTimeout()**: Called after a delay if page could not be loaded.
- **onClose(evt)**: Called when tab is closed. Tab is closed after LoadWait
  event
- **onRequestLogStart(request, listener)**: Called on every request start
- **onRequestLogStop(request, listener)**: Called on every request stop

In all callbacks, **this** represents the **RequestProcessor** instance
(you may find it in **lib/httpd-handler.js**).

You can look at the existing views source code to learn how to make your own.


