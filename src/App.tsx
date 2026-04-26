import { useState, useRef, useEffect } from 'react';
import init, { WasmOptimizer } from 'rustport';
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
  
  const [config, setConfig] = useState<SidebarConfig>({
    solver: "best_fit_ems",
    populationSize: 32,
    eliteCount: 4,
    generations: 20,
    binW: 100,
    binH: 100,
    binD: 100
  });

  const optimizerRef = useRef<WasmOptimizer | null>(null);
  const prevConfigRef = useRef<SidebarConfig>(config);
  const colorsRef = useRef<Record<number, string>>({});
  const stopRef = useRef<boolean>(false);

  // Initialize Wasm on mount
  useEffect(() => {
    init().then(() => setWasmReady(true));
  }, []);

  // Generate initial cloud
  useEffect(() => {
    const rawBoxes = generateRandomBoxes(300);
    const cloudValue = createBoxCloud(rawBoxes);
    
    // Store colors for consistency
    const colors: Record<number, string> = {};
    cloudValue.forEach(b => { colors[b.id] = b.color; });
    colorsRef.current = colors;
    
    setBoxes(cloudValue);
    // Reset optimizer on new box generation
    if (optimizerRef.current) {
      optimizerRef.current = null;
    }
  }, []);

  const handleStartOptimization = async () => {
    if (!wasmReady) return;
    stopRef.current = false;
    setIsRunning(true);

    try {
      // Check if config changed – if so, reset optimizer
      const configChanged = 
        config.solver !== prevConfigRef.current.solver ||
        config.populationSize !== prevConfigRef.current.populationSize ||
        config.eliteCount !== prevConfigRef.current.eliteCount ||
        config.binW !== prevConfigRef.current.binW ||
        config.binH !== prevConfigRef.current.binH ||
        config.binD !== prevConfigRef.current.binD;

      if (configChanged) {
        if (optimizerRef.current) optimizerRef.current = null;
        prevConfigRef.current = config;
        setGenerationCount(0);
      }

      // Initialize optimizer if first run after reset
      if (!optimizerRef.current) {
        const jsConfig = {
          bin: { w: config.binW, h: config.binH, d: config.binD, max_weight: 0 },
          boxes: boxes.map(b => ({ id: b.id, w: b.w, h: b.h, d: b.d, weight: b.weight })),
          solver: config.solver,
          population_size: config.populationSize,
          elite_count: config.eliteCount,
          growing_bin: false,
          grow_axis: "y",
          rotation_axes: [0, 1, 2]
        };
        optimizerRef.current = new WasmOptimizer(jsConfig);
      }

      // Run generations one at a time, yielding to the browser between each
      // so React can repaint with the latest best result.
      let bestScore = stats.score;
      for (let i = 0; i < config.generations; i++) {
        if (stopRef.current) break;

        const result: JsResult = optimizerRef.current.run_generation();
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
          optimizerRef.current = null;
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
        onStartOptimization={handleStartOptimization}
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
    </div>
  );
}

export default App;
