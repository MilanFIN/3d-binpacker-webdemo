/**
 * A box item supplied to the Rust optimizer.
 */
export interface JsBox {
  id: number;
  w: number;
  h: number;
  d: number;
  weight: number;
}

/**
 * Bin dimensions supplied to the Rust optimizer.
 */
export interface JsBin {
  w: number;
  h: number;
  d: number;
  max_weight: number;
}

/**
 * Configuration for the optimizer.
 */
export interface JsConfig {
  bin: JsBin;
  boxes: JsBox[];
  solver: "best_fit_ems" | "first_fit_ems" | "best_fit_3d" | "first_fit_3d";
  population_size: number;
  elite_count: number;
  growing_bin: boolean;
  grow_axis: "x" | "y" | "z";
  rotation_axes: number[];
}

/**
 * A packed box returned from Wasm.
 */
export interface JsPackedBox {
  id: number;
  bin_index: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  weight: number;
}

/**
 * Result of an optimization loop.
 */
export interface JsResult {
  packed: JsPackedBox[];
  bin_count: number;
  score: number;
}

/**
 * A box with 3D position and color for visualization.
 */
export interface CloudBox extends JsBox {
  x: number;
  y: number;
  z: number;
  binIndex?: number;
  color: string;
}

/**
 * Generates a random set of boxes.
 * 
 * @param count Number of boxes to generate.
 * @param minDim Minimum dimension for any side.
 * @param maxDim Maximum dimension for any side.
 * @returns Array of JsBox objects.
 */
export function generateRandomBoxes(
  count: number,
  minDim: number = 10,
  maxDim: number = 40
): JsBox[] {
  const boxes: JsBox[] = [];

  for (let i = 0; i < count; i++) {
    boxes.push({
      id: i,
      w: Math.floor(Math.random() * (maxDim - minDim + 1)) + minDim,
      h: Math.floor(Math.random() * (maxDim - minDim + 1)) + minDim,
      d: Math.floor(Math.random() * (maxDim - minDim + 1)) + minDim,
      weight: Math.random() * 10,
    });
  }

  return boxes;
}

/**
 * Arranges boxes in a non-overlapping 3D cloud.
 * Uses a jittered grid strategy to ensure spacing.
 * 
 * @param boxes Input boxes.
 * @param baseSpacing Minimum distance between grid centers.
 * @returns Array of CloudBox objects.
 */
export function createBoxCloud(
  boxes: JsBox[],
  baseSpacing: number = 60
): CloudBox[] {
  const count = boxes.length;
  // Calculate grid size (cube root)
  const gridSize = Math.ceil(Math.pow(count, 1/3));
  
  const cloud: CloudBox[] = [];
  
  // Center the grid around [0,0,0]
  const offset = ((gridSize - 1) * baseSpacing) / 2;

  let index = 0;
  for (let gx = 0; gx < gridSize && index < count; gx++) {
    for (let gy = 0; gy < gridSize && index < count; gy++) {
      for (let gz = 0; gz < gridSize && index < count; gz++) {
        const box = boxes[index];
        
        // Random jitter within the grid cell
        const jitter = baseSpacing * 0.2;
        const jx = (Math.random() - 0.5) * jitter;
        const jy = (Math.random() - 0.5) * jitter;
        const jz = (Math.random() - 0.5) * jitter;

        const x = gx * baseSpacing - offset + jx;
        const y = gy * baseSpacing - offset + jy;
        const z = gz * baseSpacing - offset + jz;

        // Generate a vibrant color
        const hue = Math.floor(Math.random() * 360);
        const color = `hsl(${hue}, 70%, 60%)`;

        cloud.push({
          ...box,
          x, y, z,
          color
        });
        
        index++;
      }
    }
  }

  return cloud;
}

/**
 * Parses boxes from a CSV string matching the Java demo format.
 * Format: w, h, d, [weight] 
 */
export function parseCsvBoxes(csvText: string): JsBox[] {
  const boxes: JsBox[] = [];
  const lines = csvText.split('\n');
  let idCounter = 0;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    const parts = line.split(',');
    if (parts.length >= 3) {
      const w = parseFloat(parts[0].trim());
      const h = parseFloat(parts[1].trim());
      const d = parseFloat(parts[2].trim());
      let weight = 0;
      if (parts.length >= 4) {
        weight = parseFloat(parts[3].trim());
      }
      
      if (!isNaN(w) && !isNaN(h) && !isNaN(d)) {
        boxes.push({ id: idCounter++, w, h, d, weight });
      }
    }
  }

  return boxes;
}

/**
 * Formats packed boxes into a CSV string matching Java's exportCsv.
 * Format: Bin,Box,x, y, z, w ,h ,d \n
 */
export function formatCsvExport(boxes: CloudBox[]): string {
  let csv = "Bin,Box,x, y, z, w ,h ,d \n";
  const binnedBoxes: Record<number, CloudBox[]> = {};

  for (const box of boxes) {
    if (box.binIndex !== undefined) {
      if (!binnedBoxes[box.binIndex]) binnedBoxes[box.binIndex] = [];
      binnedBoxes[box.binIndex].push(box);
    }
  }

  // Iterate over bins sorted by index
  const sortedBins = Object.keys(binnedBoxes).map(Number).sort((a, b) => a - b);
  for (const binIndex of sortedBins) {
    for (const box of binnedBoxes[binIndex]) {
      csv += `${binIndex},${box.id},${box.x},${box.y},${box.z},${box.w},${box.h},${box.d}\n`;
    }
  }

  return csv;
}
