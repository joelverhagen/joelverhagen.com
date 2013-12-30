---
category: Snippets
layout: post
tags:
- C#
- Screen Scraping
- Chromium
title: Visiting the DOM with CefGlue
---
## tl;dr

Take a look at [the whole example project]({% attachment CefGlueDomVisitor.zip %}). I wrote it to be as self-explanatory as possible. This code uses the same versions of all of the dependencies as my [previous CEF post](/blog/2013/12/headless-chromium-in-c-with-cefglue/).

## Instructions

**This post is a follow-up on [a previous post](/blog/2013/12/headless-chromium-in-c-with-cefglue/).** If you are not familiar with CefGlue, then you should probably go read that post first!

[A commenter](http://joelverhagen.com/blog/2013/12/headless-chromium-in-c-with-cefglue/#comment-1175654010) on my previous CefGlue post mentioned that the example I linked to about visiting the WebKit DOM (i.e. the actual in-memory tree) was not very helpful. Well, maybe there's something I can do about it! I whipped together a fun little demo which dumps the top 30 [Hacker News](https://news.ycombinator.com) titles to a text file.

The main difficulty when accessing a rendered page's DOM is that you can only do so in the same process as the associated renderer for that page. Remember, Chromium (and by extension, CEF and CefGlue) use multiple processes to run the browser. Therefore, the basic flow that you will have to follow is:

1. Send a <code class="inline">CefProcessMessage</code> to the renderer process.
2. Recieve the message in the render process.
3. Point a <code class="inline">CefDomVisitor</code> to a <code class="inline">CefFrame</code>.

## Send the Message

To send a message to a renderer process, you need a reference to a <code class="inline">CefBrowser</code> instance. This can be easily obtained from the <code class="inline">OnLoadEnd</code> callback in your <code class="inline">CefLoadHandler</code> subclass. Remember, you inject this specific handler in your <code class="inline">CefClient</code> subclass.

This will basically get the ball rolling by queuing another process to get'r'done.

{% highlight csharp %}
internal class DemoCefLoadHandler : CefLoadHandler
{
    protected override void OnLoadEnd(CefBrowser browser, CefFrame frame, int httpStatusCode)
    {
        browser.SendProcessMessage(
            CefProcessId.Renderer,
            CefProcessMessage.Create("GetHackerNewsTitles")
        );
    }
}
{% endhighlight %}

Note the <code class="inline">CefProcessId.Renderer</code> bit. This directs the destination of the message.

## Recieve the Message

To recieve the message, you need to override the <code class="inline">GetRenderProcessHandler</code> method on your <code class="inline">CefApp</code> subclass. The method requires that a <code class="line">CefRenderProcessHandler</code> is returned. This means you need to create your own subclass and override the <code class="inline">OnProcessMessageReceived</code> method.

{% highlight csharp %}
internal class DemoCefApp : CefApp
{
    private readonly DemoCefRenderProcessHandler _renderProcessHandler;

    public DemoCefApp()
    {
        _renderProcessHandler = new DemoCefRenderProcessHandler();
    }

    protected override CefRenderProcessHandler GetRenderProcessHandler()
    {
        return _renderProcessHandler;
    }
}

internal class DemoCefRenderProcessHandler : CefRenderProcessHandler
{
    protected override bool OnProcessMessageReceived(CefBrowser browser, CefProcessId sourceProcess, CefProcessMessage message)
    {
        // this code gets run in the renderer process
    }
}
{% endhighlight %}

## Visit the DOM

Inside the <code class="inline">OnProcessMessageReceived</code> method, point a <code class="inline">CefDomVisitor</code> instance to a frame. In most cases, you will be pointing the visitor to the main frame (<code class="inline">browser.GetMainFrame()</code>)

{% highlight csharp %}
internal class DemoCefRenderProcessHandler : CefRenderProcessHandler
{
    protected override bool OnProcessMessageReceived(CefBrowser browser, CefProcessId sourceProcess, CefProcessMessage message)
    {
        if (message.Name == "GetHackerNewsTitles")
        {
            CefFrame mainFrame = browser.GetMainFrame();
            mainFrame.VisitDom(new DemoCefDomVisitor());
            return true;
        }

        return false;
    }
}

internal class DemoCefDomVisitor : CefDomVisitor
{
    protected override void Visit(CefDomDocument document)
    {
        File.WriteAllLines(
            "HackerNewsTitles.txt",
            GetHackerNewsTitles(document.Root)
        );
    }

    private IEnumerable<string> GetHackerNewsTitles(CefDomNode node)
    {
        if (IsHackerNewsTitle(node))
        {
            yield return node.FirstChild.InnerText;
        }

        CefDomNode child = node.FirstChild;
        while (child != null)
        {
            foreach (string title in GetHackerNewsTitles(child))
            {
                yield return title;
            }
            child = child.NextSibling;
        }
    }

    private bool IsHackerNewsTitle(CefDomNode node)
    {
        return
            node.NodeType == CefDomNodeType.Element &&
            node.ElementTagName == "TD" &&
            node.HasAttribute("class") &&
            node.GetAttribute("class") == "title" &&
            node.FirstChild.NextSibling != null;
    }
}
{% endhighlight %}

## Final Notes

I would recommend doing as much work as you can in the render process instead of relaying things back in forth between the process constantly. Although process messages are in-memory, there is still a cost (especially if you are sending large blobs of data).

Also, remember you can use Visual Studio to debug the non-primary CEF processes by [manually attaching your debugger](http://msdn.microsoft.com/en-us/library/3s68z0b3.aspx).
