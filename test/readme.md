
# Test Suites

The Test Suites are divided into three categories:

- **unit**: Framework & Application unit tests.
- **special**: Unit tests for Database Drivers & Storages.
- **integration**: Integration tests for Applications.

The _Core Functionality_ unit tests don't require any configuration to run. Run them with:

    make test-unit

The _Special_ and _Integration_ tests require initial database configurations to run. 

The _Test Configuration Tool_ helps you configure your testing environment. Run it with:

    make testconfig

To run special tests:

    make test-spec

To run integration tests:

    make test-int
    
To run all tests:
    
    make tests
    
To run a single test suite:

    vows --spec test/unit/application.js
    
Tests are independent from each other. You can run them in groups, following any order
or individually to focus on specific areas.