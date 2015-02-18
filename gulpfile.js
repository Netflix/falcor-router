var gulp = require('gulp');
var sweet = require('gulp-sweetjs');
var mocha = require('gulp-mocha');
var rename = require('gulp-rename');
var license = require('gulp-license');
var concat = require('gulp-concat');
var bump = require('gulp-bump');
var hint = require('gulp-jshint');
var clean = require('gulp-clean');
var surround = require('./gulp-surround');
var _ = require('lodash');

gulp.task('dev', ['build.dev', 'hint']);
gulp.task('default', ['build.dev', 'hint']);
gulp.task('dist', ['dist.node', 'hint']);

gulp.task('clean', function() {
    return gulp.src([
            'bin/',
            'tmp/'
        ]).
        pipe(clean());
});

gulp.task('bump', ['dist'], function() {
    return gulp.
        src('package.json').
        pipe(bump({type: 'patch'})).
        pipe(gulp.dest('./'));
});

gulp.task('build.sweet', ['clean'], function() {
    return compileSweet();
});
gulp.task('build.dev', ['build.sweet', 'build.move-falcor'], function() {
    return compile({
        name: 'Router', 
        surround: {
            prefix: 'var Rx = require("rx");\nvar Observable = Rx.Observable;\nvar falcor = require("./falcor");\n',
            suffix: '\nmodule.exports = Router;\n'
        }
    });
});
gulp.task('build.move-falcor', ['clean'], function() {
    return gulp.
        src(['lib/falcor.js']).
        pipe(surround({
            prefix: '/* istanbul ignore next */\n(function() {var Rx = require("rx");\nvar Observable = Rx.Observable;\n',
            suffix: '\nmodule.exports = falcor;})();\n'
        })).
        pipe(gulp.dest('bin'));
});
gulp.task('dist.node', ['build.sweet'], function() {
    return compile({
        name: 'Router', 
        dest: 'dist',
        surround: {
            prefix: 'var Rx = require("rx");\nvar Observable = Rx.Observable;',
            suffix: '\nmodule.exports = Router;'
        }
    });
});

gulp.task('hint', function() {
    return gulp.
        src(['src/**/*.js']).
        pipe(hint());
});

function compileSweet(opts) {
    opts = opts || {};
    opts.src = [
        'src/support/*.js',
        'src/operations/*.js',
        'src/*.js'
    ].concat(opts.src || []);
    console.log(opts.src);
    var catBuild = gulp.src(opts.src).
        pipe(sweet({
            modules: ['./macros/fnToString.sjs'],
            readableNames: true
        })).
        pipe(concat({path: 'Router.js'}));
    
    if (opts.name) {
        catBuild = catBuild.pipe(rename(opts.name));
    }
    return catBuild.pipe(gulp.dest(opts.dest || 'tmp'));
}

function compile(opts) {
    var out = gulp.
        src([
            'tmp/**/*.js'
        ].concat(opts.src || [])).
        pipe(concat({path: opts.name + ".js"}));
    if (opts.surround) {
        out = out.pipe(surround(opts.surround));
    }
    
    return out.pipe(gulp.dest(opts.dest || 'bin'));
}