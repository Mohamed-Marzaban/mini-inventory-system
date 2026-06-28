import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddStockDto,
  RemoveStockDto,
  TransferStockDto,
} from './dto/stock-operations.dto';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(private readonly prisma: PrismaService) {}

  async addStock(dto: AddStockDto) {
    const { productId, warehouseId, quantity } = dto;

    return this.prisma.$transaction(async (tx) => {
      // Ensure the product and warehouse exist
      await this.ensureProductExists(tx, productId);
      await this.ensureWarehouseExists(tx, warehouseId);

      // Upsert: create the inventory row if missing, otherwise increment it
      const inventory = await tx.inventory.upsert({
        where: { productId_warehouseId: { productId, warehouseId } },
        create: { productId, warehouseId, quantity },
        update: { quantity: { increment: quantity } },
      });

      // Write the audit log row (inside the transaction)
      await tx.stockMovement.create({
        data: {
          type: 'ADD',
          productId,
          quantity,
          toWarehouseId: warehouseId,
        },
      });

      this.logger.log(
        `ADD ${quantity} of product ${productId} to warehouse ${warehouseId} (new qty: ${inventory.quantity})`,
      );

      return inventory;
    });
  }

  async removeStock(dto: RemoveStockDto) {
    const { productId, warehouseId, quantity } = dto;

    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
      });

      if (!inventory) {
        this.logger.warn(
          `No inventory for product ${productId} in warehouse ${warehouseId}`,
        );
        throw new NotFoundException(
          `No inventory for product ${productId} in warehouse ${warehouseId}`,
        );
      }
      if (inventory.quantity < quantity) {
        this.logger.warn(
          `Insufficient stock for product ${productId} in warehouse ${warehouseId}: have ${inventory.quantity}, tried to remove ${quantity}`,
        );
        throw new BadRequestException(
          `Insufficient stock: have ${inventory.quantity}, tried to remove ${quantity}`,
        );
      }

      const updated = await tx.inventory.update({
        where: { productId_warehouseId: { productId, warehouseId } },
        data: { quantity: { decrement: quantity } },
      });

      await tx.stockMovement.create({
        data: {
          type: 'REMOVE',
          productId,
          quantity,
          fromWarehouseId: warehouseId,
        },
      });

      this.logger.log(
        `REMOVE ${quantity} of product ${productId} from warehouse ${warehouseId} (new qty: ${updated.quantity})`,
      );

      return updated;
    });
  }

  async transferStock(dto: TransferStockDto) {
    const { productId, fromWarehouseId, toWarehouseId, quantity } = dto;

    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('Cannot transfer to the same warehouse');
    }

    return this.prisma.$transaction(async (tx) => {
      // Ensure the destination warehouse exists
      await this.ensureWarehouseExists(tx, toWarehouseId);
      // 1. Check source has enough stock
      const source = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId: fromWarehouseId },
        },
      });

      if (!source) {
        this.logger.warn(
          `No inventory for product ${productId} in source warehouse ${fromWarehouseId}`,
        );
        throw new NotFoundException(
          `No inventory for product ${productId} in source warehouse ${fromWarehouseId}`,
        );
      }
      if (source.quantity < quantity) {
        this.logger.warn(
          `Insufficient stock for product ${productId} in warehouse ${fromWarehouseId}: have ${source.quantity}, tried to remove ${quantity}`,
        );
        throw new BadRequestException(
          `Insufficient stock in source: have ${source.quantity}, tried to transfer ${quantity}`,
        );
      }

      // 2. Decrement source
      await tx.inventory.update({
        where: {
          productId_warehouseId: { productId, warehouseId: fromWarehouseId },
        },
        data: { quantity: { decrement: quantity } },
      });

      // 3. Increment destination (create row if it doesn't exist yet)
      await tx.inventory.upsert({
        where: {
          productId_warehouseId: { productId, warehouseId: toWarehouseId },
        },
        create: { productId, warehouseId: toWarehouseId, quantity },
        update: { quantity: { increment: quantity } },
      });

      // 4. Log the transfer
      await tx.stockMovement.create({
        data: {
          type: 'TRANSFER',
          productId,
          quantity,
          fromWarehouseId,
          toWarehouseId,
        },
      });

      this.logger.log(
        `TRANSFER ${quantity} of product ${productId} from ${fromWarehouseId} to ${toWarehouseId}`,
      );

      return { productId, fromWarehouseId, toWarehouseId, quantity };
    });
  }

  // --- helpers ---
  private async ensureProductExists(tx: any, productId: string) {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) {
      this.logger.warn(`Product ${productId} not found`);
      throw new NotFoundException(`Product ${productId} not found`);
    }
  }

  private async ensureWarehouseExists(tx: any, warehouseId: string) {
    const warehouse = await tx.warehouse.findUnique({
      where: { id: warehouseId },
    });
    if (!warehouse) {
      this.logger.warn(`Warehouse ${warehouseId} not found`);
      throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    }
  }
}
