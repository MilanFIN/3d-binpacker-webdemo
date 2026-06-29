/* tslint:disable */
/* eslint-disable */

export class GpuGenerationState {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    evaluate(orders_flat: Int32Array): Promise<Float32Array>;
}

/**
 * Genetic pool state mapped in WASM, avoiding JS object allocation overhead
 */
export class WasmGeneticPool {
    free(): void;
    [Symbol.dispose](): void;
    advance_generation(scores_flat: Float32Array): void;
    get_best_order(): Int32Array;
    get_current_orders_flat(): Int32Array;
    constructor(config: any);
}

/**
 * Stateful genetic-algorithm optimizer exposed to JavaScript.
 *
 * ```js
 * import init, { WasmOptimizer } from './rustport/pkg/rustport.js';
 * await init();
 *
 * const opt = new WasmOptimizer({
 *   bin:   { w: 100, h: 100, d: 100 },
 *   boxes: [{ id: 1, w: 30, h: 30, d: 30 }, ...],
 *   solver: "best_fit_ems",
 *   population_size: 32,
 *   elite_count: 4,
 * });
 *
 * for (let i = 0; i < 50; i++) {
 *   const result = opt.run_generation();
 *   console.log(result);
 * }
 * ```
 */
export class WasmOptimizer {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Construct a new optimizer from a JS config object.
     *
     * Throws a JS error if config is invalid.
     */
    constructor(config: any);
    /**
     * Run one generation of the genetic algorithm.
     *
     * Returns a `JsResult` object: `{ packed: [...], bin_count, score }`.
     */
    run_generation(): any;
}

export function evaluate_single_placement(config: any, best_order: Int32Array): any;

export function init_gpu_generation_state(boxes_flat: Float32Array, orders_flat: Int32Array, bin_w: number, bin_h: number, bin_d: number, bin_weight: number, rotation_mask: number, max_bins: number, max_spaces_per_bin: number, batch_size: number): Promise<GpuGenerationState>;

/**
 * Pack boxes into bins in a single call (no optimisation loop).
 *
 * ```js
 * import init, { pack } from './rustport/pkg/rustport.js';
 * await init();
 *
 * const result = pack({
 *   bin:   { w: 100, h: 100, d: 100 },
 *   boxes: [{ id: 1, w: 40, h: 40, d: 40 }, { id: 2, w: 20, h: 20, d: 20 }],
 * });
 * console.log(result.packed);
 * ```
 */
export function pack(config: any): any;

export function start(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_gpugenerationstate_free: (a: number, b: number) => void;
    readonly __wbg_wasmgeneticpool_free: (a: number, b: number) => void;
    readonly __wbg_wasmoptimizer_free: (a: number, b: number) => void;
    readonly evaluate_single_placement: (a: any, b: number, c: number) => [number, number, number];
    readonly gpugenerationstate_evaluate: (a: number, b: number, c: number) => any;
    readonly init_gpu_generation_state: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => any;
    readonly pack: (a: any) => [number, number, number];
    readonly wasmgeneticpool_advance_generation: (a: number, b: number, c: number) => void;
    readonly wasmgeneticpool_get_best_order: (a: number) => any;
    readonly wasmgeneticpool_get_current_orders_flat: (a: number) => any;
    readonly wasmgeneticpool_new: (a: any) => [number, number, number];
    readonly wasmoptimizer_new: (a: any) => [number, number, number];
    readonly wasmoptimizer_run_generation: (a: number) => any;
    readonly start: () => void;
    readonly wasm_bindgen__convert__closures_____invoke__hcf53d5153dee6e07: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen__convert__closures_____invoke__h4657a9fbfdc97dd1: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen__convert__closures_____invoke__h20ae50087089e601: (a: number, b: number, c: any) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
