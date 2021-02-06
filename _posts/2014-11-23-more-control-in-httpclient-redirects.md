---
category: Snippets
layout: post
tags:
- C#
- HTTP
title: Adding More Control to HttpClient Redirects
---

I'm a big fan of the .NET Framework. It's insane how much you can do without ever referencing a library outside of the base framework. One of my favorite additions to .NET 4.5 was the [<code class="inline">HttpClient</code>](http://msdn.microsoft.com/en-us/library/system.net.http.httpclient%28v=vs.110%29.aspx) class... and pretty much everything else in the <code class="inline">System.Net.Http</code> and <code class="inline">System.Net.Http.WebRequest</code> assemblies! Let's just move past the days of <code class="inline">WebClient</code> and just forget it ever happened, hmkay? Now we can <code class="inline">async</code> all the things!

## Motivation

I do have one small gripe about the default behavior of <code class="inline">HttpClient</code>: the way they implemented HTTP redirects. Yes, yes, they work great. All of options to enable, disable, and limit the redirects are available on the [<code class="inline">HttpClientHandler</code>](http://msdn.microsoft.com/en-us/library/system.net.http.httpclienthandler%28v=vs.110%29.aspx) or [<code class="inline">WebRequestHandler</code>](http://msdn.microsoft.com/en-us/library/system.net.http.webrequesthandler%28v=vs.110%29.aspx). La-de-da. Unfortunately, they put all of the logic of redirection at the *lowest* handler level (actually they put the code in <code class="inline">HttpWebRequest</code>, but you're not meant to reference this class directly). Wait, what's wrong with that?

Well, first let's loop around and talk about another great part of <code class="inline">System.Net.Http</code>: delegating handlers ([<code class="inline">DelegatingHandler</code>](http://msdn.microsoft.com/en-us/library/system.net.http.delegatinghandler%28v=vs.118%29.aspx)). These guys allow you to compose a pipeline of operations you'd like to perform on an HTTP request on its way out or an HTTP response on its way in. Custom caching, authentication, logging, special content-type handling, mutate headers, etc. The possibilities are limitless!

What's even better is this delegating handler stuff can be used on both the server side (with ASP.NET MVC and Web API) and client side. If you're interested in reading more about delegating handlers, check out K. Scott Allen's [blog post](http://odetocode.com/blogs/scott/archive/2013/04/04/webapi-tip-7-beautiful-message-handlers.aspx) about 'em.

Now imagine you have a URL the leads through one, two, or [seven](http://www.hanselman.com/blog/ThisURLShortenerSituationIsOfficiallyOutOfControl.aspx) redirects. Also imagine you have a delegating handler set up in your <code class="inline">HttpClient</code> that does some super helpful, super important logging:

{% highlight csharp %}
HttpMessageHandler handler = new EpicLoggingDelegatingHandler
{
    InnerHandler = new WebRequestHandler()
};

var httpClient = new HttpClient(handler);

string url = "http://httpbin.org/redirect/5";
HttpResponseMessage response = httpClient.GetAsync(url).Result;
string content = response.Content.ReadAsStringAsync().Result;
Console.WriteLine(content);
{% endhighlight %}

As mentioned before, the HTTP redirect logic is done at the very lowest C# level. What this means is that a delegating handler you have configured into your HTTP client will only see the very first <code class="inline">HttpRequestMessage</code> and the very last <code class="inline">HttpResponseMessage</code>... and the last <code class="inline">HttpRequestMessage</code> with <code class="inline">myResponse.RequestMessage</code>. None of the messages in between.

Ideally, the redirect would be resolved in a delegating handler. Yes, this would make the most common case (no delegating handlers and the need for browser-like redirects) a little more complicated to wire-up, but the flexibility that comes with wrapping this bit of logic up in a delegating handler has benefits. This would even give a nicely encapsulated means for resolving interesting problems like HTTP 300 Multiple Choices :).

Imagine taking it a step forward and splitting out even more tricky logic currently handled by <code class="inline">HttpWebRequest</code> and putting it in different delegating handlers. Mix, match, compose. Interesting...

## Code

Well, I focused on the problem at hand and implemented a delegating handler that overrides the built-in redirects, allowing you to put redirection anywhere you want in your client pipeline.

For now the code is in [a GitHub Gist](https://gist.github.com/joelverhagen/3be85bc0d5733756befa). If I find myself needing it in a lot of different projects or some of my readers would like it in a more accessible form, I could consider wrapping it up in a NuGet package.

Oh, and by default <code class="inline">RedirectingHandler</code> disables redirection in your inner <code class="inline">HttpClientHandler</code>. There are some other options on the handler that are worth looking at. Also, mad props to Kenneth Reitz's Python [<code class="inline">requests</code>](https://github.com/kennethreitz/requests) library, which I ported for the redirect rules.

## Example

{% highlight csharp %}
HttpMessageHandler handler = new RedirectingHandler
{
    InnerHandler = new WebRequestHandler()
};

var httpClient = new HttpClient(handler);

string url = "http://httpbin.org/redirect/5";
HttpResponseMessage response = httpClient.GetAsync(url).Result;
string content = response.Content.ReadAsStringAsync().Result;
Console.WriteLine(content);
{% endhighlight %}

Have fun!