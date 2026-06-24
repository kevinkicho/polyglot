const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: './src/index.js',
  output: {
    filename: isProduction ? '[name].[contenthash:8].js' : '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  devtool: isProduction ? 'source-map' : 'eval-source-map',
  devServer: {
    static: './dist',
    hot: true,
    port: 8080,
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        firebase: {
          test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
          name: 'firebase',
          chunks: 'all',
          priority: 10,
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 1,
        },
      },
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      ...(isProduction && {
        minify: {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
        },
      }),
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/favicon.svg", to: "favicon.svg" },
        { from: "src/manifest.json", to: "manifest.json" },
        { from: "src/sw.js", to: "sw.js" },
        { from: "src/icons", to: "icons", noErrorOnMissing: true },
        { from: "src/sounds", to: "sounds", noErrorOnMissing: true },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          "css-loader",
          "postcss-loader",
          "sass-loader",
        ],
      },
    ],
  },
};
