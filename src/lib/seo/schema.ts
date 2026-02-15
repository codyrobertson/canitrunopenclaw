import { toAbsoluteUrl } from "./url";

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function buildBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path),
    })),
  };
}

export function buildSchemaGraph(nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}

export type AggregateRating = {
  ratingValue: number;
  ratingCount: number;
  bestRating?: number;
  worstRating?: number;
};

export type ProductSchemaArgs = {
  name: string;
  description: string;
  category?: string;
  aggregateRating?: AggregateRating;
};

export function buildProduct(args: ProductSchemaArgs) {
  return {
    "@type": "Product",
    name: args.name,
    description: args.description,
    ...(args.category ? { category: args.category } : {}),
    ...(args.aggregateRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: args.aggregateRating.ratingValue,
            ratingCount: args.aggregateRating.ratingCount,
            bestRating: args.aggregateRating.bestRating ?? 5,
            worstRating: args.aggregateRating.worstRating ?? 1,
          },
        }
      : {}),
  };
}

export type SoftwareApplicationSchemaArgs = {
  name: string;
  description: string;
  applicationCategory?: string;
  operatingSystem?: string;
  license?: string;
  url?: string;
  authorName?: string;
};

export function buildSoftwareApplication(args: SoftwareApplicationSchemaArgs) {
  return {
    "@type": "SoftwareApplication",
    name: args.name,
    description: args.description,
    ...(args.applicationCategory ? { applicationCategory: args.applicationCategory } : {}),
    ...(args.operatingSystem ? { operatingSystem: args.operatingSystem } : {}),
    ...(args.license ? { license: args.license } : {}),
    ...(args.url ? { url: args.url } : {}),
    ...(args.authorName
      ? {
          author: {
            "@type": "Person",
            name: args.authorName,
          },
        }
      : {}),
  };
}

export type TechArticleSchemaArgs = {
  headline: string;
  description: string;
  about?: Record<string, unknown>[];
};

export function buildTechArticle(args: TechArticleSchemaArgs) {
  return {
    "@type": "TechArticle",
    headline: args.headline,
    description: args.description,
    ...(args.about ? { about: args.about } : {}),
  };
}

export type HowToStep = {
  name: string;
  text: string;
  command?: string;
  position?: number;
  url?: string;
};

export type HowToSchemaArgs = {
  name: string;
  description: string;
  totalTime?: string;
  tools?: string[];
  steps?: HowToStep[];
};

export function buildHowTo(args: HowToSchemaArgs) {
  return {
    "@type": "HowTo",
    name: args.name,
    description: args.description,
    ...(args.totalTime ? { totalTime: args.totalTime } : {}),
    ...(args.tools
      ? {
          tool: args.tools.map((tool) => ({
            "@type": "HowToTool",
            name: tool,
          })),
        }
      : {}),
    ...(args.steps
      ? {
          step: args.steps.map((step, idx) => ({
            "@type": "HowToStep",
            position: step.position ?? idx + 1,
            name: step.name,
            text: step.text,
            ...(step.url ? { url: step.url } : {}),
            ...(step.command
              ? {
                  itemListElement: {
                    "@type": "HowToDirection",
                    text: step.command,
                  },
                }
              : {}),
          })),
        }
      : {}),
  };
}

export type FAQItem = {
  question: string;
  answer: string;
};

export function buildFAQPage(items: FAQItem[]) {
  const filtered = items
    .map((i) => ({ question: i.question.trim(), answer: i.answer.trim() }))
    .filter((i) => i.question.length > 0 && i.answer.length > 0);

  return {
    "@type": "FAQPage",
    mainEntity: filtered.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
