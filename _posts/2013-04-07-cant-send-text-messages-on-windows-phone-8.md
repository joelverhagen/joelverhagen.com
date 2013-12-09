---
category: Rant
layout: post
tags:
- Windows Phone 8
- SMS
title: Can't Send Text Messages on Windows Phone 8
---
## tl;dr

If you are having trouble with your Windows Phone not sending texts (SMS) properly, try making sure the International Assist option is turned off. It caused me a world of annoyance.

You can find this option in the Settings > applications > phone menu.

## Background
I recently purchased a Windows Phone 8. Last spring, I was an SDET Intern at Microsoft and I working the Windows Phone designer for Visual Studio and Blend. So, I kind of felt obliged to get a Windows Phone... just kidding. They actually let me play with a Nokia Lumia 800 for three months and I got hooked. 

Anyways, I built up the nerve (and excess capital) to buy a smart phone and decided on an HTC 8X. Why? Well, overall it's rather hard to get a new Windows Phone that is SIM unlocked (you can use it on an GSM carrier). For example, the Lumia 920 is pretty much impossible to get unlocked, unless you want to pay hundreds more than the shelf price and get one off of eBay. I discovered that the Verizon HTC 8X [comes factory unlocked](http://www.wpcentral.com/you-can-use-your-t-mobile-sim-verizon-htc-8x), which means you can use it on any provider. Verizon++! The device is wonderful. I am not a big fan of how huge the Lumia 920 is, so the size and weight of the HTC 8X is just right.

## The Problem
Anyways, this post is not about the pros and cons of various Windows Phone models. I ran into an annoying bug on Windows Phone 8 that I have be struggling for weeks which prevented some (seemingly random) text messages that I sent to never arrive at their destination. Lady friend was not too pleased!

At first, I though the problem was related to the fact that I was using my Verizon phone on a non-Verizon carrier (in my case, T-Mobile). Then I noticed an interesting trend. Whenever I selected the recipient's number manually from my contacts, the message seemed to go through. Whenever I responded to a text message conversation thread, the text didn't go through.

<img class="center" src="{% attachment conversation.png %}" title="Windows Phone's awesome conversation view" width="360" height="640" />

That wasn't enough information for things to click into place in my head. First I called HTC and T-Mobile more times than I'd like to admit, trying to figure out what was going on. None of the support representatives had any clue what the problem was. In retrospect this is likely due to the fact that Windows Phone is still relatively uncommon compared to iPhone and Android devices. Therefore, the various options deep in the bowels of the Windows Phone Settings app are pretty much unknown to the average support rep.

Finally, I gave up on the customer support route, and decided to start testing things myself. I already had a hunch that the format of the number had something to do with it. After a couple of test text (10 times fast) messages to my Google Voice number, I realized that whenever I prepended a plus sign to the phone number, the message never reached its destination. Odd... plus signs should be fine, right? You often see a fully normalized/qualified/canonical phone number in the following format:
<code class="inline">+1 (555) 867-5309</code>

To be more precise, the plus sign is used to indicate that the number is in an international format (meaning that the number starts with a country code, then area code, etc.). United States of course has 1 as their country code. *USA! USA! USA!*

I called up HTC and T-Mobile again with this additional information. Much to my ammusement, T-Mobile was confident that it was a phone issue and HTC was confident it was a network issue. However, T-Mobile opened a support ticket on their end and promised to have their engineering team look into it. Okay, cool.

## The Solution

A couple days later, while [exploring an unrelated issue](https://twitter.com/joelverhagen/status/320650883211853825) (setting up an MMS APN on my phone), I found a little option in Phone settings menu (Settings > applications > phone) called International Assist.

"Wait a minute. Isn't my SMS problem caused by a plus sign... which is used for international calling?!?"

*Click*. That's the sound of me instantly realizing what was causing my problem.

<img class="center" src="{% attachment on.png %}" title="International Assist is on :(" width="360" height="640" />

I turned that option off and suddenly, all of my text messages starting working great!

## One Gripe

Windows Phone 8's messaging app has an option called "SMS delivery confirmation". I think this is a poorly labelled option. After some conversations with the T-Mobile engineering team, I found that this option doesn't confirm delivery *to the recipient*. Actually, I'm not even sure what it confirms delivery to at all (the T-Mobile seemed to think it confirms delivery to your current cell tower). Let's get some TCP goodness up in here! Even when I had International Assist enabled and a plus sign in the recipient's phone number, I still got these confounded confirmation messages. They seem either completely useless or grossly mislabelled.

<img class="center" src="{% attachment delivery_confirmation.png %}" title="Delivery confirmation... not so much" width="360" height="640" />
