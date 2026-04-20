export interface SidebarConfig {
  solver: "best_fit_ems" | "first_fit_ems" | "best_fit_3d" | "first_fit_3d";
  populationSize: number;
  eliteCount: number;
}

interface SidebarProps {
  onStartOptimization: () => void;
  config: SidebarConfig;
  onConfigChange: (newConfig: Partial<SidebarConfig>) => void;
  binCount: number;
  score: number;
  isRunning: boolean;
}

/**
 * A premium floating sidebar for controls and statistics.
 */
export const Sidebar: React.FC<SidebarProps> = ({ 
  onStartOptimization, 
  config,
  onConfigChange,
  binCount, 
  score,
  isRunning
}) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h2>Configuration</h2>
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

          <div className="config-row">
            <div className="config-group">
              <label>Population</label>
              <input 
                type="number" 
                value={config.populationSize} 
                onChange={(e) => onConfigChange({ populationSize: parseInt(e.target.value) || 0 })}
                disabled={isRunning}
              />
            </div>
            <div className="config-group">
              <label>Elite</label>
              <input 
                type="number" 
                value={config.eliteCount} 
                onChange={(e) => onConfigChange({ eliteCount: parseInt(e.target.value) || 0 })}
                disabled={isRunning}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="sidebar-divider" />
      
      <div className="sidebar-section">
        <h2>Statistics</h2>
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Bins</span>
            <span className="stat-value">{binCount || '--'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score ? score.toFixed(4) : '--'}</span>
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <button 
          className="primary-button" 
          onClick={onStartOptimization}
          disabled={isRunning}
        >
          {isRunning ? 'Optimizing...' : 'Start Optimization'}
        </button>
      </div>
    </aside>
  );
};
