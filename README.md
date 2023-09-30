# Simple vector creation with automatic batching
![npm version](https://img.shields.io/npm/v/@instant.dev/vectors?label=) ![Build Status](https://app.travis-ci.com/instant-dev/vectors.svg?branch=main)

## Batch create vectors without thinking about it

When you're creating a lot of vectors - for example, indexing a bunch of documents
at once using [OpenAI embeddings](https://platform.openai.com/docs/guides/embeddings) -
you quickly run into IO-related performance issues. Your web requests will be throttled
if you make too many parallel API requests, so OpenAI allows for batched requests
via the [OpenAI embeddings API](https://platform.openai.com/docs/api-reference/embeddings).
However, this API only allows for a maximum of 8,191 tokens per request:
about 32,764 characters.

**Solution:** `@instant.dev/vectors` provides a simple `VectorManager` utility that performs
automatic, efficient batch creation of vectors via APIs. It will automatically collect
vector creation requests over a 100ms (configurable) timeframe and batch them to minimize
vector creation requests.

It is most useful in web server contexts where multiple user requests may be
creating vectors at the same time. If you rely on the same `VectorManager` instance
all of these disparate requests will be efficiently batched.

## Installation and Importing

To use this library you'll need to also work with a vector creation tool, like OpenAI.

```shell
npm i @instant.dev/vectors --save # vector management
npm i openai --save # openai for the engine
```

CommonJS:

```javascript
const { VectorManager } = require('@instant.dev/vectors');
const OpenAI = require('openai');

const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
const Vectors = new VectorManager();
```

ESM:

```javascript
import { VectorManager } from '@instant.dev/vectors';
import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
    organization: "YOUR_ORG_ID",
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);
const Vectors = new VectorManager();
```

## Usage

Once you've imported and instantiated the package, you can use it like so.

Set a batch engine:

```javascript
// values will automatically be batched appropriately
Vectors.setEngine(async (values) => {
  const embeddingResult = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: values,
  });
  return embeddingResult.data.map(entry => entry.embedding);
});
```

Create a single vector:

```javascript
let vector = await Vectors.create(`Something to vectorize!`);
```

Create multiple vectors, will automatically batch:

```javascript
const myStrings = [
  `Some string!`,
  `Can also be a lot longer`,
  `W`.repeat(1000),
  // ...
];

let vectors = await Promise.all(myStrings.map(str => Vectors.create(str)));
```

Create multiple vectors with `batchCreate` utility:

```javascript
const myStrings = [
  `Some string!`,
  `Can also be a lot longer`,
  `W`.repeat(1000),
  // ...
];

let vectors = await Vectors.batchCreate(myStrings);
```

# Acknowledgements

Special thank you to [Scott Gamble](https://x.com/threesided) who helps run all
of the front-of-house work for instant.dev 💜!

| Destination | Link |
| ----------- | ---- |
| Home | [instant.dev](https://instant.dev) |
| GitHub | [github.com/instant-dev](https://github.com/instant-dev) |
| Discord | [discord.gg/puVYgA7ZMh](https://discord.gg/puVYgA7ZMh) |
| X / instant.dev | [x.com/instantdevs](https://x.com/instantdevs) |
| X / Keith Horwood | [x.com/keithwhor](https://x.com/keithwhor) |
| X / Scott Gamble | [x.com/threesided](https://x.com/threesided) |