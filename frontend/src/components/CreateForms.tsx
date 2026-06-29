import { useState } from "react";
import { createProduct, createWarehouse } from "../api/inventory";

export function CreateForms({ onCreated }: { onCreated: () => void }) {
  const [productName, setProductName] = useState("");
  const [productSku, setProductSku] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [message, setMessage] = useState("");

  async function handleCreateProduct() {
    setMessage("");
    try {
      await createProduct({ name: productName, sku: productSku });
      setProductName("");
      setProductSku("");
      setMessage("Product created.");
      onCreated();
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? "Failed to create product.");
    }
  }

  async function handleCreateWarehouse() {
    setMessage("");
    try {
      await createWarehouse({
        name: warehouseName,
        location: warehouseLocation || undefined,
      });
      setWarehouseName("");
      setWarehouseLocation("");
      setMessage("Warehouse created.");
      onCreated();
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? "Failed to create warehouse.");
    }
  }

  const boxStyle = {
    border: "1px solid #ccc",
    borderRadius: 4,
    padding: 16,
    flex: 1,
  };
  const inputStyle = {
    display: "block",
    width: "100%",
    marginBottom: 8,
    padding: 6,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={boxStyle}>
          <h3>New Product</h3>
          <input
            placeholder="Name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="SKU"
            value={productSku}
            onChange={(e) => setProductSku(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleCreateProduct}>Create product</button>
        </div>

        <div style={boxStyle}>
          <h3>New Warehouse</h3>
          <input
            placeholder="Name"
            value={warehouseName}
            onChange={(e) => setWarehouseName(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Location (optional)"
            value={warehouseLocation}
            onChange={(e) => setWarehouseLocation(e.target.value)}
            style={inputStyle}
          />
          <button onClick={handleCreateWarehouse}>Create warehouse</button>
        </div>
      </div>

      {message && <p style={{ color: "#555" }}>{message}</p>}
    </div>
  );
}
