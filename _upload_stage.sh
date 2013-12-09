set -e

# build
jekyll build --config _config_stage.yml

# upload
rsync --verbose --compress --recursive --checksum --delete _stage/ joelverhagen@joelverhagen.com:sites/s.joelverhagen.com/

# delete
rm -rf _stage
