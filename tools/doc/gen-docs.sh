#!/bin/sh

echo

MARKDOWN=./tools/doc/md-comments.js
PATCH_SOURCES=./tools/doc/patch-sources.js

## Make sure we're running within protos root dir
if [ ! -f package.json ] 
then
  echo "This script should be run within the framework's root directory.";
	exit 1;
fi

## Cleanup everything
rm -Rf build docs doctmp

#first do the build (just copying files)
mkdir -p build/lib;

# Process source files
for f in lib/application.js lib/command.js lib/controller.js lib/driver.js lib/engine.js lib/model.js lib/helper.js lib/protos.js
do
	echo "INFO:  parsing markdown in `basename $f`"
	$MARKDOWN $f > "build/lib/`basename $f`"
done

# The location of your yuidoc install
yuidoc_home=/Applications/yuidoc;

mkdir -p doctmp/{parsertmp,docs};
mkdir docs;

# The location of the files to parse.  Parses subdirectories, but will fail if
# there are duplicate file names in these directories.  You can specify multiple
# source trees:
#     parser_in="%HOME/www/yahoo.dev/src/js %HOME/www/Event.dev/src"
parser_in="build";

# The location to output the parser data.  This output is a file containing a 
# json string, and copies of the parsed files.
parser_out=doctmp/parsertmp;

# The directory to put the html file outputted by the generator
generator_out=doctmp/docs;

# The location of the template files.  Any subdirectories here will be copied
# verbatim to the destination directory.
template=resources/yuidoc-template

projectname='Protos'
version="0.0.4"

yuiversion="3.0.0"

##############################################################################
# add -s to the end of the line to show items marked private

python -W ignore::DeprecationWarning $yuidoc_home/bin/yuidoc.py $parser_in -C '<a href="https://github.com/derdesign">Ernesto M&eacute;ndez</a>.' -p $parser_out -o $generator_out -t $template -m 'Protos Web Framework' -Y $yuiversion -v $version -u 'index.html' -s;

# copy it to the right place
cp -r doctmp/docs/* docs/

# patch the sources
node $PATCH_SOURCES

# clean out temp files
rm -r doctmp

# Link client stylesheet for development
rm docs/assets/client.{css,js}
ln -s "`pwd`/resources/yuidoc-template/assets/client.css" "`pwd`/resources/yuidoc-template/assets/client.js" docs/assets/

echo 'INFO: '
echo 'INFO:  Done'
