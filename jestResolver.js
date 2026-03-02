const path = require('path')

const OUR_ROUTER_PATH = path.resolve(__dirname, 'src/router/index.js')

module.exports = (moduleName, options) => {
  if (moduleName === 'router') {
    const fromNodeModules =
      options.basedir &&
      options.basedir.includes(path.sep + 'node_modules' + path.sep)

    if (!fromNodeModules) {
      return OUR_ROUTER_PATH
    }
  }

  return options.defaultResolver(moduleName, options)
}
