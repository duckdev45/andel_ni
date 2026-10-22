/** @type {import('prettier').Config} */
module.exports = {
  arrowParens: 'always',
  bracketSpacing: true,
  bracketSameLine: false,
  jsxSingleQuote: true,
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './app/app.css',
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  tailwindFunctions: ['cn', 'cva'],
  trailingComma: 'es5',
}
