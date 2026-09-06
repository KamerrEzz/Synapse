export const STAT_RANGES = [7, 30, 90] as const;
export type StatRangeDays = (typeof STAT_RANGES)[number];

export type DayPoint = {
  day: string;
  tokens: number;
  embeddingTokens: number;
  usd: number;
  messages: number;
  files: number;
  documents: number;
  aiTurns: number;
};

export type NamedCount = { key: string; label: string; value: number; usd?: number };

export type StatsSnapshot = {
  generatedAt: string;
  days: StatRangeDays;
  from: string;
  to: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    createdAt: string;
    embeddingDim: number | null;
  };
  plan: {
    aiTokensMonth: number;
    aiTokensCap: number;
    files: number;
    filesCap: number;
    documents: number;
    documentsCap: number;
    members: number;
    membersCap: number;
  };
  knowledge: {
    chunks: number;
    chars: number;
    avgChars: number;
    fileChunks: number;
    documentChunks: number;
    fileSources: number;
    documentSources: number;
    docsTotal: number;
    docsEmpty: number;
    docsIndexed: number;
    docsUnindexed: number;
    filesReady: number;
    filesError: number;
    filesProcessing: number;
    filesImages: number;
    filesBytes: number;
    staleDocs: number;
  };
  collab: {
    channels: number;
    messagesTotal: number;
    messagesInRange: number;
    uniqueAuthors: number;
    aiConversations: number;
    aiMessages: number;
    assistantReplies: number;
    avgReplyChars: number;
  };
  ai: {
    tokensInRange: number;
    embeddingTokensInRange: number;
    promptTokensInRange: number;
    completionTokensInRange: number;
    eventsWithUsageSplit: number;
    usdInRange: number;
    usdMonth: number;
    usdPerAssistantReply: number;
    eventsInRange: number;
    byKind: NamedCount[];
    bySource: NamedCount[];
    usdBySource: NamedCount[];
    byUser: { userId: string; name: string; tokens: number; usd: number }[];
    byModel: NamedCount[];
    pricing: {
      provider: string;
      chatModel: string;
      embeddingModel: string;
      chatInputPerM: number;
      chatOutputPerM: number;
      embedPerM: number;
      chatExact: boolean;
      embedExact: boolean;
    };
    caveat: string;
  };
  mcp: {
    active: number;
    used: number;
    lastUsedAt: string | null;
  };
  series: DayPoint[];
  topSources: { sourceType: string; sourceId: string; title: string; chunks: number; chars: number }[];
  files: {
    id: string;
    name: string;
    mime: string | null;
    status: string;
    size: number;
    createdAt: string;
    error: string | null;
  }[];
  documents: {
    id: string;
    title: string;
    chars: number;
    indexed: boolean;
    updatedAt: string;
    createdBy: string | null;
  }[];
  events: {
    id: string;
    createdAt: string;
    kind: string;
    quantity: number;
    usd: number;
    source: string;
    model: string;
    userId: string | null;
    promptTokens: number;
    completionTokens: number;
  }[];
};
