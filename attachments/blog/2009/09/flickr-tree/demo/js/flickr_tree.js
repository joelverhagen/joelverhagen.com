//	Written by Joel Verhagen (http://www.wintallo.com)
//	Helpful links:
//		http://stackoverflow.com/questions/1234764/automatic-spacing-for-flowchart
//		http://www.reddit.com/r/programming/comments/97ucb/automatic_spacing_for_flowchart_stack_overflow/
//		http://en.wikipedia.org/wiki/Force-based_algorithms

var force_damping = 0.92;
var bounce_damping = 0.25;
var connected = new Array();

var working = false;

var branch_id = 0;

var images = new Array();

var nodes = new Object();

function objectLength(object) {
	var propertyCount = 0;
	for(var property in object) {
		propertyCount++;
	}
	return propertyCount;
}
function in_array(needle, haystack, argStrict) {
	for (key in haystack) {
		if (haystack[key] == needle) {
			return true;
		}
	}	
	return false;
}
function distanceBetween(node_1, node_2) {
	var distance = Math.sqrt(Math.pow(node_2.position[0] - node_1.position[0], 2) + Math.pow(node_2.position[1] - node_1.position[1], 2));
	return distance;
}
function vectorToScalar(vector) {
	return Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2));
}
function coulombRepulsion(node_1, node_2, distance, normalize) {
	var force = (8.987*Math.pow(10,9)) * ((0.001*0.001)/(distance*distance));
	return new Array(normalize[0] * force, normalize[1] * force);
}
function hookeAttraction(node_1, node_2, distance, normalize) {
	var force = 0.00185 * distance;
	return new Array(normalize[0] * force, normalize[1] * force);
}
function normalizeVector(node_1, node_2, distance) {
	return new Array(( node_2.position[0] - node_1.position[0] ) / distance, ( node_2.position[1] - node_1.position[1] ) / distance);
}
function draw() {
	for(var key in nodes) {
		var node = document.getElementById(key);
		node.style.left = ( Math.round(nodes[key].position[0]) - 38 )+"px";
		node.style.top = ( Math.round(nodes[key].position[1]) - 38 )+"px";
	}
}
function nextParent() {
	for(var key in nodes) {
		if ( objectLength(nodes[key].connected) < 4 ) {
			return key;
		}
	}
}
function arrange() {
	if ( !working ) {
		working = true
		toggleLoading();
		setStatus("Arranging...");
		jg_doc.clear();	
	}
	var total_kinetic_energy = 0;
	var max_speed_x = 0;
	var max_speed_y = 0;
	for(var key in nodes) {
		var net_force = new Array(0, 0);		
		
		for(var key2 in nodes) {
			if ( key != key2 ) {					
				var distance = distanceBetween(nodes[key], nodes[key2]);
				var normalize = normalizeVector(nodes[key2], nodes[key], distance);
				var force_vector = coulombRepulsion(nodes[key], nodes[key2], distance, normalize);
				net_force = new Array(net_force[0] + force_vector[0], net_force[1] + force_vector[1]);
			}				
		}
		var currentConnected = nodes[key]['connected'];
		for(var key2 in currentConnected) {
			if ( key != key2 ) {
				var distance = distanceBetween(nodes[key], nodes[currentConnected[key2]]);
				var normalize = normalizeVector(nodes[key], nodes[currentConnected[key2]], distance);
				var force_vector = hookeAttraction(nodes[key], nodes[currentConnected[key2]], distance, normalize);
				net_force = new Array(net_force[0] + force_vector[0], net_force[1] + force_vector[1]);
			}
		}
		nodes[key].velocity = new Array( ( nodes[key].velocity[0] + net_force[0] ) * force_damping, ( nodes[key].velocity[1] + net_force[1] ) * force_damping);
		if ( Math.abs(nodes[key].velocity[0]) > max_speed_x ) {
			max_speed_x = Math.abs(nodes[key].velocity[0]);
		}
		if ( Math.abs(nodes[key].velocity[1]) > max_speed_y ) {
			max_speed_y = Math.abs(nodes[key].velocity[1]);
		}
		
		var x = nodes[key].position[0] + nodes[key].velocity[0];
		if ( x < 25 + 38 ) {
			x = 25 + 38;
			nodes[key].velocity[0] = -1 * ( nodes[key].velocity[0] * bounce_damping );
		}
		var y = nodes[key].position[1] + nodes[key].velocity[1];
		if ( y < 25 + 38 ) {
			y = 25 + 38;
			nodes[key].velocity[1] = -1 * ( nodes[key].velocity[1] * bounce_damping );
		}
		//if ( key != "branch_0" ) {
			nodes[key].position = new Array(x, y);
			total_kinetic_energy = total_kinetic_energy + vectorToScalar(nodes[key].velocity) * vectorToScalar(nodes[key].velocity);
		//}
		
	}
	draw();
	if ( total_kinetic_energy < 1.2 || ( max_speed_x < 1 && max_speed_y < 1 ) ) {
		jg_doc.clear();		
		for (var key in nodes)
		{
			var currentConnected = nodes[key]['connected'];
			for (var key2 in currentConnected)
			{
				var connection = new Array(currentConnected[key2], key).sort().join(" to ");
				if ( !in_array(connection, connected) ) {
					connected.push(connection);
					connect(document.getElementById(key),document.getElementById(currentConnected[key2]), key2);
				}
			}
		}
		connected = new Array();
		working = false;
		toggleLoading();
		setStatus("");
		var parent = nextParent();
		newBranch(getRandomTag(document.getElementById(parent).firstChild.firstChild.title), parent);
	} else {
		setTimeout("arrange()", 1);
	}
}
function getPixels(string) {
	return string.substring(0, string.length - 2);
}
function connect(start, end, tag) {
	var horizontalOffset = end.offsetLeft - start.offsetLeft;
	var verticalOffset = end.offsetTop - start.offsetTop;
	start_x = start.offsetLeft;
	start_y = start.offsetTop;
	end_x = end.offsetLeft;
	end_y = end.offsetTop;
	if ( horizontalOffset > 77 ) {
		if ( verticalOffset > 77 ) {
			start_x += start.offsetWidth;
			start_y += start.offsetHeight;
		} else if ( verticalOffset <= 77 && verticalOffset >= -77 ) {
			start_x += start.offsetWidth;
			start_y += Math.round(start.offsetHeight/2);
			
			end_y += Math.round(end.offsetHeight/2);
		} else if ( verticalOffset < -77 ) {
			start_x += start.offsetWidth;
			
			end_y += end.offsetHeight;
		}
	} else if ( horizontalOffset <= 77 && horizontalOffset >= -77 ) {
		if ( verticalOffset > 77 ) {
			start_x += Math.round(start.offsetWidth/2);
			start_y += start.offsetHeight;
			
			end_x += Math.round(end.offsetWidth/2);
		} else if ( verticalOffset <= 77 && verticalOffset >= -77 ) {
			return false;
		} else if ( verticalOffset < -77 ) {
			start_x += Math.round(start.offsetWidth/2);
			
			end_x += Math.round(end.offsetWidth/2);
			end_y += end.offsetHeight;
		}
	} else if ( horizontalOffset < -77 ) {
		if ( verticalOffset > 77 ) {
			start_y += start.offsetHeight;
			
			end_x += end.offsetWidth;
		} else if ( verticalOffset <= 77 && verticalOffset >= -77 ) {
			start_y += Math.round(start.offsetHeight/2);
			
			end_x += end.offsetWidth;
			end_y += Math.round(end.offsetHeight/2);
		} else if ( verticalOffset < -77 ) {
			end_x += end.offsetWidth;
			end_y += end.offsetHeight;
		}
	}
	jg_doc.drawLine(start_x,start_y,end_x,end_y);
	jg_doc.setColor("#CCCCCC");
	jg_doc.fillRect(Math.round((start_x+end_x)/2) - 3, Math.round((start_y+end_y)/2) - 3, 500, 20);  
	jg_doc.setColor("#000000");
	jg_doc.drawString(tag, Math.round((start_x+end_x)/2), Math.round((start_y+end_y)/2));
	jg_doc.paint();
	var string = document.getElementById("string_"+(string_id - 1));
	var shape = document.getElementById("shape_"+(shape_id - 1));
	
	shape.style.width = (string.offsetWidth + 6)+"px";
	var topAdjustment = Math.round(shape.offsetHeight/2);
	var leftAdjustment = Math.round(shape.offsetWidth/2);
	string.style.top = (getPixels(string.style.top)-topAdjustment)+"px";
	string.style.left = (getPixels(string.style.left)-leftAdjustment)+"px";
	shape.style.top = (getPixels(shape.style.top)-topAdjustment)+"px";
	shape.style.left = (getPixels(shape.style.left)-leftAdjustment)+"px";
}
function newBranch(tag, parent) {
	if ( !working ) {
		toggleLoading();
	}
	setStatus("Loading tag '"+tag+"'...");
	
	working = true;
	
	$.get("flickr.php", { "tag": tag }, function(data) {
		var choice_photo;
		var tag_found = false;
		var max_tags = 0;
		$(data).find("photo").each(function() {
			var photo = $(this);
			var tag_count = photo.attr("tags").split(" ").length;
			if ( tag_count > max_tags && !in_array(photo.attr("thumb"), images) ) {
				choice_photo = $(this);
				tag_found = true;
				max_tags = tag_count;
			}
		});
		if ( tag_found ) {
			images.push(choice_photo.attr("thumb"));
		} else {
			console.log("dead end");
			newBranch(getRandomTag(document.getElementById(parent).firstChild.firstChild.title), parent);
		}
		if ( branch_id == 0 ) {
			var default_style = "left:25px;top:25px;";
			nodes["branch_"+branch_id] = new Object({
				"velocity": new Array(0, 0),
				//"position": new Array(63, 63),
				"position": new Array(300, 300),
				"connected": new Object()
			});
		} else {
			var x = rand(100, 1000);
			var y = rand(100, 1000);
			//var x = 100 + ( branch_id * rand(10, 50) );
			//var y = 100 + ( branch_id * rand(10, 50) );
			var default_style = "left:"+x+"px;top:"+y+"px;";
			nodes["branch_"+branch_id] = new Object({
				"velocity": new Array(0, 0),
				"position": new Array(x, y),
				"connected": new Object()
			});
			nodes["branch_"+branch_id]["connected"][tag] = parent;
			nodes[parent]["connected"][tag] = "branch_"+branch_id;
		}
		
		$("<div id='branch_"+branch_id+"' style='"+default_style+"display:none;' class='branch'><a href='"+choice_photo.attr("full")+"'><img width='75' height='75' src='"+choice_photo.attr("thumb")+"' title='"+choice_photo.attr("tags")+"' alt='' /></a></div>").appendTo("#output_body").fadeIn(500, function () {
			branch_id++;
			toggleLoading();
			setStatus("");
			working = false;
			arrange();
		});
	});
}
function rand(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomTag(tag_string) {
	var tags = tag_string.split(" ");
	return tags[rand(0, tags.length - 1)];
}
function submitTag(tag) {
	if ( tag.length > 1 ) {
		$("#tag_container").fadeOut(500, function () {
			newBranch(tag);
		});
	}
}
function setStatus(text) {
	document.getElementById("current_text").innerHTML = text;
}
function toggleLoading() {
	var loading_indicator = document.getElementById("loading_indicator");
	if ( loading_indicator.style.visibility != "hidden" ) {
		loading_indicator.style.visibility = "hidden";
	} else {
		loading_indicator.style.visibility = "visible";
	}
}