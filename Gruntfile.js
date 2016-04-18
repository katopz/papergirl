/* jshint node:true */
var path = require('path');
var saucelabsBrowsers = require(path.resolve('test', 'saucelabs-browsers.js'));

var sourceFiles = [
    'Gruntfile.js',
    'src/*.js',
    'src/**/*.js',
    'test/**/test.*.js'
];

module.exports = exports = function(grunt) {
    'use strict';

    var BANNER = '/*!\n' +
                 '    Papergirl -- XHR+ETAG\n' +
                 '    Version ' + grunt.file.readJSON('package.json').version + '\n' +
                 '*/\n';

    var babelModuleIdProvider = function getModuleId(moduleName) {
        var files = {
            'src/papergirl': 'papergirl',
            'node_modules/localforage/dist/localforage': 'localforage'
        };

        return files[moduleName] || moduleName.replace('src/', '');
    };

    grunt.initConfig({
        babel: {
            options: {
                babelrc: false,
                extends: path.resolve('.babelrc-umd'),
                moduleIds: true,
                getModuleId: babelModuleIdProvider
            },
            dist: {
                files: {
                    'build/es5src/papergirl.js': 'src/papergirl.js',
                    'build/es5src/localforage.js': 'node_modules/localforage/dist/localforage.js'
                }
            }
        },
        browserify: {
            package_bundling_test: {
                src: 'test/runner.browserify.js',
                dest: 'test/papergirl.browserify.js'
            }
        },
        concat: {
            options: {
                separator: ''
            },
            papergirl: {
                files: {
                    'dist/papergirl.js': [
                        'bower_components/es6-promise/promise.js',
                        'dist/papergirl.nopromises.js'
                    ],
                    'dist/papergirl.nopromises.js': [
                        // just to add the BANNER
                        // without adding an extra grunt module
                        'dist/papergirl.nopromises.js'
                    ]
                },
                options: {
                    banner: BANNER
                }
            }
        },
        connect: {
            test: {
                options: {
                    base: '.',
                    hostname: '*',
                    port: 9999,
                    middleware: function(connect) {
                        return [
                            function(req, res, next) {
                                res.setHeader('Access-Control-Allow-Origin',
                                              '*');
                                res.setHeader('Access-Control-Allow-Methods',
                                              '*');

                                return next();
                            },
                            connect.static(require('path').resolve('.'))
                        ];
                    }
                }
            }
        },
        es3_safe_recast: {
            dist: {
                files: [{
                    src: ['dist/papergirl.js'],
                    dest: 'dist/papergirl.js'
                }]
            },
            nopromises: {
                files: [{
                    src: ['dist/papergirl.nopromises.js'],
                    dest: 'dist/papergirl.nopromises.js'
                }]
            }
        },
        jscs: {
            source: sourceFiles
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            source: sourceFiles
        },
        mocha: {
            unit: {
                options: {
                    urls: [
                        'http://localhost:9999/test/test.main.html',
                        'http://localhost:9999/test/test.min.html',
                        'http://localhost:9999/test/test.callwhenready.html',
                        'http://localhost:9999/test/test.browserify.html',
                        'http://localhost:9999/test/test.require.html',
                        'http://localhost:9999/test/test.webpack.html',
                        'http://localhost:9999/test/test.require.unbundled.html' // not officially supported since v1.3
                    ],
                    log: true
                }
            }
        },
        'saucelabs-mocha': {
            all: {
                options: {
                    username: process.env.SAUCE_USERNAME,
                    key: process.env.SAUCE_ACCESS_KEY,
                    urls: ['http://localhost:9999/test/test.main.html'],
                    tunnelTimeout: 5,
                    build: process.env.TRAVIS_JOB_ID,
                    concurrency: 3,
                    browsers: saucelabsBrowsers,
                    testname: 'papergirl Tests'
                }
            }
        },
        uglify: {
            papergirl: {
                files: {
                    'dist/papergirl.min.js': ['dist/papergirl.js'],
                    'dist/papergirl.nopromises.min.js': ['dist/papergirl.nopromises.js']
                },
                options: {
                    banner: BANNER
                }
            }
        },
        watch: {
            build: {
                files: ['src/*.js', 'src/**/*.js'],
                tasks: ['build']
            },
            /*jshint scripturl:true */
            'mocha:unit': {
                files: [
                    'dist/papergirl.js',
                    'test/runner.js',
                    'test/test.*.*'
                ],
                tasks: [
                    'jshint',
                    'jscs',
                    'browserify:package_bundling_test',
                    'webpack:package_bundling_test',
                    'mocha:unit'
                ]
            }
        },
        webpack: {
            package_bundling_test: {
                entry: './test/runner.webpack.js',
                output: {
                    path: 'test/',
                    filename: 'papergirl.webpack.js'
                }
            },
            papergirl_nopromises: {
                entry: './src/papergirl.js',
                output: {
                    path: 'dist/',
                    filename: 'papergirl.nopromises.js',
                    library: ['papergirl'],
                    libraryTarget: 'umd'
                },
                module: {
                    loaders: [{
                        test: /\.js?$/,
                        exclude: /(node_modules|bower_components)/,
                        loader: 'babel'
                    }]
                }
            }
        }
    });

    require('load-grunt-tasks')(grunt);

    grunt.registerTask('default', ['build', 'connect', 'watch']);
    grunt.registerTask('build', ['webpack:papergirl_nopromises', 'concat', 'es3_safe_recast', 'uglify']);
    grunt.registerTask('serve', ['build', 'connect:test', 'watch']);

    // These are the test tasks we run regardless of Sauce Labs credentials.
    var testTasks = [
        'build',
        'babel',
        'jshint',
        'jscs',
        'browserify:package_bundling_test',
        'webpack:package_bundling_test',
        'connect:test',
        'mocha'
    ];
    grunt.registerTask('test:local', testTasks.slice());

    // Run tests using Sauce Labs if we are on Travis or have locally
    // available Sauce Labs credentials. Use `grunt test:local` to skip
    // Sauce Labs tests.
    // if (process.env.TRAVIS_JOB_ID ||
    //     (process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY)) {
    //     testTasks.push('saucelabs-mocha');
    // }

    grunt.registerTask('test', testTasks);
};
