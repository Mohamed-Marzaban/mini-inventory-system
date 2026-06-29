import { api } from "./client";

export interface Product {
  id: string;
  name: string;
  sku: string;
}

export interface InventoryEntry {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

export interface ProductInventory {
  product: Product;
  inventory: InventoryEntry[];
}

export interface CreateProductInput {
  name: string;
  sku: string;
}

export interface CreateWarehouseInput {
  name: string;
  location?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
}

export async function getProducts(): Promise<Product[]> {
  const res = await api.get("/products");
  return res.data;
}

export async function getProductInventory(
  productId: string,
): Promise<ProductInventory> {
  const res = await api.get(`/inventory/product/${productId}`);
  return res.data;
}

export async function createProduct(
  input: CreateProductInput,
): Promise<Product> {
  const res = await api.post("/products", input);
  return res.data;
}

export async function createWarehouse(
  input: CreateWarehouseInput,
): Promise<Warehouse> {
  const res = await api.post("/warehouses", input);
  return res.data;
}

export async function addStock(
  productId: string,
  warehouseId: string,
  quantity: number,
) {
  const res = await api.post("/stock/add", {
    productId,
    warehouseId,
    quantity,
  });
  return res.data;
}

export async function removeStock(
  productId: string,
  warehouseId: string,
  quantity: number,
) {
  const res = await api.post("/stock/remove", {
    productId,
    warehouseId,
    quantity,
  });
  return res.data;
}

export async function transferStock(
  productId: string,
  fromWarehouseId: string,
  toWarehouseId: string,
  quantity: number,
) {
  const res = await api.post("/stock/transfer", {
    productId,
    fromWarehouseId,
    toWarehouseId,
    quantity,
  });
  return res.data;
}
export async function getWarehouses(): Promise<Warehouse[]> {
  const res = await api.get("/warehouses");
  return res.data;
}
