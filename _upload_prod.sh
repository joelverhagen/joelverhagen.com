set -e

# build
jekyll build --config _config_prod.yml

# copy
rsync --verbose --compress --recursive --checksum --delete _prod/ /var/www/joelverhagen.com/

# delete
rm -rf _prod
