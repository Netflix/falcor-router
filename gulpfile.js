var gulp = require('gulp');
var sweet = require('gulp-sweetjs');
var mocha = require('gulp-mocha');
var rename = require('gulp-rename');
var license = require('gulp-license');
var concat = require('gulp-concat');
var hint = require('gulp-jshint');
var surround = require('./gulp-surround');

gulp.task('dev', ['build.node', 'hint']);
gulp.task('default', ['build.node', 'hint']);
gulp.task('build.node', function() {
    return buildPipe({
        surround: {
            prefix: 'var Rx = require("rx");\nvar Observable = Rx.Observable;',
            suffix: '\nmodule.exports = Router;'
        },
        dest: 'bin'
    });
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

function buildPipe(opts) {
    var catBuild = gulp.src([
            'src/support/*.js',
            'src/operations/*.js',
            'src/*.js'
        ]).
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
    return catBuild.pipe(gulp.dest(opts.dest));
}
