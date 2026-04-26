import React, { useRef } from 'react';

export interface SidebarConfig {
  solver: "best_fit_ems" | "first_fit_ems" | "best_fit_3d" | "first_fit_3d";
  populationSize: number;
  eliteCount: number;
  generations: number;
  binW: number;
  binH: number;
  binD: number;
}

interface SidebarProps {
  mode: 'optimizer' | 'oneshot';
  onModeChange: (mode: 'optimizer' | 'oneshot') => void;
  onStartOptimization: () => void;
  onRunOneShot: () => void;
  onStop: () => void;
  config: SidebarConfig;
  onConfigChange: (newConfig: Partial<SidebarConfig>) => void;
  isRunning: boolean;
  canExport: boolean;
  binCount: number;
  score: number;
  generationCount: number;
  onImportCsv: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportCsv: () => void;
}

/**
 * A premium floating sidebar for controls and statistics.
 */
export const Sidebar: React.FC<SidebarProps> = ({ 
  mode,
  onModeChange,
  onStartOptimization,
  onRunOneShot,
  onStop,
  config,
  onConfigChange,
  isRunning,
  canExport,
  binCount,
  score,
  generationCount,
  onImportCsv,
  onExportCsv
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h2>Configuration</h2>

        {/* Mode toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-toggle-btn${mode === 'optimizer' ? ' active' : ''}`}
            onClick={() => onModeChange('optimizer')}
            disabled={isRunning}
          >Optimizer</button>
          <button
            className={`mode-toggle-btn${mode === 'oneshot' ? ' active' : ''}`}
            onClick={() => onModeChange('oneshot')}
            disabled={isRunning}
          >One-Shot</button>
        </div>

        <div className="config-form">
          <div className="config-group">
            <label>Algorithm</label>
            <select 
              value={config.solver} 
              onChange={(e) => onConfigChange({ solver: e.target.value as any })}
              disabled={isRunning}
            >
              <option value="best_fit_ems">Best Fit EMS</option>
              <option value="first_fit_ems">First Fit EMS</option>
              <option value="best_fit_3d">Best Fit 3D</option>
              <option value="first_fit_3d">First Fit 3D</option>
            </select>
          </div>


          {mode === 'optimizer' && (
            <div className="config-row">
              <div className="config-group config-group--compact">
                <label>Pop.</label>
                <input 
                  type="number" 
                  value={config.populationSize} 
                  onChange={(e) => onConfigChange({ populationSize: parseInt(e.target.value) || 0 })}
                  disabled={isRunning}
                />
              </div>
              <div className="config-group config-group--compact">
                <label>Gens.</label>
                <input 
                  type="number" 
                  value={config.generations} 
                  onChange={(e) => onConfigChange({ generations: parseInt(e.target.value) || 0 })}
                  disabled={isRunning}
                />
              </div>
              <div className="config-group config-group--compact">
                <label>Elite</label>
                <input 
                  type="number" 
                  value={config.eliteCount} 
                  onChange={(e) => onConfigChange({ eliteCount: parseInt(e.target.value) || 0 })}
                  disabled={isRunning}
                />
              </div>
            </div>
          )}
          <div className="sidebar-divider" style={{ margin: '8px 0' }} />
          <div className="config-row">
            <div className="config-group config-group--compact">
              <label>W</label>
              <input 
                type="number" 
                value={config.binW} 
                onChange={(e) => onConfigChange({ binW: parseInt(e.target.value) || 0 })}
                disabled={isRunning}
              />
            </div>
            <div className="config-group config-group--compact">
              <label>H</label>
              <input 
                type="number" 
                value={config.binH} 
                onChange={(e) => onConfigChange({ binH: parseInt(e.target.value) || 0 })}
                disabled={isRunning}
              />
            </div>
            <div className="config-group config-group--compact">
              <label>D</label>
              <input 
                type="number" 
                value={config.binD} 
                onChange={(e) => onConfigChange({ binD: parseInt(e.target.value) || 0 })}
                disabled={isRunning}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="sidebar-divider" />
      
      <div className="sidebar-section">
        <h2>Data</h2>
        <div className="stat-grid" style={{ gridTemplateColumns: '1fr', gap: '8px' }}>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={onImportCsv}
            style={{ display: 'none' }}
          />
          <button 
            className="primary-button" 
            style={{ padding: '0.75rem', fontSize: '0.9rem', background: '#333', color: '#fff' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isRunning}
          >
            Import CSV
          </button>
        </div>
      </div>
      
      <div className="sidebar-divider" />

      <div className="sidebar-section">
        <h2>Statistics</h2>
        <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="stat-item">
            <span className="stat-label">Bins</span>
            <span className="stat-value">{binCount || '--'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score ? score.toFixed(4) : '--'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Generations</span>
            <span className="stat-value">{generationCount || '--'}</span>
          </div>
        </div>
      </div>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {isRunning && mode === 'optimizer' ? (
          <button 
            className="primary-button stop-button" 
            onClick={onStop}
          >
            Stop
          </button>
        ) : (
          <button 
            className="primary-button" 
            onClick={mode === 'optimizer' ? onStartOptimization : onRunOneShot}
            disabled={isRunning}
          >
            {mode === 'optimizer' ? 'Start Optimization' : 'Run'}
          </button>
        )}
        <button 
          className="primary-button" 
          style={{ padding: '0.75rem', fontSize: '0.9rem', background: '#333', color: '#fff' }}
          onClick={onExportCsv}
          disabled={isRunning || !canExport}
        >
          Export Solution CSV
        </button>
      </div>
    </aside>
  );
};
