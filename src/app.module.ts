import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, ProductsModule],
})
export class AppModule {}
