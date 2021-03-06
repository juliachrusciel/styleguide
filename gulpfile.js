var browserSync = require('browser-sync'),
gulp            = require('gulp'),
sass            = require('gulp-sass'),
shell           = require('gulp-shell'),
packagejson     = require('./package.json'),
file            = require('gulp-file'),
rename          = require('gulp-rename'),
plumber         = require('gulp-plumber');

// Browser Sync
gulp.task('browserSync', function() {
  browserSync({
    server: {
      baseDir: 'guide' // This is the DIST folder browsersync will serve
    },
    open: false
  })
})

gulp.task('sass', function() {
  return gulp.src('sass/styles.scss')
  .pipe(plumber())
  .pipe(sass())
  .pipe(gulp.dest('guide/styles'))
  .pipe(browserSync.stream());
});

gulp.task('distSass', function () {
  return gulp.src('sass/styles.scss')
  .pipe(plumber())
  .pipe(sass())
  .pipe(rename('govlab-styleguide.css'))
  .pipe(gulp.dest('dist/css'))
});

gulp.task('js', function() {
  return gulp.src('js/*')
  .pipe(plumber())
  .pipe(gulp.dest('guide/js'))
  .pipe(browserSync.stream());
});

gulp.task('assets', function() {
  return gulp.src('img/**/*')
  .pipe(plumber())
  .pipe(gulp.dest('guide/img'))
  .pipe(browserSync.stream());
});

gulp.task('ver', function() {
  console.log('Using version ' + packagejson.name + ' - ' + packagejson.version);
  return gulp.src('')
  .pipe(plumber())
  .pipe(file('styleguide.md', packagejson.name + ' - ' + packagejson.version))
  .pipe(gulp.dest('sass/'));
});

gulp.task('build', ['sass', 'js', 'assets', 'kss', 'distSass'], function () {
  //copy static stuff over
  return gulp.src('kss-template/static/*')
  .pipe(plumber())
  .pipe(gulp.dest('guide'));
})

gulp.task('kss', ['ver'], shell.task([
  './node_modules/.bin/kss-node --config kss-config.json'
  ])
);

gulp.task('autover', ['build'], shell.task([
  './updateversion.sh'
  ])
);

gulp.task('deploy', ['autover'], shell.task([
  'git subtree push --prefix guide origin gh-pages'
  ])
);

gulp.task('reload', function() {
  browserSync.reload();
});

gulp.task('default', ['browserSync', 'build'], function (){
  gulp.watch(['sass/**/*.scss', 'kss-template/*', 'js/*'], ['sass', 'js', 'kss']);
  gulp.watch('kss-template/*').on('change', browserSync.reload);
  gulp.watch('js/*').on('change', browserSync.reload);
  gulp.watch('img/*', ['assets', 'reload']);
});