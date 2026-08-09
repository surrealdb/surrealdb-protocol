<br>

<p align="center">
    <img width=120 src="https://raw.githubusercontent.com/surrealdb/icons/main/surreal.svg" />
</p>

<h3 align="center">SurrealDB cbor.js</h3>

<br>

<p align="center">
    <a href="https://github.com/surrealdb/cbor.js"><img src="https://img.shields.io/badge/status-beta-ff00bb.svg?style=flat-square"></a>
    &nbsp;
    <a href="https://www.npmjs.com/package/@surrealdb/cbor"><img src="https://img.shields.io/npm/v/%40surrealdb%2Fcbor?style=flat-square"></a>
</p>

<p align="center">
    <a href="https://surrealdb.com/discord"><img src="https://img.shields.io/discord/902568124350599239?label=discord&style=flat-square&color=5a66f6"></a>
    &nbsp;
    <a href="https://twitter.com/surrealdb"><img src="https://img.shields.io/badge/twitter-follow_us-1d9bf0.svg?style=flat-square"></a>
    &nbsp;
    <a href="https://www.linkedin.com/company/surrealdb/"><img src="https://img.shields.io/badge/linkedin-connect_with_us-0a66c2.svg?style=flat-square"></a>
    &nbsp;
    <a href="https://www.youtube.com/channel/UCjf2teVEuYVvvVC-gFZNq6w"><img src="https://img.shields.io/badge/youtube-subscribe-fc1c1c.svg?style=flat-square"></a>
</p>

# cbor.js

This library implements an efficient and lightweight CBOR encoder and decoder. While primary used by SurrealDB, it can be used independently for other projects.

Some features include:
- Full support for the cbor specification
- Support for partial encoding and decoding
- Support for custom tagged values

## How to install

Install it with:

```sh
# using npm
npm i @surrealdb/cbor
# or using pnpm
pnpm i @surrealdb/cbor
# or using yarn
yarn add @surrealdb/cbor
```

Next, just import it with:

```ts
const { decode, encode } = require("@surrealdb/cbor");
```

or when you use modules:

```ts
import { decode, encode } from "@surrealdb/cbor";
```

## Example usage

### Simple encode and decode
```ts
import { decode, encode } from "@surrealdb/cbor";

const cbor = encode(data);
const data = decode(cbor);
```

### Custom tagged values
```ts
import { decode, encode, Tagged } from "@surrealdb/cbor";

const TAG_SPEC_UUID = 37;

const cbor = encode(data, {
    replacer: (v) => {
		if (v instanceof Uuid) {
            return new Tagged(TAG_SPEC_UUID, v.toBuffer());
        }
		return v;
	},
});

const data = decode(cbor, {
	tagged: {
		[TAG_SPEC_UUID]: (v) => new Uuid(v),
	}
});
```