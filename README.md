# CoreJS [![Build Status](https://secure.travis-ci.org/corejs/corejs.png)](http://travis-ci.org/corejs/corejs)

Web Application Framewok for Node.js using MVC ideas aiming for pleasant simplicity, robustness and ease of use.

CoreJS integrates the best Open Source Software and creates one full package, combining and integrating several
components seamlessly, to provide a full stack Web Framework.

One thing you can be sure of: it will be big...

## Status: alpha

Getting everything ready for public release, scheduled for March 1st (ehm, working hard for that) 
on [corejs.org](http://corejs.org). You can see the planned features & enhancements by 
visiting the [Issues page](https://github.com/corejs/corejs/issues).

## Features

A more detailed list of features is coming down the road when everything's ready for release. The following list should
be enough to get you interested in trying out the framework:

- Super optimal configuration via `boot.js` file
- Multi Core support via built-in node cluster
- Multiple environments support
- **Built-in Node Inspector** for debugging. Use the Chrome web inspector to debug your application
- **Powerful Routing** with validation (allows regex + built-in regular expressions)
- Fine Grained configuration of HTTP Headers and Cache-Control
- **Built-in Regular Expressions**, used in validation and everywhere
- **Controllers**: Serve as a namespace for routes
- **Built-in Controller authentication** (optional, can also be fully handled by Auth Filters)
- **Auth Filters**: Restrict access to your controllers using your own callbaks
- **Drivers**: Abstract common Database operations (MySQL, MongoDB on the works)
- **Query Caching**: Provided by the Driver API, using a Storage backend. All drivers benefit from it
- **Storages**: NoSQL Data store, implementing a common API, also used for caching (Redis, MongoDB, CouchDB on the works)
- **Models**: ORM Functionality for databases, uses Drivers as backend & Storages for caching
- **Engines**: Featuring a flexible API, allowing the framework to seamlessly use 16 Rendering Engines (and counting...)
- **Template Extensions**: Define your own extensions or use the predefined ones, you're the boss
- **Seamless Template Engine Integration**: Use jade partials in Swig templates, HAML in Handlebars, you name it!
- **Helpers**: Their methods are exposed as partials within views
- **Views**: Super fast (supports caching), use any of the built-in template engines out of the box
- **Partials**: Supported from the ground up. Can be used interchangeably in templates from other engines: Extremely Powerful
- **Static Views**: No need to define routes, just put the templates in the static dir and you're set
- **Special Responses**: JSON and File Downloads support via `res.json` and `res.download`.

These are the features in the framework's core (might've missed a few). The next section shows you the features available on 
demand via the several middlewares the framework provides.

## Middleware

- **Asset Compiler**: Supports LESS, CoffeeScript and Stylus. Automatically watches your assets for changes & compiles them
- **Amazon Web Services**: Provides clients for all Amazon Web Services
- **BCrypt Encryption**: Use the Blowfish Encryption algorithm to hash passwords or any other type of data
- **Body Parser**: POST/PUT File uploads and fields parsing. Featuring a `FileManager` that provides control of uploaded files.
- **Cookie Parser**: Cookie parsing support, read, set, delete and update cookies.
- **CSRF Protection**: Protect against cross-site request forgery attacks
- **Logger**: Log application events both to console & file, featuring a built-in Request Logger
- **Mailer**: Send email using SMTP, Amazon SES or sendmail
- **Markdown**: Parses markdown syntax, available in views as `$markdown()`. Configurable
- **Production URL**: Remove the port number from your app's url: useful if behind a proxy
- **Redirect**: Quickly redirect all your application's requests to a single location. Useful for "maintenance mode"
- **Respone Cache**: Allows any view to be cached into a Storage backend. Useful for computationally expensive resources
- **Session Management**: Full blown session implementation supporting Guest Sessions, expires, Browser sessions, storages, etc.
- **SocketIO**: Helps you develop Real Time apps using the SocketIO framework. Easily configurable, full integration with apps.
- **Static File Server**: Fully Featured file server, supporting eTags, Partial Content requests

## Installation

Install the dependencies with `make deps` or `npm install`

If your system does not have the `libxml2` package installed, npm *could* fail installing the dependencies. This is 
easily fixed by installing the library on your system.

If you're on a mac: `sudo port install libxml2`

If you're on linux: `sudo apt-get install libxml2-dev`

## Starting the Server

Run the Application server with `node skeleton/`

To start with the debug environment + node inspector: `NODE_ENV=debug node skeleton/`

## Controllers

Controllers serve as a namespace for your routes. The `MainController` is root namespace. All routes defined in it
will be accessed directly within your application.

Controllers are located inside `app/controllers`. The name of the controller represents the route namespace it 
handles. You can also use the `_controller` suffix if you want. For example, if you want to create a controller
for the following routes:

    http://myapp.com/blog/posts
    http://myapp.com/blog/admin
    http://myapp.com/blog/archive
    
Then, you could create a `BlogController` inside `app/controllers/blog.js` (remember, you can also use `blog_controller.js`):

```javascript

function BlogController(app) {
  
  // Handles /blog/posts
  get('/posts', function(req, res) {
    // Will render app/views/blog/blog-index.{extension}
    res.render('index');
  });
  
  // Handles /blog/admin
  get('/admin', function(req, res) {
    // Will render app/views/blog/blog-admin.jade
    res.render('admin.jade');
  });
  
  // Handles /blog/archive
  get('/archive', function(req, res) {
    // Will render app/views/blog/blog-archive.mustache
    res.render('archive.mustache');
  });

}

```

You can have validation with your controllers. Imagine you want to get the following route:

    http://myapp.com/user/der?archive=true&num=1234
    
Then, you could create the following route inside `MainController`:

```javascript
get('/user/:name', {name: 'alpha', archive: 'boolean', num: 'integer'}, function(req, res, params) {
  this.getQueryData(req, function(fields) {
    fields.name = params.name;
    res.json(fields);
  });
});
```

Inside route functions, `this` points to the controller instance being accessed.

If you only want to validate `user`, and not validate `archive` and `num`, then you can access the query data directly:

```javascript
get('/user/:name', {name: 'alpha', archive: 'boolean', num: 'integer'}, function(req, res, params) {
  res.json(req.queryData);
});
```

You can pass custom validation messages if your routes or fields fail to validate. Imagine the following URL:

    http://myapp.com/blog?archive=true&num=25
    
If a parameter is passed that fails to validate, the application will respond with your custom error pages:

```javascript
get('/blog', {
  archive: 'boolean',
  num: 'integer'
}, {
  name: "Invalid name",
  num: function(val) { return "Invalid number: " + val}
}, function(req, res) {
  res.json(req.queryData);
});
```

It is worth mentioning, that if the request is done using AJAX, the response will be in plain text, as opposed to
using the default template `__restricted/msg.mustache`.

You can handle the same route in several method. To do this, simply pass the extra methods after the route callback:

```javascript
get('/submit', (req, res) {
  res.json(req.queryData);
}, 'post', 'put');
```

The example above will handle the `/submit` route in both POST and PUT requests.

## Drivers

The drivers provide you with methods that abstract common database operations.

Drivers are configured in the `config/database.js` file. The configuration is very flexible and allows several drivers
to be configured in the same config file. No need to have several configurations.

For example, to configure a simple mysql driver, you can do:

```javascript
 {
  default: 'mysql',
  mysql: {
    // driver options
  }
}
```

The default driver is the one used by the models by default. You can access the driver by doing:

    var driver = app.getResource('drivers/mysql')
    
You can also use a more flexible configuration approach:

```javascript
 {
  default: 'mysql:america',
  mysql: {
    america: {
      // driver options
    },
    europe: {
      // driver options
    },
    asia: {
      // driver options
    }
  }
}
```

To access the drivers you can refer to them as:

    drivers/mysql:america
    drivers/mysql:europe
    drivers/mysql:asia
    
So far, the MySQL driver has been implemented as a starting point. MongoDB is coming down the road.
    
## Storages

Storages provide a simple and fast way to store data in several database backends, specially NoSQL ones. For now, only
Redis has been implemented as a Storage backend. Any database can easily be implemented using the Storage API.

Storages are configured using the same configuration style as the drivers. Their configuration resides in
`config/storage.js`.

Several components of the framework require storages to work, such as the Response Caching middleware, Sessions. They are
also used by the Query Cache functionality, provided by the Drivers API.


## Models

Models provide a quick way to operate with data. The concept of `Model Generator` is introduced. All model operations are
done asynchronously, so it makes sense to use the model generator to perform the tasks related to the models.

Models are available in `app/models/`. The naming convention matches the name of the table or collection in question. Each
model can use any driver.

Models can use drivers. This provides an extra bonus functionality of Query Caching, which is provided by the drivers
themselves.

The models found in `app/models` are available in `app.models`. For convenience, you can also access them directly
on the app object, using lower camel case notation. For example, the `users` model is available via `app.usersModel`.

Models support ORM mapping of database fields via the `properties` property. This is a brief info of models, more info
is coming on release. For now, this might be enough to get you started hacking.

To create a new user:

```javascript
app.usersModel.new({
  user: 'ernie',
  pass: 'mypassword123'
}, function(err, model) {
  model.user = 'jonah';
  model.pass = '1234567'
  model.save(function(err) {
    if (err) throw err;
    else console.exit("Model has been saved successfully");
  }); 
})
```

Models support validation and automatic typecasting based on the property types. On failure to validate, the model
generator will throw a validation error.

You can find models using search criteria based on their properties:

```javascript
app.usersModel.find({name: 'ernie'}, function(err, model) {
  if (err) throw err;
  else console.exit(model);
});
```

You can also search multiple models:

```javascript
app.usersModel.find([{name: 'ernie'}, 1, 2, {name: 'maria'}], function(err, models) {
  if (err) throw err;
  else {
    models.forEach(function(model) {
      console.log(model);
    });
  }
});
```

The objects you retrieve, are called `ModelObjects`, returned to you by the `ModelGenerator`. You can do the following
operations in the model objects: `save`, `update`, `sync` (the latter 2 are aliases of save), `delete`, `destroy` (alias).

All methods of model objects are asynchronous. For a full description of the Model API, consult `lib/driver.js` and
`lib/model.js`.

## Helpers

The methods available in helpers will be available in views. The `MainHelper`, is the root namespace for the helpers. 

This means, that every method from the MainHelper instance, will be available as a partial. For example:

The methods `do_this` and `do_that` of MainHelper will be available within views as `$do_this` and `$do_that` respectively.

Now, methods from other controllers will be available with the controller namespace as prefix. So, adding the
`get_posts` and `get_info` methods to `BlogHelper` will expose the `$blog_get_posts` and `$blog_get_info` partials.

The naming convention between helpers is not related to the models directly, so you can use any helper names. To keep
things consistent, it is a good idea to have models match controller names, but this is not required.

## Views

Each controller should have a views directory inside the `app/views` directory. The views for `MainController` are
stored inside `app/views/main`. Views for the `BlogController` are stored on `app/views/blog`.

For now, since the `corejs` command line tool has not been created yet, you need to create the directories manually.
There will be a hell of automation when the command is implemented (which will be real soon).

When using `res.render('view')` from a controller, it will load the `{namespace}-view.{extension}` for you. This is very
helpful, since you can use any template engine extension, while keeping your controllers intact. The extension is 
automatically detected for you, and the rendering engine is also automatically detected, based on the extension.

Using `res.render` has its own conventions. See the `lib/response.js` to understand how it works. The first argument
of res.render will determine the path in which to locate the view.

## View Partials

To create view partials, just place a file starting with an underscore inside your view directory.

For example, saving templates into: 

    app/views/blog/_posts.mustache
    app/views/blog/_users.mustache
  
Will expose the following view partials:
  
    blog_posts
    blog_users
    
As opposed to helper partials, view partials do not start with an underscore.

You can also store view partials inside the `__layout` directory. For example:

    __layout/dothis.html
    __layout/posts/dothat.html
    
Will expose the following view partials:

    layout_dothis
    layout_posts_dothat
    
So, that being said, you now have an idea on how flexible this is. Keeping things organized by using conventions.

## Application Structure

```
── app
│   ├── controllers
│   │   └── main.js
│   ├── helpers
│   │   └── main.js
│   ├── models
│   │   └── users.js
│   └── views
│       ├── __layout
│       │   ├── footer.mustache
│       │   └── header.mustache
│       ├── __restricted
│       │   ├── 404.mustache
│       │   ├── 500.mustache
│       │   └── msg.mustache
│       ├── __static
│       │   └── static.mustache
│       └── main
│           └── main-index.mustache
├── app.js
├── boot.js
├── config
│   ├── base.js
│   ├── database.js
│   ├── env
│   │   ├── debug.js
│   │   ├── development.js
│   │   └── production.js
│   ├── regex.js
│   └── storage.js
├── incoming
│   └── readme.md
├── init.js
├── log
│   ├── access.log
│   ├── error.log
│   └── info.log
├── middleware
│   └── readme.md
├── package.json
├── public
│   ├── favicon.ico
│   └── robots.txt
└── test
    └── readme.md
```

## Running Tests

Before running _all_ tests, make sure to run `make testconfig`, and enter the database information
for your testing environment.

Run **all** tests_ with `make tests`

Run **unit tests** with `make test-unit`

Run **storage tests** with `make test-sto`

Run **driver tests** with `make test-drv`

Run **engine tests** with `make test-eng`

Run **integration tests** with `make test-int`

Run **middleware tests** with `make test-mid`

## Roadmap

There are a few things that need to be completed before release. The framework is fully functional right now. A little
bare bones since it's just starting, but more tools are coming down the road.

A beautiful website is coming for the `corejs.org` site, so stay tuned.

For a full list of things that have been worked on, and the things still missing for the Release Milestone, head over
to the [Issues Page](http://github.com/corejs/corejs/issues).

This readme file doesn't even scratch the surface on the full features of the framework. A more detailed and in-depth
overview and manual of features is coming after all the planned issues have been handled.

## Contribute

If you want to see CoreJS grow, and you think this is a good idea that would solve people's problems when developing
Web Applications, then you can help out make the framework better.

Early Adopters and Contributors are welcome. Start hacking and send a pull request, we'll evaluate it and get it into
core if it's a good idea! Hop in!

I'm creating this framework to create my own projects, so this is not done just because, it's done for a reason. I'm
actually behind a deadline for this. This is a self-funded project, so if you find a use for it, feel free to fork
and hack it however you please. If you want, then you can share your contributions.

## License

[MIT](http://www.opensource.org/licenses/mit-license.php) Licensed.