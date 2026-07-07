# 3D Binpacker Webdemo

This is a Vite-based demo for the 3d binpacker implementation in rust & webassembly.

## Key Features

* Interactive 3D visualization of bins and boxes.
* **CPU Mode**: WebAssembly-based execution for genetic and one-shot algorithms.
* **GPU Mode**: WebGPU integration for evaluating genetic permutations in parallel.
* CSV import and export functionality for loading and saving box configurations.

## Getting Started

To run the webdemo locally, you will need Node.js and NPM installed.

1. **WASM Dependencies**: The WebAssembly build files from the [rustport project](https://github.com/MilanFIN/3d-binpacker-rust) must be placed in the `src/rustport` directory. These files are already included in the repository by default. You only need to manually update them if you modify the underlying Rust code.
2. Install the required NPM dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Usage

The sidebar provides controls for configuring the bin packing execution:
* **One-Shot vs Optimization**: "One-Shot" runs a single deterministic greedy algorithm pass. "Optimization" uses a Genetic Algorithm to iteratively improve the packing over multiple generations.
* **Population Size**: The number of different packing permutations evaluated in each generation.
* **Generations**: The number of iterations the genetic algorithm will run.
* **Elite Count**: The number of best-performing solutions carried over directly to the next generation without modification.
* **Compute Mode**: Choose between CPU (WebAssembly) and GPU (WebGPU) computing. GPU mode is restricted to the optimizer.

## CSV Formats

### Input
When importing boxes, each line should represent a box in the following format:
`width, height, depth, [weight]`

The weight parameter is optional. Lines starting with `#` are ignored.

### Output
The exported solution includes a header row followed by lines in the following format:
`Bin, Box, x, y, z, w, h, d`

This represents each packed box's bin assignment, ID, position, and dimensions.
