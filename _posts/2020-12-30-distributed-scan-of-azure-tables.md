---
category: Programming
layout: post
tags:
- C#
- Azure
- Table
- Storage
- Functions
title: How to run a distributed scan of Azure Tables
---

Suppose you have a massive table in Azure Table Storage and you need to perform some task on every single row. This can
be done in many ways. The simplest approach would be to used the [segmented query API](https://docs.microsoft.com/en-us/rest/api/storageservices/query-entities)
and [pagination](https://docs.microsoft.com/en-us/rest/api/storageservices/query-timeout-and-pagination) to get blocks
of 1000 entities at a time, in a serial fashion, and perform whatever action you need on those segments.

```csharp
CloudTable table = GetTable("mystoragetable");
var tableQuery = new TableQuery { TakeCount = 1000 };

TableContinuationToken continuationToken = null;
do
{
    // Get the next segment
    TableQuerySegment segment = await table.ExecuteQuerySegmentedAsync(
        tableQuery,
        continuationToken);
    
    // Process the segment however you want

    // Continue to the next segment
    continuationToken = segment.ContinuationToken;
}
while (continuationToken != null);
```

## Problem

This probably works in many scenarios but it starts to fall over if the table is really big. Suppose you have a table
with many millions of rows and many hundreds of thousands of partition keys. Depending on your execution environment,
you may not be able to perform that sequential pagination of the entire table within some time limit. For example,
Azure Function's consumption plan has a
[maximum execution duration of 10 minutes](https://docs.microsoft.com/en-us/azure/azure-functions/functions-scale#timeout).

From some of my testing, I found that it takes about 8 minutes to serially page through 3.5 million records in Azure
when the storage account is in the same region (I tested West US 2). If my data grows much more, I won't be able to
fetch all of the data within a single Azure Function execution. And this duration doesn't account for any logic on
each row. If I do a somewhat costly operation on each entity, then there's no way I can finish the work before the
timeout.

So what are the options? Well, I could improve the serial approach and record the continuation token after
each segment. This way, upon timeout, I could resume at the latest continuation token point (i.e. that is
`x-ms-continuation-NextPartitionKey` and `x-ms-continuation-NextRowKey` values). Also, I could enqueue a message
(e.g. Storage Queue, Service Bus, etc) for each segment or entity so that the "paging" code is doing as little work as
possible and some other code is processing the entities.

Another option would be to only query for a single segment at a time. After a segment is completed, I could enqueue
a follow-up message containing the next continuation token. This would make break the paging operation up into a lot of
little Azure Function executions, thus avoiding the maximum execution time.

But these are still *serial* (sequential) approaches. The duration of the paging operation is linearly related to the number
of rows in the table.

**How could we parallelize the scan of the Azure Table? Ideally, we can throw a bunch of Azure Function nodes at the work:
both querying for rows and processing said rows.** At face value, the Azure Table Storage APIs only allow the discovery
and enumeration of partition keys and row keys using this serial API. But we can be clever!

## The idea: recursively discover partition key prefixes

One capability that the Azure Table Storage has is that you can query for partition keys greater than X. With carefully
crafted parameters, this can be leveraged to enumerate the prefixes of all partition keys. This logic can be executed
recursively to discover all partition keys in the table after the first "layer" of prefixes is discovered. Finally, this
"recursion" work can be distributed across many nodes without any fear of two workers querying for the same record. In
other words, each query will be discovered only once 

Let me explain. Suppose you have a small table like this, where the partition key is a fake person's last name and the
row key is the first name:

PartitionKey | RowKey
------------ | ------
Dashner      | Cleopatra
Davis        | Gemma
Davis        | Loralee
Dodge        | Lowell
Hartlage     | Marketta
Nuckles      | Timmy
Rundle       | Coleen
Splawn       | Lise
Wedell       | Annabelle
Wongus       | Rosenda

The maximum take count (segment size) in Azure Table Storage is 1000, but let's use a smaller number of 2 to
demonstrate the concepts. 

We can discover the prefixes `D` (from `Dashner`), `H` (from `Hardlage`), `N`, `R`, `S`, and `W` without querying for
every single row. Visually, the query execution would something like this:

<img class="center" src="{% attachment diagram-1.svg %}" width="708" height="582" />

The blue nodes are prefix queries. The beige nodes are partition key queries. The green nodes are result sets. `PK` is
short for `PartitionKey` and `RK` is short for `RowKey`.

In English, consider the following flow of logic:

1. Query for a segment with no filter: 
   - Query: `fetch 2 entities, no filter`
   - Result: two rows returned: `Dashner, Cleopatra` and `Davis, Gemma` with a continuation token
   - What we learned: `D` is the 1st prefix.
1. Query for a segment, skipping `D`.
   - Query: `fetch 2 entities, where PK > 'D\uffff'` (`\uffff` is the largest character, an invalid code point)
   - Result: two rows returned: `Hartlage, Marketta` and `Nuckles, Timmy` with a continuation token
   - What we learned: `H` is the 2nd prefix, `N` is the 3rd prefix
1. Query for a segment, skipping `N`.
   - Query: `fetch 2 entities, where PK > 'N\uffff'`
   - Result: two rows returned: `Rundle, Coleen` and `Splawn, Lise` with a continuation token
   - What we learned: `R` is the 4th prefix, `S` is the 5th prefix
1. Query for a segment, skipping `S`.
   - Query: `fetch 2 entities, where PK > 'S\uffff'`
   - Result: two rows returned: `Wedell, Annabelle` and `Wongus, Rosenda` **without** a continuation token
   - What we learned: `W` is the 5th prefix and last prefix (since no continuation token was returned)
   
With 4 queries returning a total of 8 rows, we found the prefixes for all entities in the table. We also fetched 8
entities that can be processed immediately.

In addition to the prefixes, we also found 3 segments that have more undiscovered data as indicated by a returned
continuation token.

We can continue the process by executing the same logic as above recursively but using the prefixes already discovered.

1. From step #1 above, we are not sure whether there are more `Davis` records.
   - Query: `fetch all entities with PK = 'Davis' and RowKey > 'Gemma'`
   - Result: `Davis, Loralee`
   - What we learned: we now know all of the `Davis` records
1. From step #1 above, we are not sure whether there are more `D*` records.
   - Query: `fetch 2 entities, where PK > 'Davis' and PK < 'D\uffff'` without a continuation token
   - Result: `Dodge, Lowell`
   - What we learned: we know all of the `D*` records now

Similar logic could be applied to `N*` and `S*`. We don't need to expand `W*` because no continuation token was returned
for step #4 above.

## Applying the idea

So how is this better than just paging through the entities? Well, if your data is bigger than the example above. You can
discover every single character prefix of your partition keys in N queries, where N is the number of prefixes.

Think of these prefixes like bookmarks in a dictionary. You have a bookmark at the beginning, for words starting with
'A' then another one for 'B', etc -- 26 in all. After that single actor discovers the initial "layer" of bookmarks, he
can hand each section off to another actor who can process that isolated section. One actor gets all of the
A's, another gets all of the B's, etc. These prefixed sections can be operated on in parallel. Each section can be
further broken up into smaller sections. Like the 'A' section can be broken up with 'AA', 'AB', etc.

Imagine this can be done in a distributed manner across dozens of Azure Function nodes. For each prefix of length 1
discovered in the initial phase, enqueue a message. Any partition key queries can be evaluated immediately or deferred
in a queue message. Any records found can be processed immediately or deferred with a queue message.

As the Azure Functions orchestrator sees the number of queue messages grow, it will allocate more and more nodes. This
way you can throw a bunch of hardware at a big table.

In short, **this approach enables truly parallelized processing of partition keys after some relatively cheap discovery
stage.**

## Implementation

Naturally, I have already implemented this idea and tested its performance against a big Azure Table. In my case, the
partition key is a NuGet package ID and the row key is a package version. Here's what the data looks like in Azure
Storage Explorer.

<img class="center" src="{% attachment nuget-data.png %}" width="700" height="402" />

I wrote a class called TablePrefixScanner which implements the logic above. It's available in my GitHub project
ExplorePackages:

**Implementation: [`TablePrefixScanner.cs`](https://github.com/joelverhagen/ExplorePackages/blob/084ffee36c022b7417a507fdc9303962bc9b74a3/src/ExplorePackages.Logic/Storage/TablePrefix/TablePrefixScanner.cs)**

It has some supporting classes but the core of the logic is here.

To demonstrate the recursion simply, I have implemented a `ListAsync` method that yields entities in the natural
order of the table (ordered first by PartitionKey then by RowKey). It uses a stack data structure and is therefore
a depth-first search.

**Simple usage: [`ListAsync`](https://github.com/joelverhagen/ExplorePackages/blob/084ffee36c022b7417a507fdc9303962bc9b74a3/src/ExplorePackages.Logic/Storage/TablePrefix/TablePrefixScanner.cs#L32-L84)**

This is no better than the serial approach first mentioned above, but it's useful for showing how to deal
with the various "steps" of the algorithm as well as comparing the results to the baseline approach for verifying
correctness.

To test the distributed, parallelized usage of this class, I wrote an Azure Queue Storage function that uses the
`TablePrefixScanner` class to distribute the copying of the entire table to another table. This operation is very
easily distributed (each row can be copied without affected other rows). It uses Azure Queue Storage so it is
a breadth-first search (roughly... since ordering is not guaranteed in Azure Queue Storage).

**Distributed usage:**
- Queue message handler: [**`TableCopyMessageProcessor.cs`**](https://github.com/joelverhagen/ExplorePackages/blob/084ffee36c022b7417a507fdc9303962bc9b74a3/src/ExplorePackages.Worker.Logic/MessageProcessors/TableCopy/TableCopyMessageProcessor.cs#L47-L107)
- Enqueueing logic: [**`EnqueuePrefixScanStepsAsync`**](https://github.com/joelverhagen/ExplorePackages/blob/084ffee36c022b7417a507fdc9303962bc9b74a3/src/ExplorePackages.Worker.Logic/MessageProcessors/TableCopy/TableCopyEnqueuer.cs#L47-L96)
- The work done, per row: [**`TableRowCopyMessageProcessor.cs`**](https://github.com/joelverhagen/ExplorePackages/blob/084ffee36c022b7417a507fdc9303962bc9b74a3/src/ExplorePackages.Worker.Logic/MessageProcessors/TableCopy/TableRowCopyMessageProcessor.cs)
