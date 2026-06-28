import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StockService } from './stock.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StockService', () => {
  let service: StockService;

  // A mock "transaction client" — every Prisma method we use is a jest mock
  const tx = {
    product: { findUnique: jest.fn() },
    warehouse: { findUnique: jest.fn() },
    inventory: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
    stockMovement: { create: jest.fn() },
  };

  // $transaction simply runs the callback, passing tx as the transaction client
  const prismaMock = {
    $transaction: jest.fn((cb: any) => cb(tx)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<StockService>(StockService);

    // Reset all mocks between tests so call counts/return values don't leak
    jest.clearAllMocks();
  });

  // ----------------------------- addStock -----------------------------
  describe('addStock', () => {
    const dto = { productId: 'p1', warehouseId: 'w1', quantity: 10 };

    it('adds stock: validates, upserts, logs a movement, and returns the inventory', async () => {
      tx.product.findUnique.mockResolvedValue({ id: 'p1' });
      tx.warehouse.findUnique.mockResolvedValue({ id: 'w1' });
      tx.inventory.upsert.mockResolvedValue({ id: 'inv1', quantity: 10 });
      tx.stockMovement.create.mockResolvedValue({});

      const result = await service.addStock(dto);

      expect(tx.inventory.upsert).toHaveBeenCalledWith({
        where: {
          productId_warehouseId: { productId: 'p1', warehouseId: 'w1' },
        },
        create: { productId: 'p1', warehouseId: 'w1', quantity: 10 },
        update: { quantity: { increment: 10 } },
      });
      expect(tx.stockMovement.create).toHaveBeenCalledWith({
        data: {
          type: 'ADD',
          productId: 'p1',
          quantity: 10,
          toWarehouseId: 'w1',
        },
      });
      expect(result).toEqual({ id: 'inv1', quantity: 10 });
    });

    it('throws NotFound when the product does not exist (and does not upsert)', async () => {
      tx.product.findUnique.mockResolvedValue(null);

      await expect(service.addStock(dto)).rejects.toThrow(NotFoundException);
      expect(tx.inventory.upsert).not.toHaveBeenCalled();
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });

    it('throws NotFound when the warehouse does not exist (and does not upsert)', async () => {
      tx.product.findUnique.mockResolvedValue({ id: 'p1' });
      tx.warehouse.findUnique.mockResolvedValue(null);

      await expect(service.addStock(dto)).rejects.toThrow(NotFoundException);
      expect(tx.inventory.upsert).not.toHaveBeenCalled();
    });
  });

  // --------------------------- removeStock ----------------------------
  describe('removeStock', () => {
    const dto = { productId: 'p1', warehouseId: 'w1', quantity: 5 };

    it('removes stock: decrements, logs a movement, and returns the updated row', async () => {
      tx.inventory.findUnique.mockResolvedValue({ quantity: 20 });
      tx.inventory.update.mockResolvedValue({ quantity: 15 });
      tx.stockMovement.create.mockResolvedValue({});

      const result = await service.removeStock(dto);

      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: {
          productId_warehouseId: { productId: 'p1', warehouseId: 'w1' },
        },
        data: { quantity: { decrement: 5 } },
      });
      expect(tx.stockMovement.create).toHaveBeenCalledWith({
        data: {
          type: 'REMOVE',
          productId: 'p1',
          quantity: 5,
          fromWarehouseId: 'w1',
        },
      });
      expect(result).toEqual({ quantity: 15 });
    });

    it('throws NotFound when no inventory row exists (and does not update)', async () => {
      tx.inventory.findUnique.mockResolvedValue(null);

      await expect(service.removeStock(dto)).rejects.toThrow(NotFoundException);
      expect(tx.inventory.update).not.toHaveBeenCalled();
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });

    it('throws BadRequest when stock is insufficient (and does not update)', async () => {
      tx.inventory.findUnique.mockResolvedValue({ quantity: 3 });

      await expect(service.removeStock(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.inventory.update).not.toHaveBeenCalled();
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });
  });

  // -------------------------- transferStock ---------------------------
  describe('transferStock', () => {
    const dto = {
      productId: 'p1',
      fromWarehouseId: 'w1',
      toWarehouseId: 'w2',
      quantity: 5,
    };

    it('transfers stock: decrements source, upserts destination, logs a movement', async () => {
      tx.warehouse.findUnique.mockResolvedValue({ id: 'w2' }); // destination exists
      tx.inventory.findUnique.mockResolvedValue({ quantity: 20 }); // source has stock
      tx.inventory.update.mockResolvedValue({ quantity: 15 });
      tx.inventory.upsert.mockResolvedValue({ quantity: 5 });
      tx.stockMovement.create.mockResolvedValue({});

      const result = await service.transferStock(dto);

      expect(tx.inventory.update).toHaveBeenCalledWith({
        where: {
          productId_warehouseId: { productId: 'p1', warehouseId: 'w1' },
        },
        data: { quantity: { decrement: 5 } },
      });
      expect(tx.inventory.upsert).toHaveBeenCalledWith({
        where: {
          productId_warehouseId: { productId: 'p1', warehouseId: 'w2' },
        },
        create: { productId: 'p1', warehouseId: 'w2', quantity: 5 },
        update: { quantity: { increment: 5 } },
      });
      expect(tx.stockMovement.create).toHaveBeenCalledWith({
        data: {
          type: 'TRANSFER',
          productId: 'p1',
          quantity: 5,
          fromWarehouseId: 'w1',
          toWarehouseId: 'w2',
        },
      });
      expect(result).toEqual({
        productId: 'p1',
        fromWarehouseId: 'w1',
        toWarehouseId: 'w2',
        quantity: 5,
      });
    });

    it('throws BadRequest for same-warehouse transfer (before opening a transaction)', async () => {
      const sameDto = { ...dto, toWarehouseId: 'w1' };

      await expect(service.transferStock(sameDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFound when the destination warehouse does not exist', async () => {
      tx.warehouse.findUnique.mockResolvedValue(null);

      await expect(service.transferStock(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(tx.inventory.update).not.toHaveBeenCalled();
      expect(tx.inventory.upsert).not.toHaveBeenCalled();
    });

    it('throws NotFound when the source has no inventory (and does not write)', async () => {
      tx.warehouse.findUnique.mockResolvedValue({ id: 'w2' });
      tx.inventory.findUnique.mockResolvedValue(null);

      await expect(service.transferStock(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(tx.inventory.update).not.toHaveBeenCalled();
      expect(tx.inventory.upsert).not.toHaveBeenCalled();
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });

    it('throws BadRequest when the source stock is insufficient (and does not write)', async () => {
      tx.warehouse.findUnique.mockResolvedValue({ id: 'w2' });
      tx.inventory.findUnique.mockResolvedValue({ quantity: 2 });

      await expect(service.transferStock(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.inventory.update).not.toHaveBeenCalled();
      expect(tx.inventory.upsert).not.toHaveBeenCalled();
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });
  });
});
