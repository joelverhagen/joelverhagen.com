---
category: Programming
layout: post
tags:
- C#
- reflection
- .NET
- emit
- performance
title: The fastest way to dynamically activate objects in .NET
---

... at least according to my brief investigation.

For one of my side projects, [ExplorePackages](https://github.com/joelverhagen/ExplorePackages), I wanted to know the
fastest way to activate an arbitrary type in .NET. In other words, given a type parameter `T` or variable of type
`Type`, what's the fastest way to call the parameterless constructor for that type. This is a pretty common scenario
for deserializer libraries. Imagine you are given encoded data in some byte stream and you know the format (JSON, CSV,
etc) and you want the object model that represents those bytes. Well, you need to activate a class (or call
`new Foo()`) at some point so that you can fill the live instance with data from the bytes.

In my experience, the most common approaches to this problem are to use the
[`Activator.CreateInstance`](https://docs.microsoft.com/en-us/dotnet/api/system.activator.createinstance) method or to
use reflection to get the parameterless constructor of the `Type`. It turns out these are not always the best!

I figured it might be useful to try a bunch of different approaches with
[BenchmarkDotNet](https://github.com/dotnet/BenchmarkDotNet) and post the results. Also, it's been forever since
I've blogged, and I needed to make sure I still knew how to publish to this dang thing.

## Approaches

I tried the following approaches for three types: `object`, `StringBuilder`, and a big
[POCO](https://stackoverflow.com/questions/250001/poco-definition) I had laying around. It turned out that the difference
between the three types in terms of performance was not interesting so I just mentioned the POCO performance below since
I thought it best matched the used case of "dynamic activation of a class during deserialization".

Approaches:
- explicit `new` with no dynamic type, as a baseline
- reflection
- reflection, but caching the `ConstructorInfo`
- IL emit
- IL emit, but caching the generated method
- `Activator.CreateInstance`
- `new T()` which is only usable with a `where T : new()` type parameter constraint

## Methodology

I wrote out benchmark methods for these approaches in generic methods (e.g. `ApproachFoo<T>()`) and methods with a
parameter of type `Type` (e.g. `ApproachFoo(Type type)`). I'll call the type parameter approach (the former)
**generic methods**. I'll call the methods accepting `Type` (the latter) **`Type` methods**.

I ran the benchmarks on my Surface Book 3 running Windows 10, with three different runtimes:
1. .NET Core 3.1
2. .NET 5.0
3. .NET Framework 4.8

Note that the `new T()` approach only works in generic methods and not in `Type` methods.

The POCO I used is referred to as `PackageAsset` and has 25 properties -- a mixture of reference and value types.

## Results

The fastest way to create an object in .NET is by calling `new` directly on that type 😂... but that's not surprising.
But really, if you can explicitly activate the type in a calling method and pass down the instance, this will be
the fastest. Depending on your usecase, you may even be able to get away with a single instance of the classe --
perhaps you're directly serializing again and can reuse the instance.

The next fastest way is to **use IL emit to generate a method that simply calls the constructor**. However it should be
noted that the upfront cost of using IL emit is *staggering* and should only be considered if the constructor is called
roughly 4000 times or more per process (assuming you cache the IL emit at the process level, e.g. `static`).

### "Close" approaches

Here is the activation time of my `PackageAsset` POCO. This chart excludes the uncached IL emit approach since it made
the picture unreadable since the measurements for that approach so high in comparison.
This averages the results of all three frameworks.

The value of the measurement (Y axis) is the ratio against the baseline.

<img class="center" src="{% attachment diagram-1.png %}" title="" width="700" height="347" />

As you can see the next runner up are the `Type` method and generic variants of IL emit.

### Code

As an example, you could use code like this to IL emit a delegate which produces an object of an arbitrary type. For
this approach to be performant, you must cache the delegate instead of regenerating it every time.

```csharp
using System.Reflection.Emit;

delegate object MyActivate();

object Activate(Type type)
{
    // Cache this! It uses IL emit and is very slow!
    MyActivate emitActivate = GetEmitActivate(type);

    // Invoke the method to produce an object quickly.
    return emitActivate();
}

MyActivate GetEmitActivate(Type type)
{
    var method = new DynamicMethod("EmitActivate", type, null, true);
    var generator = method.GetILGenerator();
    generator.Emit(OpCodes.Newobj, type.GetConstructor(Type.EmptyTypes));
    generator.Emit(OpCodes.Ret);
    var emitActivate = (MyActivate)method.CreateDelegate(typeof(MyActivate));
    return emitActivate;
}
```

To be clear, this would be the implementation of the "Type emit (cached)" bar (1.24).

### Framework comparison

Here are the nanosecond durations for each approach, on each framework. This is for the activation of my POCO.

Approach                        | .NET Framework 4.8 | .NET Core 3.1 | .NET 5.0
------------------------------- | ------------------ | ------------- | ---------
**Baseline**                    |                    |               |
&nbsp;&nbsp;`new`               | 12.63              | 13.18         | 13.03
**`Type` method**               |                    |               |
&nbsp;&nbsp;emit (cached)       | 19.46              | 14.31         | 14.32
&nbsp;&nbsp;`Activator`         | 51.69              | 39.86         | 35.69
&nbsp;&nbsp;reflection (cached) | 112.41             | 88.09         | 74.27
&nbsp;&nbsp;reflection          | 184.05             | 134.93        | 122.18
&nbsp;&nbsp;emit                | 48,924.70          | 54,386.42     | 48,727.37
**generic method**              |                    |               |
&nbsp;&nbsp;emit (cached)       | 22.04              | 17.24         | 16.92
&nbsp;&nbsp;`new T()`           | 61.91              | 43.71         | 39.30
&nbsp;&nbsp;`Activator`         | 62.10              | 42.77         | 40.32
&nbsp;&nbsp;reflection (cached) | 118.02             | 89.34         | 75.95
&nbsp;&nbsp;reflection          | 189.54             | 140.15        | 129.22
&nbsp;&nbsp;emit                | 50,060.25          | 53,353.06     | 48,703.52

## Conclusions

When you use IL emit for this purpose (or probably any other purpose) you should carefully consider the upfront cost of
the emit amortized over the execution of that IL during your process lifetime.

`Activator.CreateInstance` seems to be best approach if you don't plan on creating more than several
thousand objects of any given type.

In general, .NET 5.0 is faster than .NET Core 3.1. In general, .NET Core 3.1 is faster than .NET Framework 4.8.

There is a small overhead (2 to 10 nanoseconds) for using generics over a `Type` method parameter. This makes sense since
many of the approaches need to call `typeof(T)` on the generic type parameter `T` to get a `Type` in the method body
anyway. This holds true over all frameworks tested.

## Surprises

Calling `new` directly on my POCO and on `object` is faster on .NET Framework but slower for `StringBuilder`. This is a
surprising result. Results are here, in nanoseconds.

Type                  | .NET Framework 4.8 | .NET Core 3.1 | .NET 5.0
--------------------- | ------------------ | ------------- | --------
`new StringBuilder()` | 13.15              | 8.90          | 8.99
`new PackageAsset()`  | 12.63              | 13.18         | 13.03
`new object()`        | 2.19               | 2.77          | 2.71 

Perhaps this is "margin of error" stuff? Maybe I need to reproduce this on another machine? Maybe this is an
investigation for another time...

## Code and raw data

The code for this is stored on GitHub: [joelverhagen/ActivatePerf](https://github.com/joelverhagen/ActivatePerf)

The BenchmarkDotNet and Excel data (for the charts and tables above) are here: [ActivatePerf-data.zip]({% attachment ActivatePerf-data.zip %})
