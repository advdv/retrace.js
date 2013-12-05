// Karma configuration
// Generated on Mon Nov 18 2013 09:17:38 GMT+0100 (CET)

module.exports = function(config) {
  config.set({

    // base path, that will be used to resolve files and exclude
    basePath: '',


    // frameworks to use
    frameworks: ['mocha'],


    // list of files / patterns to load in the browser
    files: [

      'node_modules/should/should.js',
      'node_modules/sinon/pkg/sinon.js',

      //vendor libs
      'node_modules/q/q.js',
      'node_modules/htmlparser/lib/htmlparser.js',
      'node_modules/deep-diff/index.js',

      //the lib
      'build/retrace.js',

      //the tests
      'test/**/*_test.js'
    ],


    // list of files to exclude
    exclude: [
      
    ],

    // web server port
    port: 9876,


    reporters: ['progress', 'coverage'],
    preprocessors: {
      // source files, that you wanna generate coverage for
      // do not include tests or libraries
      // (these files will be instrumented by Istanbul)
      'build/retrace.js': ['coverage']
    },

    // optionally, configure the reporter
    coverageReporter: {
      dir : 'docs/coverage/'
    },

    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera (has to be installed with `npm install karma-opera-launcher`)
    // - Safari (only Mac; has to be installed with `npm install karma-safari-launcher`)
    // - PhantomJS
    // - IE (only Windows; has to be installed with `npm install karma-ie-launcher`)
    browsers: ['Chrome'],


    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,


    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false
  });
};
