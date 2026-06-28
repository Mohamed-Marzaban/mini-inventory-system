import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const prismaMock = {
    product: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = { name: 'Widget A', sku: 'WIDGET-A' };

    it('creates a product when the SKU is not taken', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null); // SKU free
      prismaMock.product.create.mockResolvedValue({ id: 'p1', ...dto });

      const result = await service.create(dto);

      expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
        where: { sku: 'WIDGET-A' },
      });
      expect(prismaMock.product.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual({ id: 'p1', name: 'Widget A', sku: 'WIDGET-A' });
    });

    it('throws Conflict when the SKU already exists (and does not create)', async () => {
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'existing',
        ...dto,
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(prismaMock.product.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns all products ordered by newest first', async () => {
      const products = [{ id: 'p1' }, { id: 'p2' }];
      prismaMock.product.findMany.mockResolvedValue(products);

      const result = await service.findAll();

      expect(prismaMock.product.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(products);
    });

    it('returns an empty array when there are no products', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });
});
