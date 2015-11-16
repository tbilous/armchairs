require 'compass/import-once/activate'
require 'autoprefixer-rails'

# Require any additional compass plugins here.

# Set this to the root of your project when deployed:
http_path = '/'
css_dir = '/src/css'
sass_dir = '/src/.sass'
images_dir = 'src/img'
javascripts_dir = 'src/js'
sourcemap     = true
# output_style  = :compressed
sass_options  = { cache: false }
line_comments = false


on_stylesheet_saved do |file|
    css = File.read(file)
    map = file + '.map'

    if File.exists? map
        result = AutoprefixerRails.process(css,
                                           from: file,
                                           to:   file,
                                           map:  { prev: File.read(map), inline: false })
        File.open(file, 'w') { |io| io << result.css }
        File.open(map,  'w') { |io| io << result.map }
    else
        File.open(file, 'w') { |io| io << AutoprefixerRails.process(css) }
    end
end
