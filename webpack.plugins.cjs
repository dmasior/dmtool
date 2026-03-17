const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'assets/icons', to: 'assets/icons' },
      ],
    }),
  ],
};
