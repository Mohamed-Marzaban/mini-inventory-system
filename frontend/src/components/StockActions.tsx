import { useState } from "react";
import {
  addStock,
  removeStock,
  transferStock,
  type Warehouse,
} from "../api/inventory";

type Action = "add" | "remove" | "transfer";

interface Props {
  productId: string;
  warehouses: Warehouse[];
  onChange: () => void;
}

export function StockActions({ productId, warehouses, onChange }: Props) {
  const [action, setAction] = useState<Action>("add");
  const [warehouseId, setWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function notify(text: string, error: boolean) {
    setMessage(text);
    setIsError(error);
  }

  async function handleSubmit() {
    setMessage("");

    if (!warehouseId) {
      notify("Pick a warehouse.", true);
      return;
    }
    if (action === "transfer" && !toWarehouseId) {
      notify("Pick a destination warehouse.", true);
      return;
    }
    if (action === "transfer" && warehouseId === toWarehouseId) {
      notify("Source and destination must differ.", true);
      return;
    }

    try {
      if (action === "add") {
        await addStock(productId, warehouseId, quantity);
        notify("Stock added.", false);
      } else if (action === "remove") {
        await removeStock(productId, warehouseId, quantity);
        notify("Stock removed.", false);
      } else {
        await transferStock(productId, warehouseId, toWarehouseId, quantity);
        notify("Stock transferred.", false);
      }
      onChange();
    } catch (err: any) {
      notify(err.response?.data?.message ?? "Action failed.", true);
    }
  }

  const inputStyle = { padding: 4 };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 4,
        padding: 12,
        display: "flex",
        flexWrap: "wrap" as const,
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Action picker */}
      <select
        value={action}
        onChange={(e) => setAction(e.target.value as Action)}
        style={inputStyle}
      >
        <option value="add">Add</option>
        <option value="remove">Remove</option>
        <option value="transfer">Transfer</option>
      </select>

      {/* Source warehouse (label changes for transfer) */}
      <select
        value={warehouseId}
        onChange={(e) => setWarehouseId(e.target.value)}
        style={inputStyle}
      >
        <option value="">
          {action === "transfer" ? "From warehouse..." : "Warehouse..."}
        </option>
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>

      {/* Destination warehouse — only for transfer */}
      {action === "transfer" && (
        <select
          value={toWarehouseId}
          onChange={(e) => setToWarehouseId(e.target.value)}
          style={inputStyle}
        >
          <option value="">To warehouse...</option>
          {warehouses
            .filter((w) => w.id !== warehouseId)
            .map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
        </select>
      )}

      <input
        type="number"
        min={1}
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        style={{ width: 70, ...inputStyle }}
      />

      <button onClick={handleSubmit}>Apply</button>

      {message && (
        <span style={{ color: isError ? "red" : "green" }}>{message}</span>
      )}
    </div>
  );
}
