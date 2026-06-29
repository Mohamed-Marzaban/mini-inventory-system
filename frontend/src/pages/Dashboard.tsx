import { useState, useEffect } from "react";
import {
  getProducts,
  getProductInventory,
  type Product,
  type InventoryEntry,
} from "../api/inventory";
import { CreateForms } from "../components/CreateForms";
import { getWarehouses, type Warehouse } from "../api/inventory";
import { StockActions } from "../components/StockActions";

export function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Which product is currently expanded (null = none)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Inventory for the expanded product, keyed by product id
  const [inventories, setInventories] = useState<
    Record<string, InventoryEntry[]>
  >({});

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    loadProducts();
    loadWarehouses();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const data = await getProducts();
      setProducts(data);
    } catch {
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  }

  async function loadWarehouses() {
    try {
      const data = await getWarehouses();
      setWarehouses(data);
    } catch {}
  }

  async function refreshInventory(productId: string) {
    try {
      const data = await getProductInventory(productId);
      setInventories((prev) => ({ ...prev, [productId]: data.inventory }));
    } catch {
      setInventories((prev) => ({ ...prev, [productId]: [] }));
    }
  }

  async function toggleExpand(productId: string) {
    // If already expanded, collapse it
    if (expandedId === productId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(productId);

    // Fetch this product's inventory (always refetch for fresh data)
    try {
      const data = await getProductInventory(productId);
      setInventories((prev) => ({ ...prev, [productId]: data.inventory }));
    } catch {
      setInventories((prev) => ({ ...prev, [productId]: [] }));
    }
  }

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  return (
    <div
      style={{ maxWidth: 800, margin: "40px auto", fontFamily: "sans-serif" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Inventory</h1>
        <button onClick={logout}>Log out</button>
      </div>
      <CreateForms onCreated={loadProducts} /> {/* ← add this line */}
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !error && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {products.map((product) => (
            <li
              key={product.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: 4,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <div
                onClick={() => toggleExpand(product.id)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  <strong>{product.name}</strong>{" "}
                  <span style={{ color: "#888" }}>({product.sku})</span>
                </span>
                <span>{expandedId === product.id ? "▲" : "▼"}</span>
              </div>

              {expandedId === product.id && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid #eee",
                  }}
                >
                  {inventories[product.id] === undefined ? (
                    <p>Loading inventory...</p>
                  ) : inventories[product.id].length === 0 ? (
                    <p style={{ color: "#888" }}>
                      No stock in any warehouse yet.
                    </p>
                  ) : (
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }}>Warehouse</th>
                          <th style={{ textAlign: "right" }}>Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventories[product.id].map((entry) => (
                          <tr key={entry.warehouseId}>
                            <td>{entry.warehouseName}</td>
                            <td style={{ textAlign: "right" }}>
                              {entry.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <StockActions
                    productId={product.id}
                    warehouses={warehouses}
                    onChange={() => refreshInventory(product.id)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
