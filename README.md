# Web Demo

This is a Vite-based demo for the `rustport` bin-packing library.

## Setup

First, build the WebAssembly package rust library. Then copy it over (presuming it's in rustport folder)

```bash
cd ../rustport
wasm-pack build --target web
```

Then, install the dependencies and link the local package in this directory:

```bash
cd ../webdemo
npm install
npm install ../rustport/pkg
```

## Running

To start the development server:

```bash
npm run dev
```
