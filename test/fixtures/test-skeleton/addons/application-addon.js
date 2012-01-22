
function ApplicationAddon(app, config) {
  
  app.__LoadedApplicationAddon = true;
  app.__ApplicationAddonConfig = config;
  
}

module.exports = ApplicationAddon;