---
category: Programming
layout: post
tags:
- C#
- .NET
- performance
- csv
- parser
title: The fastest CSV parser in .NET
---

**Latest update:** 2021-08-09, with new versions and libraries (commit [`8fa7626`](https://github.com/joelverhagen/NCsvPerf/tree/8fa762676711dc065a2d0401683828e1b087e095)).

## Specific purpose tested

My goal was to find the fastest _low-level_ CSV parser. Essentially, all I wanted was a library that gave me a `string[]`
for each line where each field in the line was an element in the array. This is about as simple as you can get with a
CSV parser. I don't care about parsing headings or dynamically mapping fields to class properties. I can do all of that
myself faster than reflection with [C# Source Generators](https://github.com/dotnet/roslyn/blob/master/docs/features/source-generators.md), rather trivially.

So if you want a feature-rich library and don't care as much about 1 millisecond vs 10 milliseconds, read no further and
just use [CsvHelper](https://www.nuget.org/packages/CsvHelper/). It's the "winner" from a popularity stand-point and has
good developer ergonomics in my experience. Using an established, popular library is probably the best idea since it's
most battle-tested and has the best examples and Q&A online.

## CSV libraries tested

I tested the following CSV libraries.

- [**Angara.Table**](https://www.nuget.org/packages/Angara.Table) 0.3.3 (with 5.0.2 `FSharp.Core`, 5.0.0 `System.Collections.Immutable`) / [Source code](https://github.com/predictionmachines/Angara.Table)
- [**Cesil**](https://www.nuget.org/packages/Cesil) 0.9.0 / [Source code](https://github.com/kevin-montrose/cesil)
- [**ChoETL**](https://www.nuget.org/packages/ChoETL) 1.2.1.22 / [Source code](https://github.com/Cinchoo/ChoETL)
- **CommonLibrary.NET** ~0.9.8.7 / [Source code](https://archive.codeplex.com/?p=commonlibrarynet)
  - **Note**: I had to fork this package into [Knapcode.CommonLibrary.NET](https://www.nuget.org/packages/Knapcode.CommonLibrary.NET) ([NuGet.org]((https://www.nuget.org/packages/Knapcode.CommonLibrary.NET))) for a NuGet.org distribution and for LF handling.
- [**Csv**](https://www.nuget.org/packages/Csv) 2.0.62 / [Source code](https://github.com/stevehansen/csv)
- [**CSVFile**](https://www.nuget.org/packages/CSVFile) 3.0.2 / [Source code](https://github.com/tspence/csharp-csv-reader) 
- [**CsvHelper**](https://www.nuget.org/packages/CsvHelper) 27.1.1 / [Project site](https://joshclose.github.io/CsvHelper/) / [Source code](https://github.com/JoshClose/CsvHelper) 
- [**CsvTextFieldParser**](https://www.nuget.org/packages/CsvTextFieldParser) 1.2.1 / [Source code](https://github.com/22222/CsvTextFieldParser) 
- [**CsvTools**](https://www.nuget.org/packages/CsvTools) 1.0.12 / [Source code](https://github.com/MikeStall/DataTable) 
- [**Ctl.Data**](https://www.nuget.org/packages/Ctl.Data) 2.0.0.2 / [Project site](http://ctl-global.github.io/data.html) / [Source code](https://github.com/ctl-global/ctl-data/) 
- [**Cursively**](https://www.nuget.org/packages/Cursively) 1.2.0 / [Project site](https://airbreather.github.io/Cursively/index.html) / [Source code](https://github.com/airbreather/Cursively) 
- [**Dsv**](https://www.nuget.org/packages/Dsv) 1.3.1 / [Source code](https://github.com/atifaziz/Dsv) 
- [**FastCsvParser**](https://www.nuget.org/packages/FastCsvParser) 1.1.1 / [Source code](https://github.com/bopohaa/CsvParser) 
  - **Note**: I had to fork this package into [Knapcode.FastCsvParser](https://www.nuget.org/packages/Knapcode.FastCsvParser) to avoid a colliding assembly name.
- [**FileHelpers**](https://www.nuget.org/packages/FileHelpers) 3.5.0 / [Project site](https://www.filehelpers.net/) / [Source code](https://github.com/MarcosMeli/FileHelpers) 
- [**FlatFiles**](https://www.nuget.org/packages/FlatFiles) 4.16.0 / [Source code](https://github.com/jehugaleahsa/FlatFiles) 
- [**FluentCSV**](https://www.nuget.org/packages/FluentCSV/) 3.0.0 / [Source code](https://github.com/aboudoux/FluentCSV/) 
- [**KBCsv**](https://www.nuget.org/packages/KBCsv/) 6.0.0 / [Source code](https://github.com/kentcb/KBCsv) 
- [**LinqToCsv**](https://www.nuget.org/packages/LinqToCsv/) 1.5.0 / [Source code](https://www.codeproject.com/Articles/25133/LINQ-to-CSV-library) 
- [**LumenWorksCsvReader**](https://www.nuget.org/packages/LumenWorksCsvReader) 4.0.0 / [Source code](https://github.com/phatcher/CsvReader) 
- [**mgholam.fastCSV**](https://www.nuget.org/packages/mgholam.fastCSV) 2.0.9 / [Project site](https://www.codeproject.com/Articles/5255318/fastCSV-A-Tiny-Fast-Standard-Compliant-CSV-Reader) / [Source code](https://github.com/mgholam/fastCSV) 
- [**Microsoft.Data.Analysis**](https://www.nuget.org/packages/Microsoft.Data.Analysis) 0.18.0 / [Project site](https://dot.net/ml) / [Source code](https://github.com/dotnet/MachineLearning)
- [**Microsoft.ML**](https://www.nuget.org/packages/Microsoft.ML) 1.6.0 / [Project site](https://dot.net/ml) / [Source code](https://github.com/dotnet/MachineLearning) 
- [**NReco.Csv**](https://www.nuget.org/packages/NReco.Csv) 1.0.0 / [Source code](https://github.com/nreco/csv) 
- [**Open.Text.CSV**](https://www.nuget.org/packages/Open.Text.CSV) 2.3.3 / [Source code](https://github.com/Open-NET-Libraries/Open.Text.CSV/) 
- [**RecordParser**](https://www.nuget.org/packages/RecordParser) 1.2.0 (with 0.1.8 `Ben.StringIntern`, 5.0.1 `System.IO.Pipelines`) / [Source code](https://github.com/leandromoh/RecordParser) 
- [**ServiceStack.Text**](https://www.nuget.org/packages/ServiceStack.Text) 5.11.0 / [Project site](https://servicestack.net/text) / [Source code](https://github.com/ServiceStack/ServiceStack.Text) 
- [**Sky.Data.Csv**](https://www.nuget.org/packages/Sky.Data.Csv) 2.5.0 / [Source code](https://github.com/fengzhenqiong/Sky.Data.Csv) 
- [**SoftCircuits.CsvParser**](https://www.nuget.org/packages/SoftCircuits.CsvParser) 3.0.0 / [Source code](https://github.com/SoftCircuits/CsvParser) 
- [**Sylvan.Data.Csv**](https://www.nuget.org/packages/Sylvan.Data.Csv) 1.0.3 (with 0.2.1 `Sylvan.Common`) / [Source code](https://github.com/MarkPflug/Sylvan) 
- [**TinyCsvParser**](https://www.nuget.org/packages/TinyCsvParser) 2.6.1 / [Source code](https://github.com/bytefish/TinyCsvParser)
- [**TxtCsvHelper**](https://www.nuget.org/packages/TxtCsvHelper) 1.3.1 / [Source code](https://github.com/camdrudge/TxtCsvHelper)

And... I threw in two other implementations that don't come from packages:

- An implementation I called "HomeGrown" which is my first attempt at a CSV parser, without any optimization. 🤞
- An implementation simply using `string.Split`. This is broken for CSV files containing escaped comma characters, but I figured it could be a baseline.
- **Microsoft.VisualBasic.FileIO.TextFieldParser**, which is a built-in CSV parser.

## Results

These are the parse times for a CSV file with 1,000,000 lines. The units are in seconds.

<a href="{% attachment diagram-5.png %}"><img class="center" src="{% attachment diagram-5.png %}" width="700" height="391" /></a>

🏆 Congratulations **Cursively**! It's taken the first place by parsing a 1 million line file in 1.70 seconds. The **Sylvan.Data.Csv**
library seems to effectively have equivalent performance with Cursively (faster in many past iterations) so I think
it's safe to say both are top of their class! Perhaps pick the one that had an API that feels better for your scenario.

Since I originally posted, [Josh Close](https://github.com/JoshClose) (author of the most popular **CsvHelper**) has
put a lot of work into performance and has brought his implementation from 10th place to a close 4th place. HUGE
improvement. I haven't tested "higher level" data mapping scenarios (which are likely the most common CsvHelper usages)
but it's really exciting to see such a big performance improvement in the most popular CSV parsing library.

I also want to mention some incredible work by [Aurélien Boudoux](https://github.com/aboudoux) who reworked his library
**FluentCSV** to improve the performance. I have to say this is the most impressive performance improvement I've seen in
this project. In the last round, his 2.0.0 version clocked in at 57 seconds for 1 million lines (last place). With
version 3.0.0, he brought the time down to 3.2 seconds (fifth place)! [Read more](https://github.com/aboudoux/FluentCSV/blob/master/Benchmark/README.MD)
about his own performance analysis. Awesome work, Aurélien! Great to see such a nice API with excellent performance.

**RecordParser**, a newly tested library, took third place from **CsvHelper**. I hadn't heard of this library before, but
the performance is excellent and the
[adapter code](https://github.com/joelverhagen/NCsvPerf/blob/8fa762676711dc065a2d0401683828e1b087e095/NCsvPerf/CsvReadable/Implementations/RecordParser.cs)
is extensive and leverages several OSS libraries (Ben.StringIntern and System.IO.Pipelines) so it maybe be useful to
look through to learn tricks for your own performance adventures.

Finally, I wanted to mention that two of the libraries provide better performance via data mapping to a full POCO or
only provide parsing via data mapping in their API, as opposed to most libraries which provide raw, low-level access
to a string array per row. This means that the tests for these APIs are perhaps not as representative of their
intrinsic parsing performance. But I chose to still include them for completeness. These libraries are
**ChoETL** ([reference](https://github.com/joelverhagen/NCsvPerf/pull/38#issuecomment-895357417))
and **FileHelpers** ([reference](https://github.com/joelverhagen/NCsvPerf/pull/38#issue-705928485)). Thanks Mark Pflug
for this investigation.

Also, a previous version of this post was using .NET Core 3.1. It looks like .NET 5 gives a measurable improvement on all
implementations, averaging about **a 10% reduction in runtime** on average. Nice work .NET team!

Most shockingly, my **HomeGrown** implementation is not the worst. And the [code is beautiful](https://github.com/joelverhagen/NCsvPerf/blob/8fa762676711dc065a2d0401683828e1b087e095/NCsvPerf/HomeGrown/CsvUtility.cs#L39) 😭 (as a father says to his ugly kid). In fact, it looks to be a very average implementation. So proud.

## I'm talking smack?

Am I defaming your library? Point out what I missed! I make mistakes all the time 😅 and I'm happy to adjust the report
if you can point out a legitimate flaw in my test.

I did my best to use the lowest level (and presumably highest performance?) API in each library. If I can adjust my
implementations to squeeze out more performance or be more truthful to the intended use of each library API. Let me
know or [open a PR](https://github.com/joelverhagen/NCsvPerf/pulls) against my test repository.

Feel free to reach out to me however you can figure out. (can't make it too easy for the spammers)

## My motivation

For one of my side projects, I was using CSV files as an intermediate data format. Essentially I have an Azure Function
writing results to Azure Table Storage and another Function collecting the results into giant CSV files. These CSV files
get gobbled up by Azure Data Explorer allowing easy slice and dice with Kusto query language. Kusto is awesome by the
way.

To save money on the Azure Function compute time, I wanted to optimize all of the steps I could, including the CSV
reading and writing. Therefore, I naturally installed a bunch of CSV parsing libraries and tested their performance 😁.

## Methodology

I used BenchmarkDotNet to parse a CSV file I had laying around containing NuGet package asset information generated from
NuGet.org. It has a Good Mixture™ of data types, empty fields, and string lengths. I ran several benchmarks for varying
file sizes -- anywhere from an empty file to one million lines.

I put each library in an implementation of some `ICsvReader` interface I made up that takes a `TextReader` and returns a
list of my [POCO](https://stackoverflow.com/a/910260) instances.

I used IL Emit for activating ("newing up"/"constructing") partly because this is [the fastest way to dynamically activate
objects](https://www.joelverhagen.com/blog/2020/11/dynamically-activate-objects-net) (given enough executions, via
initialization cost amortization). Also one of the libraries I tested hard codes this method for activation so I wanted
all of the libraries to have the same characteristics in this regard.

I tested execution time, not memory allocation. Maybe I'll update this post later to talk about memory.

## Library-specific adapters

Each library-specific implementation is [available on GitHub](https://github.com/joelverhagen/NCsvPerf/tree/8fa762676711dc065a2d0401683828e1b087e095/NCsvPerf/CsvReadable/Implementations).

All of the implementations look something like this:

```csharp
public List<T> GetRecords<T>(MemoryStream stream) where T : ICsvReadable
{
    var activate = ActivatorFactory.Create<T>();
    var allRecords = new List<T>();

    using (var reader = new StreamReader(stream))
    {
        string line;
        while ((line = reader.ReadLine()) != null)
        {
            var pieces = line.Split(',');
            var record = activate();
            record.Read(i => pieces[i]);
            allRecords.Add(record);
        }
    }

    return allRecords;
}
```

## Code and raw data

The code for this is stored on GitHub: [joelverhagen/NCsvPerf](https://github.com/joelverhagen/NCsvPerf)

The BenchmarkDotNet and Excel workbook (for the charts and tables above) are here: [BenchmarkDotNet.Artifacts-5.0-6.zip]({% attachment BenchmarkDotNet.Artifacts-5.0-6.zip %})

The test was run on my home desktop PC which is Windows 10, .NET 5.0.1, and an AMD Ryzen 9 3950X CPU.

## Update log

### Update 2021-08-09 (commit [`8fa7626`](https://github.com/joelverhagen/NCsvPerf/tree/8fa762676711dc065a2d0401683828e1b087e095))

- Added **Angara.Table** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/38).
- Updated **ChoETL** from 1.2.1.18 to 1.2.1.22 and enhanced the adapter for 3x perf wins via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/38).
- Added **Cesil** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/38).
- Added **Dsv** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/38).
- Added **KBCsv** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/38).
- Added **Microsoft.Data.Analysis** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/38).
- Added **Microsoft.ML** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/38).
- Added **Open.Text.CSV** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/38).
- Updated **Sylvan.Data.Csv** from 1.0.3 to 1.1.5 via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/38).
- Updated **TxtCsvHelper** from 1.2.9 to 1.3.1 via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/38).

This entire update was done by [Mark](https://github.com/MarkPflug). Thanks so much ❤️!

<a href="{% attachment diagram-5.png %}"><img class="center" src="{% attachment diagram-5.png %}" width="350" height="195" /></a>

Results - [BenchmarkDotNet.Artifacts-5.0-6.zip]({% attachment BenchmarkDotNet.Artifacts-5.0-6.zip %})

### Update 2021-08-05 (commit [`a26df9c`](https://github.com/joelverhagen/NCsvPerf/tree/a26df9cc2c14ccd34d754f32b98f7d4e7b93958e))

- Updated **CsvHelper** from 27.1.0 to 27.1.1.
- Updated **FlatFiles** from 4.15.0 to 4.16.0.
- Added **RecordParser** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/30). Thanks Leandro!
- Updated **TinyCsvParser** from 2.6.0 to 2.6.1.
- Added **TxtCsvHelper** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/32). Thanks Cameron!

<a href="{% attachment diagram-4.png %}"><img class="center" src="{% attachment diagram-4.png %}" width="350" height="184" /></a>

Results - [BenchmarkDotNet.Artifacts-5.0-5.zip]({% attachment BenchmarkDotNet.Artifacts-5.0-5.zip %})

### Update 2021-06-16 (commit [`514a037`](https://github.com/joelverhagen/NCsvPerf/tree/514a0370b2f361c03e6d27bebe9399b4d9d52051))

- Added **ChoETL** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/23). Thanks, Josh!
- Added **CommonLibrary.NET** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/24). Thanks, Josh!
- Added **CSVFile** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/28). Thanks, Josh!
- Updated **CsvHelper** from 20.0.0 to 27.1.0.
- Added **CsvTools** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/27). Thanks, Josh!
- Added **FlatFiles** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/26). Thanks, Josh!
- Updated **FluentCSV** from 2.0.0 to 3.0.0 via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/29). Thanks Aurélien!
- Added **LinqToCsv** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/21). Thanks, Josh!
- Updated **ServiceStack.Text** from 5.10.4 to 5.11.0.
- Updated **SoftCircuits.CsvParser** from 2.4.3 to 3.0.0.
- Added **Sky.Data.Csv** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/22). Thanks, Josh!
- Updated **Sylvan.Data.Csv** from 0.9.0 to 1.0.3 via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/12) and a subsequent change by me. Thanks, Mark!

<a href="{% attachment diagram-3.png %}"><img class="center" src="{% attachment diagram-3.png %}" width="350" height="203" /></a>

Results - [BenchmarkDotNet.Artifacts-5.0-3.zip]({% attachment BenchmarkDotNet.Artifacts-5.0-3.zip %})

### Update 2021-01-18 (commit [`8005d5`](https://github.com/joelverhagen/NCsvPerf/tree/8005d5e6e49d9d79d6519516bd9d8b1f4d2c5af0))

- Added **Ctl.Data** [by request](https://old.reddit.com/r/dotnet/comments/k9no77/the_fastest_csv_parser_in_net/gf6njwn/).
- Added **Cursively** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/7) from [@airbreather](https://github.com/airbreather). Thanks, Joe!
- Added **Microsoft.VisualBasic.FileIO.TextFieldParser** [by request](https://github.com/joelverhagen/NCsvPerf/issues/6).
- Added **SoftCircuits.CsvParser** [by request](https://github.com/joelverhagen/NCsvPerf/pull/8#issuecomment-761891561).
- Updated **CsvHelper** from 19.0.0 to 20.0.0 via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/8) from [@JoshClose](https://github.com/JoshClose). Thanks, Josh!
- Updated **ServiceStack.Text** from 5.10.2 to 5.10.4.
- Updated **Sylvan.Data.Csv** from 0.8.2 to 0.9.0.
- Switched to a fork of **FastCsvParser** to avoid duplicate DLL name.

<a href="{% attachment diagram-3.png %}"><img class="center" src="{% attachment diagram-2.png %}" width="350" height="251" /></a>

Results - [BenchmarkDotNet.Artifacts-5.0-2.zip]({% attachment BenchmarkDotNet.Artifacts-5.0-2.zip %})

### Update 2021-01-06 (commit [`586f602`](https://github.com/joelverhagen/NCsvPerf/tree/586f6020781925b20d4f071d4ecfa01e1572d5b6))

- Moved to .NET 5.0.1
- Added **FluentCSV** [by request](https://twitter.com/AurelienBoudoux/status/1341420464036524033).
- Added **Sylvan.Data.Csv** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/4) from [@MarkPflug](https://github.com/MarkPflug). Thanks, Mark!
- Updated **Csv** from 1.0.58 to 2.0.62.
- Updated **CsvHelper** from 18.0.0 to 19.0.0.
- Updated **mgholam.fastCSV** from 2.0.8 to 2.0.9.

<a href="{% attachment diagram-1.png %}"><img class="center" src="{% attachment diagram-1.png %}" width="350" height="251" /></a>

Results - [BenchmarkDotNet.Artifacts-5.0.zip]({% attachment BenchmarkDotNet.Artifacts-5.0.zip %})

### Initial release 2020-12-08 (commit [`57c31a`](https://github.com/joelverhagen/NCsvPerf/tree/57c31aad520ad58147f240640efe1de8e6e22108))

<a href="{% attachment diagram-0.png %}"><img class="center" src="{% attachment diagram-0.png %}" width="350" height="288" /></a>

Results - [BenchmarkDotNet.Artifacts.zip]({% attachment BenchmarkDotNet.Artifacts.zip %})

