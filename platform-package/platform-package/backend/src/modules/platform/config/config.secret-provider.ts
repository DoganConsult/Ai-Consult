export interface SecretProvider {
  putSecret(input: { key: string; scopeType: string; scopeId: string; value: string }): Promise<{ ref: string; hash: string }>;
  getSecret(ref: string): Promise<string>;
  deleteSecret(ref: string): Promise<void>;
}

export class InMemorySecretProvider implements SecretProvider {
  private readonly store = new Map<string, string>();

  async putSecret(input: { key: string; scopeType: string; scopeId: string; value: string }): Promise<{ ref: string; hash: string }> {
    const ref = `${input.key}:${input.scopeType}:${input.scopeId}`;
    this.store.set(ref, input.value);
    return { ref, hash: `hash:${Buffer.from(input.value).toString('base64')}` };
  }

  async getSecret(ref: string): Promise<string> {
    const value = this.store.get(ref);
    if (!value) throw new Error(`Secret not found for ref: ${ref}`);
    return value;
  }

  async deleteSecret(ref: string): Promise<void> {
    this.store.delete(ref);
  }
}
