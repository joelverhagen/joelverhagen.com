---
category: Tutorials
layout: post
tags:
- C#
- Screen Scraping
- Chromium
title: Headless Chromium in C# with CefGlue
---
## tl;dr

If you wanna skip all of the juicy details and take a look at my code, download my example project. It includes all of the dependencies, so you should be good to go. Just open **OffScreenCefGlue.sln** in Visual Studio. I tested the project in **Visual Studio 2013**, but 2010 and 2012 should work as well.

[OffScreenCefGlue.zip]({% attachment OffScreenCefGlue.zip %})

## Motivation

If you're interesting in screen scraping or web crawling, you'll probably agree with me that simple HTML parsing libraries (like [HtmlAgilityPack](http://htmlagilitypack.codeplex.com/) and [CsQuery](https://github.com/jamietre/CsQuery) in C#) don't always cut it. For example, you'll have a hard time detecting any changes to the DOM made by JavaScript after page load. Good luck crawling those newfangled [single-page web applications](http://en.wikipedia.org/wiki/Single-page_application) without spending hours reverse engineering their AJAX endpoints. Also, these libraries typically don't handle broken HTML as well as a web browser.

This problem got me to thinking... why not use the browser itself for HTML parsing? I spent a couple of days looking around the internet for different ways to use a Real Life browser in my code. I immediately realized I didn't want a solution that requires interaction with real windows (through mouse movements and other shenanigans). Ideally, I would like to be able to access the actual DOM in memory that the browser uses to render the webpage and keep track of page state Also, I would like the tool to be usable in a non-desktop environment (i.e. headless).

My first attempt was using Qt's WebKit bindings, but this solution had two problems:

1. [Only HTML elements are easily accessible](https://qt.gitorious.org/qt/qtwebkit/source/4ef1b438ba70b629655fe8e0eec0554968503f34:Source/WebKit/qt/Api/qwebelement.cpp#L157-165) (no text nodes).
2. [Qt is moving away from WebKit for Qt 5.3](http://blog.qt.digia.com/blog/2013/09/12/introducing-the-qt-webengine/) (aside: the replacement will be Chromium, called [QtWebEngine](http://qt-project.org/wiki/QtWebEngine)).

Since Qt and [Google](http://blog.chromium.org/2013/04/blink-rendering-engine-for-chromium.html) are both moving away from WebKit, I figured I would give Chromium (the open source part of Chrome) a try. Much to my joy, I found project called [Chromium Embedded Framework (CEF)](http://code.google.com/p/chromiumembedded/) which focuses on embedding Chromium in other software. The greatest part about this project is that you don't have to download the gigabytes and gigabytes required for a full Chromium source tree... because would make that mistake, right? \*cough\*

The primary use-case for CEF is embedding Chromium into the GUI of other projects (Chromium is a Real Life browser after all), but it also supports off-screen rendering. Essentially, this means CEF can render the visuals of a page to a block of memory which can be subsequently copied to a user's own surface... or no where (hint: that's us!). Another big plus is that CEF has C# bindings!

## Xilium.CefGlue

[Xilium.CefGlue](http://xilium.bitbucket.org/cefglue/) is one of the two available C# bindings for CEF. The other one is [CefSharp](https://github.com/cefsharp/CefSharp). CefSharp and CefGlue seem to be pretty similar, but I chose Xilium.CefGlue because I found it easier to get the demos up and running.

It took me a while to figure out exactly how to use CefGlue without a window but I finally found a solution that works. Truth be told, I was stuck for the longest time on an unrelated problem: Visual Studio's hosting process for was making the secondary processes hang.

**Note:** I am using Xilium.CefGlue, also known as Xilium.CefGlue/3 which references CEF3 (multi-process Chromium). This is not to be confused with CefGlue/1. [More on CEF1 vs. CEF3](http://code.google.com/p/chromiumembedded/wiki/Architecture).

To show you how to use CEF in a headless environment, follow these steps.

## Getting the Dependencies

CefGlue works by loading the native CEF code (and other dependencies) at runtime. It runs some checks to make sure it is working with the correct version of CEF. 

### Get CefGlue

At the time of writing this article, the latest revision of CefGlue is <code class="inline">de605d27eab0</code>. The source can be easily downloaded from Bitbucket:

[Xilium.CefGlue @ de605d27eab0](https://bitbucket.org/xilium/xilium.cefglue/get/de605d27eab09e7d2c0dffb9eba89dbe32b6ebef.zip)

### Get Chromium Embedded Framework (CEF)

The version of CEF associated with this revision of CefGlue is 3.1650.1522 (despite what the [CefGlue webpage](http://xilium.bitbucket.org/cefglue/) says). It seems that the 32-bit version is the supported version. I have not tried the 64-bit. A build of the proper CEF version can be downloaded from Adobe's great [CEF 3 Builds](http://cefbuilds.com/) website:

[CEF 3.1650.1522, Windows 32-bit](https://cefbuilds.s3.amazonaws.com/1650/win/31.0.1650.39/cef_binary_3.1650.1522_windows32.7z)

If you want use the latest version of CefGlue, take a look at [**version.g.cs**](https://bitbucket.org/xilium/xilium.cefglue/src/tip/CefGlue/Interop/version.g.cs) in the Xilium.CefGlue repository to find the associated CEF version:

- <code class="inline">CEF_REVISION</code> refers to the revision number (e.g. **1522** in 3.1650.1522).
- <code class="inline">CHROME_VERSION_BUILD</code> refers to the minor number (e.g. **1650** in 3.1650.1522).

## Prepare the Dependencies

### Build CefGlue

CEF comes pre-built but you'll have to build CefGlue on your own. This is really easy.

1. Extract the Xilium.CefGlue source that you downloaded above.
2. Open **Xilium.CefGlue.sln** in Visual Studio. I used Visual Studio 2013.
3. Change the solution configuration to **Release**.
4. Change the solution platform to **x86**.
5. Build the solution. You'll notice some build failures because the <code class="inline">CefGlue.Demo.GtkSharp</code> doesn't have all of it's dependencies. That's okay. All you need is the output from the <code class="inline">CefGlue</code> project.

### Extract CEF

First, extract the CEF. If you downloaded the .7z file, you need to use [7-Zip](http://www.7-zip.org/). The CEF binary distribution comes with a lot of different files. For simplicity, you'll need the following:

- The entire contents of the **Resources** directory.
- The entire contents of the **Release**, except for **libcef.lib**.

All of these files need to be placed in the same directory as the .NET executable using CefGlue (i.e. **Xilium.CefGlue.dll**).

If you want to trim down the dependencies, look at CEF's [README.txt](http://code.google.com/p/chromiumembedded/source/browse/trunk/cef3/tools/distrib/win/README.redistrib.txt).

### (optional) Test CefGlue

If you want to make sure that your CefGlue build is working, you can try running the <code class="inline">CefGlue.Demo.WinForms</code> project. But first, you need to put CEF itself in place!

1. Copy all of the files mentioned in the **Extract CEF** section above into the output directory:
   <code class="inline">xilium-xilium.cefglue-de605d27eab0\CefGlue.Demo.WinForms\bin\x86\Release</code>
2. Run **Xilium.CefGlue.Demo.WinForms.exe**.

You should see a browser-lookin' thing. With really crappy UI. Clearly written by an engineer.

## Using Headless CefGlue

Before you can start coding, get your project ready.

1. Create a C# console application project in Visual Studio.
2. **Important:** [disable Visual Studio hosting process](http://msdn.microsoft.com/en-us/library/ms185330.aspx). I had a lot of trouble getting the <code class="inline">CefBrowser</code> instances to work while this feature was enabled.
3. Reference the **Xilium.CefGlue.dll** assembly that you build.
    1. Right-click on **References** in your solution explorer.
    2. Click **Add Reference...**
    3. Depending your version of Visual Studio, browse for an assembly and then select the **Xilium.CefGlue.dll** assembly that you built.
4. Please all of the CEF dependencies (as mentioned in **Extract CEF** above) in your projects output folder.

Now we're ready to go. Here is a snippet of code that will show you how to use CEF off-screen (i.e. headless, no UI). For the sake of this example, I wrote a little console application that saves a screenshot of Reddit's front page. I've heavily commented the code of the <code class="inline">Main</code> to explain what everything is doing. For the full project with all dependencies, download my example project:

[OffScreenCefGlue.zip]({% attachment OffScreenCefGlue.zip %})

It is relatively simple at this point to [look at the DOM](https://groups.google.com/forum/#!topic/cefglue/dr2kYfoovZI), run arbitrary JavaScript, dump the source for a page, or do whatever else you want for screen scraping or web crawling.

Happy hacking!

{% highlight csharp %}
internal class Program
{
    private static void Main(string[] args)
    {
        // Load CEF. This checks for the correct CEF version.
        CefRuntime.Load();

        // Start the secondary CEF process.
        var cefMainArgs = new CefMainArgs(new string[0]);
        var cefApp = new DemoCefApp();

        // This is where the code path divereges for child processes.
        if (CefRuntime.ExecuteProcess(cefMainArgs, cefApp) != -1)
        {
            Console.Error.WriteLine("Could not the secondary process.");
        }

        // Settings for all of CEF (e.g. process management and control).
        var cefSettings = new CefSettings
        {
            SingleProcess = false,
            MultiThreadedMessageLoop = true
        };

        // Start the browser process (a child process).
        CefRuntime.Initialize(cefMainArgs, cefSettings, cefApp);

        // Instruct CEF to not render to a window at all.
        CefWindowInfo cefWindowInfo = CefWindowInfo.Create();
        cefWindowInfo.SetAsOffScreen(IntPtr.Zero);

        // Settings for the browser window itself (e.g. enable JavaScript?).
        var cefBrowserSettings = new CefBrowserSettings();

        // Initialize some the cust interactions with the browser process.
        // The browser window will be 1280 x 720 (pixels).
        var cefClient = new DemoCefClient(1280, 720);

        // Start up the browser instance.
        CefBrowserHost.CreateBrowser(
            cefWindowInfo,
            cefClient,
            cefBrowserSettings,
            "http://www.reddit.com/");

        // Hang, to let the browser to do its work.
        Console.WriteLine("Press a key at any time to end the program.");
        Console.ReadKey();

        // Clean up CEF.
        CefRuntime.Shutdown();
    }
}
{% endhighlight %}
