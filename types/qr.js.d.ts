// `qr.js` n'embarque pas de types. Il arrive dans l'arbre via `react-qr-code`
// (l'encodeur du QR affiché dans l'app) et sert aussi à générer les QR
// imprimés — même encodeur des deux côtés, donc même QR.

declare module "qr.js/lib/QRCode" {
  class QRCode {
    /** @param typeNumber -1 pour laisser l'encodeur choisir la version. */
    constructor(typeNumber: number, errorCorrectLevel: number);
    addData(data: string): void;
    make(): void;
    /** Matrice carrée des modules : true = module noir. */
    modules: boolean[][];
  }
  export = QRCode;
}

declare module "qr.js/lib/ErrorCorrectLevel" {
  const ErrorCorrectLevel: { L: number; M: number; Q: number; H: number };
  export = ErrorCorrectLevel;
}
