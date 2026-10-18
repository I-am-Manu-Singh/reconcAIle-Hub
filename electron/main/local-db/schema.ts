export const CURRENT_SCHEMA_VERSION = 17;

export const migrations: ReadonlyArray<{ readonly version: number; readonly statements: readonly string[] }> = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS device_identity (
        id TEXT PRIMARY KEY,
        device_name TEXT NOT NULL,
        platform TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS connector_settings (
        id TEXT PRIMARY KEY CHECK (id = 'default'),
        tally_host TEXT NOT NULL,
        tally_port INTEGER NOT NULL CHECK (tally_port >= 1 AND tally_port <= 65535),
        enable_local_tally_connector INTEGER NOT NULL CHECK (enable_local_tally_connector IN (0, 1)),
        enable_background_sync INTEGER NOT NULL CHECK (enable_background_sync IN (0, 1)),
        raw_payload_retention_days INTEGER NOT NULL CHECK (raw_payload_retention_days >= 1 AND raw_payload_retention_days <= 365),
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS workspace_cache (
        workspace_id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        cached_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS company_cache (
        company_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        legal_name TEXT NOT NULL,
        gstin TEXT,
        pan TEXT,
        state_code TEXT,
        cached_at TEXT NOT NULL,
        FOREIGN KEY (workspace_id) REFERENCES workspace_cache(workspace_id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS sync_outbox (
        command_id TEXT PRIMARY KEY,
        idempotency_key TEXT NOT NULL UNIQUE,
        workspace_id TEXT,
        company_id TEXT,
        provider TEXT NOT NULL,
        command_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_error TEXT
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sync_outbox_status_created_at
        ON sync_outbox(status, created_at)`,
      `CREATE TABLE IF NOT EXISTS raw_payloads (
        id TEXT PRIMARY KEY,
        command_id TEXT,
        provider TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('REQUEST', 'RESPONSE')),
        content_type TEXT NOT NULL,
        body TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (command_id) REFERENCES sync_outbox(command_id) ON DELETE SET NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_raw_payloads_created_at
        ON raw_payloads(created_at)`,
    ],
  },
  {
    version: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS sync_events (
        id TEXT PRIMARY KEY,
        command_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (command_id) REFERENCES sync_outbox(command_id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sync_events_command_created_at
        ON sync_events(command_id, created_at)`,
    ],
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS backend_settings (
        id TEXT PRIMARY KEY CHECK (id = 'default'),
        api_base_url TEXT,
        websocket_url TEXT,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS connector_pairing (
        id TEXT PRIMARY KEY CHECK (id = 'default'),
        connector_id TEXT,
        organization_id TEXT,
        workspace_id TEXT,
        paired_at TEXT,
        last_heartbeat_at TEXT,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ],
  },
  {
    version: 4,
    statements: [
      `CREATE TABLE IF NOT EXISTS accounting_companies (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        source_provider TEXT NOT NULL,
        source_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(source_provider, source_name)
      )`,
      `CREATE TABLE IF NOT EXISTS ledger_groups (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_name TEXT,
        source_provider TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(company_id, source_provider, name),
        FOREIGN KEY (company_id) REFERENCES accounting_companies(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS ledgers (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_name TEXT,
        opening_balance_text TEXT,
        closing_balance_text TEXT,
        source_provider TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(company_id, source_provider, name),
        FOREIGN KEY (company_id) REFERENCES accounting_companies(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS voucher_types (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_name TEXT,
        source_provider TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(company_id, source_provider, name),
        FOREIGN KEY (company_id) REFERENCES accounting_companies(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS vouchers (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        voucher_date TEXT,
        voucher_type_name TEXT,
        voucher_number TEXT,
        narration TEXT,
        source_provider TEXT NOT NULL,
        source_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(company_id, source_provider, source_hash),
        FOREIGN KEY (company_id) REFERENCES accounting_companies(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS external_mappings (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        internal_id TEXT NOT NULL,
        external_id TEXT,
        external_guid TEXT,
        external_name TEXT NOT NULL,
        last_hash TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(company_id, provider, entity_type, external_name),
        FOREIGN KEY (company_id) REFERENCES accounting_companies(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_external_mappings_internal_id
        ON external_mappings(internal_id)`,
      `CREATE TABLE IF NOT EXISTS sync_cursors (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        cursor_value TEXT,
        last_sync_at TEXT NOT NULL,
        UNIQUE(company_id, provider, entity_type),
        FOREIGN KEY (company_id) REFERENCES accounting_companies(id) ON DELETE CASCADE
      )`,
    ],
  },
  {
    version: 5,
    statements: [
      `CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        original_file_name TEXT NOT NULL,
        stored_file_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        sha256 TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS document_events (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_documents_status_created_at
        ON documents(status, created_at)`,
    ],
  },
  {
    version: 6,
    statements: [
      `CREATE TABLE IF NOT EXISTS parties (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        gstin TEXT,
        pan TEXT,
        address TEXT,
        state_code TEXT,
        party_type TEXT NOT NULL,
        source_provider TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(company_id, source_provider, name),
        FOREIGN KEY (company_id) REFERENCES accounting_companies(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_parties_company_id
        ON parties(company_id)`,
      `CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        formal_name TEXT,
        unit_type TEXT NOT NULL,
        source_provider TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(company_id, source_provider, name),
        FOREIGN KEY (company_id) REFERENCES accounting_companies(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_name TEXT,
        unit_name TEXT,
        opening_qty_text TEXT,
        closing_qty_text TEXT,
        source_provider TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(company_id, source_provider, name),
        FOREIGN KEY (company_id) REFERENCES accounting_companies(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_inventory_items_company_id
        ON inventory_items(company_id)`,
      `CREATE TABLE IF NOT EXISTS conflict_records (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        internal_id TEXT NOT NULL,
        conflict_type TEXT NOT NULL,
        local_value TEXT NOT NULL,
        remote_value TEXT NOT NULL,
        status TEXT NOT NULL,
        detected_at TEXT NOT NULL,
        resolved_at TEXT,
        resolution TEXT,
        FOREIGN KEY (company_id) REFERENCES accounting_companies(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_conflict_records_company_status
        ON conflict_records(company_id, status)`,
    ],
  },
  {
    version: 7,
    statements: [
      `CREATE TABLE IF NOT EXISTS document_extractions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL UNIQUE,
        raw_ocr_text TEXT,
        party_name TEXT,
        party_gstin TEXT,
        invoice_number TEXT,
        invoice_date TEXT,
        taxable_amount REAL,
        cgst_amount REAL,
        sgst_amount REAL,
        igst_amount REAL,
        total_amount REAL,
        confidence_score REAL,
        extracted_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_document_extractions_party
        ON document_extractions(party_name, party_gstin)`,
    ],
  },
  {
    version: 8,
    statements: [
      `CREATE TABLE IF NOT EXISTS draft_vouchers (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL UNIQUE,
        company_id TEXT,
        voucher_type_name TEXT NOT NULL,
        voucher_date TEXT NOT NULL,
        voucher_number TEXT,
        party_name TEXT NOT NULL,
        party_ledger_id TEXT,
        taxable_amount REAL NOT NULL,
        cgst_amount REAL NOT NULL,
        sgst_amount REAL NOT NULL,
        igst_amount REAL NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT NOT NULL,
        validation_status TEXT NOT NULL,
        validation_errors TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_draft_vouchers_status
        ON draft_vouchers(status)`,
    ],
  },
  {
    version: 9,
    statements: [
      `CREATE TABLE IF NOT EXISTS bank_transactions (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        bank_name TEXT NOT NULL,
        transaction_date TEXT NOT NULL,
        description TEXT NOT NULL,
        reference_no TEXT,
        debit REAL NOT NULL DEFAULT 0,
        credit REAL NOT NULL DEFAULT 0,
        balance REAL,
        category TEXT,
        reconciliation_status TEXT NOT NULL,
        matched_voucher_id TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_bank_tx_company
        ON bank_transactions(company_id, reconciliation_status)`,
      `CREATE TABLE IF NOT EXISTS gstr2b_records (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        supplier_gstin TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        invoice_number TEXT NOT NULL,
        invoice_date TEXT NOT NULL,
        taxable_value REAL NOT NULL,
        cgst REAL NOT NULL,
        sgst REAL NOT NULL,
        igst REAL NOT NULL,
        itc_availability TEXT NOT NULL,
        match_status TEXT NOT NULL,
        matched_voucher_id TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_gstr2b_match
        ON gstr2b_records(company_id, match_status)`,
    ],
  },
  {
    version: 10,
    statements: [
      `CREATE TABLE IF NOT EXISTS narration_ledger_rules (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        narration_pattern TEXT NOT NULL,
        normalized_party_name TEXT NOT NULL,
        matched_ledger_name TEXT NOT NULL,
        matched_ledger_id TEXT,
        voucher_type TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        hit_count INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(company_id, narration_pattern),
        FOREIGN KEY (company_id) REFERENCES accounting_companies(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_narration_rules_lookup
        ON narration_ledger_rules(company_id, narration_pattern)`,
    ],
  },
  {
    version: 11,
    statements: [
      `CREATE TABLE IF NOT EXISTS user_preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_user_preferences_category
        ON user_preferences(category)`,
    ],
  },
  {
    version: 12,
    statements: [
      `ALTER TABLE accounting_companies ADD COLUMN gstin TEXT`,
      `ALTER TABLE accounting_companies ADD COLUMN state_name TEXT`,
      `ALTER TABLE accounting_companies ADD COLUMN books_from TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_accounting_companies_gstin
        ON accounting_companies(gstin)`,
    ],
  },
  {
    version: 13,
    statements: [
      `ALTER TABLE accounting_companies ADD COLUMN icon_name TEXT`,
    ],
  },
  {
    version: 14,
    statements: [
      `ALTER TABLE vouchers ADD COLUMN amount REAL DEFAULT 0`,
      `ALTER TABLE vouchers ADD COLUMN party_name TEXT`,
    ],
  },
  {
    version: 15,
    statements: [
      // Bank statement session/history table — one row per imported PDF
      `CREATE TABLE IF NOT EXISTS bank_statement_sessions (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        document_id TEXT,
        bank_name TEXT NOT NULL,
        bank_label TEXT NOT NULL,
        original_file_name TEXT NOT NULL,
        account_number TEXT,
        ifsc_code TEXT,
        period_from TEXT,
        period_to TEXT,
        financial_year TEXT,
        opening_balance REAL NOT NULL DEFAULT 0,
        closing_balance REAL NOT NULL DEFAULT 0,
        total_debits REAL NOT NULL DEFAULT 0,
        total_credits REAL NOT NULL DEFAULT 0,
        tx_count INTEGER NOT NULL DEFAULT 0,
        is_balanced INTEGER NOT NULL DEFAULT 0,
        confidence REAL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_bss_company_created
        ON bank_statement_sessions(company_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_bss_company_fy
        ON bank_statement_sessions(company_id, financial_year)`,
      // Link each bank transaction to its import session
      `ALTER TABLE bank_transactions ADD COLUMN session_id TEXT`,
      `ALTER TABLE bank_transactions ADD COLUMN updated_at TEXT`,
    ],
  },
  {
    version: 16,
    statements: [
      `CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        model_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated
        ON ai_conversations(updated_at DESC)`,
      `CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        provider TEXT,
        model TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ai_messages_conv_created
        ON ai_messages(conversation_id, created_at ASC)`,
    ],
  },
  {
    version: 17,
    statements: [
      `ALTER TABLE accounting_companies ADD COLUMN password_hash TEXT`,
    ],
  },
  {
    version: 18,
    statements: [
      `ALTER TABLE ledgers ADD COLUMN gstin TEXT`,
      `ALTER TABLE ledgers ADD COLUMN pan TEXT`,
      `ALTER TABLE ledgers ADD COLUMN email TEXT`,
      `ALTER TABLE ledgers ADD COLUMN phone TEXT`,
      `ALTER TABLE ledgers ADD COLUMN address TEXT`,
      `ALTER TABLE ledgers ADD COLUMN state_name TEXT`,
      `ALTER TABLE ledgers ADD COLUMN pincode TEXT`,
      `ALTER TABLE ledgers ADD COLUMN bank_account_number TEXT`,
      `ALTER TABLE ledgers ADD COLUMN bank_ifsc TEXT`,
      `ALTER TABLE ledgers ADD COLUMN bank_name TEXT`,
      `ALTER TABLE ledgers ADD COLUMN credit_limit REAL`,
      `ALTER TABLE ledgers ADD COLUMN credit_days INTEGER`,
      `ALTER TABLE ledgers ADD COLUMN is_bill_wise INTEGER DEFAULT 1`,
      `CREATE INDEX IF NOT EXISTS idx_ledgers_company_name ON ledgers(company_id, name)`,
      `CREATE INDEX IF NOT EXISTS idx_ledgers_gstin ON ledgers(gstin)`,
    ],
  },
  {
    version: 19,
    statements: [
      `CREATE TABLE IF NOT EXISTS stock_groups (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(company_id, name)
      )`,
      `CREATE TABLE IF NOT EXISTS stock_categories (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(company_id, name)
      )`,
      `CREATE TABLE IF NOT EXISTS godowns (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_name TEXT,
        location_address TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(company_id, name)
      )`,
      `CREATE TABLE IF NOT EXISTS stock_batches (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        stock_item_name TEXT NOT NULL,
        batch_number TEXT NOT NULL,
        godown_name TEXT,
        manufacturing_date TEXT,
        expiry_date TEXT,
        opening_qty REAL DEFAULT 0,
        rate REAL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(company_id, stock_item_name, batch_number)
      )`,
      `ALTER TABLE inventory_items ADD COLUMN category_name TEXT`,
      `ALTER TABLE inventory_items ADD COLUMN hsn_sac TEXT`,
      `ALTER TABLE inventory_items ADD COLUMN default_rate REAL DEFAULT 0`,
      `ALTER TABLE inventory_items ADD COLUMN gst_rate REAL DEFAULT 18`,
      `ALTER TABLE inventory_items ADD COLUMN godown_name TEXT`,
      `ALTER TABLE inventory_items ADD COLUMN batch_name TEXT`,
      `ALTER TABLE inventory_items ADD COLUMN mfg_date TEXT`,
      `ALTER TABLE inventory_items ADD COLUMN exp_date TEXT`,
      `ALTER TABLE inventory_items ADD COLUMN job_costing TEXT`,
    ],
  },
];






