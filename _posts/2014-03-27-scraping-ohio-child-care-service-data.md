---
category: Projects
layout: post
tags:
- screen scraping
title: Scraping Ohio Child Care Service Data
---

## OdjfsScraper

### Introduction

For my University of Cincinnati senior design project, my team and I are designing a system for Cincinnati parents to easily find child care services that are convenient to bus routes. To do this, we needed access to all of the child care services in Cincinnati. Fortunately, the state of Ohio has a central database of licensed child care services throughout Ohio. The database is maintained by the Ohio Department of Jobs and Family Services (ODJFS). Unfortunately, the database is only accessible via [an HTML form](http://www.odjfs.state.oh.us/cdc/query.asp)... no simple web service. Why am I not surprised?

Well, any HTML form can be looked as a machine-readable web API... reading the form response is just a little bit trickier than parsing and XML or JSON document ;). Screen scraping to the rescue!

This project was inspired by the most-excellent [Open Data Cincy initiative](http://www.opendatacincy.org/), aiming to make more of Cincinnati's data available to developers in machine-readable formats.

### Design

I wrote a screen scraping application that parses the child care information web pages (for example, [Three C's Nursery School](http://www.odjfs.state.oh.us/cdc/results2.asp?provider_number=CDCSFJNMPINKNININI)) for all the useful information and stores that data in a SQL Server database. For my senior design project, we also needed the latitude and longitude of each child care service. I used [MapQuest's geocoding API](http://developer.mapquest.com/web/products/dev-services/geocoding-ws) to map child care service addresses to latitude and longitude pairs.

The screen scraper itself is written in C# and uses [CsQuery](https://github.com/jamietre/CsQuery) to parse the HTML documents. The tool is designed to be run as a daemon, which will periodically check each child care service's information for changes and store the data in the database. The daemon can also be configured to geocode the child care services that have addresses.

### Code

The project is called "OdjfsScraper". All of the code is available on GitHub under the MIT license.

**[SmartRoutes/OdjfsScraper](https://github.com/SmartRoutes/OdjfsScraper)**

### Data

Instead of running your own instance of the scraper, I would recommend simply grabbing the current snapshot of the database. This will ensure that the ODJFS website doesn't get hit too hard.

The data is available as a SQL Server database backup (.bak). Simply download the most recent snapshot from the link below and restore the backup to your own SQL Server instance. Now you can run your own fun SQL queries against ODJFS's child care service database.

**[Current OdjfsScraper Snapshot](http://storage.joelverhagen.com/OdjfsScraper/OdjfsScraper_Current.bak)**

For historical snapshots, take a look at the directory containing the current snapshot.

**[Historical OdjfsScraper Snapshots](http://storage.joelverhagen.com/OdjfsScraper/)**
