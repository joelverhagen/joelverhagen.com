---
category: Programming
layout: post
tags:
- C#
- Azure
- Functions
- Consumption
- Performance
- Buffers
title: Disk write performance on Azure Functions
---

## Introduction

For one of my side projects, I've used the disk available on Azure Functions for temporary storage. Some code that
processes .NET `Stream` objects requires a seekable stream. If you are downloading bytes from a remote endpoint, e.g.
the response body by an HTTP request, the stream will not be seekable.

If the stream is small enough, it can fit in memory, such as in a `MemoryStream`. But what if you're in an enviroment
that has rather limited memory or what if the data is just too large to fit in memory? Well, in such a case using a
`FileStream` or some of the stream based on a persistent store is required.

In my case, I am unzipping ZIP files
([requires a seekable stream](https://github.com/dotnet/runtime/blob/56d0eb94ec83473d99c1050072a224da327bc02a/src/libraries/System.IO.Compression/src/System/IO/Compression/ZipArchive.cs#L141-L147))
and reading assembly metadata using `System.Reflection.Metadata`
([requires a seekable stream](https://github.com/dotnet/runtime/blob/56d0eb94ec83473d99c1050072a224da327bc02a/src/libraries/System.Reflection.Metadata/src/System/Reflection/PortableExecutable/PEReader.cs#L160-L163)).

Also, I am running my code in Azure Functions Consumption plan which
[only has 1.5 GiB of memory](https://docs.microsoft.com/en-us/azure/azure-functions/functions-scale#service-limits)
so data I'm working with often exceeds the memory limits, especially when a single Azure Function node is handling
multiple function invocations.

The disk space on Azure Functions Consumption plan for Windows is a bit strange. The disk that is local to the node
running your function (not shared with other nodes) seems to have roughly 500 MiB of disk space from my experiments.
However when you provision a Consumption plan Function App, you also get an Azure File Share which allows all of your
function invocations to share a disk as well.

In short, the local disk is fast but very limited. The share is not as fast but nearly unlimited in capacity (5 terrabytes
is the default limit). That's not too surprising though since the Azure File Share is backed by network operations
whereas the local storage is presumably a physical disk available to host running Azure Functions.

The surprising thing is that **the buffer size used when writing to the Azure File Share has huge impact on your write
performance**. In many cases, stream APIs in .NET have default buffer sizes that are not ideal for working with Azure
File Shares, at least in the context of Azure Functions Consumption Plan which is all that I tested.

I've made the following discoveries!

### Avoid using `Stream.CopyToAsync` for big files

Let's talk a bit about the default `Stream.CopyToAsync` method. The default buffer size for .NET Framework is a static
80 KiB. On .NET Core, the copy buffer is fetched from the `ArrayPool<byte>.Shared` pool so it's actually 128 KiB
([proof](https://dotnetfiddle.net/BAL8b6)). This is a pretty small buffer considering a network operation may need to be
performed every time data is written to a Azure File Share.

Consider an alternative where you perform the `ReadAsync` then `WriteAsync` yourself. This allows you to use any buffer
size you want and even perform additional tasks on the buffered bytes, such as hash/checksum calculation.

In this chart, you can see that a 1 MiB buffer improves the write performance by over 4 times!

<img class="center" src="{% attachment 1-mib-vs-copytoasync.png %}" width="700" height="445" />

### Bigger buffers are better, but don't go crazy

### Call `SetLength` on the destination steam

### Use `%TEMP%` if you can, fall back to `%HOME%`

### Use a buffer larger than the `FileStream` internal buffer

This is a small thing, avoiding a bit of unnecessary copying and allocation.

When the buffer provided to `FileStream.WriteAsync` exceeds the length of the internal `FileStream`
buffer, this skips an internal buffering operation ([source](https://github.com/dotnet/runtime/blob/39afd1f46f8f03582b0414591ff7a1e2f1809979/src/libraries/System.Private.CoreLib/src/System/IO/FileStream.Windows.cs#L982)).
As you saw below, bigger buffers are better so the default buffer size of 4096 bytes
([source](https://github.com/dotnet/runtime/blob/39afd1f46f8f03582b0414591ff7a1e2f1809979/src/libraries/System.Private.CoreLib/src/System/IO/FileStream.cs#L18))
should be always be bypassed. As a little bonus this eliminates the unnecessary allocation of that buffer and you can
pool your write buffer with something like [`ArrayPool<byte>.Shared`](https://docs.microsoft.com/en-us/dotnet/api/system.buffers.arraypool-1.shared?view=netcore-3.1).

#### `WriteAsync` buffer is smaller than `FileStream` buffer

<img class="center" src="{% attachment filestream-buffer-less.png %}" width="700" height="317" />

#### `WriteAsync` buffer is larger than `FileStream` buffer

<img class="center" src="{% attachment filestream-buffer-less.png %}" width="700" height="317" />

Note the ~100 MiB difference the allocation, causes by the internal buffer in `FileStream`.