# Falcor Router [![Build Status](https://travis-ci.org/Netflix/falcor-router.svg?branch=master)](https://travis-ci.org/Netflix/falcor-router)

## Developer Preview

**This release is a developer preview.** We are looking for community help to track down and fix bugs. We are also looking for help porting the Router to other platforms.

You can check out a working example server for a Netflix-like application [here](http://github.com/netflix/falcor-express-demo) right now. Alternately you can go through this short tutorial:

## Getting Started

Let's use the Falcor Router to build a Virtual JSON resource on an app server and host it at /model.json. The JSON resource will contain the following contents:

~~~js
{
  "greeting": "Hello World"
}
~~~

Normally Routers retrieve the data for their Virtual JSON resource from backend data stores or other web services on-demand. However in this simple tutorial the Router will simply return static data for a single key.

### Creating a Virtual JSON Resource with a Falcor Router

First we create a folder for our application server.

~~~bash
mkdir falcor-app-server && cd !$
npm init
~~~

Now we install the Falcor Router.

~~~bash
npm i falcor-router -S
~~~

Then install [express](http://expressjs.com/) and [falcor-express](https://github.com/Netflix/falcor-express).

~~~bash
npm i express falcor-express -S
~~~
> Support for [Restify is also available](https://github.com/Netflix/falcor-restify.git) (including a [demo](https://github.com/Netflix/falcor-restify-demo.git)): `npm i restify falcor-restify -S`—as is [support for Hapi](https://github.com/Netflix/falcor-router.git): `npm i hapi falcor-hapi -S`.

Now we create an index.js file with the following contents:

~~~js
// index.js
var falcorExpress = require('falcor-express');
var Router = require('falcor-router');

var express = require('express');
var app = express();

app.use('/model.json', falcorExpress.dataSourceRoute(function (req, res) {
  // create a Virtual JSON resource with single key ("greeting")
  return new Router([
    {
      // match a request for the key "greeting"    
      route: "greeting",
      // respond with a PathValue with the value of "Hello World."
      get: function() {
        return {path:["greeting"], value: "Hello World"};
      }
    }
  ]);
}));

// statically host all files in current directory
app.use(express.static(__dirname + '/'));

var server = app.listen(3000);
~~~

Now we run the server, which will listen on port 3000 for requests for /model.json.

~~~sh
node index.js
~~~

### Retrieving Data from the Virtual JSON resource

Now that we've built a simple virtual JSON document with a single read-only key "greeting", we will create a test web page and retrieve this key from the server.

Now create an index.html file with the following contents:

~~~html
<!-- index.html -->
<html>
  <head>
    <!-- Do _not_  rely on this URL in production. Use only during development.  -->
    <script src="//netflix.github.io/falcor/build/falcor.browser.js"></script>
    <script>
      var model = new falcor.Model({source: new falcor.HttpDataSource('/model.json') });
      
      // retrieve the "greeting" key from the root of the Virtual JSON resource
      model.
        get("greeting").
        then(function(response) {
          document.write(response.json.greeting);
        });
    </script>
  </head>
  <body>
  </body>
</html>
~~~

Now visit http://localhost:3000/index.html and you should see the message retrieved from the server:

Hello World

## More Information

For an example of a Router built for a Netflix-like application, see [this repository](http://github.com/netflix/falcor-router-demo).

For in-depth information on the Falcor Router, see the Router Guide in the [Falcor Website](http://netflix.github.io/falcor).

For discussion please use [Stack Overflow](http://stackoverflow.com/questions/tagged/falcor).
