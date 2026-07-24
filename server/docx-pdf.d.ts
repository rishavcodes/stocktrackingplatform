declare module 'docx-pdf' {
    interface Options {
      quality?: number;
    }
  
    function docxConverter(
      input: string | Buffer,
      callback: (err: Error | null, result: Buffer) => void,
      options?: Options
    ): void;
  
    export = docxConverter;
  }
  