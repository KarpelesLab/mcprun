const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'mcp-client.js',
    library: {
      type: 'commonjs2'
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
