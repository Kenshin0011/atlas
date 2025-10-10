# ATLAS Architecture

## モノレポ構造

ATLAS は **提案C (実用的折衷案)** に基づいたモノレポ構造を採用しています。

```
atlas/
├── packages/
│   ├── atlas-core/           # 純粋関数・アルゴリズム
│   └── atlas-ui/             # UIコンポーネントライブラリ
└── apps/
    └── web/                  # Next.js アプリケーション
```

---

## パッケージ詳細

### 1. `@atlas/core`

**責務**: フレームワーク非依存の純粋関数・アルゴリズム

```
packages/atlas-core/src/
├── algorithms/               # 依存関係検出アルゴリズム
│   ├── dependency-analyzer.ts  # Local/Topic依存関係検出
│   ├── metrics-logger.ts       # メトリクスロギング
│   ├── adaptive-thresholds.ts  # 適応的閾値計算
│   └── index.ts
├── format/                   # 時間フォーマット
│   └── time.ts
├── math/                     # 数学関数
│   └── similarity.ts         # コサイン類似度
├── temporal/                 # 時間減衰
│   └── decay.ts
├── text/                     # テキスト処理
│   ├── japanese.ts           # 日本語処理
│   └── processing.ts         # 名詞抽出
├── types.ts                  # 型定義
└── index.ts
```

**エクスポート**:
- `computeLocalDependencies()` - 短期依存関係検出
- `computeTopicDependencies()` - トピック依存関係検出
- `MetricsLogger` - メトリクスロギング
- `calculateAdaptiveThreshold()` - 適応的閾値計算
- `cosineSimilarity()` - コサイン類似度
- `temporalDecay()` - 時間減衰関数
- `extractNouns()` - 日本語名詞抽出

**依存**: なし（外部ライブラリ最小限）

**特徴**:
- React/Next.js非依存
- 他のプロジェクトで再利用可能
- 論文化・研究用途に最適

---

### 2. `@atlas/ui`

**責務**: 再利用可能なUIコンポーネント（デザインシステム）

```
packages/atlas-ui/src/
├── primitives/               # 基本UI部品
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── index.ts
│   ├── Modal/
│   ├── Badge/
│   ├── Card/
│   └── index.ts
├── compositions/             # 組み合わせコンポーネント
│   └── index.ts
└── index.ts
```

**エクスポート**:
- `Button` - ボタンコンポーネント
- `Modal` - モーダルダイアログ
- `Badge` - ステータスバッジ
- `Card` - カードコンテナ

**依存**: `@atlas/core` (型定義のみ)

**特徴**:
- Tailwind CSS使用
- 将来的にStorybookでカタログ化
- Desktop版・Mobile版でも再利用可能

---

### 3. `apps/web`

**責務**: Next.js アプリケーション層

```
apps/web/src/
├── app/                      # Next.js App Router
│   ├── page.tsx
│   ├── layout.tsx
│   └── api/
│       ├── detect-dependency/
│       └── metrics/
├── features/                 # 機能単位で整理
│   ├── conversation-assistant/
│   │   ├── components/
│   │   │   ├── ConversationAssistant.tsx
│   │   │   ├── ConversationView.tsx
│   │   │   └── ControlPanel.tsx
│   │   └── hooks/
│   │       ├── useSpeechRecognition.ts
│   │       └── useSCAINDetection.ts
│   ├── context-recovery/
│   │   ├── components/
│   │   │   ├── ContextRecoveryPanel.tsx
│   │   │   └── QuickActionButtons.tsx
│   │   └── hooks/
│   │       └── useContextRecovery.ts
│   ├── notifications/
│   │   ├── components/
│   │   │   └── SmartNotification.tsx
│   │   └── hooks/
│   │       └── useNotifications.ts
│   └── topic-tracking/
│       ├── components/
│       │   └── TopicHistoryPanel.tsx
│       └── hooks/
│           └── useTopicTracking.ts
└── services/                 # 外部サービス連携
    └── embeddingService.ts   # OpenAI API wrapper
```

**依存**:
- `@atlas/core` - アルゴリズム・型定義
- `@atlas/ui` - UIコンポーネント

**特徴**:
- Next.js 15 + React 19
- App Router使用
- Web Speech API統合
- OpenAI API連携

---

## 依存関係グラフ

```
apps/web
   ├─→ @atlas/ui
   │     └─→ @atlas/core (型定義のみ)
   └─→ @atlas/core (全機能)
```

**レイヤールール**:
- `@atlas/core` は他のパッケージに依存しない
- `@atlas/ui` は `@atlas/core` の型定義のみ使用
- `apps/web` は両方のパッケージを使用

---

## 設計原則

### 1. **関心の分離 (Separation of Concerns)**
- アルゴリズム (`@atlas/core`) とUI (`@atlas/ui`) を分離
- フレームワーク依存を最小化

### 2. **再利用性 (Reusability)**
- `@atlas/core` は他の研究プロジェクトでも利用可能
- `@atlas/ui` は Desktop版・Mobile版でも利用可能

### 3. **Colocation**
- 関連するファイルは近くに配置
- features/ ディレクトリで機能ごとにまとめる

### 4. **依存注入 (Dependency Injection)**
- `computeLocalDependencies()` は `EmbeddingService` を受け取る
- テスト時にモックを注入可能

---

## マイグレーション履歴

### Phase 1: パッケージ作成 (2025-10-09)
- [x] `@atlas/ui` パッケージ作成
- [x] 基本UIコンポーネント追加 (Button, Modal, Badge, Card)

### Phase 2: アルゴリズム分離 (2025-10-09)
- [x] `dependencyAnalyzer` → `@atlas/core/algorithms`
- [x] `metricsLogger` → `@atlas/core/algorithms`
- [x] `adaptiveThresholds` → `@atlas/core/algorithms`
- [x] `extractNouns` → `@atlas/core/text`

### Phase 3: features 構造化 (2025-10-09)
- [x] `apps/web/src/features` ディレクトリ作成
- [ ] コンポーネント移動 (次のステップ)

---

## 今後の拡張

### 1. Storybook統合
```bash
cd packages/atlas-ui
pnpm add -D @storybook/react
pnpm storybook
```

### 2. Desktop版アプリ
```
apps/
├── web/          # 既存
└── desktop/      # NEW: Electron
    └── (同じ@atlas/coreと@atlas/uiを使用)
```

### 3. npm公開
```bash
# 将来的に
npm publish @atlas/core
npm publish @atlas/ui
```

---

## 参考資料

- [Feature-Sliced Design](https://feature-sliced.design/)
- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/)
