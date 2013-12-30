set -e

# build
jekyll build --config _config_stage.yml

# add _stage_extra
cp -f _stage_extra/.htaccess _stage/.htaccess
cp -rf _stage_extra/* _stage/

# upload
rsync --verbose --compress --recursive --checksum --delete _stage/ joelverhagen@joelverhagen.com:sites/s.joelverhagen.com/

# delete
rm -rf _stage
