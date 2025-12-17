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
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",   // 4. Inject styles into DOM
          "css-loader",     // 3. Turns css into commonjs
          "postcss-loader", // 2. Runs Tailwind logic <--- ADD THIS HERE
          "sass-loader",    // 1. Turns sass into css
        ],
      },
    ],
  },
};
