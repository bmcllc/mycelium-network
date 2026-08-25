export function publishBinary(body: Record<string, unknown>): {
  artifactId: string;
  name: string;
  priceSov: number;
};

export function purchaseBinary(
  id: string,
  buyerId: string,
): { error?: string; artifactId?: string };

export function listBinaries(): unknown[];
export function getBinary(id: string): unknown;
