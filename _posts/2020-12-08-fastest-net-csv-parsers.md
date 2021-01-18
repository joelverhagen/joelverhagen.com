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

**Latest update:** 2021-01-18, with new versions and libraries. Also, a new winner!

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

- [**Csv**](https://www.nuget.org/packages/Csv) / [Source code](https://github.com/stevehansen/csv)
  - ![Downloads](https://img.shields.io/nuget/dt/Csv)
  - Tested version: 2.0.62
- [**CsvHelper**](https://www.nuget.org/packages/CsvHelper) / [Project site](https://joshclose.github.io/CsvHelper/) / [Source code](https://github.com/JoshClose/CsvHelper)
  - ![Downloads](https://img.shields.io/nuget/dt/CsvHelper)
  - Tested version: 20.0.0
- [**CsvTextFieldParser**](https://www.nuget.org/packages/CsvTextFieldParser) / [Source code](https://github.com/22222/CsvTextFieldParser)
  - ![Downloads](https://img.shields.io/nuget/dt/CsvTextFieldParser)
  - Tested version: 1.2.1
- [**Ctl.Data**](https://www.nuget.org/packages/Ctl.Data) / [Project site](http://ctl-global.github.io/data.html) / [Source code](https://github.com/ctl-global/ctl-data/)
  - ![Downloads](https://img.shields.io/nuget/dt/Ctl.Data)
  - Tested version: 2.0.0.2
- [**Cursively**](https://www.nuget.org/packages/Cursively) / [Project site](https://airbreather.github.io/Cursively/index.html) / [Source code](https://github.com/airbreather/Cursively)
  - ![Downloads](https://img.shields.io/nuget/dt/Cursively)
  - Tested version: 1.2.0
- [**FastCsvParser**](https://www.nuget.org/packages/FastCsvParser) / [Source code](https://github.com/bopohaa/CsvParser)
  - ![Downloads](https://img.shields.io/nuget/dt/FastCsvParser)
  - Tested version: 1.1.1
  - **Note**: I had to fork this package into [Knapcode.FastCsvParser](https://www.nuget.org/packages/Knapcode.FastCsvParser/1.1.0) to avoid a colliding assembly name.
- [**FluentCSV**](https://www.nuget.org/packages/FluentCSV/) / [Source code](https://github.com/aboudoux/FluentCSV/)
  - ![Downloads](https://img.shields.io/nuget/dt/FluentCSV)
  - Tested version: 2.0.0
- [**LumenWorksCsvReader**](https://www.nuget.org/packages/LumenWorksCsvReader) / [Source code](https://github.com/phatcher/CsvReader)
  - ![Downloads](https://img.shields.io/nuget/dt/LumenWorksCsvReader)
  - Tested version: 4.0.0
- [**mgholam.fastCSV**](https://www.nuget.org/packages/mgholam.fastCSV) / [Project site](https://www.codeproject.com/Articles/5255318/fastCSV-A-Tiny-Fast-Standard-Compliant-CSV-Reader) / [Source code](https://github.com/mgholam/fastCSV)
  - ![Downloads](https://img.shields.io/nuget/dt/mgholam.fastCSV)
  - Tested version: 2.0.9
- [**NReco.Csv**](https://www.nuget.org/packages/NReco.Csv) / [Source code](https://github.com/nreco/csv)
  - ![Downloads](https://img.shields.io/nuget/dt/NReco.Csv)
  - Tested version: 1.0.0
- [**ServiceStack.Text**](https://www.nuget.org/packages/ServiceStack.Text) / [Project site](https://servicestack.net/text) / [Source code](https://github.com/ServiceStack/ServiceStack.Text)
  - ![Downloads](https://img.shields.io/nuget/dt/ServiceStack.Text)
  - Tested version: 5.10.4
- [**SoftCircuits.CsvParser**](https://www.nuget.org/packages/SoftCircuits.CsvParser) / [Source code](https://github.com/SoftCircuits/CsvParser)
  - ![Downloads](https://img.shields.io/nuget/dt/SoftCircuits.CsvParser)
  - Tested version: 2.4.3
- [**Sylvan.Data.Csv**](https://www.nuget.org/packages/Sylvan.Data.Csv) / [Source code](https://github.com/MarkPflug/Sylvan)
  - ![Downloads](https://img.shields.io/nuget/dt/Sylvan.Data.Csv)
  - Tested version: 0.9.0 (with 0.2.0 `StringPool`)
- [**TinyCsvParser**](https://www.nuget.org/packages/TinyCsvParser) / [Source code](https://github.com/bytefish/TinyCsvParser)
  - ![Downloads](https://img.shields.io/nuget/dt/TinyCsvParser)
  - Tested version: 2.6.0

And... I threw in two other implementations that don't come from packages:

- An implementation I called "HomeGrown" which is my first attempt at a CSV parser, without any optimization. 🤞
- An implementation simply using `string.Split`. This is broken for CSV files containing escaped comma characters, but I figured it could be a baseline.
- **Microsoft.VisualBasic.FileIO.TextFieldParser**, which is a built-in CSV parser.

## Results

These are the parse times for a CSV file with 1,000,000 lines. The units are in seconds.

<img class="center" src="{% attachment diagram-2.png %}" width="700" height="502" />

🏆 Congratulations **Cursively**! It's taken the first place by parsing a 1 million line file in 1.75 seconds.

Note that the three implementations performing better than the simplistic, broken **string.Split** method all implement
string deduping, which reduces allocations when there are redundant strings in the CSV file. This performance win is
certainly dependent on the CSV files you're working with. In my side projects, I have a lot of duplicated fields
because I'm using CSVs sort of like denormalized tables in SQL (image the result of a SQL `JOIN`). So YMMV!

In my previous versions of this blog post, the **mgholam.fastCSV** and **Sylvan.Data.Csv** libraries were the fastest
CSV parsers but now you can see we have a new contender.

Since I originally posted, [Josh Close](https://github.com/JoshClose) (author of the most popular **CsvHelper**) has
put a lot of work into performance and has brought his implementation from 10th place to a close 3rd place. HUGE
improvement. I haven't tested "higher level" data mapping scenarios (which are likely the most common CsvHelper usages)
but it's really exciting to see such a big performance improvement in the most popular CSV parsing library.

Also, a previous version was using .NET Core 3.1. It looks like .NET 5 gives a measurable improvement on all
implementations, averaging about **a 10% reduction in runtime** on average. Nice work .NET team!

Most shockingly, my **HomeGrown** implementation is not the worst. And the [code is beautiful](https://github.com/joelverhagen/NCsvPerf/blob/8005d5e6e49d9d79d6519516bd9d8b1f4d2c5af0/NCsvPerf/HomeGrown/CsvUtility.cs#L39) 😭 (as a father says to his ugly kid). In fact, it looks to be a very average implementation. So proud.

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

Each library-specific implementation is [available on GitHub](https://github.com/joelverhagen/NCsvPerf/tree/8005d5e6e49d9d79d6519516bd9d8b1f4d2c5af0/NCsvPerf/CsvReadable/Implementations).

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

The BenchmarkDotNet and Excel workbook (for the charts and tables above) are here: [BenchmarkDotNet.Artifacts-5.0-2.zip]({% attachment BenchmarkDotNet.Artifacts-5.0-2.zip %})

The test was run on my home desktop PC which is Windows 10, .NET 5.0.1, and an AMD Ryzen 9 3950X CPU.

## Update log

### Update 2021-01-18

- Added **Ctl.Data** [by request](https://old.reddit.com/r/dotnet/comments/k9no77/the_fastest_csv_parser_in_net/gf6njwn/).
- Added **Cursively** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/7) from [@airbreather](https://github.com/airbreather). Thanks, Joe!
- Added **Microsoft.VisualBasic.FileIO.TextFieldParser** [by request](https://github.com/joelverhagen/NCsvPerf/issues/6).
- Added **SoftCircuits.CsvParser** [by request](https://github.com/joelverhagen/NCsvPerf/pull/8#issuecomment-761891561).
- Updated **CsvHelper** from 19.0.0 to 20.0.0 via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/8) from [@JoshClose](https://github.com/JoshClose). Thanks, Josh!
- Updated **ServiceStack.Text** from 5.10.2 to 5.10.4
- Updated **Sylvan.Data.Csv** from 0.8.2 to 0.9.0
- Switched to a fork of **FastCsvParser** to avoid duplicate DLL name.

**Results** - [BenchmarkDotNet.Artifacts-5.0-2.zip]({% attachment BenchmarkDotNet.Artifacts-5.0-2.zip %})

### Update 2021-01-06

- Moved to .NET 5.0.1
- Added **FluentCSV** [by request](https://twitter.com/AurelienBoudoux/status/1341420464036524033).
- Added **Sylvan.Data.Csv** via [a PR](https://github.com/joelverhagen/NCsvPerf/pull/4) from [@MarkPflug](https://github.com/MarkPflug). Thanks, Mark!
- Updated **Csv** from 1.0.58 to 2.0.62
- Updated **CsvHelper** from 18.0.0 to 19.0.0
- Updated **mgholam.fastCSV** from 2.0.8 to 2.0.9

<img class="center" src="{% attachment diagram-1.png %}" width="700" height="502" />

**Results** - [BenchmarkDotNet.Artifacts-5.0.zip]({% attachment BenchmarkDotNet.Artifacts-5.0.zip %})

### Initial release 2020-12-08

<img class="center" src="{% attachment diagram-0.png %}" width="700" height="576" />

**Results** - [BenchmarkDotNet.Artifacts.zip]({% attachment BenchmarkDotNet.Artifacts.zip %})

