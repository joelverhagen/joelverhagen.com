set -e

# build
jekyll build --config _config_prod.yml

# upload
rsync --verbose --compress --recursive --checksum --delete _prod/ joelverhagen@joelverhagen.com:sites/joelverhagen.com/

# delete
rm -rf _prod
