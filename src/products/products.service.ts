import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { sku: dto.sku },
    });
    if (existing) {
      throw new ConflictException(
        `Product with SKU '${dto.sku}' already exists`,
      );
    }
    return this.prisma.product.create({ data: dto });
  }

  findAll() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
