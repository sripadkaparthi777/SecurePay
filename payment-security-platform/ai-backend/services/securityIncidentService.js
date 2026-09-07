import { randomUUID } from 'crypto';
import { getDb } from '../database/db.js';

export function createSecurityIncident({
  attackType,
  severity = 'HIGH',
  testUserId,
  targetUserId,
  transactionId = null,
  originalRequest,
  modifiedRequest,
  expectedResult,
  actualResult,
  securityDecision = 'BLOCKED',
}) {
  const db = getDb();

  const incidentId =
    `INC-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const now = new Date().toISOString();

  const incident = {
    incidentId,
    attackType,
    severity,
    testUserId,
    targetUserId,
    transactionId,
    originalRequest,
    modifiedRequest,
    expectedResult,
    actualResult,
    securityDecision,
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(`
    INSERT INTO security_incidents (
      incident_id,
      attack_type,
      severity,
      test_user_id,
      target_user_id,
      transaction_id,
      original_request,
      modified_request,
      expected_result,
      actual_result,
      security_decision,
      status,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    incident.incidentId,
    incident.attackType,
    incident.severity,
    incident.testUserId,
    incident.targetUserId,
    incident.transactionId,
    JSON.stringify(incident.originalRequest ?? {}),
    JSON.stringify(incident.modifiedRequest ?? {}),
    incident.expectedResult,
    incident.actualResult,
    incident.securityDecision,
    incident.status,
    incident.createdAt,
    incident.updatedAt
  );

  return incident;
}

function mapIncident(row) {
  if (!row) return null;

  return {
    incidentId: row.incident_id,
    attackType: row.attack_type,
    severity: row.severity,
    testUserId: row.test_user_id,
    targetUserId: row.target_user_id,
    transactionId: row.transaction_id,
    originalRequest: JSON.parse(row.original_request || '{}'),
    modifiedRequest: JSON.parse(row.modified_request || '{}'),
    expectedResult: row.expected_result,
    actualResult: row.actual_result,
    securityDecision: row.security_decision,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getSecurityIncidents() {
  const db = getDb();

  const rows = db.prepare(`
    SELECT *
    FROM security_incidents
    ORDER BY created_at DESC
  `).all();

  return rows.map(mapIncident);
}

export function getSecurityIncidentById(incidentId) {
  const db = getDb();

  const row = db.prepare(`
    SELECT *
    FROM security_incidents
    WHERE incident_id = ?
  `).get(incidentId);

  return mapIncident(row);
}

export function updateSecurityIncidentStatus(incidentId, status) {
  const db = getDb();

  const allowedStatuses = [
    'OPEN',
    'INVESTIGATING',
    'BLOCKED',
    'RESOLVED',
  ];

  if (!allowedStatuses.includes(status)) {
    return null;
  }

  const updatedAt = new Date().toISOString();

  const result = db.prepare(`
    UPDATE security_incidents
    SET status = ?, updated_at = ?
    WHERE incident_id = ?
  `).run(status, updatedAt, incidentId);

  if (result.changes === 0) {
    return null;
  }

  return getSecurityIncidentById(incidentId);
}
