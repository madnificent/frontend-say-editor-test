'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {
    sassOptions: {
      includePaths: ['node_modules/@appuniversum/ember-appuniversum'], // just "node_modules" would also work, but it seems to slow (re)builds down a lot
    },
  });

  return app.toTree();
};
