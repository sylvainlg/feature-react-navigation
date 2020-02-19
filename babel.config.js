module.exports = {
  // standard presets applying various plugins
  presets: ['@babel/preset-env', '@babel/preset-react'],

  plugins: ['@babel/plugin-proposal-class-properties'],

  env: {
    // BABEL_ENV=commonjs ... our CommonJS distribution (promoted in lib/ directory)
    commonjs: {
      plugins: [['transform-es2015-modules-commonjs', { loose: true }]],
    },
    // BABEL_ENV=es ... for our ES distribution (promoted in lib/ directory)
    es: {
      plugins: [],
    },
  },
};
