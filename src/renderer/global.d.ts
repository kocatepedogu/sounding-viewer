declare global {
  interface Window {
    /** Functions implemented in the main process */
    IO: {
      download: (url:string, filename:string) => Promise<void|Error>,
      wgrib2: (filename: string) => Promise<string[][]|Error>,
      listFiles: (host: string, dir: string) => Promise<string[]|Error>
    },

    /** Global functions directly called from HTML code */
    initializeMapAndOptions: () => void,
    initializeSounding: () => void
  }
}

export {};