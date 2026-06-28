import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;

  const prismaMock = {
    product: { findUnique: jest.fn() },
    inventory: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
  });

  describe('findByProduct', () => {
    it('returns the product with its inventory flattened to {warehouseId, warehouseName, quantity}', async () => {
      const product = { id: 'p1', name: 'Widget A', sku: 'WIDGET-A' };
      prismaMock.product.findUnique.mockResolvedValue(product);
      prismaMock.inventory.findMany.mockResolvedValue([
        { warehouseId: 'w1', quantity: 80, warehouse: { name: 'Cairo DC' } },
        {
          warehouseId: 'w2',
          quantity: 40,
          warehouse: { name: 'Alexandria DC' },
        },
      ]);

      const result = await service.findByProduct('p1');

      expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
      expect(prismaMock.inventory.findMany).toHaveBeenCalledWith({
        where: { productId: 'p1' },
        include: { warehouse: true },
        orderBy: { warehouse: { name: 'asc' } },
      });
      expect(result).toEqual({
        product,
        inventory: [
          { warehouseId: 'w1', warehouseName: 'Cairo DC', quantity: 80 },
          { warehouseId: 'w2', warehouseName: 'Alexandria DC', quantity: 40 },
        ],
      });
    });

    it('returns an empty inventory array when the product exists but has no stock anywhere', async () => {
      const product = { id: 'p1', name: 'Widget A', sku: 'WIDGET-A' };
      prismaMock.product.findUnique.mockResolvedValue(product);
      prismaMock.inventory.findMany.mockResolvedValue([]);

      const result = await service.findByProduct('p1');

      expect(result).toEqual({ product, inventory: [] });
    });

    it('throws NotFound when the product does not exist (and never queries inventory)', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(service.findByProduct('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.inventory.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns all inventory rows with product and warehouse included', async () => {
      const rows = [
        {
          id: 'inv1',
          quantity: 80,
          product: { name: 'A' },
          warehouse: { name: 'Cairo DC' },
        },
      ];
      prismaMock.inventory.findMany.mockResolvedValue(rows);

      const result = await service.findAll();

      expect(prismaMock.inventory.findMany).toHaveBeenCalledWith({
        include: { product: true, warehouse: true },
        orderBy: [{ product: { name: 'asc' } }, { warehouse: { name: 'asc' } }],
      });
      expect(result).toEqual(rows);
    });

    it('returns an empty array when there is no inventory', async () => {
      prismaMock.inventory.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });
});
