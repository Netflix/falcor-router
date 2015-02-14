var gulp = require('gulp');
var sweet = require('gulp-sweetjs');
var mocha = require('gulp-mocha');
var license = require('gulp-license');
var concat = require('gulp-concat');
var hint = require('gulp-jshint');

gulp.task('dev', ['build', 'hint']);
gulp.task('build', function() {
    return gulp.src(['src/**/*.js']).
        pipe(sweet({
            modules: ['./macros/fnToString.sjs'],
            readableNames: true
        })).
        pipe(concat({path: 'Router.js'})).
        pipe(gulp.dest('bin'));
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
