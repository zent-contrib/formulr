const HtmlPlugin = require('html-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
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
  ].concat(process.env.BUNDLE_ANALYZER ? [new BundleAnalyzerPlugin()] : []),
};
