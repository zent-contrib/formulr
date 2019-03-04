const HtmlPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './dev.jsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ['awesome-typescript-loader'],
      },
      {
        test: /\.jsx?$/,
        use: ['babel-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  plugins: [
    new HtmlPlugin({
      template: './dev.html',
    }),
  ],
};
