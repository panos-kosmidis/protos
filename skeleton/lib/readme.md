
## Application Extensions

The functionality of both the Application and Node.js objects can be extended via the files in this directory.

### Loading extensions

You load all the extensions in this directory as such:

    app.libExtensions();
    
If you want to load specific extensions:

    app.libExtensions('application.js', 'response.js', 'request.js');
    
Extensions can be loaded at any time during the application's initialization process. You can enable/disable the extensions
by editing the `boot.js` file.