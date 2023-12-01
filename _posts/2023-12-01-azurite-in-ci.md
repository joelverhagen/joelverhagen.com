---
category: Programming
layout: post
tags:
- Azure
- storage
- emulator
- continuous
- integration
- CI
title: Run Azurite in CI for Azure Storage integration testing
---

In [my previous post](https://www.joelverhagen.com/blog/2023/11/azurite-in-memory), I talked about how I introduced an
"in-memory" mode for Azurite for the 3.28.0 release. The reason I made this OSS contribution to Azurite was that I
wanted to simplify the clean-up for testing in [NuGet Insights](https://github.com/NuGet/Insights) and improve test
runtime by eliminating unnecessary disk persistence.

In this post, I'll share how you can start Azurite in your continuous integration (CI) run so that you can run
integration tests against it. This is very useful when your code integrates with Azure Storage APIs (blobs, queues,
tables) and you want to exercise a full integration test with Azure Storage each time your tests run. This is in
contrast, or in addition to, mocking or stubbing your data access layer and never hitting a real Azure Storage endpoint
in your tests.

In NuGet Insights, my pet project, there are a bunch of integration tests that hit real NuGet.org endpoints to fetch
package metadata or package content and then store results in Azure Storage. For every code change in the project, I
want these integration tests with Azure Storage to run so I have high confidence that the whole system is working as
expected.

## Sample CI build definitions

I have used both GitHub Actions and Azure Pipelines (Azure DevOps) for CI so I'll link samples for both.

- **Azure Pipelines** (Azure DevOps):
  [`.pipelines/test.yml`](https://github.com/joelverhagen/azurite-sample/blob/cc194e27278f259aadcc75b12365ead0a4ffb043/.pipelines/test.yml#L32-L40)
- **GitHub Actions**:
  [`.github/workflows/test.yml`](https://github.com/joelverhagen/azurite-sample/blob/7e755f2eeb6c58487cb5c04a503ae2a5ae03b6d7/.github/workflows/test.yml#L37-L46)

But the general steps to use Azurite in your CI run should translate easily to any CI service. I tested this on Ubuntu,
macOS, and Windows but should work on any platform supporting Azurite. You probably just need to make sure Node.js is
installed on your CI build agent.

## Install Azurite

Azurite has several ways it can be installed and run, but the easiest I've found is running it via `npx`. The npx tool
is a package runner bundled with Node.js's npm package manager. For this to work, your CI build agents need to have a
non-ancient version of npm installed. Pretty much every CI service I have seen has Node.js and npm pre-installed.

So first, run this command.

```
npx --yes --loglevel info azurite --version
```

This will tell npx to execute the `azurite` package, confirm installation via `--yes`, and immediately run the
`--version` option of Azurite. I also have `--loglevel info` because this command can take a bit of time to run
sometimes (5 seconds to 1 minute depending on the platform) so I want to see some installation progress.

I picked the `--version` option because I didn't want to actually start Azurite yet. I just wanted to get Azurite fully
installed by npx in preparation for the next step.

## Start Azurite as a background process

Now that Azurite is installed, you'll want to start Azurite as a background process. I found the easiest way to do this
reliably across multiple CI services is using the bash `&` operator at the end of the command, which starts the npx
process with the given arguments but doesn't block on the process lifetime, allowing the build to continue on to the
next step.

```
npx --yes azurite --silent --inMemoryPersistence &
```

Note that the bash execution of a command might be challenging on a Windows CI agent. Fortunately, both GitHub Actions
and Azure Pipelines support commands in bash even on Windows.

The `--silent` option makes Azurite not write request logs to stdout. Request logs are probably not desired because the
stdout pipe attached to the Azurite process will not be valid once this "start" build step completes (depending on the
CI implementation). The `--inMemoryPersistence` option makes Azurite only store data in the memory of the CI agent.
Nothing will be written to disk ensuring that the disk space on the CI agent doesn't get used. It will also make blob
and queue operations faster.

The output of Azurite starting up looks something like this:

```
In-memory extent storage is enabled with a limit of 8191.78 MB (8589699072 bytes, 50% of total memory).
Azurite Blob service is starting at http://127.0.0.1:10000
Azurite Blob service is successfully listening at http://127.0.0.1:10000
Azurite Queue service is starting at http://127.0.0.1:10001
Azurite Queue service is successfully listening at http://127.0.0.1:10001
Azurite Table service is starting at http://127.0.0.1:10002
Azurite Table service is successfully listening at http://127.0.0.1:10002
```

From my experience, Azurite starts very quickly due to the separate install step mentioned above. It's possible that if
Azurite is slow to start you may want a step to poll for the storage ports opening up (10000 for blob, 10001 for queue,
100002 for table).

I did this in NuGet Insights with a
[`Wait-ForStorageEmulator.ps1`](https://github.com/NuGet/Insights/blob/2c7e4636594a6fff21d7360e7cf4a083bc734e9c/scripts/Wait-StorageEmulator.ps1)
PowerShell script (`pwsh` on macOS/Linux) but I haven't seen it be necessary, especially considering most Azure SDKs
have retry policies on TCP connection errors allowing your tests to be resilient to a slow Azurite startup.

## Run your tests

Now that Azurite is up and running, you can have your tests connect to Azurite and do their thing. In the .NET Azure
SDKs, the `UseDevelopmentStorage=true` connection string can be used which uses the same hostname and port defaults as
Azurite. Alternatively, you can use the full connection string:

```
DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;
```

In C# using the Azure.Storage.Blobs SDK package, a simple test might look like this:

```csharp
// arrange
string connectionString = "UseDevelopmentStorage=true";
BlobServiceClient client = new BlobServiceClient(connectionString);
BlobContainerClient container = client.GetBlobContainerClient("foo");
await container.CreateAsync();
BlobClient blob = container.GetBlobClient("myblob");

// act
string expected = "my blob content";
await blob.UploadAsync(new BinaryData(expected));

// assert
BlobDownloadResult actual = await blob.DownloadContentAsync();
Assert.Equal(expected, actual.Content.ToString());
```

This is obviously too simple since it's just testing the Azure SDK itself. In reality, you would call your own code that
internally interacts with Azure Storage and then assert against the data that is produced (perhaps by running a "get
blob" or "list blobs" operation on the blob container).

Some things to try if you're having flaky tests with Azurite:

1. Consider prefixing your container entities (blob container, queue, table) with a random string. This allows parallel
   test execution of multiple tests interacting with storage. This test parallelism is done by default in some test
   runners. In NuGet Insights, we prefix all of the containers with `t` + `yyMMdd` (date) + 10 bytes encoded as base32,
   e.g. `t231201ijjvrleck5quivsm`.
2. A high degree of parallelism can result in the Azurite process getting overloaded and requests timing out. It
   probably depends on how powerful your test agent hardware is.
3. If the CI service runs multiple test agents on a single node, you can get conflicts on the default Azurite ports.
   This could be mitigated by overriding the ports used by Azurite or using `--blobPort 0`, `--queuePort 0`,
   `--tablePort 0` and parsing the system-selected port numbers from stdout to be used in your test setup.

## Test clean-up?

You don't need to worry about it!

The CI systems I have worked with automatically terminate orphan processes at the end of each build. The Azurite `node`
process still running at the end of your CI run will be detected and killed by the CI agent software. When the process
is terminated, all of the Azure Storage state that your tests accumulated will be blown away. Easy!

If you're not using GitHub Actions or Azure Pipelines, it might be worth confirming that orphan processes are indeed
killed. Here are some logs from GitHub Actions in the automatically executed "Complete job" step showing clean-up is
handled automatically.

```
Cleaning up orphan processes
Terminate orphan process: pid (1993) (dotnet)
Terminate orphan process: pid (2066) (dotnet)
Terminate orphan process: pid (2085) (dotnet)
Terminate orphan process: pid (2150) (npm exec azurite --silent --inMemoryPersistence)
Terminate orphan process: pid (2162) (sh)
Terminate orphan process: pid (2163) (node)
```

If you don't see this, you could find and kill the process using CLI commands.
