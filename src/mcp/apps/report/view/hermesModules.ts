declare module "@hermes/plugin-sdk" {
  export const TRANSCRIPT_DIRECTIVE_AREA: string;
  export const host: {
    composer?: {
      submit(sessionId: string | null, text: string): boolean;
      insertText(sessionId: string | null, text: string, opts?: { mode?: "block" | "inline" | "prefix" }): Promise<boolean>;
      focus(sessionId: string | null): void;
    };
  };
}

declare module "logViewCss" {
  const css: string;
  export default css;
}

declare module "*.css" {
  const css: string;
  export default css;
}
