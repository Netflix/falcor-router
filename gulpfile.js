var gulp = require('gulp');
var sweet = require('gulp-sweetjs');
var mocha = require('gulp-mocha');
var rename = require('gulp-rename');
var license = require('gulp-license');
var concat = require('gulp-concat');
var bump = require('gulp-bump');
var hint = require('gulp-jshint');
var surround = require('./gulp-surround');
var _ = require('lodash');

gulp.task('dev', ['build.dev', 'hint']);
gulp.task('default', ['build.dev', 'hint']);
gulp.task('dist', ['build.dist', 'hint']);
gulp.task('bump', ['dist'], function() {
    return gulp.
        src('package.json').
        pipe(bump({type: 'patch'})).
        pipe(gulp.dest('./'));
});

gulp.task('build.sweet', function() {
    return buildTmpPipe({
        surround: {
            prefix: 'var Rx = require("rx");\nvar Observable = Rx.Observable;',
            suffix: '\nmodule.exports = Router;'
        }
    });
});
gulp.task('build.dev', ['build.sweet'], function() {
    return compile({name: 'Router', src: ['lib/falcor.js']});
});
gulp.task('dist.node', ['build.sweet'], function() {
    return compile({name: 'Router', dest: 'dist'});
});

gulp.task('hint', function() {
    return gulp.
        src(['src/**/*.js']).
        pipe(hint());
});

gulp.task('dist', function() {
    return gulp.src(['src/**/*.js']).
        pipe(sweet({
            modules: ['./macros/fnToString.sjs'],
            readableNames: true
        })).
        pipe(concat({path: 'Router.js'})).
        pipe(gulp.dest('dist'));
});

function buildTmpPipe(opts) {
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
    
    if (opts.surround) {
        catBuild = catBuild.pipe(surround(opts.surround));
    }
    if (opts.name) {
        catBuild = catBuild.pipe(rename(opts.name));
    }
    return catBuild.pipe(gulp.dest(opts.dest || 'tmp'));
}

function compile(opts) {
    return gulp.
        src([
            'tmp/**/*.js'
        ].concat(opts.src || [])).
        pipe(concat({path: opts.name + ".js"})).
        pipe(gulp.dest(opts.dest || 'bin'));
}