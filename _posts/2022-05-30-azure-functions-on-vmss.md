---
category: Programming
layout: post
tags:
- C#
- Azure
- Functions
- VMSS
- virtual machine scale set
- spot vm
title: Run Azure Functions on Virtual Machine Scale Sets
---

## Series

This post is part of my Advanced Azure Functions series (thanks for the idea, [Loïc](https://twitter.com/sharmaloic)!)

1. [How to run a distributed scan of Table Storage](../../2020/12/distributed-scan-of-azure-tables) - 10 minute limit
   and Table Storage
1. [Disk write performance on Azure Functions](../../2021/02/azure-function-disk-performance) - use the Azure File Share
   efficiently
2. **Run Azure Functions on Virtual Machine Scale Sets** - this post

## Introduction

My pet project, [NuGet.Insights](https://github.com/NuGet/Insights), uses Azure Functions heavily for all of the data
processing and data aggregating related I need to perform in-depth NuGet package analysis. Each unit of work is captured
as an Azure Queue Storage message and is processed via the Azure Function [Queue
trigger](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue).

Fundamentally, I am interested in the *framework* that Azure Functions provides: .NET Core host, the notion of triggers
as an entry point, a rich collection of useful built-in primitives like timers. I care a bit less about the huge variety
of hosting options that Azure Functions has: Consumption Plan vs. App Service Plan, Docker images vs. ZIP publish.
Originally, the project used a Windows P1v2 App Service plans for hosting and ARM-based ZIP deploy.

In the end, **I want to run my code on Azure Functions and I want to do it as cheaply as possible.**

A couple months ago I discovered [Azure Spot VMs](https://azure.microsoft.com/en-us/services/virtual-machines/spot/).
These are low priority VMs potentially available in all of the same VM SKUs that are typically offered in a region but
they are billed at a greatly reduced cost (sometimes 5-10% of the normal price). The catch is that there is no guarantee
any specific SKU is available at any time and your VM instance may be evicted at any time with a short notice as demand
increases in that region. So, cheap VMs but you may get evicted at any time.

**Spot VMs are a great match for stateless, worker roles like Azure Functions queue triggers if you are tolerant of
evications from time to time.**

My NuGet.Insights project automatically processes new NuGet packages published to NuGet.org every couple of hours via a [timer trigger](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer). If it
runs a bit slower due to VM evitions or completely fails to run for half a day here or there it's not a big deal, especially considering the potential cost savings.

Some services in Azure have the ability to run directly on spot VMs, passing the savings directly on to you, e.g.

- Individual VMs (not surprising, this is the based offering)
- VM scale sets (VMSS, this is what we'll use)
- Azure Kubernetes Service (AKS)

I would love to use AKS this but [Windows workloads don't support managed identities](https://docs.microsoft.com/en-us/azure/aks/operator-best-practices-identity#use-pod-managed-identities). NuGet.Insights needs Windows for at least two of the package analyzers so it's a non-starter for me.

This this knowledge in mind, I selected VMSS as my compute option and figured out how to deploy and run Azure Functions there.

## Investigation

At first, I didn't know how to even run an Azure Functions app and went down the route of automating the installation of the [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local). Even at the beginning I was concerned about this approach because it's not clear to me that the development runtime has fully compatible features or analogous performances as the runtime running in Azure. Also, the installer for this brings along all sorts of extra stuff I don't need for runtime.

Fortunately, I stumbled upone the [Dockerfile for running an Azure Function on Windows Docker](https://github.com/Azure/azure-functions-docker/blob/3.8.0/host/3.0/nanoserver/1909/dotnet.Dockerfile) and this gave me the hint I needed. This told me two critical things:

1. The [Azure/azure-functions-host](https://github.com/Azure/azure-functions-host) repository is enough to host a Functions App.
1. The `AzureWebJobsScriptRoot` variable is where the host looks for the app.

All we have to do is get the host and the app running on VMSS nodes and we'll be in business!

## Design

### VM image

With VMSS, you can choose a Microsoft or 3rd party provided VM images or you can build your own with all of your code pre-bundled. I found that it was 