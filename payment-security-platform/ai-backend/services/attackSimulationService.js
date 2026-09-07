import { randomUUID } from 'crypto';
import { createSecurityIncident } from './securityIncidentService.js';

export function simulateAmountManipulation({
  testUserId = 'usr_b',
  targetUserId = 'usr_a',
  transactionId = null,
  originalAmount = 500,
  modifiedAmount = 50000,
}) {
  const attackTransactionId =
    transactionId || `SIM-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const blocked =
    !Number.isFinite(modifiedAmount) ||
    modifiedAmount <= 0 ||
    modifiedAmount > originalAmount;

  const securityDecision = blocked ? 'BLOCKED' : 'ALLOWED';

  const incident = blocked
    ? createSecurityIncident({
        attackType: 'AMOUNT_MANIPULATION',
        severity: 'HIGH',
        testUserId,
        targetUserId,
        transactionId: attackTransactionId,
        originalRequest: {
          senderUserId: testUserId,
          receiverUserId: targetUserId,
          amount: originalAmount,
        },
        modifiedRequest: {
          senderUserId: testUserId,
          receiverUserId: targetUserId,
          amount: modifiedAmount,
        },
        expectedResult: 'MODIFIED PAYMENT MUST BE BLOCKED',
        actualResult: `Modified amount INR ${modifiedAmount} rejected`,
        securityDecision,
      })
    : null;

  return {
    success: true,
    simulation: {
      attackType: 'AMOUNT_MANIPULATION',
      originalAmount,
      modifiedAmount,
      transactionId: attackTransactionId,
      result: securityDecision,
      transactionCreated: false,
      fundsTransferred: false,
    },
    incident,
  };
}

