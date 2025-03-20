declare module 'shpjs' {
  const shpjs: (file: string) => Promise<any>;
  export default shpjs;
}

declare module 'togeojson' {
  const toGeoJSON: {
    kml: (doc: Document) => any;
    gml: (doc: Document) => any;
  };
  export default toGeoJSON;
}

declare module 'xmldom' {
  export class DOMParser {
    parseFromString(source: string): Document;
  }
}

declare module 'csv-parse/sync' {
  export function parse(input: string, options?: {
    columns?: boolean;
    skip_empty_lines?: boolean;
    delimiter?: string;
  }): any[];
}

declare module 'topojson-client' {
  const topojson: {
    feature: (topology: any, object: any) => any;
  };
  export = topojson;
} 