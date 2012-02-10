# CoreJS [![Build Status](https://secure.travis-ci.org/corejs/corejs.png)](http://travis-ci.org/corejs/corejs)

Getting everything ready for public release, scheduled for March 1st on [corejs.org](http://corejs.org).

You can see the planned features & enhancements by visiting the [Issues page](https://github.com/corejs/corejs/issues).

## Status: alpha

## About

CoreJS is a Web Application Framework for [node.js](http://nodejs.org), using the 
[MVC](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) architecture.

## Installation

Install the dependencies with `make deps` or `npm install`

## Usage

Run the Application server with `node skeleton/`

To start with the debug environment + node inspector: `NODE_ENV=debug node skeleton/`

## Running Tests

Before running the entire test suite, make sure to run `make testconfig`, and enter the database information
for your testing environment.

Run _all tests_ with `make tests`

Run _unit tests_ with `make test-unit`

Run _storage tests_ with `make test-sto`

Run _driver tests_ with `make test-drv`

Run _engine tests_ with `make test-eng`

Run _integration tests_ with `make test-int`

## License

[MIT](http://www.opensource.org/licenses/mit-license.php) Licensed.