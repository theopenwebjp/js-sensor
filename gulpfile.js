const eslint   = require('gulp-eslint');
const gulp = require('gulp');
const reporter = require('eslint-html-reporter');
const path     = require('path');
const fs       = require('fs');

gulp.task('eslint', function(){
    gulp.src(['./src/*.js'])
    .pipe(eslint({
        configFile: './.eslintrc'
    }))
    .pipe(eslint.format(reporter, function(results) {
        fs.writeFileSync(path.join(__dirname, 'report-results.html'), results);
      })
    );
});