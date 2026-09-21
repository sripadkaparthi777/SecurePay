import React, { useState } from 'react';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '';

function formatAmount(value) {
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

export default function AttackSimulation() {
  const [originalAmount, setOriginalAmount] =
    useState('500');

  const [modifiedAmount, setModifiedAmount] =
    useState('50000');

  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState('');

  async function runAmountManipulation() {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem(
        'securepay_token'
      );

      if (!token) {
        throw new Error(
          'Authentication token is not available.'
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/attack-simulation/amount-manipulation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            targetUserId: 'usr_a',
            originalAmount: Number(
              originalAmount
            ),
            modifiedAmount: Number(
              modifiedAmount
            ),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Attack simulation request failed.'
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err?.message ||
          'Unable to run attack simulation.'
      );
    } finally {
      setLoading(false);
    }
  }

  const simulation =
    result?.simulation;

  const incident =
    result?.incident;

  return (
    <div
      style={{
        padding: '28px',
        color: '#e2e8f0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '20px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '12px',
              color: '#00f2ff',
              fontWeight: '700',
              letterSpacing: '1.5px',
              marginBottom: '8px',
            }}
          >
            SECURITY OPERATIONS
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '30px',
              color: '#f8fafc',
            }}
          >
            Controlled Attack Simulation
          </h1>

          <p
            style={{
              marginTop: '8px',
              color: '#94a3b8',
              maxWidth: '760px',
            }}
          >
            Safely simulate a payment amount-manipulation
            attack and observe SecurePay detection,
            blocking, and incident creation.
          </p>
        </div>

        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(16,185,129,0.35)',
            background:
              'rgba(16,185,129,0.08)',
            color: '#10b981',
            fontSize: '12px',
            fontWeight: '700',
          }}
        >
          CONTROLLED / NO REAL TRANSFER
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(320px, 1fr) minmax(320px, 1fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        <section
          style={{
            background:
              'rgba(15,23,42,0.82)',
            border:
              '1px solid rgba(148,163,184,0.16)',
            borderRadius: '16px',
            padding: '22px',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: '#f8fafc',
              fontSize: '20px',
            }}
          >
            Amount Manipulation Test
          </h2>

          <p
            style={{
              color: '#94a3b8',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
          >
            The simulation starts with an original
            payment amount and submits a modified amount
            to verify that the security control blocks
            unauthorized increases.
          </p>

          <div
            style={{
              marginTop: '20px',
              display: 'grid',
              gap: '16px',
            }}
          >
            <label>
              <div
                style={{
                  marginBottom: '7px',
                  color: '#cbd5e1',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                Original Amount
              </div>

              <input
                type="number"
                min="1"
                value={originalAmount}
                onChange={(e) =>
                  setOriginalAmount(
                    e.target.value
                  )
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border:
                    '1px solid rgba(148,163,184,0.2)',
                  background: '#0f172a',
                  color: '#f8fafc',
                  outline: 'none',
                }}
              />
            </label>

            <label>
              <div
                style={{
                  marginBottom: '7px',
                  color: '#cbd5e1',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                Modified Amount
              </div>

              <input
                type="number"
                min="1"
                value={modifiedAmount}
                onChange={(e) =>
                  setModifiedAmount(
                    e.target.value
                  )
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border:
                    '1px solid rgba(148,163,184,0.2)',
                  background: '#0f172a',
                  color: '#f8fafc',
                  outline: 'none',
                }}
              />
            </label>

            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                background:
                  'rgba(239,68,68,0.08)',
                border:
                  '1px solid rgba(239,68,68,0.25)',
                color: '#fca5a5',
                fontSize: '13px',
              }}
            >
              Demo scenario:
              <strong
                style={{
                  color: '#f8fafc',
                  marginLeft: '6px',
                }}
              >
                {formatAmount(originalAmount)}
                {' → '}
                {formatAmount(modifiedAmount)}
              </strong>
            </div>

            <button
              type="button"
              onClick={runAmountManipulation}
              disabled={loading}
              style={{
                marginTop: '4px',
                width: '100%',
                padding: '13px 16px',
                border: 0,
                borderRadius: '10px',
                background: loading
                  ? '#334155'
                  : '#00f2ff',
                color: '#020617',
                fontWeight: '800',
                cursor: loading
                  ? 'not-allowed'
                  : 'pointer',
              }}
            >
              {loading
                ? 'RUNNING SIMULATION...'
                : 'RUN AMOUNT MANIPULATION'}
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '10px',
                background:
                  'rgba(239,68,68,0.10)',
                border:
                  '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}
        </section>

        <section
          style={{
            background:
              'rgba(15,23,42,0.82)',
            border:
              '1px solid rgba(148,163,184,0.16)',
            borderRadius: '16px',
            padding: '22px',
            minHeight: '340px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
            }}
          >
            <h2
              style={{
                margin: 0,
                color: '#f8fafc',
                fontSize: '20px',
              }}
            >
              Simulation Result
            </h2>

            {simulation && (
              <span
                style={{
                  padding: '6px 10px',
                  borderRadius: '999px',
                  background:
                    simulation.result === 'BLOCKED'
                      ? 'rgba(239,68,68,0.12)'
                      : 'rgba(16,185,129,0.12)',
                  color:
                    simulation.result === 'BLOCKED'
                      ? '#f87171'
                      : '#34d399',
                  fontSize: '11px',
                  fontWeight: '800',
                }}
              >
                {simulation.result}
              </span>
            )}
          </div>

          {!simulation ? (
            <div
              style={{
                minHeight: '280px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              Run the simulation to view
              <br />
              detection and incident details.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: '10px',
              }}
            >
              <ResultRow
                label="Attack Type"
                value={simulation.attackType}
              />

              <ResultRow
                label="Original Amount"
                value={formatAmount(
                  simulation.originalAmount
                )}
              />

              <ResultRow
                label="Modified Amount"
                value={formatAmount(
                  simulation.modifiedAmount
                )}
              />

              <ResultRow
                label="Security Decision"
                value={simulation.result}
                highlight
              />

              <ResultRow
                label="Transaction Created"
                value={
                  simulation.transactionCreated
                    ? 'TRUE'
                    : 'FALSE'
                }
              />

              <ResultRow
                label="Funds Transferred"
                value={
                  simulation.fundsTransferred
                    ? 'TRUE'
                    : 'FALSE'
                }
              />

              <ResultRow
                label="Simulation Transaction ID"
                value={
                  simulation.transactionId
                }
              />

              {incident && (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '16px',
                    borderRadius: '12px',
                    background:
                      'rgba(239,68,68,0.07)',
                    border:
                      '1px solid rgba(239,68,68,0.25)',
                  }}
                >
                  <div
                    style={{
                      color: '#f87171',
                      fontWeight: '800',
                      fontSize: '12px',
                      letterSpacing: '1px',
                      marginBottom: '12px',
                    }}
                  >
                    SECURITY INCIDENT CREATED
                  </div>

                  <ResultRow
                    label="Incident ID"
                    value={
                      incident.incidentId
                    }
                  />

                  <ResultRow
                    label="Severity"
                    value={
                      incident.severity
                    }
                    highlight
                  />

                  <ResultRow
                    label="Status"
                    value={
                      incident.status
                    }
                  />

                  <ResultRow
                    label="Decision"
                    value={
                      incident.securityDecision
                    }
                    highlight
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  highlight = false,
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '20px',
        padding: '10px 0',
        borderBottom:
          '1px solid rgba(148,163,184,0.08)',
      }}
    >
      <span
        style={{
          color: '#94a3b8',
          fontSize: '13px',
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: highlight
            ? '#f87171'
            : '#e2e8f0',
          fontSize: '13px',
          fontWeight: '700',
          textAlign: 'right',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
    </div>
  );
}
