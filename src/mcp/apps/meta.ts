export interface AppCsp {
  connectDomains: string[];
  resourceDomains: string[];
}

export interface AppToolMetaOptions {
  visibility?: ("model" | "app")[];
  invoking?: string;
  invoked?: string;
}

export function appToolMeta(resourceUri: string, options: AppToolMetaOptions = {}): Record<string, unknown> {
  const appOnly = options.visibility !== undefined && !options.visibility.includes("model");
  return {
    ui: { resourceUri, ...(options.visibility ? { visibility: options.visibility } : {}) },
    ...(appOnly ? {} : { "openai/outputTemplate": resourceUri }),
    "openai/widgetAccessible": true,
    ...(options.invoking ? { "openai/toolInvocation/invoking": options.invoking } : {}),
    ...(options.invoked ? { "openai/toolInvocation/invoked": options.invoked } : {}),
  };
}

export function appResourceMeta(csp: AppCsp, prefersBorder: boolean, description: string): Record<string, unknown> {
  return {
    ui: { csp, prefersBorder },
    "openai/widgetDescription": description,
    "openai/widgetPrefersBorder": prefersBorder,
    "openai/widgetCSP": { connect_domains: csp.connectDomains, resource_domains: csp.resourceDomains },
  };
}
