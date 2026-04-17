declare module 'markdown-tables-to-json' {
  export class Extractor {
    static extractObject(table: string, layout: string, headers: boolean): any;
  }
}