import net from "node:net";

export type TallyTcpClientOptions = {
  readonly host: string;
  readonly port: number;
  readonly timeoutMs: number;
};

/**
 * Audit Item #1: Direct Binary TCP Socket Client for Tally Prime
 * Provides raw TCP socket communication fallback on port 9001 when HTTP API is disabled or blocked.
 */
export class TallyTcpClient {
  public constructor(private readonly options: TallyTcpClientOptions) {}

  public async executeTcp(xmlPayload: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let responseData = "";

      socket.setTimeout(this.options.timeoutMs);

      socket.connect(this.options.port, this.options.host, () => {
        socket.write(xmlPayload, "utf-8");
      });

      socket.on("data", (chunk) => {
        responseData += chunk.toString("utf-8");
      });

      socket.on("end", () => {
        socket.destroy();
        resolve(responseData);
      });

      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error(`Tally TCP Socket timed out after ${this.options.timeoutMs} ms.`));
      });

      socket.on("error", (err) => {
        socket.destroy();
        reject(new Error(`Tally TCP connection error: ${err.message}`));
      });
    });
  }
}
