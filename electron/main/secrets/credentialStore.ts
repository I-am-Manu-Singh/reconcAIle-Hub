const SERVICE_NAME = "AccountingAutomationHub";

export type CredentialKey = 
  | "cloudAccessToken" 
  | "cloudRefreshToken" 
  | "connectorDeviceToken"
  | "groqApiKey"
  | "geminiApiKey"
  | "openaiApiKey"
  | "customLlmEndpoint"
  | "activeAiProvider";

const inMemoryStore = new Map<string, string>();

export class CredentialStore {
  public async setSecret(key: CredentialKey, value: string): Promise<void> {
    if (value.length === 0) {
      throw new Error("Secret value cannot be empty.");
    }
    inMemoryStore.set(key, value);
  }

  public async getSecret(key: CredentialKey): Promise<string | null> {
    return inMemoryStore.get(key) ?? null;
  }

  public async deleteSecret(key: CredentialKey): Promise<void> {
    inMemoryStore.delete(key);
  }

  public async hasSecret(key: CredentialKey): Promise<boolean> {
    const value = await this.getSecret(key);
    return value !== null;
  }
}


