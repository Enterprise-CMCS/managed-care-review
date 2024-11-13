In order to investigate slowness in app-api, you can use node profiling.

# node --prof

See these docs: https://nodejs.org/en/learn/getting-started/profiling

running `./dev local api --prof` will run app-api using `node --prof` to invoke serverless offline. When you stop app-api it will generate some “isolate-0x*****-v8.log” files. These files can be processed with `node --prof-process` as described in the above docs, generating profiling traces. In my experience it created 3 profiles, only one of which will have our code in it. I suspect the other two are threads running serverless offline instead of the one running our resolvers. 

All of the code locations in these profiles are in the files compiled by serverless offline, which is a pain, but you can search for them by line number so you can figure out what’s being seen in the profile.

When I did this I wrote a small script that hit the indexRates api 100 times in a row to give the profiler more meat to chew on. 

Look for what code is showing up in the profiles the most and that can guide you to places you can optimize. 

# perf_hooks

Separately, you can use https://nodejs.org/api/perf_hooks.html

Node perf hooks let you insert timers into code to see how long certain functions are taking.

With this you can manually time what parts of the app are taking time. 

Configure a simple perf hook observer in apollo_gql.ts:

```bash
import { performance,  PerformanceObserver} from 'perf_hooks'

const perfObserver = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(entry)
  })
})

perfObserver.observe({ entryTypes: ["measure"], buffered: true })
```

then in your code, put marks where you want to measure things:

```bash
import { performance } from 'perf_hooks'
...

performance.mark('GQLHandler-start')
...code you want to measure
performance.measure('GQLHandler', 'GQLHandler-start')
```

This will print out timings for every request. There’s probably more you can do here to make it smarter about repetitive markings but I haven’t figured that out yet.
