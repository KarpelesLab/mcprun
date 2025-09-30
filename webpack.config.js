const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'mcp-client.js',
    library: {
      name: 'MCPClient',
      type: 'var',
      export: 'default'
    },
    globalObject: 'this'
  },
  target: 'node',
  mode: 'production',
  optimization: {
    minimize: false
  },
  resolve: {
    extensions: ['.js']
  }
};
