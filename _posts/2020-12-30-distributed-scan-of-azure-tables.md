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
be done in a many ways. The simplest approach would be to used the [segmented query API](https://docs.microsoft.com/en-us/rest/api/storageservices/query-entities)
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

From some of my testing, I found that it takes about 8 minutes to serially page through 3.5 million records in Azure,
when the storage account is in the same region (I tested West US 2). If my data grows much more, I won't be able to
fetch all of the data within in a single Azure Function execution. And this duration doesn't account for any logic on
each row. If I do a somewhat costly operation on each entity, then there's no way I can finish the work before the
timeout.

So what are the options? Well, I could improve the serial approach and record the continuation token after
each segment. This way, upon timeout, I could resume at the latest continuation token point (i.e. that latest
`x-ms-continuation-NextPartitionKey` and `x-ms-continuation-NextRowKey` values). Also, I could enqueue a message
(e.g. Storage Queue, Service Bus, etc) for each segment or entity so that the "paging" code is doing as little work as
possible and some other code is processing the entities.

Another option would be to only query for a single segment at a time. After a segment is completed, I could enqueue
a follow-up message containing the next continuation token. This would make break the paging operation up into a lot of
little Azure Function executions, thus avoiding the maximum execution time.

But these are still *serial* (sequential) approachs. The duration of the paging operation is linearly related to the number
of rows in the table.

**How would we parallelize the scan of the Azure Table? Ideally we can throw a bunch of Azure Function nodes at the work:
both querying for rows and processing said rows.** At face value, the Azure Table Storage APIs only allow the discovery
and enumeration of partition keys and row keys using this serial API...

## The idea: recursively discovery partition key prefixes

One capability that the Azure Table Storage has is that you can query for partition keys greater than a X. With carefully
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
every single row. Consider the following flow of logic:

1. Query for a segment with no filter: 
   - Query: `fetch 2 entities, no filter`
   - Result: two rows returned: `Dashner, Cleopatra` and `Davis, Gemma` with a continuation token
   - What we learned: `D` is the 1st prefix.
1. Query for a segment, skipping `D`.
   - Query: `fetch 2 entities, where PartitionKey > 'D\uffff'` (`\uffff` is the largest character, an invalid code point)
   - Result: two rows returned: `Hartlage, Marketta` and `Nuckles, Timmy` with a continuation token
   - What we learned: `H` is the 2nd prefix, `N` is the 3rd prefix
1. Query for a segment, skipping `N`.
   - Query: `fetch 2 entities, where PartitionKey > 'N\uffff'`
   - Result: two rows returned: `Rundle, Coleen` and `Splawn, Lise` with a continuation token
   - What we learned: `R` is the 4th prefix, `S` is the 5th prefix
1. Query for a segment, skipping `S`.
   - Query: `fetch 2 entities, where PartitionKey > 'S\uffff'`
   - Result: two rows returned: `Wedell, Annabelle` and `Wongus, Rosenda` **without** a continuation token
   - What we learned: `W` is the 5th prefix and last prefix (since no continuation token was returned)
   
With 4 queries returning a total of 8 rows, we found the prefixes for all entities in the table. We also fetched 8
entities which can be processed immediately.

In addition to the prefixes, we also found 3 segments that have more undiscovered data as indicated by a returned
continuation token.

We can continue the process by executing the same logic as above recursively, but using the prefixes already discovered.

1. From step #1 above, we are not sure whether there are more `Davis` records.
   - Query: `fetch all entities with PartitionKey = 'David' and RowKey > 'Gemma'`
   - Result: `David, Loralee`
   - What we learned: we now know all of the `Davis` records
1. From step #1 above, we are not sure whether there are more `D*` records.
   - Query: `fetch 2 entities, where PartitionKey > 'Davis' and PartitionKey < 'D\uffff'` without a continuation token
   - Result: `Dodge, Lowell`
   - What we learned: we know all of the `D*` records now

Similar logic could be applied to `N*` and `S*`. We don't need to expand `W*` because no continuation token was returned
for the step #4 above.

Visually, the query execution looks something like this:

<img class="center" src="{% attachment diagram-1.svg %}" width="700" height="347" />

The blue nodes are prefix queries. The beige nodes are partition key queries. The green nodes are result sets.

## Applying the idea

So how is this better than just paging throug the entities? Well, if your data is bigger than the example above. You can
discover every single character prefix of your partition keys in N queries, where N is the number of prefixes.

Think of these prefixes like bookmarks in a dictionary. You have a bookmark at the beginning, for words starting with
'A' then another one for 'B', etc -- 26 in all. After that single actor discovers the initial "layer" of bookmarks, he
can hand each individual section off to another actor who can process that isolated section. One actor gets all of the
A's, another gets all of the B's, etc. These prefixed sections can be operated on in parallel. 

Imagine this can be done in a distributed manner across dozens of Azure Function nodes. Each section can be further
broken up into smaller sections. Like the 'A' section can be broken up with 'AA', 'AB', etc.

This enables truly parallelized processing of partition keys after some relatively cheap discovery stage.
