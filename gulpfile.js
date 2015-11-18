var fs = require('fs');
var path = require('path');

var gulp = require('gulp');

// Load all gulp plugins automatically
// and attach them to the `plugins` object
var plugins = require('gulp-load-plugins')();

// Temporary solution until gulp 4
// https://github.com/gulpjs/gulp/issues/355
var runSequence = require('run-sequence');

var pkg = require('./package.json');
var dirs = pkg['h5bp-configs'].directories;

var minifyCss = require('gulp-minify-css');
var uglify = require('gulp-uglifyjs');
var rename = require('gulp-rename');
var imagemin = require('gulp-imagemin');


var mainStylesheet = 'style';

// ---------------------------------------------------------------------
// | Helper tasks                                                      |
// ---------------------------------------------------------------------

gulp.task('archive:create_archive_dir', function () {
    fs.mkdirSync(path.resolve(dirs.archive), '0755');
});

gulp.task('archive:zip', function (done) {

    var archiveName = path.resolve(dirs.archive, pkg.name + '.zip');
    var archiver = require('archiver')('zip');
    var files = require('glob').sync('**/*.*', {
        'cwd': dirs.dist,
        'dot': true // include hidden files
    });
    var output = fs.createWriteStream(archiveName);

    archiver.on('error', function (error) {
        done();
        throw error;
    });

    output.on('close', done);

    files.forEach(function (file) {

        var filePath = path.resolve(dirs.dist, file);

        // `archiver.bulk` does not maintain the file
        // permissions, so we need to add files individually
        archiver.append(fs.createReadStream(filePath), {
            'name': file,
            'mode': fs.statSync(filePath)
        });

    });

    archiver.pipe(output);
    archiver.finalize();

});

gulp.task('clean', function (done) {
    require('del')([
        dirs.archive,
        dirs.dist
    ], done);
});

gulp.task('copy', [
    'copy:uglify',
    'copy:.htaccess',
    'copy:index.html',
    'copy:jquery',
    'copy:license',
    'copy:images',
    // 'copy:main.css',
    // 'minify-css',
    'copy:misc'
]);

gulp.task('copy:.htaccess', function () {
    return gulp.src('node_modules/apache-server-configs/dist/.htaccess')
        .pipe(plugins.replace(/# ErrorDocument/g, 'ErrorDocument'))
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('copy:index.html', function () {
    return gulp.src(dirs.src + '/index.html')
        .pipe(plugins.replace(/{{JQUERY_VERSION}}/g, pkg.devDependencies.jquery))
        .pipe(plugins.replace(/{{MAIN_JS_FILE}}/g, 'main.js'))
        .pipe(plugins.replace(/{{CUT-START}}(.|\n)+?{{CUT-END}}/gm, ''))
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('copy:jquery', function () {
    return gulp.src(['node_modules/jquery/dist/jquery.min.js'])
        .pipe(plugins.rename('jquery-' + pkg.devDependencies.jquery + '.min.js'))
        .pipe(gulp.dest(dirs.dist + '/js/vendor'));
});

gulp.task('copy:license', function () {
    return gulp.src('LICENSE.txt')
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('copy:main.css', function () {

    var banner = '/*! HTML5 Boilerplate v' + pkg.version +
        ' | ' + pkg.license.type + ' License' +
        ' | ' + pkg.homepage + ' */\n\n';

    return gulp.src(dirs.src + '/css/' + mainStylesheet + '.css')
        .pipe(plugins.header(banner))
        .pipe(plugins.autoprefixer({
            browsers: ['last 2 versions', 'ie >= 8', '> 1%'],
            cascade: false
        }));
});

gulp.task('copy:minify-css', function () {
    return gulp.src(dirs.src + '/css/*.css')
        .pipe(minifyCss())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('dist' + '/css/'));
});

gulp.task('copy:uglify', function() {
    return gulp.src([
            dirs.src + '/assets/js/*.js',
            '!' + dirs.src + '/assets/js/' + mainStylesheet + '*.min.js'
        ])

        .pipe(uglify('main.js', {
            outSourceMap: false
        }))
        .pipe(gulp.dest('dist' + '/js/'));
});

gulp.task('copy:images', function() {
    return gulp.src(dirs.src + '/img/**/*.{gif,jpg,png}')
        .pipe(imagemin({
            progressive: true,
            interlaced: true,
            svgoPlugins: [{ removeViewBox:false }, { removeUselessStrokeAndFill:false }]
        }))
        .pipe(gulp.dest('dist' + '/img'));
});

gulp.task('copy:misc', function () {
    return gulp.src([

        // Copy all files
        dirs.src + '/**/*',
        // Exclude the following files
        // (other tasks will handle the copying of these files)
        // '!' + dirs.src + '/css/' + mainStylesheet + '.min.css',
        '!' + dirs.src + '/assets/js/*.js',
        '!' + dirs.src + '/img/**/*',
        '!' + dirs.src + '/index.html'

    ], {

        // Include hidden files by default
        dot: false

    }).pipe(gulp.dest(dirs.dist));
});

/*
 gulp.task('copy:normalize', function () {
 return gulp.src('node_modules/normalize.css/normalize.css')
 .pipe(gulp.dest(dirs.dist + '/css'));
 });
 */

gulp.task('lint:js', function () {
    return gulp.src([
        'gulpfile.js',
        dirs.src + '/js/plugin.js',
        dirs.test + '/*.js'
    ]).pipe(plugins.jscs())
        .pipe(plugins.jshint({
            browser: true,
            devel: true
        }))
        .pipe(plugins.jshint.reporter('jshint-stylish'))
        .pipe(plugins.jshint.reporter('fail'));
});


// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------

gulp.task('archive', function (done) {
    runSequence(
        'build',
        'archive:create_archive_dir',
        'archive:zip',
        done);
});

gulp.task('build', function (done) {
    runSequence(
        ['clean', 'lint:js'],
        'copy',
        done);
});

gulp.task('default', ['build']);
