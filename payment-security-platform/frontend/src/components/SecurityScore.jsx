import React from 'react';

export default function SecurityScore({ score }) {
  return (
    <div className="security-score">
      <h2>Overall Security Score: {score}/100</h2>
    </div>
  );
}
