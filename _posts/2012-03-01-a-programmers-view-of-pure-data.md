---
category: Programming
layout: post
tags:
- Pure Data
- visual programming
title: A Programmer's Experience with Pure Data
---
During this past quarter at school, I have been taking a class called "Jammin' with Laptops". Overall, it's been a very interesting course. It hasn't been interesting in the same way that my Computer Science courses have interested me. In my CS course, I've been stimulated academically. The theory, the math, the *not programming* (I'm looking at you Dr. Berman). In Jammin' with Laptops, it's been more of an artistic stimulation. Call me crazy, but I really didn't know this kind of artistic stimulation until now... it's kind of awesome (even though I pretty much suck at making music)!

There are three main units in the course: waveform editing with [Audacity](http://audacity.sourceforge.net/), live DJing and beat matching with [Mixxx](http://www.mixxx.org/), and audio/visual programming (like computer programming) with [Pure Data](http://puredata.info/) (*yes, I got a little something-something for my programming fix this quarter!*). One thing I really love about my professor in this course is that he is *totally* into the open-source movement. In other words, $0 on books/software for that class. Also a big win in my mind.

I had already messed around with Audacity a lot on my own time before the class. Unfortunately, Mixxx didn't hold much allure for me. I think it's because if I was to ever jam with my laptop, I would probably spend a billion hours making a cool electronic track in FL Studio and Audacity... and then put it up on SoundCloud or YouTube or something. I am the last person in the world you'll ever see up there DJing. Maybe I just don't get the whole live DJ thing. Aside: maybe I've totally missed my professor's whole point of the class...

The real interesting part of the class for me was learning about Pure Data (PD for short). Wait! Programming is interesting to a programmer/Computer Science major? Shocker! I'm going to go over some of the things I liked, some things I disliked, and then show off the fruits of my labor. I spent about 4 hours from the time I downloaded PD and installed it to when I finished my little program. To be honest, there were a couple of lectures about the basic syntax and ideas behind PD, so I didn't truly start with zero knowledge. Not sure if the 4 hours for the below code is an indication of my own numbscullery or not.

Quick overview of PD for those that are unaquainted: the basic interface with PD is a blank white canvas where you place **objects**. Each object has 0 or more inlets and 0 or more outlets. To make a program or "patch", all you do is connect the outlets (plugs on the bottom of an object) of one object to the inlets (plugs on the top) of other objects. Very intuative.

## Good Things
1. Visual programming is refreshing. This is "good thing" is gimme. It's actually really refreshing to work with moving little rectangles around the screen and connected them with wires. It reminds me of an old game I played when I was a kid called [Widget Workshop](http://en.wikipedia.org/wiki/Widget_Workshop). As far as I know, there is no notion of scope. By connecting the outlet of one "object" to the inlet of the next, you've passed a value. I might have to poke around the implementation sometime to seen how it works.
2. It's easy to learn. My professor took a class of 40 to 50 students (only a few of which had ever had any programming experience) and taught them the VERY VERY basics of programming. I can appreciate this feat because I've tried to teach a couple people about programming... and it didn't turn out as well as I'd like. The majority of people seemed to understand his in-class tutorials. I only saw two or three *really* glassy eyed people.
3. Pure Data has an awesome standard library. If you install PD-Extended (the first option on the download page), you get a metric crapload of sound, video, and image processing objects. You don't have to go out installing plugins or external libraries. One exception to this is that Windows users (like myself) need to install Quicktime to get PD to find the codecs required for opening certain video codecs.
4. There are nice built-in GUI elements. I really like that there's a decent number of GUI elements like buttons, checkboxes and sliders. It guess it really make sense since it's a *visual* programming language, but it makes experimenting a lot more friendly.
5. The documentation inside the program is really nice (once you know where to look for it). When you create an object, you can just right-click on it and click "Help", which will open a new test canvas with working examples and thorough comments. It makes the PD canvas kind of feel like an IDE.
6. It's cross-platform. I might be naive in this thought, but the fact that they've gotten this amount of rich multimedia functionality working on Windows, Mac, and Linux makes me happy. I'm having a couple problems, but the majority of the objects I have used work flawlessly.
7. The file format (<code class="inline">.pd</code>) is plain-text. This opens up some interesting scripting possiblities...
8. The key-board shortcuts are really helpful. It makes for really fast-pace development.

## Bad Things
1. The notion of adding a tilde <code class="inline">~</code> to the end of some object names to make them magically work with sound data seems strange to me. For example, if you want to multiply two integers, you used the <code class="inline">\*</code> object. If you want to modulate the amplitude of an incoming audio signal, then you use the <code class="inline">\*~</code>. I understand the similarity between the two operations, but couldn't the <code class="inline">\*</code> object be smart about the input type? Granted, I don't know the implementation details so there could be complexities that I simply don't know about.
2. The wiki has some serious formatting issues. For example, the [documentation](http://wiki.puredata.info/en/rectangle) for the <code class="inline">rectangle</code> object is a little messy. It looks like someone scraped the right-click documentation and dumped it onto the wiki page. Fortunately, the in-program documentation suffices most of the time. Also the [FLOSS Manual](http://flossmanuals.net/puredata/) is really good.
3. I haven't found a way to "zoom" in on the PD canvas (i.e. object size, font size) and I am pretty sure this is a [known area for improvement](http://puredata.info/dev/GuiIdeas). It's all really really small. This is the first time I've used the <code class="inline">Win + =</code> keyboard shortcut to open the magnifier built into Windows. Changing the font size of comments would be nice too, for headings and such. **Note:** a reader, Anton, mentioned that you can add `-font-size 12` as a startup flag for PD to increase the font size on the canvas.
4. I am having problems with getting my webcam to work with PD out of the box (via the <code class="inline">pix_video</code> object). I will be able to get it working eventually, but I haven't found too much documentation on the subject... so I'm totally acknowledging the possibility of user error on this count.
5. There seems to be some performance issues when moving 15 or more objects at the same time. It gets really laggy.
6. It seems like some objects that I use store state and others do not. This needs to be made very, very clear. My initial inclination was that all objects acted like pure functions and number boxes would store state, but this is not the case (I'm looking at you <code class="inline">pow</code>).

The majority of the qualms I have up there are no doubt related to my own ignorance about Pure Data. If I'm saying something totally silly, set me straight in the comments below!

## Fruits of my Labor
I made a thing. This was for an assignment for my Jammin' with Laptops class, but that assignment simply required that I make a patch with five different objects. Easy peasy! I went a bit overboard. Here's a picture of what the "code" looks like. Sadly, I think the code is more interesting to look at than the actually output.

[<img src="{% attachment code-preview.png %}" class="max-width" alt="Shapes and Colors PD code" />]({% attachment code-preview.png %})

And this is the output. It takes a random color and draws a circle, triangle, or square in increasing then decreasing size on a black canvas. Pretty basic. Do you like my use of <code class="inline">cos</code> in there to make the resizing ease smoothly?

<img src="{% attachment output-preview.png %}" alt="Shapes and Colors example output" /> 

**I have made the [source file]({% attachment shapes-and-colors.pd %}) is available for your parusal.** All you need is PD-extended to run it, which you can download off [PD's website](http://puredata.info/community/projects/software).