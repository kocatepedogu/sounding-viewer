/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */

const path = require('path');

let common = {
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [{loader: 'ts-loader'}],
        exclude: [/node_modules/],
      },
      {
        test: /\.m?js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  output: {
    libraryTarget: 'var',
    library: 'vaporPressure',
  }
}

module.exports = [
  Object.assign({}, common, {
    target: 'electron-main',
    entry: ['./src/main/index.ts'],
    output: {
      path: path.resolve(__dirname, 'src/main'),
      filename: 'bundle.js'
    }
  }),

  Object.assign({}, common, {
    target: 'electron-renderer',
    entry: ['./src/renderer/index.ts', './src/renderer/viewer.ts'],
    output: {
      path: path.resolve(__dirname, 'src/renderer'),
      filename: 'bundle.js'
    }
  })
];