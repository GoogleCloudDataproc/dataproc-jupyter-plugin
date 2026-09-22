const path = require('path');

module.exports = {
  resolve: {
    modules: [
      path.resolve(__dirname, 'lib'),
      'node_modules'
    ],
    alias: {
      // Map absolute 'style/...' imports directly to your root style directory
      style: path.resolve(__dirname, 'style')
    }
  }
};
