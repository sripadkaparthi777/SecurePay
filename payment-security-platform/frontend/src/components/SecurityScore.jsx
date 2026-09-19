import React from 'react';

export default function SecurityScore({ score }) {
  const getColor = (s) => {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card security-score-container" style={{ textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '120px', height: '120px' }}>
        <svg style={{ transform: 'rotate(-90deg)', width: '120px', height: '120px' }}>
          <circle
            cx="60" cy="60" r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          <circle
            cx="60" cy="60" r={radius}
            fill="transparent"
            stroke={getColor(score)}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '28px', fontWeight: 'bold', color: getColor(score), textShadow: `0 0 10px ${getColor(score)}44` }}>{score}</span>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800' }}>SCORE</div>
        </div>
      </div>
      <h3 style={{ marginTop: '16px', fontSize: '12px', color: '#e2e8f0' }}>SYSTEM INTEGRITY</h3>
      <div style={{ color: getColor(score), fontSize: '11px', fontWeight: '900', letterSpacing: '1px' }}>
        {score >= 80 ? 'OPTIMAL' : score >= 60 ? 'DEGRADED' : 'CRITICAL'}
      </div>
    </div>
  );
}
