module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-gh-pages');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-shell');

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),


    /* browser tests */
    karma: {
      unit: {
        configFile: 'karma.conf.js',
        background: true
      }, 
      continues: {
        configFile: 'karma.conf.js',
        singleRun: true,
        browsers: ['PhantomJS']
      }
    },

    /* test coverage */
    shell: {
      documentation: {
        command: [
          'node_modules/groc/bin/groc "./src/**/*.js" --out=docs "./README.md"',
        ].join(' && ')
      },
      deploy: {
        command: 'npm publish'
      }
    },

    /* retest on change */
    watch: {
      dev: {
        files: ['src/**/*.js', 'test/**/*.js'],
        tasks: ['test', 'browserify', 'karma:unit:run']
      },
    },


    //publish docs to pages
    'gh-pages': {
      options: {
        base: 'docs'
      },
      src: ['**']
    },

    /* include commonjs */
    browserify: {
      dev: {
        files: {
          'build/retrace.js': ['index.js'],
          'build/when.js': ['test/when.js']
        }
      }
    },

    /* js hint */
    jshint: {
      options: {
        jshintrc: './.jshintrc',
      },
      files: ['src/**/*.js']
    },

    /* minify js */
    uglify: {
      options: {
        report: 'gzip'
      },
      dist: {
        files: {
          'build/retrace.min.js': ['build/retrace.js']
        }
      }
    }

  });

  grunt.registerTask('default', ['test', 'build']);

  grunt.registerTask('start', ['karma:unit','watch']);
  grunt.registerTask('test', ['jshint', 'karma:continues', 'shell:documentation']);
  grunt.registerTask('build', ['jshint', 'browserify', 'uglify', 'shell:documentation']);
  grunt.registerTask('deploy', ['test', 'build', 'gh-pages', 'shell:deploy']);

};