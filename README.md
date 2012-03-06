# CoreJS [![Build Status](https://secure.travis-ci.org/corejs/corejs.png)](http://travis-ci.org/corejs/corejs)

## Status: beta

## About

CoreJS is a Web Application Framework for [node.js](http://nodejs.org), using ideas from the 
[MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) architecture.

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

From inside an application, you can dynamically generate your application's resources:

    corejs model accounts books stores
    corejs controller mycontroller
    corejs controller dashboard --nohelper
    corejs view main/hello dashboard/settings
    corejs partial blog/post blog/comments
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