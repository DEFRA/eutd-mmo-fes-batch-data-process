// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'jest', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
  ],
  rules: {
    /* This rule is deprecated but is still included in the plugins so disabled here
           to use the new @typescript-eslint/naming-convention */
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/no-empty-interface': 'warn',
    'prettier/prettier': 'off',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'warn',
    'jest/no-identical-title': 'error',
    'jest/no-commented-out-tests': 'warn',
    'jest/no-test-prefixes': 'error',
    'jest/no-conditional-expect': 'warn',
    'jest/no-try-expect': 'off',
    'jest/valid-expect': 'warn',
    'no-mixed-spaces-and-tabs': 'warn'
  },
  "env": {
    "jest/globals": true
  }
};