import crypto from "node:crypto";
import type { LocalDatabase } from "./database.js";

export interface AiConversation {
  readonly id: string;
  readonly title: string;
  readonly modelId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AiMessage {
  readonly id: string;
  readonly conversationId: string;
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
  readonly provider?: string | null;
  readonly model?: string | null;
  readonly createdAt: string;
}

export class AiChatRepository {
  public constructor(private readonly database: LocalDatabase) {}

  public listConversations(): AiConversation[] {
    const rows = this.database
      .prepare("SELECT id, title, model_id, created_at, updated_at FROM ai_conversations ORDER BY updated_at DESC")
      .all() as Array<{
        id: string;
        title: string;
        model_id: string;
        created_at: string;
        updated_at: string;
      }>;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      modelId: r.model_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  public getConversation(id: string): AiConversation | null {
    const row = this.database
      .prepare("SELECT id, title, model_id, created_at, updated_at FROM ai_conversations WHERE id = ?")
      .get(id) as {
        id: string;
        title: string;
        model_id: string;
        created_at: string;
        updated_at: string;
      } | undefined;

    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      modelId: row.model_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public createConversation(title = "New Discussion", modelId = "smollm2-135m"): AiConversation {
    const id = `conv_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    this.database
      .prepare("INSERT INTO ai_conversations (id, title, model_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(id, title, modelId, now, now);

    return {
      id,
      title,
      modelId,
      createdAt: now,
      updatedAt: now,
    };
  }

  public updateConversationTitle(id: string, title: string): void {
    const now = new Date().toISOString();
    this.database
      .prepare("UPDATE ai_conversations SET title = ?, updated_at = ? WHERE id = ?")
      .run(title, now, id);
  }

  public deleteConversation(id: string): void {
    this.database
      .prepare("DELETE FROM ai_conversations WHERE id = ?")
      .run(id);
  }

  public getMessages(conversationId: string): AiMessage[] {
    const rows = this.database
      .prepare(
        "SELECT id, conversation_id, role, content, provider, model, created_at FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC"
      )
      .all(conversationId) as Array<{
        id: string;
        conversation_id: string;
        role: "system" | "user" | "assistant";
        content: string;
        provider: string | null;
        model: string | null;
        created_at: string;
      }>;

    return rows.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      role: r.role,
      content: r.content,
      provider: r.provider,
      model: r.model,
      createdAt: r.created_at,
    }));
  }

  public appendMessage(msg: {
    conversationId: string;
    role: "system" | "user" | "assistant";
    content: string;
    provider?: string | null;
    model?: string | null;
  }): AiMessage {
    const id = `msg_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const insert = this.database.prepare(
      "INSERT INTO ai_messages (id, conversation_id, role, content, provider, model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const updateConv = this.database.prepare(
      "UPDATE ai_conversations SET updated_at = ? WHERE id = ?"
    );

    this.database.transaction(() => {
      insert.run(id, msg.conversationId, msg.role, msg.content, msg.provider || null, msg.model || null, now);
      updateConv.run(now, msg.conversationId);
    })();

    return {
      id,
      conversationId: msg.conversationId,
      role: msg.role,
      content: msg.content,
      provider: msg.provider || null,
      model: msg.model || null,
      createdAt: now,
    };
  }
}
