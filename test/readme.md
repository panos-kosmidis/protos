
# Test Suites

The Test Suites are divided into three categories:

- **unit**: Framework & Application unit tests.
- **special**: Unit tests for Database Drivers & Storages.
- **integration**: Integration tests for Applications.

The _Special Tests_ require initial database configurations in to run. You need to run the _Test Configuration_
tool to provide the configuration for the Database backends supported by the Framework Drivers & Storages.

To run the Test Configuration tool:

    make testconfig

To run unit tests:

    make test-unit
    
To run special tests:

    make test-spec
    
To run integration tests:

    make test-int
    
To run all tests:
    
    make tests
    
To run a single test suite:

    vows --spec 
    
You can also run tests manually using vows:

    vows --spec test/unit/application.js

Tests are independent from each other. You can run them in groups, following any order
or individually to focus on specific areas.