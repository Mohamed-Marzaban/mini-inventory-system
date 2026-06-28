import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  logger = new Logger(InventoryService.name);
  constructor(private readonly prisma: PrismaService) {}

  // All inventory for one product
  async findByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      this.logger.warn(`Product ${productId} not found`);
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const inventory = await this.prisma.inventory.findMany({
      where: { productId },
      include: { warehouse: true },
      orderBy: { warehouse: { name: 'asc' } },
    });

    return {
      product,
      inventory: inventory.map((row) => ({
        warehouseId: row.warehouseId,
        warehouseName: row.warehouse.name,
        quantity: row.quantity,
      })),
    };
  }

  // Full inventory list
  findAll() {
    return this.prisma.inventory.findMany({
      include: { product: true, warehouse: true },
      orderBy: [{ product: { name: 'asc' } }, { warehouse: { name: 'asc' } }],
    });
  }
}
