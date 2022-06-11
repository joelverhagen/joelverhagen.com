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

This post is part of my Advanced Azure Functions series (thanks for the idea, [Loïc](https://twitter.com/loicsharma)!)

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

Right now, it uses Azure Functions App Service Plan P1v2 SKU to crunch the data and analyze NuGet packages. I'd like to
cut down on the Azure bill and reduce the compute costs.

To do this, I figured out how to run Azure Functions on Azure virtual machine scale sets with spot VMs (low priority).
By doing this I cut my compute costs by over 90%!

## Initial idea

At first, I didn't know how to even run an Azure Functions app and went down the route of automating the installation of
the [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local) on a VM.
Even at the beginning, I was concerned about this approach because it was not clear to me that the development runtime
has fully compatible features or analogous performance as the runtime running in Azure. Also, the installer for this
brings along all sorts of extra stuff I don't need for runtime.

Fortunately, I stumbled upon the [Dockerfile for running an Azure Function on Windows
Docker](https://github.com/Azure/azure-functions-docker/blob/3.8.0/host/3.0/nanoserver/1909/dotnet.Dockerfile) and this
gave me the hint I needed. This told me two critical things:

1. The [Azure/azure-functions-host](https://github.com/Azure/azure-functions-host) repository is enough to host a
   Functions App in-process.
1. The `AzureWebJobsScriptRoot` variable is where the host looks for the app.

All I had to was get the host and the app running on VMSS nodes and then I was in business!

## Implementation

**⚠️ Warning!** This experiment of mine is **NOT** production-ready and certainly has all sorts of undiscovered caveats.
Try it out at your own risk. I offer zero warranty! 

For those that just want to look at the code, I'll skip the design considerations. Take a look. I've implemented a
sample repository so that you can see it in action and even try it in your Azure subscription:
[joelverhagen/az-func-vmss](https://github.com/joelverhagen/az-func-vmss).

[![Deploy to
Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fjoelverhagen%2Faz-func-vmss%2Fv0.0.2%2Fbicep%2Fspot-workers.deploymentTemplate.json)

These are the resources that get deployed:

<img class="center" src="{% attachment resources.png %}" width="622" height="323" />

On the Load Balancer resource (or in the Azure deployment Outputs), you'll find a domain name which points to the HTTP
(port 80) endpoints on your instances.

```
PS C:\Users\joelv> http http://foo.westus.cloudapp.azure.com/api/hello -v
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Date: Sat, 11 Jun 2022 02:46:22 GMT
Server: Kestrel
Transfer-Encoding: chunked

Hello from VMSS instance app000000, running as win10-x64!
MyTestSetting = 'foo'
```

<img class="center" src="{% attachment load-balancer.png %}" width="651" height="466" />

Here are some notable files:

- Compile and zip the Azure Functions host:
  [`Build-Host.ps1`](https://github.com/joelverhagen/az-func-vmss/blob/main/scripts/Build-Host.ps1)
- Main Bicep template:
  [`spot-workers.bicep`](https://github.com/joelverhagen/az-func-vmss/blob/main/bicep/spot-workers.bicep). Check out the
  parameters.
- Copy deployment files to storage:
  [`Set-DeploymentFiles`](https://github.com/joelverhagen/az-func-vmss/blob/main/scripts/Set-DeploymentFiles.ps1).
- Install the host on the VMSS instance:
  [`Install-Standalone.ps1`](https://github.com/joelverhagen/az-func-vmss/blob/main/scripts/Install-Standalone.ps1).

For details on my various design decisions, see the **Design** section below.

## Cost savings

When I tested this solution for my NuGet.Insights project, **I cut my compute costs by 92%!**

In the test, I ran two versions of NuGet.Insights and executed 4 big analysis jobs per variant. The analysis jobs were:
load all ZIP and signature metadata into Table storage, load all .nuspec files into Table Storage, analyze package
assets, and analyze .nuspec metadata.

### Running on App Service Plan

My previous compute option was using up to 30 instances of `P1v2` App Service Plan for running Azure Functions.

- **Total runtime:** 9 hours, 7 minutes
- **Service name:** Azure App Service
- **Service tier:** Premium v2 Plan
- **Meter:** P1 v2
- **Cost:** $26.47 (USD)

### Running on Spot VMSS

I used the `Standard_D2ds_v4` in the `westus2` region with Spot priority.

- **Total runtime:** 5 hours, 34 minutes
- **Service name:** Virtual Machines
- **Service tier:** Dav4/Dasv4 Series Windows
- **Meter:** D2a v4/D2as v4 Low Priority
- **Cost:** $1.96 (USD)

It other words, the compute work was completed more quickly and it was cheaper. This make sense since `P1v2` is single
core machine and a `Standard_D2ds_v4` is a two core machine and Spot VMs main claim to fame is being much cheaper.

### Other costs

Other peripheral costs for running my NuGet.Insights project include Azure Storage, an App Service Plan for an admin
site, a single Azure Function instance for emitting metrics, and bandwidth (talking to NuGet.org public APIs). These
numbers were pretty much the same (give or take $0.05) between the two variants.

## Motivation

Fundamentally, I am interested in the *framework* that Azure Functions provides: .NET Core host, the notion of triggers
as an entry point, and a rich collection of useful built-in primitives like timers. I care a bit less about the huge
variety of hosting options that Azure Functions has: Consumption Plan vs. App Service Plan, Docker images vs. ZIP
publish. Originally, the project used a Windows P1v2 App Service plan for hosting and ARM-based ZIP deployment.

In the end, **I want to run my code on Azure Functions and I want to do it as cheaply as possible.**

A couple of months ago I discovered [Azure Spot VMs](https://azure.microsoft.com/en-us/services/virtual-machines/spot/).
These are low-priority VMs potentially available in all of the same VM SKUs that are typically offered in a region but
they are billed at a greatly reduced cost (sometimes 5-10% of the normal price). The catch is that there is no guarantee
any specific SKU is available at any time and your VM instance may be evicted at any time with short notice as demand
increases in that region. So, they're cheap VMs but you may get evicted at any time.

**Spot VMs are a great match for stateless, worker roles like Azure Functions queue triggers if you are tolerant of
evictions from time to time.**

My NuGet.Insights project automatically processes new NuGet packages published to NuGet.org every couple of hours via a
[timer trigger](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer). If it runs a bit
slower due to VM evictions or completely fails to run for half a day here or there it's not a big deal, especially
considering the potential cost savings.

Some services in Azure can run directly on spot VMs, passing the savings directly on to you, e.g.

- Individual VMs (not surprising, this is the based offering)
- VM scale sets (VMSS, this is what we'll use)
- Azure Kubernetes Service (AKS)

I would love to use AKS but [Windows workloads don't support managed
identities](https://docs.microsoft.com/en-us/azure/aks/operator-best-practices-identity#use-pod-managed-identities).
NuGet.Insights needs Windows for at least two of the package analyzers so it's a non-starter for me. 

I also consider Azure Container Apps but they [don't support
Windows](https://github.com/microsoft/azure-container-apps/issues/181) and, as far as I can tell, don't support Spot VMs
either.

With this knowledge in mind, I selected VMSS as my compute option and figured out how to deploy and run Azure Functions
there.

## Design

We'll invoke the `WebJobs.Script.WebHost` project from
[Azure/azure-functions-host](https://github.com/Azure/azure-functions-host) using the .NET runtime. We'll use
environment variables to point the host to our Functions app as well as define custom configuration for our app.

### VM SKU

Currently, the `Standard_D2as_v4` is cheap right now (May 2022) and seems to be available a lot of the time in the Azure
regions I run my experiments in (`westus`, `westus2`, `westus3`). You can pick whichever SKU you want but this seemed
like a great balance between computing power, cost, and availability.

### VM image

With VMSS, you can choose a Microsoft or 3rd party provided VM image or you can build your own with all of your code
pre-bundled.

I found that it was much easier to use a base image (e.g. `2022-datacenter-core-smalldisk`) and install everything
needed for the app using
[`CustomScriptExtension`](https://docs.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-windows). 

An alternative approach would be to use [Azure Image
Builder](https://docs.microsoft.com/en-us/azure/virtual-machines/image-builder-overview) to bundle up a VM image with
the Azure Functions host, app, and even configuration baked in. I avoided this approach since I found that the
end-to-end VM provisioning and `CustomScriptExtension` installation flow is relatively fast (3-5 minutes) so it doesn't
seem worth the effort to produce and store custom VM images.

### Ephemeral OS disk

For stateless apps (which Azure Functions is an example of), Azure VMs have an option for an [ephemeral OS
disk](https://docs.microsoft.com/en-us/azure/virtual-machines/ephemeral-os-disks). The benefit of using an ephemeral OS
disk is that you don't pay for the storage (it's included in the base VM cost).

One of the tricky parts of using an ephemeral OS disk is that it has two placement options: `CacheDisk` (OS cache
placement) or `ResourceDisk` (temp disk placement). I don't fully understand the trade-offs between these options since
my own very superficial performance measurements with [`diskspd`](https://github.com/microsoft/diskspd) yielded similar
performance numbers.

Many of the cheaper SKUs only have one or the other placement options having a size large enough to hold a Windows
Server VM image (which is 30 GB with the
[`smalldisk`](https://azure.microsoft.com/en-us/blog/new-smaller-windows-server-iaas-image/) variants).

For example, `Standard_D2a_v4` has no cache disk and a resource disk of 50 GB. This means if you try to deploy with the
`CacheDisk` placement option the initial deployment validation will just fail. 

`Standard_D2as_v4` on the other hand has a cache disk of 50 GB and a resource disk of 16 GB. That means for a VM image
of 30 DB you *must* pick the `CacheDisk`.

For a SKU like `Standard_D2ds_v4` with a cache disk of 50 GB and resource disk of 75 GB, you can pick either one you
want.

You can check on all VM SKU capabilities for this by looking that the `CachedDiskBytes` and `MaxResourceVolumeMB`
capabilities reported by the `az vm list-skus` commands (or in my GitHub data file
[vm-skus.csv](https://github.com/joelverhagen/data-azure-spot-vms/blob/main/vm-skus.csv)).

To encapsulate this decision into an ARM template, I've built this [lookup
table](https://github.com/joelverhagen/az-func-vmss/blob/6e77ea7cca46ec2fb5b3c93905f09ac8256450d0/bicep/spot-worker.bicep#L331)
which simply picks the larger of the two placement options so all you need to do is pick the SKU and forget about the
rest.

### Deployment via Bicep

We'll be using Bicep to define all of the resources needed (which is not just one... VMSS requires a bit of scenery to
work).

The files needed for `CustomScriptExtension` will be downloaded from provided URLs (publicly accessible or Blob Storage
URLs with SAS tokens) and copied into a dedicated Blob Storage container via a [deployment script
resource](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-script-template).

### Installation on the VM

This installation logic will be executed by a PowerShell script invoked by the
[`CustomScriptExtension`](https://docs.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-windows).
`CustomScriptExtension` will ensure all of the needed files are delivered to the VM and the executed script will extract
and shuffle the files as needed.

Since we're using a base Windows Server VM image, .NET 5+ is not guaranteed to be installed so we'll use
[`dotnet-install.ps1`](https://docs.microsoft.com/en-us/dotnet/core/tools/dotnet-install-script).

To ensure the Azure Functions host runs as a singleton and restarts when the VM instance reboots, we'll add a [Scheduled
Task](https://docs.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page) to launch the app.

The scheduled task will invoke a PowerShell script that sets up the proper environment variables and launches
`dotnet.exe`, pointing at the Azure Functions host.

### VMSS auto-scaling

One of the great value propositions of Azure Functions Consumption plan is that auto-scaling based on load is handled
for you. With this VMSS-based solution, we'll need to do auto-scaling ourselves or settle on a fixed number of
instances.

I opted to create a basic auto-scaling rule based on CPU counters:

- Scale-out (add) by 5 instances when the average CPU exceeds 25%.
- Scale-in (remote) by 10 instances when the average CPU drops below 15%.

I didn't put too much thought into these rules but for my use case, they worked well enough. If I was running on AKS, I
would probably try out something like [KEDA](https://keda.sh/).

### HTTP triggers

If you use an HTTP trigger then your app very likely needs to be accessible to the internet (or at least a virtual
network) so you have to think about routing incoming traffic to one of the VMSS nodes.

The approach I used here was adding an Azure Load Balancer resource which is a layer 4 load balancer. You can integrate
a Load Balancer (LB) with VMSS such that connections are distributed across all VMSS nodes.

If you don't have any HTTP triggers and just process queue messages or run on a timer, you don't need a load balancer at
all and no incoming traffic needs to be allowed to your nodes.

## Things not implemented

### Azure Metadata Service - scheduled events

As the VMSS scales in (reduces instances) or your Spot VMs get evicted, it would be great to attempt a graceful shutdown
on the Azure Functions host. I believe this can be achieved by querying the [Azure Metadata Service for scheduled
events](https://docs.microsoft.com/en-us/azure/virtual-machines/windows/scheduled-events). For any worker role that is
processing a queue message, this can be ideal the dequeuer (your app) can learn of an upcoming shutdown event and
gracefully release the handle (or lease) on some queue message. This can lead to better message processing since the
maximum lease duration will not need to be exhausted by those queue messages that were not yet completed by the
shutting-down worker.

### Region or SKU unavailability

Suppose you are using Azure Spots VMs and your region + SKU combination is no longer available, perhaps due to capacity
constraints in that region. Well, it would be great to have another region + SKU combination spin up automatically so
that your Functions app is still running. There's some nuance to this problem because it suggests we likely need some
dedicated compute to perform such orchestration. Also choosing different regions may impact latency between your workers
and any storage or persistence layer you have (e.g. an Azure Storage account). Also, the price of VMs varies from region
to region.
