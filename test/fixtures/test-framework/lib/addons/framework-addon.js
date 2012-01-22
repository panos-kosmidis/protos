
function FrameworkAddon(app, config) {
  
  app.__LoadedFrameworkAddon = true;
  app.__FrameworkAddonConfig = config;
  
}

module.exports = FrameworkAddon;