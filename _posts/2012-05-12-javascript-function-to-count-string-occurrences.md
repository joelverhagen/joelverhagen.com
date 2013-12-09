---
category: Snippets
layout: post
tags:
- node.js
- JavaScript
title: JavaScript Function to Count String Occurrences
---
I've been working on a super-awesome-secret [node.js](http://nodejs.org/) project... and I had a need for a high-performance way to read how many lines a file has. Well, I've generalized my code a bit to count the number of occurrences of a substring in a larger string. Use the <code class="inline">countInString</code> function below to count how many occurrences of <code class="inline">needle</code> exist in <code class="inline">haystack</code>. This function should work on all standard JavaScript environments (including the browser!).

I've also provided my more specific function, which can be used on [node.js](http://nodejs.org/) to count the number of times an arbitrary string occurs in a file. I called the function <code class="inline">countInFile</code>. This function can easily be used to count the number of lines in a file, if you set the <code class="inline">needle</code> to the newline character <code class="inline">\n</code>.

The arguments for <code class="inline">countInFile</code> are as follows:
{% highlight javascript %}
function countInFile(path, needle, [bufferSize], callback)
{% endhighlight %}

- **Argument**: <code class="inline">path</code> is the path to the file you want to count the occurrences of the needle.
- **Argument**: <code class="inline">needle</code> is the string you are looking for in the file.
- **Argument (optional)**:  <code class="inline">bufferSize</code> is the size of the chunks you want the file to be read by.
- **Argument**: <code class="inline">callback</code> function that will be called when the counting is done. The callback should have the following parameters:
{% highlight javascript %}
function yourCallback(error, count)
{% endhighlight %}

Here's the code. Enjoy!

----------------

{% highlight javascript %}
var countInString = function(haystack, needle) {
  var count = 0;
  var position = 0;
  while(true) {
    position = haystack.indexOf(needle, position);
    if(position != -1) {
      count++;
      position += needle.length;
    } else{
      break;
    }
  }
  return count;
};

// node.js only!
var fs = require("fs");

// assumes the content is UTF-8
var countInFile = function(path, needle) {
  // Argument validation
  if(arguments.length < 3) {
    throw new Error("At least 3 arguments (optionally 4) are required.");
  }
  if(typeof path !== "string") {
    throw new Error("The path must be a string.");
  }
  if(typeof needle !== "string") {
    throw new Error("The needle must be a string.");
  }
  if(arguments.length === 3) {
    var bufferSize = 4096;
    var callback = arguments[2];
  } else {
    if(typeof arguments[2] !== "number") {
      throw new Error("The buffer size must be a number.");
    }
    var bufferSize = arguments[2];
    var callback = arguments[3];
  }
  if(typeof callback !== "function") {
    throw new Error("The callback must be a function.");
  }

  // enforce buffer size, based on needle size (due to the way we read the file in)
  if(bufferSize <= Math.floor(needle.length / 2)) {    
    bufferSize = Math.ceil(needle.length / 2) + 1;
  }

  // open the stream
  var stream = fs.createReadStream(path, {
    encoding: "utf8",
    bufferSize: bufferSize
  });

  var callbackFired = false;
  var count = 0;
  var partialMatch = "";
  
  stream.on("data", function(data) {
    // prepend the partial match
    if(partialMatch.length > 0) {
      data = partialMatch + data;
      partialMatch = "";
    }

    // count occurrences in midst of the block
    count += countInString(data, needle);

    // check for a partial match at the end
    for(var i = needle.length - (2 + partialMatch.length); i >= 0; i--) {
      var end = data.substring(data.length - (i + 1));
      if(end == needle.substring(0, i + 1)) {
        partialMatch = end;
        break;
      }
    }
  });

  // if there is an error on the stream
  stream.on("error", function(error) {
    if(!callbackFired) {
      callback(error);
      callbackFired = true;
    }
  });

  // when we've hit the end of the file, return the number of occurrences
  stream.on("end", function() {
    if(!callbackFired) {
      callback(null, count);
      callbackFired = true;
    }
  });
};
{% endhighlight %}
