export function verifyMockToken(token: string) {
  if (token === 'f1-token') {
    return {
      uid: 'f1-user-id',
      email: 'f1@example.com',
      user_metadata: { subscription_tier: 'F1' }
    };
  }
  if (token === 'f2-token') {
    return {
      uid: 'f2-user-id',
      email: 'f2@example.com',
      user_metadata: { subscription_tier: 'F2' }
    };
  }
  if (token === 'f3-token') {
    return {
      uid: 'f3-user-id',
      email: 'f3@example.com',
      user_metadata: { subscription_tier: 'F3' }
    };
  }
  return null;
}
