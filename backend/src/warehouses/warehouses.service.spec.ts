import { Test, TestingModule } from '@nestjs/testing';
import { WarehousesService } from './warehouses.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WarehousesService', () => {
  let service: WarehousesService;

  const prismaMock = {
    warehouse: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehousesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a warehouse with name and location', async () => {
      const dto = { name: 'Cairo DC', location: 'Cairo' };
      prismaMock.warehouse.create.mockResolvedValue({ id: 'w1', ...dto });

      const result = await service.create(dto);

      expect(prismaMock.warehouse.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual({ id: 'w1', name: 'Cairo DC', location: 'Cairo' });
    });

    it('creates a warehouse without a location (optional field)', async () => {
      const dto = { name: 'Alexandria DC' };
      prismaMock.warehouse.create.mockResolvedValue({
        id: 'w2',
        name: 'Alexandria DC',
        location: null,
      });

      const result = await service.create(dto);

      expect(prismaMock.warehouse.create).toHaveBeenCalledWith({ data: dto });
      expect(result.location).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all warehouses ordered by newest first', async () => {
      const warehouses = [{ id: 'w1' }, { id: 'w2' }];
      prismaMock.warehouse.findMany.mockResolvedValue(warehouses);

      const result = await service.findAll();

      expect(prismaMock.warehouse.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(warehouses);
    });

    it('returns an empty array when there are no warehouses', async () => {
      prismaMock.warehouse.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });
});
