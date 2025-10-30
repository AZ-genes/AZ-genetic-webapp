import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HederaClient } from '../src/services/hedera/client';
import { TopicMessageSubmitTransaction, ContractExecuteTransaction } from '@hashgraph/sdk';


// Define mocked transaction methods
const mockTransaction = {
  setTopicId: vi.fn().mockReturnThis(),
  setMessage: vi.fn().mockReturnThis(),
  setContractId: vi.fn().mockReturnThis(),
  setGas: vi.fn().mockReturnThis(),
  setFunction: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue({
    getReceipt: () => Promise.resolve({
      transactionId: { toString: () => 'mock_transaction_id' }
    })
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
  })
}));

describe('HederaClient', () => {
  const client = new HederaClient();
  const testHash = '123456789abcdef';
  const testTopicId = '0.0.123456';

  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mockTransaction).forEach(mock => mock.mockClear());
  });

  it('should submit hash to HCS', async () => {
    const txId = await client.submitHash(testTopicId, testHash);
    
    expect(mockTransaction.setTopicId).toHaveBeenCalled();
    expect(mockTransaction.setMessage).toHaveBeenCalled();
    expect(mockTransaction.execute).toHaveBeenCalled();
    expect(txId).toBe('mock_transaction_id');
  });

  it('should execute smart contract for access grant', async () => {
    const contractId = '0.0.654321';
    const fileId = 'file123';
    const granteeId = 'user456';

    const txId = await client.grantAccess(contractId as any, fileId, granteeId);
    
    expect(mockTransaction.setContractId).toHaveBeenCalled();
    expect(mockTransaction.setGas).toHaveBeenCalled();
    expect(mockTransaction.setFunction).toHaveBeenCalled();
    expect(mockTransaction.execute).toHaveBeenCalled();
    expect(txId).toBe('mock_transaction_id');
  });
});