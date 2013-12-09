<?php

if ( isset($_GET["tag"]) ) {
	header("Content-type: application/xml");
	$url = "http://api.flickr.com/services/rest/?method=flickr.photos.search&sort=relavancy&api_key=***REMOVED***&tags=".$_GET["tag"]."&per_page=20&extras=url_m,url_sq,url_o,tags";
	$pictures = new SimpleXMLElement($url, NULL, TRUE);
	echo "<photos>\n";
	foreach ( $pictures->photos->photo as $current ) {
		echo "\t<photo full='".( isset($current["url_o"]) ? $current["url_o"] : $current["url_m"] )."' thumb='".$current["url_sq"]."' tags='".$current["tags"]."' />\n";
	}
	echo "</photos>";
} 

?>