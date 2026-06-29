import { useState, useRef, useEffect } from 'react';
import init, { WasmOptimizer, WasmGeneticPool, init_gpu_generation_state, evaluate_single_placement, pack } from 'rustport';
import { Viewer } from './components/Viewer';
import { Sidebar } from './components/Sidebar';
import type { SidebarConfig } from './components/Sidebar';
import { generateRandomBoxes, createBoxCloud, parseCsvBoxes, formatCsvExport } from './utils/boxUtils';
import type { CloudBox, JsResult } from './utils/boxUtils';
import './App.css';

/**
 * Main application component.
 */
function App() {
  const [boxes, setBoxes] = useState<CloudBox[]>([]);
  const [stats, setStats] = useState({ binCount: 1, score: 0 });
  const [generationCount, setGenerationCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);
  const [isImported, setIsImported] = useState(false);
  const [mode, setMode] = useState<'optimizer' | 'oneshot'>('optimizer');
  const [gpuError, setGpuError] = useState<string | null>(null);
  
  const [config, setConfig] = useState<SidebarConfig>({
    solver: "best_fit_ems",
    gpuSolver: "best_fit_ems",
    computeMode: 'cpu',
    populationSize: 32,
    eliteCount: 4,
    generations: 20,
    binW: 100,
    binH: 100,
    binD: 100,
    gpuBatchSize: 10,
    gpuMaxBins: 16,
    gpuMaxSpaces: 128
  });

  const cpuOptimizerRef = useRef<WasmOptimizer | null>(null);
  const gpuPoolRef = useRef<WasmGeneticPool | null>(null);
  const gpuStateRef = useRef<any>(null);
  const prevConfigRef = useRef<SidebarConfig>(config);
  const colorsRef = useRef<Record<number, string>>({});
  const stopRef = useRef<boolean>(false);

  // Initialize Wasm on mount
  useEffect(() => {
    init().then(() => setWasmReady(true));
  }, []);

  // Generate initial cloud
  useEffect(() => {
    const rawBoxes = generateRandomBoxes(100);
    const cloudValue = createBoxCloud(rawBoxes);
    
    // Store colors for consistency
    const colors: Record<number, string> = {};
    cloudValue.forEach(b => { colors[b.id] = b.color; });
    colorsRef.current = colors;
    
    setBoxes(cloudValue);
    // Reset optimizer on new box generation
    if (cpuOptimizerRef.current) cpuOptimizerRef.current = null;
    if (gpuPoolRef.current) gpuPoolRef.current = null;
  }, []);

  const handleStartOptimization = async () => {
    if (!wasmReady) return;
    stopRef.current = false;
    setIsRunning(true);

    try {
      // Check if config changed – if so, reset optimizer
      const configChanged = 
        config.solver !== prevConfigRef.current.solver ||
        config.gpuSolver !== prevConfigRef.current.gpuSolver ||
        config.computeMode !== prevConfigRef.current.computeMode ||
        config.populationSize !== prevConfigRef.current.populationSize ||
        config.eliteCount !== prevConfigRef.current.eliteCount ||
        config.binW !== prevConfigRef.current.binW ||
        config.binH !== prevConfigRef.current.binH ||
        config.binD !== prevConfigRef.current.binD;

      if (configChanged) {
        if (cpuOptimizerRef.current) cpuOptimizerRef.current = null;
        if (gpuPoolRef.current) gpuPoolRef.current = null;
        prevConfigRef.current = config;
        setGenerationCount(0);
      }

      const jsConfig = {
        bin: { w: config.binW, h: config.binH, d: config.binD, max_weight: 0 },
        boxes: boxes.map(b => ({ id: b.id, w: b.w, h: b.h, d: b.d, weight: b.weight })),
        solver: config.computeMode === 'gpu' ? config.gpuSolver : config.solver,
        population_size: config.populationSize,
        elite_count: config.eliteCount,
        growing_bin: false,
        grow_axis: "y",
        rotation_axes: [0, 1, 2]
      };

      // Initialize optimizer if first run after reset
      if (config.computeMode === 'gpu') {
        if (!gpuPoolRef.current || !gpuStateRef.current) {
          gpuPoolRef.current = new WasmGeneticPool(jsConfig);
          
          const flatBoxes = new Float32Array(boxes.length * 4);
          for (let i = 0; i < boxes.length; i++) {
              flatBoxes[i*4+0] = boxes[i].w;
              flatBoxes[i*4+1] = boxes[i].h;
              flatBoxes[i*4+2] = boxes[i].d;
              flatBoxes[i*4+3] = boxes[i].weight || 1;
          }
          const initialOrders = gpuPoolRef.current.get_current_orders_flat();
          
          if (gpuStateRef.current) gpuStateRef.current.free();
          try {
            gpuStateRef.current = await init_gpu_generation_state(
                flatBoxes, initialOrders, 
                config.binW, config.binH, config.binD, 0, 7,
                config.gpuMaxBins, config.gpuMaxSpaces, config.gpuBatchSize
            );
          } catch (gpuErr) {
            const msg = gpuErr instanceof Error
              ? gpuErr.message
              : typeof gpuErr === 'string' ? gpuErr : String(gpuErr);
            console.error('WebGPU init failed:', gpuErr);
            setGpuError(msg);
            setIsRunning(false);
            return;
          }
        }
      } else {
        if (!cpuOptimizerRef.current) {
          cpuOptimizerRef.current = new WasmOptimizer(jsConfig);
        }
      }

      // Run generations one at a time, yielding to the browser between each
      // so React can repaint with the latest best result.
      let bestScore = stats.score;
      let currentGpuBestScore = stats.score;
      for (let i = 0; i < config.generations; i++) {
        if (stopRef.current) break;

        let result: JsResult | null = null;
        
        if (config.computeMode === 'gpu') {
          const orders = gpuPoolRef.current!.get_current_orders_flat();
          const scores = await gpuStateRef.current.evaluate(orders);
          
          let genBestScore = -Infinity;
          for (let j = 0; j < scores.length; j++) {
            if (scores[j] > genBestScore) {
              genBestScore = scores[j];
            }
          }
          
          gpuPoolRef.current!.advance_generation(scores);
          
          // CPU Fallback to reconstruct winning permutation for rendering
          // Only do this if the GPU found a strictly better score
          if (genBestScore > currentGpuBestScore) {
            currentGpuBestScore = genBestScore;
            result = evaluate_single_placement(jsConfig, gpuPoolRef.current!.get_best_order());
          }
        } else {
          result = cpuOptimizerRef.current!.run_generation();
        }
        
        setGenerationCount(prev => prev + 1);

        // Paint immediately if this generation produced a better solution
        if (result && result.score > bestScore) {
          bestScore = result.score;
          const nextBoxes: CloudBox[] = result.packed.map(pb => ({
            id: pb.id,
            w: pb.w,
            h: pb.h,
            d: pb.d,
            x: pb.x,
            y: pb.y,
            z: pb.z,
            binIndex: pb.bin_index,
            weight: pb.weight,
            color: colorsRef.current[pb.id] || '#ffffff'
          }));
          setBoxes(nextBoxes);
          setStats({ binCount: result.bin_count, score: result.score });
        }

        // Yield to browser event loop so the UI can repaint and handle stop clicks
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (err) {
      console.error("Optimization failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    stopRef.current = true;
  };

  const handleRunOneShot = () => {
    if (!wasmReady) return;
    setIsRunning(true);
    try {
      // Sort boxes largest-volume-first for best greedy packing
      const sortedBoxes = [...boxes].sort(
        (a, b) => (b.w * b.h * b.d) - (a.w * a.h * a.d)
      );
      const jsConfig = {
        bin: { w: config.binW, h: config.binH, d: config.binD, max_weight: 0 },
        boxes: sortedBoxes.map(b => ({ id: b.id, w: b.w, h: b.h, d: b.d, weight: b.weight })),
        solver: config.solver,
        rotation_axes: [0, 1, 2]
      };
      const result: JsResult = pack(jsConfig);
      if (result) {
        // Calculate score for one-shot: sum of box volumes in bins 0 to (bin_count - 2)
        // divided by total volume of those bins.
        let calculatedScore = 0;
        if (result.bin_count > 1) {
          const binVolume = config.binW * config.binH * config.binD;
          const fullBinsVolume = (result.bin_count - 1) * binVolume;
          
          const packedBoxesInFullBins = result.packed.filter(pb => pb.bin_index < result.bin_count - 1);
          const packedVolume = packedBoxesInFullBins.reduce((sum, pb) => sum + (pb.w * pb.h * pb.d), 0);
          
          calculatedScore = packedVolume / fullBinsVolume;
        }

        const nextBoxes: CloudBox[] = result.packed.map(pb => ({
          id: pb.id,
          w: pb.w,
          h: pb.h,
          d: pb.d,
          x: pb.x,
          y: pb.y,
          z: pb.z,
          binIndex: pb.bin_index,
          weight: pb.weight,
          color: colorsRef.current[pb.id] || '#ffffff'
        }));
        setBoxes(nextBoxes);
        setStats({ binCount: result.bin_count, score: calculatedScore });
      }
    } catch (err) {
      console.error('One-shot packing failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const rawBoxes = parseCsvBoxes(text);
        if (rawBoxes.length > 0) {
          const cloudValue = createBoxCloud(rawBoxes);
          
          const colors: Record<number, string> = {};
          cloudValue.forEach(b => { colors[b.id] = b.color; });
          colorsRef.current = colors;
          
          setBoxes(cloudValue);
          setStats({ binCount: 1, score: 0 });
          setIsImported(true);
          if (cpuOptimizerRef.current) cpuOptimizerRef.current = null;
          if (gpuPoolRef.current) gpuPoolRef.current = null;
        } else {
          alert('No valid boxes found in CSV');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportCsv = () => {
    const csvText = formatCsvExport(boxes);
    if (!csvText || csvText.trim() === "Bin,Box,x, y, z, w ,h ,d" || csvText.split('\n').length <= 2) {
       alert('No solution to export – run the solver first.');
       return;
    }

    const blob = new Blob([csvText], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solution.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      <Viewer boxes={boxes} binCount={stats.binCount} binSize={{ w: config.binW, h: config.binH, d: config.binD }} />
      
      {/* UI Overlay */}
      <div className="ui-overlay">
        <h1>3d Binpacker</h1>
        <p>{boxes.length} {isImported ? 'Boxes to be packed' : 'Boxes pre-generated for demo use'}</p>
      </div>

      <Sidebar 
        mode={mode}
        onModeChange={setMode}
        onStartOptimization={handleStartOptimization}
        onRunOneShot={handleRunOneShot}
        onStop={handleStop}
        config={config}
        onConfigChange={(newPart) => setConfig({ ...config, ...newPart })}
        isRunning={isRunning}
        canExport={boxes.some(b => b.binIndex !== undefined)}
        binCount={stats.binCount}
        score={stats.score}
        generationCount={generationCount}
        onImportCsv={handleImportCsv}
        onExportCsv={handleExportCsv}
      />

      {/* WebGPU error modal */}
      {gpuError !== null && (
        <div
          className="webgpu-error-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="webgpu-error-title"
          onClick={(e) => { if (e.target === e.currentTarget) setGpuError(null); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setGpuError(null); }}
          tabIndex={-1}
        >
          <div className="webgpu-error-card">
            <div className="webgpu-error-icon">⚠️</div>
            <h2 id="webgpu-error-title">WebGPU Not Available</h2>
            <p>Your browser or device could not initialise the WebGPU adapter. GPU-accelerated features will be unavailable.</p>
            {gpuError && (
              <div className="webgpu-error-detail">{gpuError}</div>
            )}
            <div className="webgpu-error-links">
              <a href="https://caniuse.com/webgpu" target="_blank" rel="noopener noreferrer">Browser support ↗</a>
              <a href="https://developer.chrome.com/docs/capabilities/webgpu" target="_blank" rel="noopener noreferrer">Chrome guide ↗</a>
              <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API" target="_blank" rel="noopener noreferrer">MDN WebGPU ↗</a>
            </div>
            <button className="webgpu-error-dismiss" onClick={() => setGpuError(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
