export type TallyHttpClientOptions = {
  readonly host: string;
  readonly port: number;
  readonly timeoutMs: number;
};

export class TallyHttpClient {
  public constructor(private readonly options: TallyHttpClientOptions) {}

  public async execute(xml: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const response = await fetch(`http://${this.options.host}:${this.options.port}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
        },
        body: xml,
        signal: controller.signal,
      });

      const body = await response.text();

      if (!response.ok) {
        throw new Error(`Tally HTTP request failed with status ${response.status}.`);
      }

      return body;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Tally did not respond within ${this.options.timeoutMs} ms.`);
      }

      if (error instanceof Error) {
        throw new Error(`Tally connection failed: ${error.message}`);
      }

      throw new Error("Tally connection failed for an unknown reason.");
    } finally {
      clearTimeout(timeout);
    }
  }
}
