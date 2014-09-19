set -e

# build
jekyll build --config _config_stage.yml

# add _stage_extra
cp -rf _stage_extra/* _stage/

# upload
rsync --verbose --compress --recursive --checksum --delete _stage/ /var/www/s.joelverhagen.com/

# delete
rm -rf _stage
