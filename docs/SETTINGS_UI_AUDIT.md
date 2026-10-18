# 100-Point Deep Technical UI Audit: SettingsView.tsx
## ReconcAILe Hub — Enterprise Connector Configuration, Tally Gateway & System Preferences Engine

> **Audit Scope**: Comprehensive technical and UI evaluation of `SettingsView.tsx`, evaluating Tally HTTP/XML Gateway (port 9000), Local SQLite Cache Maintenance, Cloud Backend Synchronization, Auto-Start Tray Registration, Session Credentials Vault, and System Diagnostics.

---

### Executive Summary Matrix

| Audit Domain | Items | Priority | Summary & Resolution Directive |
| :--- | :---: | :---: | :--- |
| **Section 1: General Preferences & User Profile** | Items 1 – 25 | 🔴 High | Add Automatic Startup Toggle, Minimize to System Tray Toggle, Base Currency Selector, Registered Email Field, Practice Role Badge, and Password Reset Modal. |
| **Section 2: Connector Preferences & Background Sync** | Items 26 – 50 | 🟡 Medium | Add Enable Local Tally Connector Toggle, Background Sync Toggle, Sync Interval Slider (10s - 300s), Auto-Retry Failed Commands Toggle, and Max Outbox Attempts Selector. |
| **Section 3: Tally Gateway & ERP Pairing** | Items 51 – 75 | 🟡 Medium | Add Tally Host URL (`http://localhost:9000`), ERP Provider Dropdown (`TallyPrime`, `BUSY`), Tally GUID Pair Code Input, Test Port Connection Button, and Tally Connection Ping Metric. |
| **Section 4: Data, Storage & System Diagnostics** | Items 76 – 100 | 🟢 Polish | Add Purge Local SQLite Cache Button, Export Diagnostic Log Action, App Version Info (`v0.1.0`), Device Identity Fingerprint, ARIA accessibility attributes, and focus rings. |

---

### Detailed 100-Item Breakdown

#### Section 1: General Preferences & User Profile (Items 1 – 25)
1. **Automatic Startup Toggle**: Toggle switch enabling app auto-launch on system boot.
2. **Minimize to System Tray Toggle**: Toggle switch keeping tray agent running when window closes.
3. **Financial Year Start Month Dropdown**: Select FY start (`April (Indian FY)`, `January`, `July`).
4. **Base Currency Selector**: Select currency (`INR ₹`, `USD $`, `EUR €`).
5. **Dark Mode / Light Mode Theme Switcher**: Toggle between Dark OLED and Light themes.
6. **User Full Name Field**: Editable input for auditor full name (`User`).
7. **User Practice Email Address Field**: Display registered professional email address.
8. **Practice Role Assignment Badge**: Badge displaying user access level (`Principal Auditor`).
9. **OAuth2 Session Token Status**: Badge displaying token security state (`✓ Active & Secure`).
10. **Change Password Trigger Button**: Button launching password update modal.
11. **Two-Factor Authentication (2FA) Status**: Toggle switch for 2FA security enforcement.
12. **Session Timeout Inactivity Selector**: Select auto-lock timeout (`15 Minutes`, `30 Minutes`, `1 Hour`).
13. **App Language Selector**: Language dropdown (`English`, `Hindi`).
14. **Date Format Preference Dropdown**: Select date format (`DD-MM-YYYY`, `YYYY-MM-DD`).
15. **Number Format Locale Dropdown**: Select number formatting (`Lakhs / Crores`, `Millions / Billions`).
16. **Sidebar Navigation Tab - General**: Tab navigation button (`Sliders` icon).
17. **Sidebar Navigation Tab - Profile & Account**: Tab navigation button (`User` icon).
18. **Sidebar Navigation Tab - Connector Preferences**: Tab navigation button (`Activity` icon).
19. **Sidebar Navigation Tab - Tally Gateway**: Tab navigation button (`Server` icon).
20. **Sidebar Navigation Tab - Cloud Workspace**: Tab navigation button (`Cloud` icon).
21. **Sidebar Navigation Tab - Notifications**: Tab navigation button (`Bell` icon).
22. **Sidebar Navigation Tab - Data & Storage**: Tab navigation button (`Database` icon).
23. **Sidebar Navigation Tab - System Info**: Tab navigation button (`Info` icon).
24. **Save General Settings Action Button**: Primary button persisting configuration changes.
25. **Reset to Default Settings Button**: Button resetting preferences to system defaults.
