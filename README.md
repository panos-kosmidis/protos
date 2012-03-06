# CoreJS [![Build Status](https://secure.travis-ci.org/corejs/corejs.png)](http://travis-ci.org/corejs/corejs)

## Status: beta

## About

CoreJS is a Web Application Framework for [node.js](http://nodejs.org), using ideas from the 
[MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) architecture.

## Development Stack

Everything has been developed implementing APIs:

* Database Drivers: MySQL, MongoDB
* Storages: MongoDB, Redis
* Models: Database-agnostic using Drivers & Storages for caching
* Logging Storages: MongoDb, Redis, File, Console

## Features

* Powerful routing
* RESTful methods
* Environment-based configuration
* Bootstrap file, for easy & quick app configuration
* Middlewares support
* Executable to create, generate & deploy apps and resources
* Automatic downloading of assets (jquery, prototype, bootstrap, etc)
* Cluster support (multiple cores)
* Easy deployment with JSON file or command line
* Built-in proxy server for apps
* Built-in Node Inspector for debugging
* Built-in Redirection
* Route validation using regexes
* JSON Responses
* Controllers serve as a namespace for routes
* Models serve as an abstraction for Database Backends
* Model Relationships: hasOne, hasMany, belongsTo, belongsToMany (database-agnostic)
* Helpers expose their methods into all views
* View Partials support (in all supported template engines)
* Modular Configuration
* Customizable HTTP Headers, Cache-control, etc

## Rendering Engines

Views are supported and partials can be used interchangeably. This means you can use Swig templates inside
Jade, or CoffeeKup templates within EJS. Mix & Match them all. Each template does one job well. Use them in
each scenario you see fit.

Everything is available & provided by the framework, no configuration. Just start using them. Place a view
with the apropriate extension and you're already using the template engine.

Each template has its own set of registered extensions. You can also define which extensions the template engines
will render from the application's config.

* CoffeeKup
* DoT
* Eco
* EJS
* Haml
* Haml-Coffee
* Handlebars (default for .mustache)
* Hogan.js
* Jade
* Jazz (async)
* jQuery Templates
* JSHtml
* Kernel (async)
* Liquor (default for .html)
* Swig
* Whiskers

## Middleware

These have been carefully integrated with the framework, to provide quick usability for common libraries:

- **Asset Compiler** Compile LESS, Stylus & CoffeeScript automatically
- **Amazon Web Services** Provides abstraction for all of aws
- **BCrypt** Blowfish hashing/comparison
- **Body Parser** Handle POST/PUT File Uploads & Requests, very secure
- **Cookie Parser** Parse request cookies
- **CSRF** Prevents Cross-Site Request Forgery attacks
- **Logger** Complete Logger, supporting multiple transports such as MongoDB, File, Redis & Console
- **Mailer** Send email quickly & easily using sendmail, Amazon SES or SMTP
- **Markdown** Complete markdown solution for your apps
- **Production URL** Remove port number from proxied apps
- **Redirect** Redirect all requests to any url (good for "maintenance" mode)
- **Response Cache** Cache computationally expensive views using any Storage
- **Session** Everything you need to handle sessions. Supports any Storage
- **SocketIO** The solution for your realtime app demands
- **Static Server** Fully featured static file server, integrated with the Asset compiler, supports range requests

## Installation

It's best if you install the package globally, since you will have access to the `corejs` command:

    npm install -g corejs
    
To install the dependencies, you can run `npm install` or `make deps`.

## Usage

To view all the options the command provides:

    corejs --help
    
To create a new application with default settings:

    corejs create myapp
    
To create a new application with extra options:

    corejs create myapp --domain corejs.org --js jquery --css bootstrap --model accounts --controller blog admin
    
The command above will create your application, attach it to the domain `corejs.org`, download the latest version
of jQuery and Bootstrap (saving it into public/js and public/css). Will create the `AccountsModel`, as well
as the `BlogController` and `AdminController`. Views for these controllers are created automatically.

From inside an application, you can dynamically generate your application's resources.

### Create models

    corejs model accounts books stores
    
### Create controllers

    corejs controller mycontroller
    corejs controller dashboard --nohelper
    
### Create views

    corejs view main/hello dashboard/settings
    
### Create partials

    corejs partial blog/post blog/comments

### Create helpers
    
    corejs helper blog admin

## Starting the Server

You have a robust server at your disposal, ready for production.

To run an application's server:

    corejs server myapp
    
To run a Production server, forking to a new process and storing output into server.log:

    corejs server myapp --fork --logpath server.log --env production
    
You can run the server from any directory inside of the application:

    corejs server
    
## Running a Cluster

Each application runs in its own process and port, providing a safe way to run your application's code.

You can run a cluster server in two ways. Deploy using a json file, or manually starting the servers.

### Deploying with a JSON file

Create a json file with the following structure:

```javascript
{
  "fork": "true",
  "env": "production",
  "port": "8080",
  "logpath": "server.log",
  "routes": {
    "app1": "8081",
    "app2": "8082"
  }
}
```

This means, you have two apps: `app1/` and `app2/`, which will run on the ports specified. These options are exactly
the same you specify in the command line of `corejs server`, fully automated.

Run the server with `corejs deploy cluster.json`.

### Starting manually

The cluster above can be run using the following command:

    corejs server app1:8081 app2:8082 --fork --env production --port 8080 --logpath server.log
    
The proxy server uses bouncy behind the scenes to route requests. You now have two applications running on
isolated environments.

If you use `--fork`, the server will fork a new node process and everything will run behind the scenes.

## Tests

Tests are a serious thing. The project has hundreds of functional tests, which can be run together, by groups or
independently.

To see all the available test commands, run `make test`.

## What's Next ?

The fun has just started. I'm already working on the corejs.org website and documentation. I'm proud to announce
that the framework is fully usable for your projects.

Here are the goodies which will come in the next few days/weeks:

- Website for corejs.org
- Documentation
- Guide
- Screencasts
- Example Applications

## Collaborate

Got ideas or pull requests ? Send 'em over, I'd love to see the framework grow. So far, this is just what I need
to build my own startups. Hope you like it.

Happy Hacking!

## License

This project is [MIT](http://www.opensource.org/licenses/mit-license.php) Licensed.