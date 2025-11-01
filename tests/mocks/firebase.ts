export function verifyMockToken(token: string) {
  const parts = token.split('-');
  if (parts.length < 3) return null; // Expecting at least 'tier-token-uniqueId'

  const tier = parts[0].toUpperCase(); // F1, F2, F3
  const uniqueId = parts.slice(2).join('-'); // Rejoin if uniqueId itself contains hyphens

  if (['F1', 'F2', 'F3'].includes(tier)) {
    const uid = `test-auth-id-${tier}-${uniqueId}`;
    const id = `test-auth-id-${tier}-${uniqueId}`;
    return {
      uid,
      id,
      email: `${tier.toLowerCase()}@example.com`,
      user_metadata: { subscription_tier: tier }
    };
  }
  return null;
}
