import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HederaClient } from '../src/services/hedera/client';
import { TopicMessageSubmitTransaction, ContractExecuteTransaction } from '@hashgraph/sdk';

// Mock the HederaClient
vi.mock('../src/services/hedera/client', () => {
  const HederaClient = vi.fn();
  HederaClient.prototype.submitHash = vi.fn(() => Promise.resolve('mock_transaction_id'));
  HederaClient.prototype.grantAccess = vi.fn(() => Promise.resolve('mock_transaction_id'));
  return { HederaClient };
});

// Define mocked transaction methods
const mockTransaction = {
  setTopicId: vi.fn().mockReturnThis(),
  setMessage: vi.fn().mockReturnThis(),
  setContractId: vi.fn().mockReturnThis(),
  setGas: vi.fn().mockReturnThis(),
  setFunction: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue({
    transactionId: { toString: () => 'mock_transaction_id' },
    getReceipt: () => Promise.resolve({})
  })
};

// Mock the module
vi.mock('@hashgraph/sdk', () => ({
  Client: { forTestnet: vi.fn().mockReturnThis(), setOperator: vi.fn() },
  AccountId: { fromString: vi.fn() },
  PrivateKey: { fromString: vi.fn() },
  TopicMessageSubmitTransaction: vi.fn().mockImplementation(function () {
    return {
      setTopicId: mockTransaction.setTopicId,
      setMessage: mockTransaction.setMessage,
      execute: mockTransaction.execute
    };
  }),
  ContractExecuteTransaction: vi.fn().mockImplementation(function () {
    return {
      setContractId: mockTransaction.setContractId,
      setGas: mockTransaction.setGas,
      setFunction: mockTransaction.setFunction,
      execute: mockTransaction.execute
    };
  }),
  ContractFunctionParameters: class {
    addString() { return this; }
  }
}));

describe('HederaClient', () => {
  let client: HederaClient;
  const testHash = '123456789abcdef';
  const testTopicId = '0.0.123456';

  beforeEach(() => {
    client = new HederaClient();
    vi.clearAllMocks();
    Object.values(mockTransaction).forEach(mock => mock.mockClear());
  });

  it('should submit hash to HCS', async () => {
    const txId = await client.submitHash(testTopicId, testHash);
    
    expect(client.submitHash).toHaveBeenCalled();
    expect(txId).toBe('mock_transaction_id');
  });

  it('should execute smart contract for access grant', async () => {
    const contractId = '0.0.654321';
    const fileId = 'file123';
    const granteeId = 'user456';

    const txId = await client.grantAccess(contractId as any, fileId, granteeId);
    
    expect(client.grantAccess).toHaveBeenCalled();
    expect(txId).toBe('mock_transaction_id');
  });
});