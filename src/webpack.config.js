const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  devServer: {
    static: './dist',
    hot: true,
    port: 8080,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i, // This Regex matches .scss and .sass
        use: [
          "style-loader", // 3. Inject styles into DOM
          "css-loader",   // 2. Turns css into commonjs
          "sass-loader",  // 1. Turns sass into css
        ],
      },
    ],
  },
};
