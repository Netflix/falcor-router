var gulp = require('gulp');
var mocha = require('gulp-mocha');
var rename = require('gulp-rename');
var license = require('gulp-license');
var concat = require('gulp-concat');
var bump = require('gulp-bump');
var clean = require('gulp-clean');
var eslint = require('gulp-eslint');
var gulp = require('gulp');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-mocha');


gulp.task('lint', ['lint-src', 'lint-test']);
gulp.task('lint-src', function() {
    return gulp.src('src/**/*.js').
        pipe(eslint({
            globals: {
                'require': false,
                'module': false
            },
            reset: true, // dz: remove me after linting is finished, else i can't do one at the time
            useEslintrc: true,
        })).
        pipe(eslint.format());
});

gulp.task('lint-test', function() {
    return gulp.src('test/**/*.js').
        pipe(eslint({
            globals: {
                'require': false,
                'module': false,
                'it': false,
                'xit': false,
                'describe': false
            },
            reset: true, // dz: remove me after linting is finished, else i can't do one at the time
            rules: {
                'max-len': [2, 200],
                'no-unused-expressions': 0
            },
            useEslintrc: true,
        })).
        pipe(eslint.format());
});


gulp.task('bump', function() {
    return gulp.
        src('package.json').
        pipe(bump({type: 'patch'})).
        pipe(gulp.dest('./'));
});

gulp.task('test-coverage', function (cb) {
    gulp.src(['./src/**/*.js']).
        pipe(istanbul()).
        pipe(istanbul.hookRequire()).
        on('finish', function () {
            gulp.src(['./test/index.js']).
                pipe(mocha()).
                pipe(istanbul.writeReports()).
                on('end', cb);
        });
});

gulp.task('test', function (cb) {
  gulp.src(['./test/index.js'])
    .pipe(mocha())
    .on('end', cb);
});

gulp.task('dist', ['lint', 'test-coverage']);
