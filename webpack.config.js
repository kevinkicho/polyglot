const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

// Load repo-root .env for the dev server / build. Only OLLAMA_PROXY_URL is
// inlined into the bundle below — never OLLAMA_API_KEY.
(function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
})();

const isProduction = process.env.NODE_ENV === 'production';
const ollamaProxyTarget = process.env.OLLAMA_PROXY_TARGET || 'http://127.0.0.1:8787';

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
    proxy: [
      {
        context: ['/ollama-proxy'],
        target: ollamaProxyTarget,
        pathRewrite: { '^/ollama-proxy': '' },
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
      },
    ],
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
    new webpack.DefinePlugin({
      'process.env.OLLAMA_PROXY_URL': JSON.stringify(process.env.OLLAMA_PROXY_URL || ''),
    }),
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
